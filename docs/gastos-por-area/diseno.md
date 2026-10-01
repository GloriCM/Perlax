# Diseño — cuadro de gastos

**Menu:** Administracion -> Diseño

## Modulos

| Modulo                  | URL                 | Estado                            |
| ----------------------- | ------------------- | --------------------------------- |
| **Planeador de Diseño** | `/diseno/planeador` | En produccion — ver guia completa |
| Cuadro de gastos        | `/diseno/gastos/*`  | Captura por area                  |

***

## Planeador de Diseño

Cola de trabajos de diseño: alta, asignacion, proceso (planchas, troquel, muestra), semaforo, avance y aprobacion.

**Guia completa:** [Planeador de Diseño](planeador-diseno.md)

El seguimiento de la orden, el arte y la ficha está en [Planes de Diseño](../flujo-principal/planes-diseno.md) (menú Operaciones → Órdenes de trabajo).

Resumen rapido:

1. Crear trabajo (cliente, vendedor, accion, diseñador, fecha recepcion).
2. El diseñador actualiza el proceso y guarda.
3. Semaforo: rojo critico (+15 dias), naranja sin novedades, amarillo con novedades, verde con fecha de aprobacion.
4. Admin puede eliminar trabajos errados con la herramienta oculta del detalle.

***

## Cuadro de gastos de diseño

Misma logica que otras areas: **Captura**, **Graficas**, **Rubros**, **Cotizaciones**, **Proveedores**.

Ver [Gastos por area](gastos-por-area.md).

## Siguiente lectura

* [Planeador de Diseño](planeador-diseno.md)
* [Ordenes de trabajo](../flujo-principal/ordenes-trabajo.md)
* [Cotizador](../flujo-principal/cotizador.md)
