# Facturacion

**Estado:** En desarrollo (menu visible, pantalla placeholder)
**Menu:** Operaciones -> Facturacion

## Para que sirve? (previsto)

Emitir y consultar **facturas** al cliente tras remision / entrega.

## URLs en el menu

- `/facturacion/nueva` — Nueva factura
- `/facturacion/informe` — Informe de facturacion

## Situacion actual

Modulo **en construccion**. Condiciones de factura se capturan hoy en la **OT**.

Flujo comercial objetivo:

```
Pedido Aprobado -> Produccion -> Remision -> Facturacion -> Cartera
```

Solo los primeros eslabones estan operativos en Perla hoy.

## Siguiente lectura

- [Pedidos de cliente](pedidos-cliente.md)
- [Remisiones](remisiones.md)
