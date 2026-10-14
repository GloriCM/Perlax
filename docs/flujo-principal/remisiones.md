# Remisiones

**Estado:** Operativo **Menu:** Operaciones -> Remisiones

## Para que sirve?

Documentar la **salida de producto** terminado hacia el cliente despues de producir el pedido.

## URLs

* `/remisiones/nueva` — Nueva remision (o editar `/remisiones/nueva/:id`)
* `/remisiones/informe` — Informe, transporte y acceso a edicion

## Flujo

1. Seleccionar pedido **aprobado** con saldo pendiente por despachar.
2. Indicar cantidades, observaciones de despacho y, si aplica, **despacho final** (cierra la OP ligada).
3. Guardar. Desde el informe se puede asignar **transporte** (flete).
4. La remision queda disponible para facturar.
5. Desde el informe: **Imprimir** remisión o fichas de despacho (LOCAL / EXPOR / Tickets).

## Siguiente lectura

* [Pedidos de cliente](pedidos-cliente.md)
* [Facturacion](facturacion.md)
* [Inventario PT](../operaciones-de-apoyo/inventario-pt.md)
