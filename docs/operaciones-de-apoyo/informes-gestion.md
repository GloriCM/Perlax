# Informes de gestión

**Estado:** Operativo  
**Menu:** Configuración → Informes de gestión  
**URL:** `/informes`

## Para qué sirve?

Consultas gerenciales sobre el flujo comercial y operativo: entregas, pedidos pendientes, OP sin remisión, remisiones sin factura, ventas, transporte, talleres, desperdicios y kardex de materia prima.

## Quién lo usa?

- Administrador
- Administrativo con la vista autorizada en la matriz de módulos

## Cómo usarlo

1. Abra **Informes de gestión**.
2. Elija un informe en las tarjetas o en el selector.
3. Opcional: filtre por fechas, cliente o texto.
4. Pulse **Actualizar** o cambie de informe.
5. **Exportar CSV** descarga la tabla visible (separador `;`).

## Informes disponibles

| Informe | Contenido |
|---------|-----------|
| Fechas de entrega | OP abiertas: pacto vs fecha producción |
| Pedidos pendientes de apertura | Pedidos aprobados sin OP abierta |
| OP con saldo por remisionar | Producido vs remisionado |
| Remisiones sin facturar | Remisiones confirmadas sin factura |
| Ventas totales | Facturas activas por mes |
| Transporte | Fletes de remisiones |
| Trabajos en talleres | Talleres externos en OP |
| Desperdicios | % no remisionado en OP cerradas |
| Kardex / saldos MP | Movimientos de almacén |
| Compras sin recepción | Enlace al módulo Compras |

## Parametrización

La configuración del sistema no es un módulo vacío: use **Ajustes** (`/ajustes`) como índice hacia usuarios, auditoría, catálogos del cotizador, clientes, proveedores e informes.

## Relación con otros módulos

Los datos salen de pedidos, OP, remisiones, facturas, consumos y detalle de OP. No sustituye los informes puntuales de cada módulo.

## Siguiente lectura

- [Usuarios y permisos](../configuracion/usuarios.md)
- [Remisiones](../flujo-principal/remisiones.md)
- [Facturación](../flujo-principal/facturacion.md)
- [Compras y Almacén](compras-almacen.md)
