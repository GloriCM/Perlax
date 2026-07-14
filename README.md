# Perla ERP 💎

Sistema unificado de producción y gestión empresarial (Perla), con arquitectura modular y frontend React.

## Seguridad

### Protección contra fuerza bruta (Account Lockout)
- Seguimiento de intentos fallidos de inicio de sesión.
- Tras **5** intentos fallidos consecutivos, la cuenta se bloquea por **20 minutos**.
- Los bloqueos/desbloqueos se registran en auditoría (con IP).

### Protección contra inyección SQL
- Acceso a datos con **Entity Framework Core (LINQ)** sobre **PostgreSQL**. Las entradas de usuario se tratan como datos, no como SQL ejecutable.

### Sesión e inactividad
- Rutas protegidas: sin sesión válida se redirige al login.
- Cierre automático tras inactividad del usuario (política de sesión JWT / frontend).

## Arquitectura

### Backend (.NET 9)
- Monolito modular (Dominio, Aplicación, Infraestructura, API).
- PostgreSQL como base de datos.
- Hashing de contraseñas con BCrypt; auditoría persistente.
- JWT para autenticación.
- SignalR para chat interno en tiempo real.
- Host HTTP en `0.0.0.0:5262` (red local) y HTTPS en `5263` (certificado local).

### Frontend (React 19 + Vite 7)
- **Mantine UI** + Tabler Icons.
- React Router, Framer Motion.
- SignalR client (chat).
- Sidebar multinivel según permisos / rutas permitidas.

---

## Módulos principales

### Usuarios y seguridad
- Login/logout con persistencia en `localStorage`.
- Auditoría de accesos.
- Administración de usuarios y políticas de rutas permitidas.

### Cotizador
- Wizard de cotización y cotizaciones guardadas.
- Catálogos configurables (materiales, máquinas, factores, etc.) desde ajustes / backend.

### Órdenes, fichas y pedidos
- Órdenes de trabajo (nueva OT, listado, planes de diseño).
- Fichas técnicas (listado + plantilla de impresión).
- Pedidos (alta e informe).

### Producción y planeación
- Apertura / estado de órdenes, panel de planeación.
- Cuadros de gastos (captura, gráficas, rubros, cotizaciones, proveedores).
- Control de personal (horas extra, recargos, salarios).

### Diseño
- Cuadro de gastos de diseño.
- **Planeador de Diseño**: cola de trabajos, filtros, KPIs, seguimiento de aprobación/entregas.

### Chat interno
- Conversaciones en tiempo real (SignalR) con adjuntos.

### Mantenimiento de maquinaria
- Hojas de vida, cronogramas, tickets de daño, mantenimientos.
- Gastos e inventario de mantenimiento.

### Otros módulos de operación / control
- Compras & almacén, remisiones, facturación, inventario PT.
- Calidad, cuadro master, SST, talleres, gestión humana, presupuestos por área.

> Varias pantallas del menú coexisten como UI migrada / operativa; la profundidad de integración API varía por módulo.

---

## Cómo empezar

### Requisitos
- .NET SDK 9
- Node.js 20+ (recomendado)
- PostgreSQL
- (Opcional) certificado `certs/perla.pfx` para HTTPS en desarrollo

### Backend
1. Copia la configuración local de secretos:
   ```powershell
   cd backend\src\Host\Perlax.Web
   copy appsettings.Development.example.json appsettings.Development.local.json
   ```
   Edita `appsettings.Development.local.json` con connection strings, JWT y contraseña de seed admin. **No** subas ese archivo a git.
2. Desde `backend/`:
   ```powershell
   .\start-backend.ps1
   ```
   El script reinicia el host si se cae. Endpoints típicos:
   - HTTP: `http://localhost:5262`
   - HTTPS: `https://localhost:5263`

### Frontend
1. Copia variables de entorno:
   ```powershell
   cd frontend
   copy .env.example .env.local
   ```
   Ajusta `VITE_API_BASE_URL` / certificado según tu entorno (ver comentarios en `.env.example`).
2. Instala y arranca:
   ```powershell
   npm install
   npm run dev
   ```
   Vite suele servir en `https://localhost:5173`.

---

## Notas de repositorio
- Secretos y certificados están en `.gitignore` (`.env*`, `*.pfx`, `appsettings.*.local.json`).
- Uploads de servidor: `wwwroot/uploads/` (solo se versiona `.gitkeep`).

---

## Última actualización
- **Fecha**: 2026-07-14
- **Fase**: Cotizador, chat interno (SignalR), planeador de diseño, mantenimiento de maquinaria y ampliación de módulos de operación/control.
- **Estado**: Funcional en desarrollo local (`main`).
