using Microsoft.EntityFrameworkCore;

namespace Perlax.Modules.Almacen.Infrastructure.Persistence;

public static class AlmacenDbInitializer
{
    public static async Task InitializeAsync(AlmacenDbContext context)
    {
        await context.Database.ExecuteSqlRawAsync("""
            CREATE SCHEMA IF NOT EXISTS almacen;

            CREATE TABLE IF NOT EXISTS almacen."Productos" (
                "Id" uuid PRIMARY KEY,
                "Nombre" character varying(300) NOT NULL,
                "TipoRequisicionId" character varying(50) NOT NULL,
                "Descripcion" text NULL,
                "CostoEstandar" numeric(18,2) NOT NULL DEFAULT 0,
                "UnidadSugerida" character varying(30) NOT NULL DEFAULT '',
                "Activo" boolean NOT NULL DEFAULT true,
                "FechaRegistro" timestamp with time zone NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS almacen."Proveedores" (
                "Id" uuid PRIMARY KEY,
                "Nombre" character varying(300) NOT NULL,
                "Nit" character varying(30) NULL,
                "Correo" character varying(200) NULL,
                "TelefonoTrabajo" character varying(50) NULL,
                "TelefonoMovil" character varying(50) NULL,
                "Direccion" text NULL,
                "Categoria" character varying(80) NULL,
                "ResponsableIva" boolean NOT NULL DEFAULT false,
                "Telefono" character varying(50) NULL,
                "Activo" boolean NOT NULL DEFAULT true,
                "FechaRegistro" timestamp with time zone NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS almacen."Requisiciones" (
                "Id" uuid PRIMARY KEY,
                "Codigo" character varying(20) NOT NULL,
                "AnioCodigo" integer NOT NULL,
                "SecuenciaCodigo" integer NOT NULL,
                "TipoRequisicionId" character varying(50) NOT NULL,
                "FechaSolicitud" timestamp with time zone NOT NULL,
                "OrdenProduccionNumero" character varying(200) NOT NULL DEFAULT '',
                "CatalogoOpId" uuid NULL,
                "Cliente" character varying(500) NOT NULL DEFAULT '',
                "Referencia" text NOT NULL DEFAULT '',
                "ProductoId" uuid NULL,
                "ProductoNombre" character varying(500) NOT NULL DEFAULT '',
                "Cantidad" numeric(18,4) NOT NULL,
                "Unidad" character varying(30) NOT NULL,
                "FechaRequerida" timestamp with time zone NOT NULL,
                "Observacion" text NULL,
                "Estado" character varying(30) NOT NULL DEFAULT 'Pendiente',
                "FechaRegistro" timestamp with time zone NOT NULL DEFAULT NOW(),
                "CreadoPorId" uuid NULL,
                "CreadoPorNombre" character varying(200) NOT NULL DEFAULT ''
            );

            CREATE TABLE IF NOT EXISTS almacen."Pedidos" (
                "Id" uuid PRIMARY KEY,
                "RequisicionId" uuid NOT NULL UNIQUE REFERENCES almacen."Requisiciones"("Id") ON DELETE CASCADE,
                "FechaPedido" timestamp with time zone NOT NULL,
                "FechaEntregaEstimada" timestamp with time zone NULL,
                "PrecioUnitario" numeric(18,2) NULL,
                "ProcesadoPorId" uuid NULL,
                "ProcesadoPorNombre" character varying(200) NULL,
                "FechaRegistro" timestamp with time zone NOT NULL DEFAULT NOW()
            );

            CREATE TABLE IF NOT EXISTS almacen."PedidoProveedores" (
                "Id" uuid PRIMARY KEY,
                "PedidoId" uuid NOT NULL REFERENCES almacen."Pedidos"("Id") ON DELETE CASCADE,
                "ProveedorCatalogoId" uuid NULL,
                "Nombre" character varying(300) NOT NULL,
                "Nit" character varying(30) NULL,
                "Telefono" character varying(50) NULL,
                "Cantidad" numeric(18,4) NOT NULL,
                "PrecioUnitario" numeric(18,2) NOT NULL DEFAULT 0,
                "FechaEntregaEstimada" timestamp with time zone NULL,
                "Recibido" boolean NOT NULL DEFAULT false,
                "Pagado" boolean NOT NULL DEFAULT false,
                "FormaPago" character varying(20) NULL,
                "NumeroOrdenCompra" character varying(30) NULL,
                "OrdenCompraId" uuid NULL
            );

            CREATE TABLE IF NOT EXISTS almacen."OrdenesCompra" (
                "Id" uuid PRIMARY KEY,
                "NumeroOrdenCompra" character varying(30) NOT NULL,
                "ProveedorCatalogoId" uuid NULL,
                "NombreProveedor" character varying(300) NOT NULL,
                "NitProveedor" character varying(30) NULL,
                "TelefonoProveedor" character varying(50) NULL,
                "FechaPedido" timestamp with time zone NOT NULL,
                "FechaEntregaEstimada" timestamp with time zone NULL,
                "Estado" character varying(20) NOT NULL DEFAULT 'Emitida',
                "Pagado" boolean NOT NULL DEFAULT false,
                "FormaPago" character varying(20) NULL,
                "FechaRegistro" timestamp with time zone NOT NULL DEFAULT NOW(),
                "CreadoPorId" uuid NULL,
                "CreadoPorNombre" character varying(200) NULL
            );

            CREATE TABLE IF NOT EXISTS almacen."OrdenCompraLineas" (
                "Id" uuid PRIMARY KEY,
                "OrdenCompraId" uuid NOT NULL REFERENCES almacen."OrdenesCompra"("Id") ON DELETE CASCADE,
                "PedidoProveedorId" uuid NOT NULL UNIQUE,
                "RequisicionId" uuid NOT NULL,
                "Orden" integer NOT NULL DEFAULT 1
            );

            CREATE TABLE IF NOT EXISTS almacen."RecepcionLineas" (
                "Id" uuid PRIMARY KEY,
                "RequisicionId" uuid NOT NULL REFERENCES almacen."Requisiciones"("Id") ON DELETE CASCADE,
                "PedidoProveedorId" uuid NOT NULL,
                "NombreProveedor" character varying(300) NOT NULL,
                "CodigoUsuario" character varying(100) NOT NULL,
                "FechaLlegada" timestamp with time zone NOT NULL,
                "CalidadEsperada" boolean NOT NULL DEFAULT true,
                "MotivoCalidadNo" text NULL,
                "FacturaEntregada" boolean NOT NULL DEFAULT true,
                "MotivoFacturaNo" text NULL,
                "CantidadRecibida" numeric(18,4) NOT NULL,
                "CantidadPedidaEnMomento" numeric(18,4) NOT NULL,
                "PedidoCompleto" boolean NOT NULL DEFAULT false,
                "MotivoCantidadParcial" text NULL,
                "NuevaFechaEntrega" timestamp with time zone NULL,
                "FechaRegistro" timestamp with time zone NOT NULL DEFAULT NOW(),
                "RegistradoPorId" uuid NULL,
                "RegistradoPorNombre" character varying(200) NULL
            );

            CREATE TABLE IF NOT EXISTS almacen."OrdenCompraConsecutivo" (
                "Id" integer PRIMARY KEY DEFAULT 1 CHECK ("Id" = 1),
                "UltimoNumero" integer NOT NULL DEFAULT 0
            );

            INSERT INTO almacen."OrdenCompraConsecutivo" ("Id", "UltimoNumero")
            SELECT 1, 0 WHERE NOT EXISTS (SELECT 1 FROM almacen."OrdenCompraConsecutivo" WHERE "Id" = 1);

            CREATE UNIQUE INDEX IF NOT EXISTS "IX_Requisiciones_Codigo" ON almacen."Requisiciones" ("Codigo");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_Requisiciones_Anio_Secuencia" ON almacen."Requisiciones" ("AnioCodigo", "SecuenciaCodigo");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_OrdenesCompra_Numero" ON almacen."OrdenesCompra" ("NumeroOrdenCompra");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_OrdenCompraLineas_PedidoProveedor" ON almacen."OrdenCompraLineas" ("PedidoProveedorId");
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_RecepcionLineas_UnicoCodigo"
                ON almacen."RecepcionLineas" ("RequisicionId", "PedidoProveedorId", lower(trim("CodigoUsuario")));
            """);

        await context.Database.ExecuteSqlRawAsync("""
            CREATE UNIQUE INDEX IF NOT EXISTS "IX_Productos_Nombre_Activo"
                ON almacen."Productos" (lower(trim("Nombre")))
                WHERE "Activo" = true;
            """);
    }
}
