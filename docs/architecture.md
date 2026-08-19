# Arquitectura PerlaX (Perlax)

Fuente de verdad técnica para el equipo. Complementa el [manual de usuario](README.md).

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
4. **Frontend**: pantallas operativas reales usan API; mock/`localStorage` solo si está marcado como parcial/migración.
5. **Rutas canónicas** se documentan en `docs/flujo-principal/*` al cambiarlas.

## Módulos backend actuales

| Módulo | Esquema / DbContext | Responsabilidad |
|--------|---------------------|-----------------|
| Production | `production` | OT, cotizador, pedidos, OP, planeación/scheduling, planta, reporte diario |
| Users | `users` | Auth, roles, rutas permitidas |
| Audit | `audit` | Bitácora |
| Budgets | `budgets` | Presupuestos |
| Almacen | `almacen` | Requisiciones, compras, inventario insumos |

### Production (núcleo amplio)

Hoy concentra varios dominios del menú. **Es aceptable a corto plazo**, pero:

- Casos de uso nuevos de planeación → `Application/Scheduling` (`IOpSchedulingService`).
- Cotizador → `Application/Cotizador` (`ICotizadorService`).
- OP → `Application/Manufacturing` (`IManufacturingOrderService`); OT → `Application/Orders` (`IProductionOrderService`).
- Design → `Application/Design` (`IDesignPlannerService`); Chat → `Application/Chat` (`IInternalChatService`).
- Fichas técnicas → `Application/TechnicalSheets`; Pedidos cliente → `Application/CustomerOrders`; Quotations legado → `Application/Quotations`.
- Planta / reporte diario → `Application/DailyProduction` (`IDailyProductionService`).
- Gastos de área (rubros/proveedores) → `Application/AreaExpense` (`IAreaExpenseCatalogService`).
- No añadir chat/cotizador/diseño nuevos sin evaluar extracción o carpeta Application propia.

### Users / Budgets — excepción “vertical slice”

Estos módulos son **delgados y estables**. Está permitido (de momento) que controladores usen `DbContext` / inicializadores directos **solo** dentro del mismo módulo, sin lógica de negocio cruzada.

Cuando se toque Users o Budgets con reglas nuevas (permisos compuestos, workflows de presupuesto, etc.):

1. Extraer puerto + servicio a Application/Infrastructure del módulo.
2. Dejar el Api delgado.
3. Quitar esta excepción del módulo afectado.

No usar esta excepción para Production ni Almacén.

### Integración Users → Production

- Puerto: `IOperatorUserDirectory` (Production.Application).
- Adaptador: `Perlax.Web.Services.UsersOperatorDirectory` (Host).

### Integración Almacén → Production (OP/OT)

- Puerto: `IProductionOrderLookup` (Almacen.Application).
- Adaptador: `Perlax.Web.Services.ProductionOrderLookup` (Host).
- **Prohibido** que Almacen referencie `Production.Infrastructure`.

## Frontend

| Área | Ruta canónica | API |
|------|---------------|-----|
| Programador | `/planeacion/programador` | `schedulingApi` → `/api/production/scheduling/*` |
| Planta | `/planta` | `/api/planta/floor/*` (red interna, anónimo) |
| Reporte diario | `/reporte-diario` | `dailyProductionApi` |
| Almacén | `/compras/...` | `almacenApi` |

Redirects legacy (`/planeacion/panel`, `/produccion/planeacion`) → Programador.

## Checklist PR (arquitectura)

- [ ] ¿La lógica nueva está en Application/Infrastructure, no en el controlador?
- [ ] ¿Hay referencias cruzadas a Infrastructure de otro módulo?
- [ ] ¿Si hay integración entre módulos, el adaptador está en el Host?
- [ ] ¿Docs de usuario / rutas actualizadas si cambió la URL?
- [ ] ¿Hay test de reglas nuevas en `backend/tests` cuando aplica?

## Cómo completar la arquitectura (pasos)

Orden recomendado:

1. ~~Scheduling en Application + controlador sin DbContext.~~
2. ~~Tests de reglas de scheduling (`OpSchedulingServiceTests`).~~
8. ~~Audit / Users / Almacén con `MigrateAsync` (`InitialUsers`, `InitialAlmacen`).~~
4. ~~Documentar excepción Users/Budgets.~~
5. Adelgazar controladores gordos de Production (uno por PR):
   - ~~Cotizador / catalogs → `ICotizadorService`.~~
   - ~~Pedidos / OP (`IManufacturingOrderService`) y OT (`IProductionOrderService`).~~
   - ~~Design planner (`IDesignPlannerService`) / Internal chat (`IInternalChatService`).~~
   - ~~TechnicalSheets / CustomerOrders / Quotations.~~
   - ~~Gastos de área (rubros/proveedores) → `IAreaExpenseCatalogService`.~~
   - **Production.Api sin `ProductionDbContext` en controladores.**
6. ~~Lookup OP: tests de `IProductionOrderLookup` (`ProductionOrderLookupTests`) + smoke en Almacén.~~
7. ~~Users: `EnsureCreated` → `MigrateAsync` (migración `InitialUsers` idempotente).~~
8. ~~Almacén: SQL idempotente → `MigrateAsync` (`InitialAlmacen`).~~
9. **Particionar Production** solo cuando un subdominio (Cotizador / Design / Chat) cambie a menudo o choque en PRs; no partir "por estética".

Criterio de “arquitectura completa” en la práctica:

- Ningún controlador de Production/Almacén con `_context` directo.
- Integraciones entre módulos solo por puertos + Host.
- Tests verdes de scheduling (y lookup) en CI / local antes de merge.
- Migraciones unificadas con `MigrateAsync` en todos los DbContext del Host.

## Cómo probarlo

### Automatizado (obligatorio tras cambios de scheduling)

```bash
cd backend/tests/Perlax.Modules.Production.UnitTests
dotnet test
```

Cubre scheduling (bloques, cruces, urgencia, billing) y lookup OT/OP para Almacén (solo OP abiertas, filtro por término, límite).

### Manual — smoke Almacén (lookup)

1. Reiniciar `Perlax.Web`.
2. En Almacén (requisiciones / OC), buscar OT o OP abierta por número o cliente.
3. Confirmar que OP sin apertura o cerradas no aparecen; OT sí.

### Manual — smoke post-deploy / reinicio Host

1. Reiniciar `Perlax.Web` (para cargar DLLs nuevas).
2. Cotizador: calcular → guardar → listar; catálogos admin; convertir a OT borrador.
3. OP: pendientes de apertura → abrir → tablero de estado → cerrar.
4. OT: crear/editar, adjuntos, prioridad/diseñador, sugerencias de cliente.
5. Design planner: crear trabajo → prep técnica → actividades → aprobar/finalizar.
6. Chat interno: abrir desde OT → mensaje/adjunto → SignalR.
7. Programador + Planta.
8. Almacén: buscar OT/OP.

### Regresión rápida de capas

- Un endpoint nuevo de Production no debe inyectar `ProductionDbContext` en el controlador.
- Almacén no debe referenciar `Perlax.Modules.Production.Infrastructure` en el `.csproj`.

## Deuda conocida (orden de ataque)

1. ~~Documentar reglas (este archivo).~~
2. ~~Romper Almacén → Production.Infrastructure (`IProductionOrderLookup` en Host).~~
3. ~~Núcleo de lectura scheduling en Application (`IOpSchedulingService`: Gantt + schedule por máquina).~~
4. ~~Scheduling completo en Application (`IOpSchedulingService`: blocks, program, catálogo, turnos, roster, coverage, billing); `OpProcessSchedulingController` sin `DbContext`.~~
5. ~~Excepción “vertical slice” documentada para Users/Budgets.~~
6. Particionar Production (Cotizador / Design / Chat) cuando el tamaño lo justifique.
7. ~~Tests de reglas de scheduling.~~ ~~Tests del lookup OP (`ProductionOrderLookupTests`).~~
8. ~~Audit / Users / Almacén con `MigrateAsync` (`InitialUsers`, `InitialAlmacen`).~~
9. ~~Production.Api: controladores sin `DbContext`.~~
10. **Siguiente foco:** particionar Production solo si duele (Cotizador / Design / Chat). Captura de gastos / mantenimiento en frontend aún usa `localStorage` (fuera de esta capa).
