# Usuarios y permisos

**Estado:** En produccion
**Menu:** Configuracion -> Usuarios
**URL:** `/configuracion/usuarios`

## Para que sirve?

Crear y administrar cuentas: roles, areas, vistas permitidas y estado activo/inactivo.

## Quien lo usa?

Solo usuarios con rol **Administrador**.

## Listado de usuarios

Columnas: Nombre, Login, Correo, Rol, Estado, Area, Permisos.

| Accion | Descripcion |
|--------|-------------|
| Editar | Modificar datos y permisos |
| Desactivar / Reactivar | Bloquea login sin borrar historial |
| Nuevo usuario | Alta completa |

## Crear usuario

### Datos basicos

- Nombre, apellido, documento
- Usuario (login), correo, contrasena
- Area (administrativos), salario si aplica

### Rol

| Rol | Comportamiento |
|-----|----------------|
| **Administrador** | Acceso total. **Sin horas extras.** |
| **Administrativo** | Solo vistas marcadas en matriz |
| **Operario (planta)** | Solo `/planta`. Extras en Producción |
| **Auxiliar** | Personal de producción. No aparece en `/planta`. Extras en Producción |
| **Almacén** | Personal de Planeación. Extras en Gastos de Planeación |
| **Taller** | Personal de Talleres. Puede tener **vistas** ERP. Con vistas: chat. Extras en Talleres |

### Permisos (Administrativo y Taller)

1. **Administrativo:** elija **área** (incluye **Financiero**; no hay área Contabilidad aparte).
2. **Taller:** área fija Talleres; opcionalmente asigne vistas.
3. Pulse **Seleccion de modulos y vistas**.
4. Marque con **X** cada pantalla permitida.
5. **Sin ninguna X** = usuario solo ve pantalla de inicio.
6. **Taller con al menos una vista** también puede usar el **chat interno** (p. ej. con el líder administrativo de talleres).

## Operarios de planta

Rol **Operario (planta)**:

- Aparecen en selector de `/planta`
- Aparecen en Reporte diario
- **No** acceden al menu ERP

## Desactivar vs eliminar

**Desactivar** usuarios que dejan la empresa. El historial se conserva. **Reactive** si regresan.

No elimine usuarios salvo error de alta.

## Restablecer contrasena

Al editar, deje contrasena vacia para no cambiarla, o ingrese nueva (usuario debera cambiarla al entrar si asi lo configuran).

## Siguiente lectura

- [Roles del sistema](../roles-del-sistema.md)
- [Vista de planta](../flujo-principal/planta.md)
