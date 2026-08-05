# Calidad

**Estado:** Prototipo (datos de demostracion)
**Menu:** Administracion -> Calidad

## Para que sirve? (previsto)

Gestionar **encuestas en piso**, **no conformidades (NC)**, consolidados y **planes de accion**.

## Pantallas

| Pantalla | URL | Contenido |
|----------|-----|-----------|
| Encuestas de Calidad | `/calidad/encuestas-calidad` | Registro operario/maquina/OP/proceso/defectos |
| Reporte de NC | `/calidad/reporte-nc` | NC por OP, cliente, material |
| Consolidado de NC | `/calidad/consolidado-nc` | Vista mensual agrupada |
| Planes de Accion | `/calidad/planes-accion` | Acciones correctivas y avance |

## Situacion actual

Las pantallas muestran **datos de ejemplo**. Los botones de guardar pueden no persistir en base de datos aun.

Use este modulo como **referencia de proceso** hasta integracion completa.

## Flujo objetivo

1. Encuesta en proceso productivo.
2. Si hay defecto -> Reporte NC.
3. Consolidar NC del periodo.
4. Plan de accion con responsable y fecha.

## Filtros (encuestas)

Mes, ano, dia, maquina, proceso, estatus, tipo de defecto.

## Relacion con produccion

Conecta con **Reporte diario** y **Planta** (misma OP y maquina).

## Siguiente lectura

- [Reporte diario](../flujo-principal/reporte-diario.md)
- [Vista de planta](../flujo-principal/planta.md)
