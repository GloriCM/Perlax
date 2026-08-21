# Vista de planta

**Estado:** En producción  
**URL:** https://perlax.perla.work/planta (solo red de la fábrica)  
**Login ERP:** No requerido

## ¿Para qué sirve?

Pantalla de **captura en piso** para operarios: registrar máquina, operario, turno, actividades de producción, tiros y desperdicio. Los datos alimentan el **Reporte diario** y los indicadores de producción.

## ¿Quién lo usa?

- **Operarios** creados en Configuración → Usuarios con rol **Operario (planta)**
- Supervisores en planta con tablet o PC en la red de la fábrica

No está en el menú lateral del ERP; se accede **directo por URL** o favorito en el navegador del piso.

## Acceso

| Desde | Resultado |
|-------|-----------|
| Red WiFi / LAN de la fábrica | Pantalla de captura normal |
| Internet externo (4G, casa) | Acceso denegado |

> La restricción es por **red de la empresa**, no por usuario/contraseña.

## Antes de empezar (administrador)

1. Crear usuarios **Operario (planta)** en Configuración → Usuarios.
2. Verificar que existan **máquinas** y **códigos de actividad** en catálogos de producción.
3. Entregar a cada tablet la URL: `https://perlax.perla.work/planta`

## Pantalla principal

### Panel izquierdo (sidebar)

| Campo | Descripción |
|-------|-------------|
| **Máquina** | Equipo donde se trabaja |
| **Operario** | Lista de operarios activos (rol Operario) |
| **Turno** | Turno 1, 2 o 3 |
| **OP** | Orden de producción; obligatoria en actividades 01 y 02 |

Si no hay operarios en la lista, créelos en Configuración → Usuarios con rol Operario.

### Banner superior

- **Temporizador** de la actividad en curso
- Botones **Play** (iniciar/reanudar), **Pausa**, **Stop** (finalizar sesión o actividad)

### Actividades (códigos)

Seleccione el código de actividad (preparación, producción, mantenimiento, etc.). Algunos códigos abren **subcódigos**; los marcados como "Otro" pueden exigir **observaciones**.

### Registro de producción

- **Tiros:** cantidad producida en la actividad actual
- **Desperdicio:** motivo y cantidad (materiales perdidos)

### Historial del día

Lista de actividades registradas en la sesión con hora, duración, tiros y desperdicio.

## Flujo típico de un turno

1. Abrir `/planta` desde la red de la fábrica.
2. Elegir **máquina**, **operario** y **turno**.
3. Pulsar **Play** para iniciar sesión (si no hay una activa del día).
4. Seleccionar **código de actividad** → iniciar actividad.
5. Registrar **tiros** durante la actividad.
6. Agregar **desperdicio** si aplica.
7. Cambiar de actividad o **Pausa** en descansos.
8. Al terminar el turno, **Stop** para cerrar.

## OP (orden de producción)

- Actividades **01** y **02:** debe ingresar el número de OP manualmente.
- Otras actividades: el sistema usa un OP por defecto automáticamente.

## Pausa y reanudación

- **Pausa:** detiene el temporizador sin cerrar la sesión.
- **Play** de nuevo: reanuda la misma sesión del día (misma máquina + operario).

## Relación con Reporte diario

Las sesiones capturadas en planta aparecen en **Operaciones → Reporte diario** con origen **PLANTA**. Allí supervisión puede revisar, complementar o exportar.

## Errores frecuentes

| Mensaje / situación | Causa | Qué hacer |
|---------------------|-------|-----------|
| Acceso denegado | Fuera de red de fábrica | Conectar WiFi de planta |
| Verificando acceso de red… | Comprobando permisos | Esperar unos segundos |
| No hay operarios | Sin usuarios rol Operario | Crearlos en Configuración |
| Vista desactivada | Build sin módulo planta | Contacte TI |
| Catálogos vacíos | API o datos maestros | Verificar máquinas/actividades |

## Buenas prácticas

- Dejar el tablet en la URL `/planta` como favorito.
- Cerrar sesión de actividad con **Stop** al cambio de turno.
- Registrar desperdicio con el motivo correcto para cuadro master e indicadores.

## Siguiente lectura

- [Roles del sistema](../roles-del-sistema.md)
- [Reporte diario](reporte-diario.md)
- [Acceso al sistema](../introduccion/acceso-al-sistema.md)
