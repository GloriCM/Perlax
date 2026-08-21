# Compras y Almacen

**Estado:** En produccion  
**Menu:** Operaciones -> Compras & Almacen

## Para que sirve?

Gestiona el ciclo de **insumos** para la planta: crear requisiciones, convertirlas en pedidos a proveedores y registrar recepciones en almacen. Incluye indicadores de puntualidad, precios y gastos por categoria.

## Quien lo usa?

- Personal de **compras** y **almacen**
- Usuarios administrativos con acceso a las rutas `/compras/requisicion`, `/compras/pedidos`, `/compras/recepcion` o `/compras/indicadores`

## Como llegar

| Pantalla | Ruta en el menu | URL |
|----------|-----------------|-----|
| Requisicion | Compras & Almacen -> Requisicion | `/compras/requisicion` |
| Pedidos | Compras & Almacen -> Pedidos | `/compras/pedidos` |
| Recepcion | Compras & Almacen -> Recepcion | `/compras/recepcion` |
| Indicadores | Compras & Almacen -> Indicadores | `/compras/indicadores` |

## Flujo general

1. **Requisicion:** se registra la necesidad de insumo (estado Pendiente).
2. **Pedidos:** se confirma el pedido al proveedor (estado Pedido o Parcial).
3. **Recepcion:** se registra lo recibido (Parcial o En Almacen).
4. **Indicadores:** analisis de puntualidad, precios y gastos.

## Categorias de insumo

Siempre debe estar activa **una** categoria:

| Categoria | Uso tipico |
|-----------|------------|
| Insumos de Consumo Diario | Materiales de uso frecuente |
| Cajas y Empaque | Empaques y cajas |
| Gomas y Adhesivos | Adhesivos, cintas |
| Tinta | Tintas Pantone |

## Estados

| Estado | Significado |
|--------|-------------|
| Pendiente | Creada; no pedida al proveedor |
| Pedido | Pedido enviado |
| Parcial | Llego parte de la cantidad |
| En Almacen | Recepcion completa |

## Requisicion

- Crear nueva requisicion con categoria seleccionada.
- Solo se editan requisiciones en estado **Pendiente**.

## Pedidos

- Muestra requisiciones que no estan en En Almacen.
- Confirme cantidades, precios e impuestos al proveedor.

## Recepcion

- Solo requisiciones en **Pedido** o **Parcial**.
- Registre cantidad recibida; complete o deje en Parcial.

## Indicadores

| Sub-vista | Contenido |
|-----------|-----------|
| Proveedores | Puntualidad vs fecha requerida |
| Historial de precios | Evolucion por producto |
| Gastos | Acumulado mensual por categoria |

## Errores frecuentes

| Problema | Que revisar |
|----------|-------------|
| No veo registros | Categoria o filtro de estado |
| No puedo editar | Ya no esta Pendiente |
| Indicadores vacios | Sin datos en esa categoria |

## Siguiente lectura

- [Flujo del negocio](../introduccion/flujo-del-negocio.md)
- [Vista de planta](../flujo-principal/planta.md)