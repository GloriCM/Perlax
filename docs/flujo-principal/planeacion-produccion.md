# Planeación y producción

**Menú:** Operaciones → Producción

## Para qué sirve

Coordina la **ejecución en planta** de los pedidos aprobados: apertura de órdenes de producción (OP), seguimiento de estado y panel de planeación.

## Pantallas operativas

| Entrada del menú | URL | Estado |
|------------------|-----|--------|
| Apertura | `/produccion/apertura` | **Operativo** |
| Estado de órdenes | `/produccion/estado-ordenes` | **Operativo** |

### Apertura de OP

Desde **Apertura** se listan los pedidos de cliente **aprobados** que aún no tienen fecha de apertura. Al confirmar:

1. Se asigna la **fecha de apertura**.
2. Se puede ajustar el **% recibo mercancía** (por defecto 10 %).
3. Se calcula la **cantidad a producir** = cantidad pedida × (1 + % recibo), redondeada hacia arriba.
4. La OP queda en estado **Abierta** y puede usarse en requisiciones de almacén.

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
| Panel planeación | `/produccion/planeacion` | En desarrollo |

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
- [Vista de planta](planta.md)
- [Reporte diario](reporte-diario.md)