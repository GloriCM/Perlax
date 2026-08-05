namespace Perlax.Modules.Almacen.Application.DTOs;

public record AlmacenUserContext(Guid? UserId, string UserName);

public record CatalogosResponse(
    IReadOnlyList<TipoRequisicionDto> TiposRequisicion,
    IReadOnlyList<string> UnidadesMedida,
    IReadOnlyList<string> CorreosNotificacion);

public record TipoRequisicionDto(string Id, string Label, string Color);

public record ProductoDto(
    Guid Id,
    string Nombre,
    string TipoRequisicionId,
    string? Descripcion,
    decimal CostoEstandar,
    string UnidadSugerida,
    bool Activo);

public record ProductoUpsertRequest(
    string Nombre,
    string TipoRequisicionId,
    string? Descripcion,
    decimal CostoEstandar,
    string UnidadSugerida);

public record ImportResultDto(
    int Insertados,
    int Actualizados,
    int Omitidos,
    IReadOnlyList<string> Errores);

public record ProveedorDto(
    Guid Id,
    string Nombre,
    string? Nit,
    string? Correo,
    string? TelefonoTrabajo,
    string? TelefonoMovil,
    string? Direccion,
    string? Categoria,
    bool ResponsableIva,
    string? Telefono,
    bool Activo);

public record ProveedorUpsertRequest(
    string Nombre,
    string? Nit,
    string? Correo,
    string? TelefonoTrabajo,
    string? TelefonoMovil,
    string? Direccion,
    string? Categoria,
    bool ResponsableIva);

public record OrdenProduccionLookupDto(
    Guid Id,
    string OTNumber,
    string? Cliente,
    string? ProductName);

public record RequisicionListDto(
    Guid Id,
    string Codigo,
    string TipoRequisicionId,
    DateTime FechaSolicitud,
    string OrdenProduccionNumero,
    string Cliente,
    string Referencia,
    string ProductoNombre,
    decimal Cantidad,
    string Unidad,
    DateTime FechaRequerida,
    string? Observacion,
    string Estado,
    string? CreadoPorNombre,
    decimal? PrecioUnitario,
    decimal? TotalEstimado,
    IReadOnlyList<string> ProveedoresNombres,
    int ComentariosCount);

public record RequisicionDetailDto(
    Guid Id,
    string Codigo,
    string TipoRequisicionId,
    DateTime FechaSolicitud,
    string OrdenProduccionNumero,
    string Cliente,
    string Referencia,
    string ProductoNombre,
    decimal Cantidad,
    string Unidad,
    DateTime FechaRequerida,
    string? Observacion,
    string Estado,
    string? CreadoPorNombre,
    decimal? PrecioUnitario,
    decimal? TotalEstimado,
    IReadOnlyList<string> ProveedoresNombres,
    int ComentariosCount,
    Guid? ProductoId,
    Guid? CatalogoOpId,
    PedidoDto? Pedido,
    IReadOnlyList<RecepcionLineaDto> Recepciones) : RequisicionListDto(
        Id, Codigo, TipoRequisicionId, FechaSolicitud, OrdenProduccionNumero,
        Cliente, Referencia, ProductoNombre, Cantidad, Unidad, FechaRequerida,
        Observacion, Estado, CreadoPorNombre, PrecioUnitario, TotalEstimado,
        ProveedoresNombres, ComentariosCount);

public record RequisicionUpsertRequest(
    string TipoRequisicionId,
    DateTime FechaSolicitud,
    string OrdenProduccionNumero,
    Guid? CatalogoOpId,
    string Cliente,
    string Referencia,
    Guid? ProductoId,
    string ProductoNombre,
    decimal Cantidad,
    string Unidad,
    DateTime FechaRequerida,
    string? Observacion);

public record PedidoDto(
    Guid Id,
    DateTime FechaPedido,
    DateTime? FechaEntregaEstimada,
    decimal? PrecioUnitario,
    string? ProcesadoPorNombre,
    IReadOnlyList<PedidoProveedorDto> Proveedores);

public record PedidoProveedorDto(
    Guid Id,
    Guid? ProveedorCatalogoId,
    string Nombre,
    string? Nit,
    string? Telefono,
    decimal Cantidad,
    decimal PrecioUnitario,
    DateTime? FechaEntregaEstimada,
    bool Recibido,
    bool Pagado,
    string? FormaPago,
    string? NumeroOrdenCompra,
    Guid? OrdenCompraId,
    decimal CantidadRecibida,
    decimal SaldoPendiente);

public record GuardarPedidoRequest(
    DateTime FechaPedido,
    DateTime? FechaEntregaEstimada,
    IReadOnlyList<GuardarPedidoProveedorRequest> Proveedores);

public record GuardarPedidoProveedorRequest(
    Guid? ProveedorCatalogoId,
    string Nombre,
    string? Nit,
    string? Telefono,
    decimal Cantidad,
    decimal PrecioUnitario,
    DateTime? FechaEntregaEstimada);

public record PagadoProveedorRequest(bool Pagado, string? FormaPago);

public record RecepcionCreateRequest(
    Guid PedidoProveedorId,
    string CodigoUsuario,
    DateTime FechaLlegada,
    bool CalidadEsperada,
    string? MotivoCalidadNo,
    bool FacturaEntregada,
    string? MotivoFacturaNo,
    decimal CantidadRecibida,
    bool PedidoCompleto,
    string? MotivoCantidadParcial,
    DateTime? NuevaFechaEntrega);

public record RecepcionLineaDto(
    Guid Id,
    Guid PedidoProveedorId,
    string NombreProveedor,
    string CodigoUsuario,
    DateTime FechaLlegada,
    bool CalidadEsperada,
    string? MotivoCalidadNo,
    bool FacturaEntregada,
    string? MotivoFacturaNo,
    decimal CantidadRecibida,
    decimal CantidadPedidaEnMomento,
    bool PedidoCompleto,
    string? MotivoCantidadParcial,
    DateTime? NuevaFechaEntrega);

public record OrdenCompraListDto(
    Guid Id,
    string NumeroOrdenCompra,
    string NombreProveedor,
    string? NitProveedor,
    DateTime FechaPedido,
    DateTime? FechaEntregaEstimada,
    string Estado,
    bool Pagado,
    string? FormaPago,
    int LineasCount,
    decimal TotalValor);

public record OrdenCompraDetailDto(
    Guid Id,
    string NumeroOrdenCompra,
    string NombreProveedor,
    string? NitProveedor,
    string? TelefonoProveedor,
    DateTime FechaPedido,
    DateTime? FechaEntregaEstimada,
    string Estado,
    bool Pagado,
    string? FormaPago,
    IReadOnlyList<OrdenCompraLineaDetailDto> Lineas);

public record OrdenCompraLineaDetailDto(
    Guid Id,
    Guid RequisicionId,
    string RequisicionCodigo,
    string ProductoNombre,
    decimal Cantidad,
    decimal PrecioUnitario,
    decimal Subtotal);

public record ConsolidarOrdenCompraRequest(
    IReadOnlyList<Guid> RequisicionIds,
    Guid? ProveedorCatalogoId,
    string? NombreProveedor,
    string? Nit,
    DateTime FechaPedido,
    DateTime? FechaEntregaEstimada);