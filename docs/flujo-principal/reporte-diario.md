# Reporte diario

**Estado:** En produccion (integrado con API)
**Menu:** Operaciones -> Reporte Diario
**URL:** `/reporte-diario`

## Para que sirve?

Consolida la **operacion del dia**: tiempos, procesos, tiros y desperdicio por operario o maquina. Integra datos capturados en **Vista de planta** y permite **ingreso manual** de supervisores.

## Quien lo usa?

- Supervisores de produccion
- Planeacion
- Administradores con acceso al modulo

> Los **operarios** registran en `/planta`, no aqui.

## Vistas principales

| Vista | Uso |
|-------|-----|
| **Dashboard / KPIs** | Resumen del dia (procesos, horas, cantidad) |
| **Historial** | Consultar sesiones y actividades pasadas |
| **Ingreso manual** | Registrar o corregir actividades sin tablet |
| **Explorador** | Filtrar sesiones en vivo, pausadas o finalizadas |

## Explorador de sesiones

**Filtros:**

- Estado: Todas / En vivo / Pausadas / Finalizadas
- Fecha
- Busqueda por operario, maquina u OP

**Acciones:**

- Ver detalle de actividades (origen **PLANTA** o **MANUAL**)
- Exportar **Excel por operario** o **por maquina**

## Codigos de actividad (referencia)

Incluyen entre otros:

- Puesta a punto (01, 02 — requieren OP explicita)
- Produccion
- Reparacion, descanso, mantenimiento
- Falta de trabajo, tiempos muertos

Cada codigo puede tener **subcodigos**; algunos exigen observaciones.

## Flujo: ingreso manual

1. Seleccione perspectiva **operario** o **maquina**.
2. Agregue filas con codigo, horas, tiros, desperdicio, OP.
3. Guarde el lote.

Use manual solo cuando no hubo captura en planta o para correcciones autorizadas.

## Relacion con planta

| Origen | Donde se captura | Como se ve aqui |
|--------|------------------|-----------------|
| PLANTA | `/planta` | Badge PLANTA en actividades |
| MANUAL | Reporte diario | Badge MANUAL |

## Errores frecuentes

| Problema | Que revisar |
|----------|-------------|
| Sesion vacia | Operario no inicio en planta |
| OP faltante | Codigos 01/02 exigen OP |
| Excel vacio | Filtro de fecha o sin datos del dia |

## Siguiente lectura

- [Vista de planta](planta.md)
- [Planeacion y produccion](planeacion-produccion.md)
