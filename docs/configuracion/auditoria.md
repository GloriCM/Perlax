# Auditoria

**Estado:** En produccion
**Menu:** Configuracion -> Auditoria
**URL:** `/admin/auditoria`

## Para que sirve?

Consulta el **registro de eventos de seguridad**: inicios de sesion, intentos fallidos, bloqueos de cuenta y acciones sensibles.

## Quien lo usa?

Administradores y personal de TI / control interno.

## Que registra el sistema

- Login exitoso y fallido (con IP)
- Bloqueo por intentos fallidos (5 intentos, 20 minutos)
- Desactivacion / reactivacion de usuarios (segun implementacion)

## Como usar

1. Entre a **Auditoria**.
2. Filtre por fecha o usuario si esta disponible.
3. Revise detalle del evento.

## Buenas practicas

- Revise auditoria ante accesos sospechosos.
- Cruce con desactivacion de usuarios que ya no laboran.

## Siguiente lectura

- [Usuarios y permisos](usuarios.md)
- [Acceso al sistema](../introduccion/acceso-al-sistema.md)
