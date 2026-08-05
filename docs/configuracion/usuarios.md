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
| **Administrador** | Acceso total |
| **Administrativo** | Solo vistas marcadas en matriz |
| **Operario (planta)** | Solo `/planta` y reporte como operario |

### Permisos (Administrativo)

1. Elija **area**.
2. Pulse **Seleccion de modulos y vistas**.
3. Marque con **X** cada pantalla permitida.
4. **Sin ninguna X** = usuario solo ve pantalla de inicio.

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
