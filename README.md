# Perlax ERP

Sistema Unificado de Producción y Gestión Empresarial.

## Estructura del Proyecto

El proyecto está dividido en dos grandes carpetas:

- **`backend/`**: Implementado con .NET 9 siguiendo una arquitectura de Monolito Modular y Clean Architecture.
- **`frontend/`**: Implementado con React 19, Vite y Mantine UI para una experiencia de usuario premium y fluida.

---

## Cómo empezar

### Backend
1. Navega a `backend/`.
2. Para un inicio rápido, simplemente ejecuta el script de PowerShell:
   ```powershell
   .\start-backend.ps1
   ```
   *Este script se encarga de la compilación y ejecución automática del host.*

### Frontend
1. Navega a `frontend/`.
2. Ejecuta `npm install` (si es la primera vez).
3. Ejecuta `npm run dev`.

---

## Mejoras Recientes
- 🔐 **Seguridad**: Implementación de hashing de contraseñas con BCrypt.
- 📂 **Navegación**: Menús laterales anidados y colapsables con Mantine UI.
- 📋 **Auditoría**: Registro detallado de Login y Logout en PostgreSQL.
- 🚀 **Developer Experience**: Scripts de inicio simplificados.
