# Planeación y producción

**Menú:** Operaciones → Producción

## Para qué sirve

Coordina la **ejecución en planta** de los pedidos aprobados: apertura de órdenes de producción (OP), seguimiento de estado y panel de planeación.

## Pantallas operativas

| Entrada del menú | URL | Estado |
|------------------|-----|--------|
| Apertura | `/produccion/apertura` | **Operativo** |
| OP existente | `/produccion/op-existente` | **Operativo** — registrar OP legacy en BD |
| Estado de órdenes | `/produccion/estado-ordenes` | **Operativo** |

### Apertura de OP

Desde **Apertura** se listan los pedidos de cliente **aprobados** que aún no tienen fecha de apertura. Al confirmar:

1. Se asigna la **fecha de apertura**.
2. Se puede ajustar el **% recibo mercancía** (por defecto 10 %).
3. Se calcula la **cantidad a producir** = cantidad pedida × (1 + % recibo), redondeada hacia arriba.
4. La OP queda en estado **Abierta** y puede usarse en requisiciones de almacén.


### Registrar OP existente

URL: `/produccion/op-existente`

Sirve para **cargar en la base de datos** una OP que ya existía fuera del flujo normal (legacy / expertiS).

1. Subir **dos PDFs**: ficha técnica (FO PD 63) y orden de producción.
2. **Leer PDFs** extrae cliente, trabajo, cantidades, fechas, medidas, tintas, terminados, material y ruta de procesos (por posición en el PDF).
3. Revisar/corregir los campos en pantalla.
4. **Guardar** crea **una OP Abierta**, una OT con **una pieza por bloque `Pieza:`** del PDF, adjunta ambos PDFs y guarda los textos crudos en `OrderParts.LegacyImportJson` (botón **Textos** en Estado de órdenes). La OP aparece de inmediato en **Estado de órdenes** (badge **Existente**), que es el tablero de avance y cierre.
5. En el **programador**, al elegir la OP se sugieren los procesos **de cada pieza** (p. ej. Colaminado en Pieza Unica y en Micro Flauta E no se fusionan).

No reemplaza ni usa la asignación **Repetición** de OT (esa sigue siendo solo para trabajos nuevos basados en diseño).

### Estado de órdenes

Muestra todas las OP **ya abiertas** con:

- Cantidad objetivo vs. **producido** (suma de tiros en `/planta` con el mismo número OP).
- **% de avance** y estado calculado: Abierta, En producción, Terminada o Cerrada.
- Acción **Cerrar OP** cuando la orden deja de estar activa.

> El avance depende de que en planta se registre la OP con el mismo número (ej. `1234 51`).

### Formato del número OP

El número sigue el criterio expertiS: **4 dígitos del pedido + espacio + 2 últimos dígitos de la OT**.

Ejemplo: pedido `1234` y OT `OT-7851` → OP `1234 51`.

## Otras entradas del submenú

| Entrada | URL | Estado actual |
|---------|-----|---------------|
| Programador | `/planeacion/programador` | **Operativo** — ver [Programador de máquinas](programador-maquinas.md) |

### Programador (`/planeacion/programador`)

Guía completa (vistas Gantt/Lista/Roster, wizard, meta mes y API):

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