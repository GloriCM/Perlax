# Ordenes de trabajo y fichas tecnicas

**Estado:** En produccion (integrado con API)
**Menu:** Operaciones -> Ordenes de Trabajo

## Para que sirve?

Registra la **Orden de Trabajo (OT)** con datos comerciales y tecnicos de diseño: piezas, sustratos, tintas, troquel, procesos y condiciones de entrega. Las fichas tecnicas se aprueban desde este flujo.

## Quien lo usa?

- Diseño
- Comercial (datos iniciales)
- Produccion (consulta)

## Como llegar

| Pantalla | URL |
|----------|-----|
| Nueva OT | `/ordenes/nueva` |
| Lista de OT | `/ordenes/lista` |
| Planes de diseno | `/ordenes/planes-diseno` |
| Ficha tecnica (impresion) | `/fichas/lista` |

## Flujo: crear OT

### Paso 1 — Validacion

- Consecutivo OT (automatico o editable)
- Cliente, ejecutivo de cuenta, fecha solicitud
- Asignacion: Diseño / Repeticion / Otro
- Diseñador, linea PT, nombre del producto
- El sistema valida duplicados

### Paso 2 — Detalle de diseno

Por cada pieza:

- Sustrato, medidas, flauta, troquel
- Tintas CMYK y especiales
- Terminados, manija, adjuntos
- Procesos de fabricacion
- Condiciones: remision, certificado, factura, orden de compra cliente

### Guardar

Pulse **Guardar OT**. Puede llegar precargada desde **Cotizador -> Convertir a OT**.

## Lista de OT

| Columna | Significado |
|---------|-------------|
| OT | Numero de orden |
| Cliente / Producto | Identificacion |
| Piezas | Cantidad de piezas en la OT |
| Estado | **Pendiente** o **Aprobada** (segun fichas tecnicas) |

**Acciones:** buscar, abrir para editar, eliminar.

## Estados

- **Pendiente:** al menos una ficha tecnica sin aprobar.
- **Aprobada:** todas las piezas con ficha aprobada; habilita crear **Pedido de cliente**.

## Fichas tecnicas

Menu **Fichas Tecnicas -> Listado**: imprima o revise fichas por pieza. La aprobacion de ficha es requisito para pedidos.

## Errores frecuentes

| Problema | Causa |
|----------|-------|
| OT duplicada | Cliente + producto ya existe |
| No puedo pedir producto | Ficha tecnica no aprobada |
| OT vacia al convertir | Complete paso 2 tras convertir desde cotizador |

## Siguiente lectura

- [Cotizador](cotizador.md)
- [Pedidos de cliente](pedidos-cliente.md)
- [Planeador de Diseno](../gastos-por-area/diseno.md)
