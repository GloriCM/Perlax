# Pedidos de cliente

**Estado:** En produccion (integrado con API)
**Menu:** Operaciones -> Pedidos

> No confundir con **Compras & Almacen -> Pedidos**, que son pedidos a **proveedores** de insumos.

## Para que sirve?

Formaliza el pedido del **cliente** contra OT con ficha aprobada: cantidades, OC del cliente, fecha de entrega y precios de aprobacion.

## Quien lo usa?

- Ejecutivo de cuenta / comercial (creacion)
- Gerencia comercial (aprobacion de precios)

## Como llegar

| Pantalla | URL |
|----------|-----|
| Nuevo pedido | `/pedidos/nuevo` |
| Editar pedido | `/pedidos/nuevo/:id` |
| Informe | `/pedidos/informe` |

## Flujo: nuevo pedido

1. El sistema asigna **numero de pedido**.
2. Complete encabezado obligatorio:
   - **Cliente**
   - **Fecha pedido**
   - **Orden de compra del cliente (OC)**
   - **Fecha entrega acordada**
3. Agregue **lineas**:
   - Seleccione OT + producto + referencia (solo piezas con **ficha tecnica aprobada**)
   - Indique **cantidad**
4. **Guarde** el pedido.

## Informe de pedidos

- Busque por pedido, cliente, producto, referencia u OC.
- Estado por pedido: **Aprobado** o **Pendiente**.
- **Editar** pedidos pendientes.
- **Imprimir** nota de pedido (HTML).
- **Aprobar** con **precio unitario** por linea (requerido para produccion y facturacion futura).

## Estados

| Estado | Significado |
|--------|-------------|
| Pendiente | Falta aprobacion de precios |
| Aprobado | Listo para produccion / despacho |

## Requisitos previos

1. OT creada y completa.
2. **Ficha tecnica aprobada** para cada referencia que agregue.
3. Cliente del pedido debe coincidir con el de la OT.

## Errores frecuentes

| Problema | Solucion |
|----------|----------|
| No aparece producto | Ficha no aprobada o cliente distinto |
| No guarda | Complete OC y fecha entrega |
| No puede aprobar | Ingrese precio unitario en informe |

## Siguiente lectura

- [Ordenes de trabajo](ordenes-trabajo.md)
- [Planeacion y produccion](planeacion-produccion.md)
