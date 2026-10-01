# Presupuestos

**Menú:** Administración → Presupuestos

## Para qué sirve

Arma el presupuesto de la empresa para un año: cuánto se espera vender, cuánto cuesta producirlo, cuánto se gasta en administración, ventas y financieros, y cuál queda la utilidad.

También calcula el **costo por hora** de cada centro de trabajo (corte, impresión, troquelado y los demás). Ese costo por hora es el que después usa la operación para saber cuánto vale una hora de máquina.

Hay dos entradas en el menú:

| Entrada | Para qué |
|---------|----------|
| Presupuesto general | El presupuesto de la compañía: ingresos, nómina, gastos y mapa de costos |
| Por área | Una grilla mes a mes (enero a diciembre) del presupuesto de Producción, Talleres, Gestión humana, SST, Planeación o Diseño |

Este capítulo explica el **presupuesto general**. El de cada área es una hoja aparte: se elige el año y se escriben los montos de cada rubro por mes.

## Quién lo usa

Gerencia, finanzas y quien administra el presupuesto de la compañía. Quien solo consulta un área usa **Por área**.

## Cómo llegar

**Administración → Presupuestos → Presupuesto general.**

## El listado

Arriba ve cuántos presupuestos hay, cuántos están pendientes, cuántos aprobados y la suma de ingresos proyectados.

**Filtrar** reduce la lista por empresa, año o estado.

La tabla muestra código, empresa, vigencia, moneda, unidades de negocio, ingresos y estado. Pulse una fila para abrirla.

## Crear un presupuesto

Pulse **Nuevo presupuesto** y complete:

| Campo | Qué escribir |
|-------|----------------|
| Empresa | Nombre de la compañía |
| Vigencia | Año del presupuesto (2025 a 2028) |
| Fecha inicio y fecha fin | El periodo que cubre, normalmente del 1 de enero al 31 de diciembre |
| Moneda | Pesos, dólares o euros |
| Centro de costos | Si lo usan para identificar el presupuesto |
| Unidad de negocio | Opcional |

Al guardar queda en estado **Pendiente** y se abre el detalle. Un presupuesto nuevo empieza vacío: hay que cargar ingresos, personas y rubros.

## La ficha del presupuesto

Arriba está el código, la empresa y el año. Cuatro cifras resumen el cálculo:

- **Ingresos**
- **Costo de producción** (materia prima, mano de obra, costos indirectos y contratos)
- **Gastos** (administración, ventas y financieros)
- **Utilidad**

Los cambios se **guardan solos** al editar. El aviso de la esquina indica si está guardando, si ya quedó guardado o si está en solo lectura.

Hay cuatro pestañas: Costos fijos, Costos variables, Resumen y Mapa de costos.

## Costos fijos

Aquí se arma la estructura. Puede agregar tres tipos de sección:

| Tipo de sección | Qué se escribe |
|-----------------|----------------|
| Lista de ingresos | Nombre del área o división, el monto de venta y el porcentaje que corresponde a materia prima |
| Nómina | Personas: cargo, sueldo y auxilio de transporte. Cada grupo de nómina se marca según a dónde entra: gastos de administración, gastos de ventas, costo de producción o cooperativa |
| Rubros / montos | Honorarios, impuestos, arriendos, servicios, financieros, mantenimiento, fletes, contratos y cualquier otro valor fijo |

Dentro de una sección puede agregar subgrupos (por ejemplo «Honorarios» o «Nómina de producción») y, dentro de cada uno, las líneas.

La nómina no se digita prestación por prestación. Usted escribe sueldo y transporte. El sistema calcula cesantía, intereses, prima, vacaciones, ARL, salud, pensión y caja, y los suma al área que corresponda.

## Costos variables

Son valores que dependen de una base, sobre todo **comisiones**: un porcentaje por un monto (por ejemplo 3 % de una venta).

También puede agregar rubros variables que sean un monto directo.

Estas comisiones se ven en esta pestaña. El resumen de utilidad usa los gastos de ventas que estén escritos en costos fijos (por ejemplo una línea de comisiones de ventas). Así el estado de resultados no suma dos veces la misma comisión.

## Resumen

Es el estado de resultados. No se digita: sale de lo que escribió en las otras pestañas.

Muestra cada concepto, el monto y qué porcentaje representa sobre los ingresos: ventas, materia prima, mano de obra, costos indirectos, contratos, gastos de administración, de ventas y financieros, y la utilidad.

Más abajo está el detalle de nómina por área: sueldos, transporte y cada prestación, y a qué gasto entra esa nómina.

## Mapa de costos

Reparte el costo de fabricación en centros de trabajo y dice cuánto vale **una hora** de cada uno.

Por cada centro se escribe:

| Dato | Qué es |
|------|--------|
| Código y nombre | Por ejemplo Corte, Impresión, Troquelado |
| Horas productivas | Horas del año con las que se va a trabajar ese centro |
| Factor de prestaciones | Recargo de prestaciones sobre el sueldo y el transporte de la gente de ese centro. Lo habitual es 0,50. En algunos centros, 0,55 |
| Gastos varios | Un valor adicional de personal de ese centro, si lo hay |

La gente de producción que en nómina no está asignada a un centro entra a los gastos generales de fabricación, no a una máquina.

Tres factores los calcula el sistema y no se editan:

- **Gastos generales de fabricación:** cómo se reparten los costos que no son de una máquina.
- **Administración:** cómo se cargan los gastos de administración y ventas sobre la operación.
- **Financiero:** cómo se cargan los gastos financieros.

El **porcentaje de utilización** sí se puede cambiar. La hora real es la hora ideal dividida por ese porcentaje. Con 70 %, la hora real es más alta que la hora ideal porque no todo el tiempo disponible es productivo.

La tabla de abajo muestra, ya calculado, el costo primario y el valor por hora: primario, cargado, ideal y **real**. El que se usa como costo de la hora del centro es el **$/hora real**.

## Estados

| Estado | Qué puede hacer |
|--------|-----------------|
| Pendiente | Editar montos. Es el estado al crear |
| Aprobado | Ya no se editan los montos. Puede cerrarlo o reabrirlo |
| En ajuste | Vuelve a permitir edición. Se llega con **Reabrir** |
| Cerrado | Quedó cerrado. Puede reabrirlo si hay que corregir |
| Cancelado | No sigue vigente |

Botones de la ficha:

- **Aprobar**, cuando todavía se puede editar.
- **Cerrar**, cuando ya está aprobado.
- **Reabrir**, cuando está aprobado o cerrado. Pasa a ajuste y otra vez se pueden cambiar los montos.

## Presupuesto por área

**Administración → Presupuestos → Por área**, y luego Producción, Talleres, Gestión humana, SST, Planeación o Diseño.

Elija el año. La pantalla es una grilla: cada rubro del área y una columna por mes. Escriba el monto de ese mes. Este presupuesto no reemplaza al general: es el plan mensual de esa área.

## Siguiente lectura

- [Cotizador](cotizador.md)
- [Gastos por área](../gastos-por-area/README.md)
