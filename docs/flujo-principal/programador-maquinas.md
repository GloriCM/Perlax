# Programador de máquinas (Planeación)

**Estado:** En producción
**Menú:** Operaciones → Producción → Programador
**URL:** https://perlax.perla.work/planeacion/programador  
**Ruta interna:** `/planeacion/programador`

## Para qué sirve?

En **Perla (Perlax)** planifica la ejecución de **órdenes de producción (OP)** sobre el parque de máquinas: diagrama **Gantt** por procesos, lista de OPs programadas, **roster** (horarios, cobertura, turnos) y **meta de facturación** del mes.

Flujo típico dentro del ERP:

```
OP Abierta (/produccion/apertura o OP existente)
        →
Programar en /planeacion/programador
        →
Operario consulta en /planta
        →
Avance en Estado de órdenes / Reporte diario
```

## Cómo llegar

| Acceso | Dirección |
|--------|-----------|
| ERP (login) | https://perlax.perla.work |
| Programador | https://perlax.perla.work/planeacion/programador |
| Vista de planta | https://perlax.perla.work/planta (red de fábrica) |

Otras rutas antiguas del menú (`/planeacion/panel`, `/produccion/planeacion`) redirigen al programador.

## Quién lo usa?

| Rol | Uso |
|-----|-----|
| Jefe / planeación de producción | Programar OPs, mover barras, meta mes, procesos |
| Supervisión | Consultar carga, roster y cobertura |
| Operario | No usa esta pantalla; ve la programación del día en `/planta` |

## Vistas principales

| Vista / acción | Función |
|----------------|---------|
| **Gantt** | Filas = procesos productivos; columnas = tiempo (Mes / Semana / Día). Arrastrar y redimensionar bloques. |
| **Lista** | OPs programadas con detalle expandible por proceso |
| **Roster** | Pestañas: **Grilla**, **Horarios**, **Cobertura**, **Turnos**, **Novedades** |
| **Programar OP** | Wizard de 3 pasos |
| **Procesos** | Catálogo de filas del Gantt (agregar, editar, ordenar, eliminar) |
| **Meta mes** | Meta de facturación mensual y fila FACTURADO en el Gantt |
| **Capacitación / Limpieza** | Bloques auxiliares (botón o arrastre a una fila) |

### Zoom y navegación del Gantt

- **Mes / Semana / Día**
- Cabecera con semanas **S1–S6**, días L–D y línea del día actual
- Clic en semana o día del encabezado cambia la vista
- Chips S1–S6 para saltar de semana
- Controles ◀ / ▶ y búsqueda / filtro de estado

### Roster (detalle)

| Pestaña | Contenido |
|---------|-----------|
| **Grilla** | Horarios semanales por trabajador (máquina o proceso/categoría) |
| **Horarios** | Catálogo de turnos de planta (ej. 7 am–1 pm, 7 am–4:30 pm) |
| **Cobertura** | Grid máquina × día × turno con asignación Op/Ax |
| **Turnos** | Turnos habilitados por máquina |
| **Novedades** | Incapacidades / faltas (según versión del módulo) |

## Wizard: Programar OP (3 pasos)

1. **Datos OP** — elegir OP abierta, datos comerciales / prefill, opción urgencia.
2. **Cálculo / procesos sugeridos** — se proponen procesos **por pieza** de la OP (no se fusionan piezas distintas con el mismo proceso).
3. **Fechas y máquinas** — asignar máquina y ventana temporal por proceso; guardar programa.

Validaciones relevantes:

- No solapar bloques en la misma máquina / fila de proceso.
- Evitar reprogramar la misma OP (salvo reglas de urgencia / auxiliares).

### Edición en Gantt

- **Arrastrar** barra → mueve fechas
- **Bordes** → redimensiona duración
- Clic / menú contextual → editar o eliminar
- Bloques de tipo **Op**, **Capacitación**, **Limpieza**

### Urgencias y auxiliares

- **Urgencia:** trabajo prioritario que puede reacomodar otras barras del Gantt.
- **Capacitación / Limpieza:** actividades que ocupan máquina o fila de proceso sin ser una OP de producción normal.

## Meta de facturación

- Configurar **meta del mes** (dividida por semanas en la UI).
- En el pie del Gantt aparece la fila **FACTURADO** (generado, meta, total, diferencia).

## Relación con planta y avance

- La programación del programador alimenta lo que el operario ve en **Vista de planta** (`/planta`) al elegir máquina (y turno / contexto del día).
- El avance real (tiros, tiempos de proceso) se registra en planta y se refleja en **Estado de órdenes** y **Reporte diario**.
- Si la producción termina antes o después de lo planeado, el tablero de planeación y el seguimiento operativo se actualizan según los datos capturados en el ERP.

## Buenas prácticas

1. Solo programar OPs **abiertas** (flujo Apertura / OP existente en Perla).
2. Revisar cruces de máquina antes de confirmar.
3. Mantener el catálogo de **procesos** alineado con las máquinas del cotizador / planta.
4. Actualizar **roster** y turnos para que planta reciba la asignación correcta.
5. Usar **meta mes** si el tablero de facturación del Gantt debe guiar la carga semanal.

## Siguiente lectura

- [Planeación y producción](planeacion-produccion.md)
- [Vista de planta](planta.md)
- [Reporte diario](reporte-diario.md)
- [Acceso al sistema](../introduccion/acceso-al-sistema.md)
