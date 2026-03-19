# Perla ERP 💎

Sistema Unificado de Producción y Gestión Empresarial de última generación, diseñado con una estética premium y una arquitectura robusta y escalable.

## 🛡️ Seguridad Avanzada

El sistema cuenta con múltiples capas de protección para garantizar la integridad de los datos y la privacidad:

### 🔒 Protección contra Fuerza Bruta (Account Lockout)
- **Control de Intentos**: El sistema realiza un seguimiento de los intentos fallidos de inicio de sesión.
- **Bloqueo Automático**: Tras 5 intentos fallidos consecutivos, la cuenta se bloquea automáticamente por un periodo de **20 minutos**.
- **Auditoría**: Todos los intentos de bloqueo y desbloqueo se registran en el sistema de auditoría con la IP del atacante.

### 🛡️ Protección contra Inyección SQL
- **Consultas Parametrizadas**: El sistema utiliza **Entity Framework Core (LINQ)** para todas las comunicaciones con la base de datos PostgreSQL. Esto garantiza que todas las entradas del usuario se traten como datos y no como comandos ejecutables, haciendo al sistema invulnerable a ataques por inyección SQL.

### ⏱️ Control de Sesión e Inactividad
- **Protección de Rutas**: Ninguna parte del sistema es accesible sin una sesión válida. Usuarios no autorizados son redirigidos al Login.
- **Auto-Logout**: Por seguridad, la sesión se cierra automáticamente tras **15 minutos** de inactividad del usuario.

## 🚀 Arquitectura de Software

El proyecto sigue estándares industriales modernos para garantizar mantenibilidad y rendimiento:

### ⚙️ Backend (.NET 9)
- **Monolito Modular**: Los módulos están físicamente separados para evitar el código espagueti.
- **Clean Architecture**: Capas separadas de Dominio, Aplicación, Infraestructura y API.
- **PostgreSQL 16**: Base de datos relacional para alta disponibilidad y integridad.
- **Seguridad**: Hashing de contraseñas con BCrypt.Net-Next y auditoría persistente.
- **Acceso Remoto**: Configurado para acceso multi-PC en red local vinculando a `0.0.0.0:5262`.

### 🎨 Frontend (React 19 + Vite)
- **Mantine UI**: Framework de componentes para una interfaz coherente y elegante.
- **Glassmorphism**: Estética moderna con fondos translúcidos y desenfoques (Backdrop Filters).
- **Framer Motion**: Animaciones fluidas para transiciones y menús.
- **Navegación Dinámica**: Sidebar multinivel colapsable y auto-generado.

---

## 🛠️ Módulos Implementados

### 📂 Gestión de Usuarios y Seguridad
- **Login/Logout**: Autenticación persistente con gestión de estado en `localStorage`.
- **Auditoría**: Cada login y logout se registra automáticamente en el sistema de auditoría.
- **Roles**: Soporte inicial para roles de "Super Administrador" y "Usuario".

### 📦 Compras & Almacén
- **Requisición**: Migración completa de la vista de requerimientos con tablas avanzadas, cálculo automático de totales acumulados y diseño responsivo.

### 📄 Fichas Técnicas
- **Listado General**: Tabla interactiva con búsqueda global y filtrado por estado de aprobación.
- **Plantilla de Impresión**: Generación de documentos de alta fidelidad para impresión física, omitiendo automáticamente elementos de la interfaz.

### 💰 Control de Gastos (Multimódulo)
- **Producción**: Gestión completa de captura de gastos, rubros, cotizaciones y proveedores.
- **Gestión Humana**: Implementación de vista de "Tipos de Servicio" especializada para recursos humanos.
- **Planeación**: 
  - Cuadro de gastos completo migrado.
  - **Personal de Almacén**: Vista especializada para la gestión de horas extra y registros de personal de planta.

---

## 🏁 Cómo empezar

### Backend
1. Navega a `backend/`.
2. Para un inicio rápido, simplemente ejecuta el script de PowerShell:
   ```powershell
   .\start-backend.ps1
   ```
   *Este script se encarga de la compilación y ejecución automática del host.*

### Frontend
1. Navega a `frontend/`.
2. Ejecuta `npm install`.
3. Ejecuta `npm run dev`.

---

## 📅 Última Actualización
- **Fecha**: 2026-03-10
- **Fase**: Finalización de la migración de vistas de Gastos y Fichas Técnicas. Preparación de migración de datos.
- **Estado**: ✅ Funcional y Pushed a GitHub (`main`).
