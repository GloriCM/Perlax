# Diseño

**Menu:** Administracion -> Diseño

## Modulos

| Modulo | URL | Estado |
|--------|-----|--------|
| **Planeador de Diseno** | `/diseno/planeador` | En produccion |
| Cuadro de gastos | `/diseno/gastos/*` | Captura por area |

---

## Planeador de Diseño

### Para que sirve?

Gestiona la **cola de trabajos de diseño**: preparacion tecnica, actividades, plazos y cierre.

### Flujo

1. **Dashboard / Trabajos asignados** con filtros (estado, cliente, vendedor, disenador).
2. **Anadir trabajo:** cliente, vendedor, nombre, responsable, fecha entrega.
3. Abrir detalle del trabajo:
   - **Preparacion tecnica**
   - **Planeacion:** actividades (Planchas, Troquel, Muestras, Impresion digital, Arte, Expertis)
   - **Aprobacion y cierre**
4. Actualice actividades, marque avance, **apruebe** o **finalice**.

### Estados del trabajo

| Estado | Significado |
|--------|-------------|
| Nuevo trabajo pendiente | Recien creado |
| En desarrollo | En ejecucion |
| Finalizado | Cerrado |

El tablero muestra **semaforo** de retrasos vs fecha entrega.

### Quien lo usa?

- Diseñadores
- Comercial (alta de trabajos)

---

## Cuadro de gastos de diseno

Misma logica que otras areas: **Captura**, **Graficas**, **Rubros**, **Cotizaciones**, **Proveedores**.

Ver [Gastos por area](README.md).

## Siguiente lectura

- [Ordenes de trabajo](../flujo-principal/ordenes-trabajo.md)
- [Cotizador](../flujo-principal/cotizador.md)
