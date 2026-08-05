# Cotizador

**Estado:** En produccion (integrado con API)
**Menu:** Operaciones -> Cotizaciones

## Para que sirve?

Permite cotizar productos tipo **Caja** o **Bolsa** paso a paso, guardar cotizaciones, generar PDF y convertir una cotizacion en borrador de **Orden de Trabajo (OT)**.

## Quien lo usa?

- Comercial / ventas
- Ejecutivos de cuenta
- Diseno (cuando retoman una cotizacion vinculada a OT)

## Como llegar

| Pantalla | URL |
|----------|-----|
| Inicio cotizador | `/cotizador` |
| Nueva cotizacion | `/cotizador/nueva` |
| Cotizaciones guardadas | `/cotizador/guardadas` |
| Editar cotizacion | `/cotizador/:id` |

**Catalogos (admin):** Configuracion -> Ajustes -> Catalogos cotizador (`/ajustes/cotizador-catalogos`)

## Flujo: nueva cotizacion

1. Entre a **Nueva cotizacion**.
2. Elija tipo de producto: **Caja** o **Bolsa**.
3. Complete el asistente (wizard) por pasos:
   - Datos generales (cliente, trabajo, vendedor)
   - Medidas y material
   - Impresion, micro/cordon, refuerzo, troquel
   - Cantidades (escalas 5k a 100k)
   - Servicios adicionales y flete (Sin / Local / Nacional)
   - Resumen y calculo de precios
4. Pulse **Calcular** para obtener precios.
5. **Guarde** la cotizacion.

## Cotizaciones guardadas

Desde **Guardadas** puede:

| Accion | Descripcion |
|--------|-------------|
| Editar | Abrir el wizard con los datos guardados |
| PDF propuesta | Documento comercial para el cliente |
| PDF hoja produccion | Documento tecnico interno |
| Convertir a OT | Crea borrador de OT y abre Nueva OT |
| Eliminar | Borra la cotizacion (confirmacion) |

## Convertir cotizacion en OT

1. En guardadas, pulse **Convertir a OT**.
2. Confirme el mensaje.
3. El sistema crea la OT y lo lleva a **Ordenes -> Nueva OT** para completar ficha tecnica.

## Campos importantes

- **Cliente / Trabajo:** identifican la oportunidad comercial.
- **Tipo Caja o Bolsa:** cambia los pasos del wizard.
- **Cantidades multiples:** compare escenarios de volumen.
- **Flete y servicios:** impactan el precio final.

## Errores frecuentes

| Problema | Que hacer |
|----------|-----------|
| No calcula | Revise campos obligatorios del paso actual |
| Cliente no aparece | Use autocomplete; verifique catalogos |
| No convierte a OT | Cotizacion debe estar guardada; reintente |

## Relacion con otros modulos

Cotizacion -> **OT** -> Ficha tecnica aprobada -> **Pedido de cliente**

## Siguiente lectura

- [Ordenes de trabajo](ordenes-trabajo.md)
- [Pedidos de cliente](pedidos-cliente.md)
