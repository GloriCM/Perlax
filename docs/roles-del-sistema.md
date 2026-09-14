# Roles del sistema

PerlaX define roles de **oficina** y de **personal** (horas extras). Los **Administradores no tienen horas extras**.

## Roles de oficina

| Rol | Acceso al ERP | Horas extras |
|-----|---------------|--------------|
| **Administrador** | Completo | **No** |
| **Administrativo** | Vistas autorizadas + área (incluye Contabilidad) | Sí (según su área) |

## Roles de personal (horas extras)

Se crean en **Configuración → Usuarios**.

| Rol | Quién lo gestiona | /planta | Matriz de vistas | Horas extras van a |
|-----|-------------------|---------|------------------|--------------------|
| **Operario (planta)** | Producción → Control de Personal | **Sí** (único rol seleccionable) | No | Gastos de **Producción** |
| **Auxiliar** | Producción → Control de Personal | No | No | Gastos de **Producción** |
| **Almacén** | Planeación → Personal | No | No | Gastos de **Planeación** |
| **Taller** | Talleres → Personal | No | **Sí** (opcional) | Gastos de **Talleres** |

## Operario vs auxiliar

- En **/planta** solo aparecen usuarios con rol **Operario**.
- Los **auxiliares** son personal de producción para salarios y horas extras, no para el selector de planta.

## Administrador

- Acceso total.
- No registra horas extras.

## Administrativo

- Área obligatoria (incluye **Contabilidad**) y **vistas permitidas**.
- Si no tiene vistas, solo ve el inicio.
- Acceso al chat interno.

## Personal de almacén, operarios y auxiliares

- Login = cédula (igual que el resto).
- No acceden al menú ERP ni al chat.
- Salario y cédula sirven para el cálculo de extras en el área indicada.

## Taller

- Área fija **Talleres**; horas extras en Talleres.
- Puede recibir **vistas** del ERP (misma matriz que Administrativo).
- **Con al menos una vista:** menú según matriz + **chat interno** (p. ej. con el líder administrativo de talleres).
- **Sin vistas:** solo inicio, sin chat.

## Usuarios inactivos

Un usuario **desactivado** no puede iniciar sesión. El historial se conserva.

## Siguiente lectura

- [Usuarios y permisos](../configuracion/usuarios.md)
- [Vista de planta](../flujo-principal/planta.md)
- [Chat interno](../operaciones-apoyo/chat-interno.md)
