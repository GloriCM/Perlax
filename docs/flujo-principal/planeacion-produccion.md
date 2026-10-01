# Planeación y producción

**Menú:** Operaciones → Producción

## Para qué sirve

Coordina la **ejecución en planta** de los pedidos aprobados: apertura de órdenes de producción (OP), seguimiento de estado y panel de planeación.

## Pantallas operativas

| Entrada del menú | URL | Estado |
|------------------|-----|--------|
| Apertura | `/produccion/apertura` | **Operativo** |
| OP existente | `/produccion/op-existente` | **Operativo** — cargar una OP a partir de sus PDF |
| Estado de órdenes | `/produccion/estado-ordenes` | **Operativo** |

### Apertura de OP

Desde **Apertura** se listan los pedidos de cliente **aprobados** que aún no tienen fecha de apertura. Al confirmar:

1. Se asigna la **fecha de apertura**.
2. Se puede ajustar el **% recibo mercancía** (por defecto 10 %).
3. Se calcula la **cantidad a producir** = cantidad pedida × (1 + % recibo), redondeada hacia arriba.
4. La OP queda en estado **Abierta** y puede usarse en requisiciones de almacén.


### Registrar OP existente

URL: `/produccion/op-existente`

Sirve para **registrar en Perla** una orden de producción que ya tiene ficha y orden en PDF.

1. Subir **dos PDF**: la ficha técnica y la orden de producción.
2. **Leer PDFs** trae cliente, trabajo, cantidades, fechas, medidas, tintas, terminados, material y la ruta de procesos.
3. Revise y corrija los campos en pantalla.
4. **Guardar** crea una OP **Abierta** y una OT con una pieza por cada bloque de pieza del PDF. Los dos PDF quedan adjuntos. En **Estado de órdenes** la OP aparece con la marca **Existente**; el botón **Textos** muestra lo leído del PDF.
5. En el **programador**, al elegir esa OP se sugieren los procesos de cada pieza por separado.

No reemplaza ni usa la asignación **Repetición** de OT (esa sigue siendo solo para trabajos nuevos basados en diseño).

### Estado de órdenes

Muestra todas las OP **ya abiertas** con:

- Cantidad objetivo vs. **producido** (suma de tiros en `/planta` con el mismo número OP).
- **% de avance** y estado calculado: Abierta, En producción, Terminada o Cerrada.
- Acción **Cerrar OP** cuando la orden deja de estar activa.

> El avance depende de que en planta se registre la OP con el mismo número (ej. `1234 51`).

### Formato del número OP

El número de OP en Perla junta **4 dígitos del pedido**, un espacio y los **2 últimos dígitos de la OT**.

Ejemplo: pedido `1234` y OT `OT-7851` → OP `1234 51`.

## Otras entradas del submenú

| Entrada | URL | Estado actual |
|---------|-----|---------------|
| Programador | `/planeacion/programador` | **Operativo** — ver [Programador de máquinas](programador-maquinas.md) |

### Programador (`/planeacion/programador`)

Guía completa (vistas Gantt, lista, roster, programación y meta del mes):

→ **[Programador de máquinas](programador-maquinas.md)**

Resumen: Gantt Mes/Semana/Día con arrastre; Lista; Roster (Grilla, Horarios, Cobertura, Turnos); wizard Programar OP; bloques Capacitación/Limpieza; meta de facturación; URL https://perlax.perla.work/planeacion/programador

> Otras rutas del menú (`/planeacion/panel`, `/produccion/planeacion`) redirigen al programador.

Flujo recomendado: OP abierta en Apertura → Programar OP en planeación → operario consulta en `/planta`.

## Flujo operativo recomendado

```
OT + ficha aprobada
        |
        v
Pedido de cliente (con OC) → Aprobación con PV unitario
        |
        v
Apertura (/produccion/apertura) → OP Abierta
        |
        +--> Requisición almacén (buscar OP abierta)
        |
        v
Operario registra en /planta (máquina, actividad, tiros)
        |
        v
Estado de órdenes (/produccion/estado-ordenes) → avance y cierre
        |
        v
Supervisor revisa /reporte-diario
```

## Pantallas complementarias

| Pantalla | URL | Manual |
|----------|-----|--------|
| Vista de planta | `/planta` | [Vista de planta](planta.md) |
| Reporte diario | `/reporte-diario` | [Reporte diario](reporte-diario.md) |
| Pedidos cliente | `/pedidos/informe` | [Pedidos de cliente](pedidos-cliente.md) |

## Planeación — gastos y personal

En **Administración → Planeación** existen módulos de **gastos** y **personal** almacén. Ver [Gastos — Planeación](../gastos-por-area/planeacion.md).

## Quién lo usa

| Rol | Herramienta |
|-----|-------------|
| Comercial / pedidos | Pedidos cliente + aprobación |
| Jefe producción | Apertura + estado de órdenes + reporte diario |
| Almacén | Requisiciones con OP abierta |
| Operario | `/planta` |
| Supervisor | Reporte diario + estado de órdenes |

## Siguiente lectura

- [Pedidos de cliente](pedidos-cliente.md)
- [Programador de máquinas](programador-maquinas.md)
- [Vista de planta](planta.md)
- [Reporte diario](reporte-diario.md)