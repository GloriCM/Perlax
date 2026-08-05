# Acceso al sistema

## URL de acceso

| Uso | URL | ¿Requiere login? |
|-----|-----|------------------|
| ERP completo | https://perlax.perla.work | Sí |
| Login directo | https://perlax.perla.work/login | Sí |
| Vista de planta (piso) | https://perlax.perla.work/planta | No (solo red de fábrica) |

## Iniciar sesión

1. Abra https://perlax.perla.work/login
2. Ingrese **usuario** y **contraseña** entregados por el administrador
3. Tras el login verá el **Dashboard** o la pantalla de inicio según sus permisos

## Cierre de sesión por inactividad

Si no hay actividad durante **15 minutos**, la sesión se cierra automáticamente y debe volver a iniciar sesión.

## Bloqueo por intentos fallidos

Tras **5 intentos fallidos** consecutivos, la cuenta se bloquea **20 minutos**. Si olvidó la contraseña, contacte al administrador.

## No veo un módulo en el menú

Revise [Roles del sistema](../roles-del-sistema.md). Los usuarios **Administrativos** solo ven las vistas que el administrador marcó en la matriz de permisos.

## Vista de planta (operarios)

Los operarios de piso **no entran por login** del ERP. Usan la URL `/planta` desde un tablet en la red de la fábrica. Esa pantalla solo funciona **dentro de la red de la empresa**, no desde internet externo.

## Siguiente lectura

- [Roles del sistema](../roles-del-sistema.md)
- [Vista de planta](../flujo-principal/planta.md)
