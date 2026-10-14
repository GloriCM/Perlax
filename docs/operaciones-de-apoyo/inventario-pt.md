# Inventario PT

**Estado:** Operativo
**Menu:** Operaciones -> Inventario PT

## Para que sirve?

Consultar el saldo de **producto terminado** por OP (producido vs remisionado vs devuelto) y registrar **devoluciones** del cliente.

## URLs

| Pantalla | URL |
|----------|-----|
| Existencias | `/inventario/existencias` |
| Devoluciones | `/inventario/devoluciones` |

## Criterio de saldo

- **Producido:** entradas registradas en PT; si no hay entradas, se usa la cantidad a producir de la OP abierta/cerrada.
- **Remisionado:** suma de cantidades en remisiones confirmadas de esa OP.
- **Devuelto:** suma de devoluciones registradas (mercancía que vuelve del cliente).
- **Disponible:** producido − remisionado + devuelto.

Desde **Gestionar** (existencias) se registra una entrada de PT cuando el producto queda en stock sin despacharse de inmediato.

## Devoluciones

1. Elija un ítem ya **remisionado** con saldo devoluble.
2. Indique cantidad (no mayor a lo remisionado menos lo ya devuelto), motivo y fecha.
3. Al guardar:
   - sube el stock disponible en PT;
   - libera cantidad para poder **volver a remisionar** ese pedido;
   - queda historial con número `DV-AAAA-#####`.

No anula facturas automáticamente: si la remisión ya estaba facturada, la nota crédito / ajuste comercial se gestiona aparte.

## Siguiente lectura

- [Remisiones](../flujo-principal/remisiones.md)
- [Planeacion / produccion](../flujo-principal/planeacion-produccion.md)
