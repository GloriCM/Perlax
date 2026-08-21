# Roles del sistema

PerlaX define roles de **oficina** y de **personal** (horas extras). Los **Administradores no tienen horas extras**.

## Roles de oficina

| Rol | Acceso al ERP | Horas extras |
|-----|---------------|--------------|
| **Administrador** | Completo | **No** |
| **Administrativo** | Vistas autorizadas + área | Sí (según su área) |

## Roles de personal (horas extras)

Se crean en **Configuración → Usuarios**. No usan la matriz de módulos.

| Rol | Quién lo gestiona | /planta | Horas extras van a |
|-----|-------------------|---------|--------------------|
| **Operario (planta)** | Producción → Control de Personal | **Sí** (único rol seleccionable) | Gastos de **Producción** |
| **Auxiliar** | Producción → Control de Personal | No | Gastos de **Producción** |
| **Almacén** | Planeación → Personal | No | Gastos de **Planeación** |
| **Taller** | Talleres → Personal | No | Gastos de **Talleres** |

## Operario vs auxiliar

- En **/planta** solo aparecen usuarios con rol **Operario**.
- Los **auxiliares** son personal de producción para salarios y horas extras, no para el selector de planta.

## Administrador

- Acceso total.
- No registra horas extras.

## Administrativo

- Área obligatoria y **vistas permitidas**.
- Si no tiene vistas, solo ve el inicio.

## Personal de almacén, operarios, auxiliares y talleres

- Login = cédula (igual que el resto).
- No acceden al menú ERP.
- Salario y cédula sirven para el cálculo de extras en el área indicada.

## Usuarios inactivos

Un usuario **desactivado** no puede iniciar sesión. El historial se conserva.

## Siguiente lectura

- [Usuarios y permisos](../configuracion/usuarios.md)
- [Vista de planta](../flujo-principal/planta.md)
