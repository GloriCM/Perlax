# Flujo del negocio

Este capítulo resume la lógica general de PerlaX según el mapa de procesos de la empresa. Sirve como hilo conductor del manual.

## Flujo principal (cadena del pedido)

Desde el presupuesto hasta el cobro, los módulos siguen esta secuencia lógica:

```
Presupuesto
    ├── Cotización ──┐
    └── Diseño ──────┴──► Pedido (cliente)
                              │
                         Planeación
                              │
                         Programación
                              │
                         Producción ◄── Calidad
                              │
                         Remisión
                              │
                         Facturación
                              │
                    Cartera / Índices / Reportes
```

| Etapa | Módulo en PerlaX | Capítulo del manual |
|-------|------------------|---------------------|
| Presupuesto | Presupuestos (general y por área) | [Presupuestos](../flujo-principal/presupuestos.md) |
| Cotización | Cotizador | [Cotizador](../flujo-principal/cotizador.md) |
| Diseño | Diseño, Planeador de Diseño | [Órdenes y diseño](../flujo-principal/ordenes-trabajo.md) |
| Pedido | Pedidos de cliente | [Pedidos](../flujo-principal/pedidos-cliente.md) |
| Planeación | Planeación, panel de producción | [Planeación y producción](../flujo-principal/planeacion-produccion.md) |
| Producción | Apertura OT, estado de órdenes, reporte diario | [Planeación y producción](../flujo-principal/planeacion-produccion.md) |
| Captura en piso | Vista `/planta` | [Vista de planta](../flujo-principal/planta.md) |
| Remisión | Remisiones | [Remisiones](../flujo-principal/remisiones.md) |
| Facturación | Facturación | [Facturación](../flujo-principal/facturacion.md) |

## Procesos aparte: gastos por área

A la derecha del flujo principal están los **cuadros de gastos de cada área**. No forman parte de la cadena del pedido; registran costos internos:

- Contabilidad (si aplica en el sistema)
- Gestión Humana
- SST
- Diseño, Producción, Planeación, Talleres, Mantenimiento (cada uno con captura, rubros, gráficas, proveedores)

Ver [Gastos por área](../gastos-por-area/README.md).

## Módulos de apoyo en planta

| Módulo | Función en el flujo |
|--------|---------------------|
| **Compras y Almacén** | Insumos: requisición → pedido a proveedor → recepción |
| **Calidad** | Encuestas, no conformidades, planes de acción |
| **Inventario PT** | Producto terminado |
| **Cuadro Master** | Indicadores y captura mensual de planta |

## CRM

El CRM (relación con clientes) es un módulo transversal que complementa cotización y pedidos.

## Diagrama de referencia

> Inserte aquí la imagen de la pizarra PerlaX en `docs/assets/flujo-perlax.png` cuando esté disponible.

## Siguiente lectura

- [Compras y Almacén](../operaciones-apoyo/compras-almacen.md)
- [Vista de planta](../flujo-principal/planta.md)
