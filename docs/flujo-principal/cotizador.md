# Cotizador

**Menú:** Operaciones → Cotizaciones

## Para qué sirve

Sirve para armar una cotización de **caja** o de **bolsa**, calcular el precio y guardarla. Desde ahí se puede enviar una propuesta al cliente, consultar el desglose interno y, cuando el cliente acepta, convertirla en borrador de orden de trabajo.

## Quién lo usa

- Comercial y ejecutivos de cuenta, para cotizar y enviar la propuesta.
- Quien administra precios de papel, máquinas y acabados.
- Diseño, cuando retoma una cotización que ya se convirtió en orden de trabajo.

## Cómo llegar

En el menú **Operaciones → Cotizaciones**:

| Opción | Qué abre |
|--------|----------|
| Cotizaciones | Pantalla de inicio: nueva, guardadas o catálogos |
| Nueva cotización | El asistente en blanco |
| Guardadas | El historial |
| Materiales y máquinas | Los precios que usa el cálculo |

## Nueva cotización

1. Entre a **Nueva cotización**.
2. Elija **Caja** o **Bolsa**. En caja se omite el paso de refuerzo y ventanilla. En bolsa sí se pregunta.
3. Recorra el asistente. En cada paso pulse **Siguiente**. Si falta un dato obligatorio, el sistema se queda en ese paso y dice qué completar.

### Paso 1. Datos generales

Cliente, nombre del trabajo y vendedor. Si el trabajo tiene más de una pieza (por ejemplo tapa y base), agréguelas aquí. Cada pieza lleva después sus propias medidas.

### Paso 2. Medidas y material

Largo y ancho del pliego, cabida, papel y precio por metro cuadrado.

Escriba las medidas en **metros**. Ejemplo: largo 0,35 y ancho 0,40. Si las tiene en milímetros, escriba 350 y 400: el sistema las pasa a metros.

Abajo hay una **vista previa de materia prima**. Muestra el área de la pieza y cuánto vale el material por unidad. Si sale casi en cero, revise que el largo, el ancho y el precio del papel estén escritos.

### Paso 3. Impresión, barniz y terminado

Pasadas de impresión, número de planchas, precio de la plancha y cubrimiento. El cubrimiento se escribe en porcentaje y puede ser mayor que 100 (por ejemplo 150).

También elige barniz y terminado (plastificado, UV u otro) cuando el trabajo los lleva.

### Paso 4. Micro y cordón

Flauta o microcorrugado, y el cordón o la manija si aplica, con su precio.

### Paso 5. Refuerzo y ventanilla

Solo en **bolsa**. Número de refuerzos y medidas de la ventanilla.

### Paso 6. Troquel y películas

Costo del troquel. Si el trabajo incluye películas, márquelas: entran al costo.

### Paso 7. Cantidad

Una o varias cantidades (por ejemplo 5.000, 10.000, 20.000). El resumen compara el precio de cada una.

### Paso 8. Servicios y contrato

Marque los procesos de máquina que lleva el trabajo: conversión, corte, impresión, corrugado, laminado, troquelado o pegado. Tiene que haber al menos uno.

El **contrato de servicios** es un valor que entra directo al costo. Si no aplica, déjelo en cero.

### Paso 9. Flete y plazo

Elija **Sin flete**, **Local** o **Nacional**. La pantalla muestra el flete calculado por unidad.

Si el flete real es distinto del calculado, escríbalo en **Flete por unidad que entra al costo**. Si lo deja vacío, se usa el cálculo.

El **plazo de pago** (contado, 30, 60 o 90 días) cambia el precio de venta. Contado y 30 días no dan el mismo precio.

### Paso 10. Resumen

Pulse **Calcular**. Aparecen tres precios por cada cantidad:

| Precio | Cómo usarlo |
|--------|-------------|
| Al 1.5 | El más bajo |
| Al 3 | El habitual |
| Al 5 | El más alto |

Pulse el que quiere enviar al cliente. Ese queda marcado como **se envía**. Los otros dos también salen en el PDF.

Luego **guarde** la cotización.

## Cotizaciones guardadas

En **Guardadas** cada fila tiene estas acciones:

| Acción | Para qué |
|--------|----------|
| Editar | Vuelve a abrir el asistente con lo ya escrito |
| Propuesta para el cliente | Documento para enviar. No muestra los costos internos. Se abre en el navegador: Imprimir → Guardar como PDF |
| Hoja de producción | Desglose interno del costo, para planta y costos |
| Convertir a OT | Crea un borrador de orden de trabajo con las piezas |
| Eliminar | Borra la cotización, previa confirmación |

## Convertir en orden de trabajo

1. En **Guardadas**, pulse **Convertir a OT**.
2. Confirme.
3. El sistema abre **Órdenes de trabajo → Nueva OT** con el cliente, el trabajo y las piezas (medidas, material, micro, terminado, cordón y troquel).

Revise esa orden y complétela antes de seguir hacia la ficha técnica.

## Materiales y máquinas

Quien mantiene los precios entra a **Materiales y máquinas** (o a **Configuración → Ajustes → Catálogos cotizador**).

| Catálogo | Qué se guarda |
|----------|----------------|
| Materiales | Papeles y cartones, con precio por metro cuadrado |
| Máquinas | Tiempo de alistamiento, tiros por hora y tarifa por hora de cada proceso |
| Barnices | Nombre y factor |
| Terminados | Plastificado, UV y similares, con precio por metro cuadrado |
| Micro / flauta | Flautas y su precio por metro cuadrado |
| Cordones | Precio por manija |
| Planchas | Precio de cada tipo de plancha |
| Factores | Valores que usa el cálculo: tinta, ventanilla, flete y márgenes |

Si un papel nuevo no está en la lista del paso 2, primero se agrega aquí.

## Si algo no cuadra

| Lo que ve | Qué revisar |
|-----------|-------------|
| No deja calcular y vuelve a Medidas | Largo, ancho, cabida y precio del material de **cada** pieza |
| El material sale en $0 | Precio por metro cuadrado y que las medidas estén en metros |
| El flete sale en $0 | Largo, ancho y cabida. O escriba el flete a mano en el paso 9 |
| No aparece el cliente al guardar | Vuelva al paso 1 y confirme cliente y nombre del trabajo |
| No convierte a orden de trabajo | La cotización tiene que estar guardada |

## Después de cotizar

Cotización guardada → orden de trabajo → ficha técnica aprobada → pedido de cliente.

- [Órdenes de trabajo](ordenes-trabajo.md)
- [Planes de diseño](planes-diseno.md)
- [Pedidos de cliente](pedidos-cliente.md)
