# Cuadro Master

**Estado:** Prototipo (datos de demostracion)
**Menu:** Administracion -> Cuadro Master

## Para que sirve? (previsto)

Tablero de **rendimiento de operarios**: metas de tiros, bonificaciones, desperdicio e historico mensual.

## Pantallas

| Pantalla | URL |
|----------|-----|
| Captura Mensual | `/cuadro-master/captura` |
| Desperdicio | `/cuadro-master/desperdicio` |
| Tablero Semaforos | `/cuadro-master/tablero` |
| Historial | `/cuadro-master/historial` |
| Config Maquinas | `/cuadro-master/config-maquinas` |
| Operarios | `/cuadro-master/operarios` |
| Cartas | `/cuadro-master/cartas` |

## Situacion actual

Interfaz **visual** con datos de ejemplo. La captura mensual permite editar celdas pero **sin guardado en servidor** confirmado.

## Datos reales hoy

Los tiros y tiempos operativos provienen de:

- [Vista de planta](../flujo-principal/planta.md)
- [Reporte diario](../flujo-principal/reporte-diario.md)

## Config maquinas (referencia)

Metas 100% / 75%, valor por tiro, tarifa — para calcular bonificaciones cuando el modulo este integrado.

## Siguiente lectura

- [Reporte diario](../flujo-principal/reporte-diario.md)
- [Roles del sistema](../roles-del-sistema.md)
