# Facturacion

**Estado:** Operativo
**Menu:** Operaciones -> Facturacion

## Para que sirve?

Emitir la factura de venta a partir de remisiones pendientes, con IVA configurable (default 19%).

## URLs

- `/facturacion/nueva` — Nueva factura desde remision pendiente
- `/facturacion/informe` — Listado, repasar fechas y anular

## Flujo

1. Elegir remision pendiente de facturar.
2. Confirmar fecha, vencimiento, % IVA y observaciones.
3. Guardar. El PV unitario viene del pedido.
4. Desde el informe se puede **imprimir**, **repasar** (fecha/vencimiento) o **anular** (libera la remision).

## Siguiente lectura

- [Remisiones](remisiones.md)
- [Pedidos de cliente](pedidos-cliente.md)
