# Planeacion y produccion

**Menu:** Operaciones -> Produccion

## Para que sirve?

Coordina la **ejecucion en planta** de los pedidos aprobados: apertura de ordenes, seguimiento de estado y panel de planeacion.

## Importante — menu vs pantallas reales

Algunas entradas del submenu aun muestran pantalla generica **"en desarrollo"**:

| Entrada del menu | URL | Estado actual |
|------------------|-----|---------------|
| Apertura | `/produccion/apertura` | En desarrollo |
| Estado de ordenes | `/produccion/estado-ordenes` | En desarrollo |
| Panel planeacion | `/produccion/planeacion` | En desarrollo |

**La operacion real hoy se hace en:**

| Pantalla | URL | Manual |
|----------|-----|--------|
| Vista de planta | `/planta` | [Vista de planta](planta.md) |
| Reporte diario | `/reporte-diario` | [Reporte diario](reporte-diario.md) |

## Flujo operativo recomendado

```
Pedido cliente Aprobado
        |
        v
Operario registra en /planta (maquina, actividad, tiros)
        |
        v
Supervisor revisa /reporte-diario
        |
        v
Indicadores / Cuadro Master (cuando esten integrados)
```

## Planeacion — gastos y personal

En **Administracion -> Planeacion** existen modulos de **gastos** y **personal** almacen (captura de costos de planeacion). Ver [Gastos — Planeacion](../gastos-por-area/planeacion.md).

## Quien lo usa?

| Rol | Herramienta |
|-----|-------------|
| Operario | `/planta` |
| Supervisor | Reporte diario |
| Jefe produccion | Reporte diario + pedidos aprobados |

## Siguiente lectura

- [Vista de planta](planta.md)
- [Reporte diario](reporte-diario.md)
- [Pedidos de cliente](pedidos-cliente.md)
