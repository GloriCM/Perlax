# Arquitectura PerlaX (Perlax)

Fuente de verdad técnica para el equipo. Complementa el [manual de usuario](README.md).

**Estado:** criterios de arquitectura backend **cumplidos** (marzo 2026 / actualizado sep 2026).

## Estilo

**Monolito modular** (.NET 9 + React):

- Cada **módulo de negocio** vive en `backend/src/Modules/<Nombre>/` con capas:
  - **Domain** — entidades y reglas puras (sin EF, sin HTTP)
  - **Application** — puertos (interfaces), DTOs y casos de uso
  - **Infrastructure** — EF Core, servicios que implementan Application
  - **Api** — controladores delgados (HTTP → Application)
- El **Host** (`backend/src/Host/Perlax.Web`) compone módulos, JWT, CORS y **adaptadores entre módulos**.
- Frontend (`frontend/src/pages/<dominio>/`) se organiza por menú; APIs en `services/*Api.js` o `pages/*/utils/*Api.js`.

## Reglas obligatorias

1. **Api no usa `DbContext`.** El controlador llama a una interfaz de Application.
2. **Un módulo no referencia la Infrastructure de otro.** Integración solo por:
   - interfaz en Application del consumidor, implementada en el **Host**, o
   - interfaz pública en Application del proveedor, sin tocar su Infrastructure.
3. **Nuevas features** entran en el módulo de su bounded context (no “todo a Production porque ya está”).
4. **Frontend**: pantallas operativas reales usan API; mock/`localStorage` solo si está marcado como deuda de producto (abajo).
5. **Rutas canónicas** se documentan en `docs/flujo-principal/*` al cambiarlas.

## Módulos backend actuales

| Módulo | Esquema / DbContext | Responsabilidad |
|--------|---------------------|-----------------|
| Production | `production` | OT, cotizador, pedidos, OP, planeación/scheduling, planta, reporte diario, gastos de área, chat |
| Users | `users` | Auth, roles, rutas permitidas |
| Audit | `audit` | Bitácora |
| Budgets | `budgets` | Presupuestos |
| Almacen | `almacen` | Requisiciones, compras, inventario insumos |

### Production (núcleo amplio)

Hoy concentra varios dominios del menú. **Es aceptable**; la lógica está particionada por carpetas Application:

- Planeación → `Application/Scheduling` (`IOpSchedulingService`)
- Cotizador → `Application/Cotizador` (`ICotizadorService`)
- OP → `Application/Manufacturing`; OT → `Application/Orders`
- Design → `Application/Design`; Chat → `Application/Chat`
- Fichas / Pedidos / Quotations → Application propias
- Planta / reporte diario → `Application/DailyProduction`
- Gastos de área → `Application/AreaExpense`

Extraer un subdominio a módulo propio **solo** si cambia a menudo o choca en PRs; no partir por estética.

### Users / Budgets — excepción “vertical slice”

Estos módulos son **delgados y estables**. Está permitido (de momento) que controladores usen `DbContext` / inicializadores directos **solo** dentro del mismo módulo, sin lógica de negocio cruzada.

Cuando se toque Users o Budgets con reglas nuevas:

1. Extraer puerto + servicio a Application/Infrastructure del módulo.
2. Dejar el Api delgado.
3. Quitar esta excepción del módulo afectado.

No usar esta excepción para Production ni Almacén.

### Integraciones Host

| Puerto (Application) | Adaptador (Host) |
|----------------------|------------------|
| `IOperatorUserDirectory` | `UsersOperatorDirectory` |
| `IProductionOrderLookup` | `ProductionOrderLookup` |
| `IChatUserDirectory` | `UsersChatDirectory` |

## Frontend

| Área | Ruta canónica | API |
|------|---------------|-----|
| Programador | `/planeacion/programador` | `schedulingApi` → `/api/production/scheduling/*` |
| Planta | `/planta` | `/api/planta/floor/*` (red interna, anónimo) |
| Reporte diario | `/reporte-diario` | `dailyProductionApi` |
| Almacén | `/compras/...` | `almacenApi` |
| Chat | `/chat` | `/api/production/internal-chat/*` + hub |

Redirects legacy (`/planeacion/panel`, `/produccion/planeacion`) → Programador.

## Checklist PR (arquitectura)

- [ ] ¿La lógica nueva está en Application/Infrastructure, no en el controlador?
- [ ] ¿Hay referencias cruzadas a Infrastructure de otro módulo?
- [ ] ¿Si hay integración entre módulos, el adaptador está en el Host?
- [ ] ¿Docs de usuario / rutas actualizadas si cambió la URL?
- [ ] ¿Hay test de reglas nuevas en `backend/tests` cuando aplica?

## Criterios cumplidos

- Ningún controlador de Production/Almacén con `_context` directo.
- Integraciones entre módulos solo por puertos + Host.
- Tests de scheduling y lookup OP verdes (`dotnet test` en `Perlax.Modules.Production.UnitTests`).
- Migraciones unificadas con `MigrateAsync` en todos los DbContext del Host.

## Cómo probarlo

### Automatizado

```bash
cd backend/tests/Perlax.Modules.Production.UnitTests
dotnet test
```

### Manual — smoke post-deploy

1. Reiniciar `Perlax.Web`.
2. Cotizador / OP / OT / Design planner / Programador / Planta / Almacén.
3. Chat: roles Admin/Administrativo/Taller-con-vistas; canal de área y 1:1.
4. Gastos SST y Mantenimiento: rubros/proveedores vía API (`/api/gastos/{area}/…`).

### Regresión rápida de capas

- Un endpoint nuevo de Production no debe inyectar `ProductionDbContext` en el controlador.
- Almacén no debe referenciar `Perlax.Modules.Production.Infrastructure` en el `.csproj`.

## Deuda de producto (no bloquea arquitectura)

1. **Tipos de hora / recargo** en UI aún editables vía `localStorage` (`HorasExtra.jsx` / `Recargos.jsx`); el cálculo de nómina usa defaults de API.
2. **Productos y cotizaciones de Mantenimiento** aún en `localStorage` (`mantenimiento/gastos/storage.js`); rubros/proveedores ya van a API.
3. Pantallas SST de cotizaciones / tipos de servicio / orden de aseo pueden seguir con datos locales o estáticos.
4. Particionar Production en módulos .NET separados: solo si el tamaño empieza a doler en PRs.
