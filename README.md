# Perlax ERP 💎

Sistema Unificado de Producción y Gestión Empresarial de última generación, diseñado con una estética premium y una arquitectura robusta y escalable.

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

### 📝 Ordenes de Trabajo (OT)
- **Nueva OT**: 
  - Formulario de 2 pasos con validaciones en tiempo real.
  - Selección de Clase y Línea de diseño con verificación automática de existencia.
  - Gestión técnica de materiales, tintas, troqueles y procesos de fabricación.
- **Lista General de OT**:
  - Tabla avanzada con búsqueda global dinámica.
  - **Lógica de Aprobación**: Sistema inteligente que bloquea la edición si la orden ya ha sido aprobada.
- **Planes de Diseño**:
  - Vista especializada para seguimiento de bocetos, artes y muestras.
  - **Modal de Detalle Experto**: Vista de alta fidelidad que replica el sistema legado para visualización técnica rápida con soporte para scroll y adjuntos.

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
- **Fecha**: 2026-02-27
- **Fase**: Finalización de la migración del módulo de Ordenes de Trabajo.
- **Estado**: ✅ Funcional y Desplegado en entorno de desarrollo.
