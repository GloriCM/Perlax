# Presupuestos

**Menu:** Administracion -> Presupuestos

## Para que sirve?

Planifica ingresos y costos por **empresa**, **ano fiscal** y **unidad de negocio**. Incluye presupuesto **corporativo** (integrado) y captura **por area** (planeacion mensual).

## Quien lo usa?

- Finanzas y gerencia (presupuesto general)
- Jefes de area (presupuesto por rubro mensual)

## Como llegar

| Pantalla | URL | Estado |
|----------|-----|--------|
| Presupuesto general | `/presupuestos` | En produccion |
| Detalle presupuesto | `/presupuestos/:id` | En produccion |
| Por area — Produccion | `/presupuestos/produccion` | Captura local |
| Por area — Talleres | `/presupuestos/talleres` | Captura local |
| Por area — G. Humana | `/presupuestos/gestion-humana` | Captura local |
| Por area — SST | `/presupuestos/sst` | Captura local |
| Por area — Planeacion | `/presupuestos/planeacion` | Captura local |
| Por area — Diseno | `/presupuestos/diseno` | Captura local |

---

## Presupuesto general (API)

### Listado

Filtre por empresa, ano fiscal y estado. Cree nuevo presupuesto con:

- Empresa, vigencia, moneda
- Centro de costos, unidad de negocio
- Observaciones

### Detalle — pestanas

| Pestana | Contenido |
|---------|-----------|
| Lineas | Ingresos, materia prima, costos produccion, gastos admin/ventas/financieros |
| Unidades de negocio | Desglose por U.N. |
| Personal | Planilla presupuestada |
| Ajustes | Modificaciones posteriores |
| Reportes | Estado de resultados, mapa de costos |

### Estados

| Estado | Significado |
|--------|-------------|
| Pendiente | En elaboracion |
| Aprobado | Validado por gerencia |
| Cerrado | Periodo cerrado |
| Cancelado | Anulado |
| En Ajuste | Reabierto para cambios |

**Acciones:** Aprobar, Cerrar, Reabrir (segun permisos).

---

## Presupuesto por area (captura mensual)

Grilla **Enero–Diciembre** por rubros fijos del area (ej. Produccion: horas extras, mantenimiento, repuestos).

> **Nota:** La captura por area es **interfaz operativa**; confirme con finanzas si los cambios ya se persisten en servidor o son borrador local.

---

## Siguiente lectura

- [Gastos por area](../gastos-por-area/README.md)
- [Flujo del negocio](../introduccion/flujo-del-negocio.md)
