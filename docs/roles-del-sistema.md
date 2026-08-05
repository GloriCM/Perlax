# Roles del sistema

PerlaX define tres roles principales al crear usuarios en **Configuración → Usuarios**.

## Roles disponibles

| Rol | Acceso al ERP | Vista de planta | Reporte diario |
|-----|---------------|-----------------|----------------|
| **Administrador** | Completo (todo el menú) | Sí (como cualquier usuario con URL) | Sí |
| **Administrativo** | Solo vistas autorizadas | Según permisos | Según permisos |
| **Operario (planta)** | No (sin módulos administrativos) | Sí, como operario en `/planta` | Aparece como operario |

## Administrador

- Acceso total al sistema.
- Gestiona usuarios, auditoría y configuración.
- No necesita matriz de vistas.

## Administrativo

- Debe tener un **área** asignada (Diseño, Producción, Compras, etc.).
- El administrador elige **vistas permitidas** con la matriz de módulos.
- Si **no tiene ninguna vista marcada**, solo verá la pantalla de inicio al entrar.
- Puede tener acceso a uno o varios módulos según su trabajo.

### Ejemplos de permisos mostrados en la tabla de usuarios

| Texto en columna Permisos | Significado |
|---------------------------|-------------|
| Completo | Administrador |
| Completo (sin lista) | Acceso amplio sin restricción de rutas |
| 3 vista(s) | Administrativo con 3 pantallas autorizadas |
| Solo inicio | Administrativo sin vistas marcadas |
| Planta (/planta) | Operario |
| Desactivado | Usuario inactivo; no puede entrar |

## Operario (planta)

- Creado en **Configuración → Usuarios** con rol **Operario (planta)**.
- Aparece automáticamente en el selector de operarios de **Vista de planta** y en **Reporte diario**.
- **No** accede al menú del ERP (cotizador, compras, etc.).
- Trabaja en https://perlax.perla.work/planta desde la red de la fábrica.

## Usuarios inactivos

Un usuario **desactivado** no puede iniciar sesión. El historial se conserva. Un administrador puede **reactivarlo** cuando vuelva a la empresa.

## Contraseña provisional

Si el administrador restablece la contraseña, el usuario deberá cambiarla al ingresar.

## Siguiente lectura

- [Usuarios y permisos](../configuracion/usuarios.md)
- [Vista de planta](../flujo-principal/planta.md)
