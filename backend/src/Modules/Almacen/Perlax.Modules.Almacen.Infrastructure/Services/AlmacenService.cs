using System.Data;
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Configuration;
using Npgsql;
using OfficeOpenXml;
using Perlax.Modules.Almacen.Application.Abstractions;
using Perlax.Modules.Almacen.Application.DTOs;
using Perlax.Modules.Almacen.Domain.Entities;
using Perlax.Modules.Almacen.Infrastructure.Persistence;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Almacen.Infrastructure.Services;

public class AlmacenService : IAlmacenService
{
    private readonly AlmacenDbContext _db;
    private readonly ProductionDbContext _productionDb;
    private readonly IConfiguration _configuration;
    private readonly AlmacenEmailService _email;

    public AlmacenService(
        AlmacenDbContext db,
        ProductionDbContext productionDb,
        IConfiguration configuration,
        AlmacenEmailService email)
    {
        _db = db;
        _productionDb = productionDb;
        _configuration = configuration;
        _email = email;
    }

    public Task<CatalogosResponse> GetCatalogosAsync(CancellationToken ct = default)
    {
        var tipos = AlmacenCatalog.TiposRequisicion
            .Select(t => new TipoRequisicionDto(t.Id, t.Label, t.Color))
            .ToList();
        var notificaciones = _configuration.GetSection("AlmacenNotificaciones:CorreosDestino").Get<string[]>()
            ?? Array.Empty<string>();
        return Task.FromResult(new CatalogosResponse(tipos, AlmacenCatalog.UnidadesMedida, notificaciones));
    }

    public async Task<IReadOnlyList<ProductoDto>> ListProductosAsync(string? tipo, string? q, string? unidad, CancellationToken ct = default)
    {
        var query = _db.Productos.AsNoTracking().Where(p => p.Activo);
        if (!string.IsNullOrWhiteSpace(tipo))
            query = query.Where(p => p.TipoRequisicionId == tipo.Trim());
        if (!string.IsNullOrWhiteSpace(unidad))
            query = query.Where(p => p.UnidadSugerida == unidad.Trim());
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLowerInvariant();
            query = query.Where(p => p.Nombre.ToLower().Contains(term) || (p.Descripcion != null && p.Descripcion.ToLower().Contains(term)));
        }

        var rows = await query.OrderBy(p => p.Nombre).ToListAsync(ct);
        return rows.Select(MapProducto).ToList();
    }

    public async Task<ProductoDto> CreateProductoAsync(ProductoUpsertRequest request, CancellationToken ct = default)
    {
        ValidateProductoRequest(request);
        await EnsureProductoNombreUnicoAsync(request.Nombre, null, ct);

        var entity = new AlmacenProducto
        {
            Id = Guid.NewGuid(),
            Nombre = request.Nombre.Trim(),
            TipoRequisicionId = request.TipoRequisicionId.Trim(),
            Descripcion = request.Descripcion?.Trim(),
            CostoEstandar = request.CostoEstandar,
            UnidadSugerida = request.UnidadSugerida.Trim(),
            Activo = true,
            FechaRegistro = DateTime.UtcNow
        };
        _db.Productos.Add(entity);
        await _db.SaveChangesAsync(ct);
        return MapProducto(entity);
    }

    public async Task<ProductoDto> UpdateProductoAsync(Guid id, ProductoUpsertRequest request, CancellationToken ct = default)
    {
        ValidateProductoRequest(request);
        var entity = await _db.Productos.FirstOrDefaultAsync(p => p.Id == id && p.Activo, ct)
            ?? throw new InvalidOperationException("Producto no encontrado.");
        await EnsureProductoNombreUnicoAsync(request.Nombre, id, ct);

        entity.Nombre = request.Nombre.Trim();
        entity.TipoRequisicionId = request.TipoRequisicionId.Trim();
        entity.Descripcion = request.Descripcion?.Trim();
        entity.CostoEstandar = request.CostoEstandar;
        entity.UnidadSugerida = request.UnidadSugerida.Trim();
        await _db.SaveChangesAsync(ct);
        return MapProducto(entity);
    }

    public async Task DeleteProductoAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Productos.FirstOrDefaultAsync(p => p.Id == id && p.Activo, ct)
            ?? throw new InvalidOperationException("Producto no encontrado.");
        var enUso = await _db.Requisiciones.AnyAsync(r => r.ProductoId == id, ct);
        if (enUso)
            throw new InvalidOperationException("No se puede eliminar el producto porque está referenciado en requisiciones.");

        entity.Activo = false;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<ImportResultDto> ImportProductosExcelAsync(IFormFile file, CancellationToken ct = default)
    {
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
        var insertados = 0;
        var actualizados = 0;
        var omitidos = 0;
        var errores = new List<string>();

        await using var stream = file.OpenReadStream();
        using var package = new ExcelPackage(stream);
        var ws = package.Workbook.Worksheets.FirstOrDefault()
            ?? throw new InvalidOperationException("El archivo Excel no contiene hojas.");

        var headers = ReadHeaders(ws);
        var colNombre = FindColumn(headers, "nombre", "producto", "insumo");
        var colCategoria = FindColumn(headers, "categoria", "tipo", "tiporequisicion");
        var colUnidad = FindColumn(headers, "unidad", "unidadsugerida");
        var colCosto = FindColumn(headers, "costo", "costoestandar", "precio");

        if (colNombre <= 0)
            throw new InvalidOperationException("No se encontró la columna 'nombre' en el Excel.");

        for (var row = 2; row <= ws.Dimension?.End.Row; row++)
        {
            var nombre = GetCell(ws, row, colNombre);
            if (string.IsNullOrWhiteSpace(nombre)) { omitidos++; continue; }

            try
            {
                var categoria = colCategoria > 0 ? GetCell(ws, row, colCategoria) : string.Empty;
                var tipoId = ResolveTipoRequisicion(categoria);
                var unidad = colUnidad > 0 ? GetCell(ws, row, colUnidad) : "unidades";
                if (string.IsNullOrWhiteSpace(unidad)) unidad = "unidades";
                var costo = colCosto > 0 ? ParseDecimal(GetCell(ws, row, colCosto)) : 0m;

                var normalized = AlmacenCatalog.NormalizeName(nombre);
                var activos = await _db.Productos.Where(p => p.Activo).ToListAsync(ct);
                var existing = activos.FirstOrDefault(p => AlmacenCatalog.NormalizeName(p.Nombre) == normalized);

                if (existing == null)
                {
                    _db.Productos.Add(new AlmacenProducto
                    {
                        Id = Guid.NewGuid(),
                        Nombre = nombre.Trim(),
                        TipoRequisicionId = tipoId,
                        CostoEstandar = costo,
                        UnidadSugerida = unidad.Trim(),
                        Activo = true,
                        FechaRegistro = DateTime.UtcNow
                    });
                    insertados++;
                }
                else
                {
                    existing.TipoRequisicionId = tipoId;
                    existing.CostoEstandar = costo;
                    existing.UnidadSugerida = unidad.Trim();
                    actualizados++;
                }
            }
            catch (Exception ex)
            {
                errores.Add($"Fila {row}: {ex.Message}");
                omitidos++;
            }
        }

        await _db.SaveChangesAsync(ct);
        return new ImportResultDto(insertados, actualizados, omitidos, errores);
    }

    public async Task<IReadOnlyList<ProveedorDto>> ListProveedoresAsync(string? q, int limit, CancellationToken ct = default)
    {
        limit = Math.Clamp(limit <= 0 ? 50 : limit, 1, 200);
        var query = _db.Proveedores.AsNoTracking().Where(p => p.Activo);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLowerInvariant();
            query = query.Where(p =>
                p.Nombre.ToLower().Contains(term) ||
                (p.Nit != null && p.Nit.Contains(term)) ||
                (p.Correo != null && p.Correo.ToLower().Contains(term)));
        }

        var rows = await query.OrderBy(p => p.Nombre).Take(limit).ToListAsync(ct);
        return rows.Select(MapProveedor).ToList();
    }

    public async Task<ProveedorDto> CreateProveedorAsync(ProveedorUpsertRequest request, CancellationToken ct = default)
    {
        ValidateProveedorRequest(request);
        var entity = MapProveedorEntity(new AlmacenProveedor { Id = Guid.NewGuid(), Activo = true, FechaRegistro = DateTime.UtcNow }, request);
        _db.Proveedores.Add(entity);
        await _db.SaveChangesAsync(ct);
        return MapProveedor(entity);
    }

    public async Task<ProveedorDto> UpdateProveedorAsync(Guid id, ProveedorUpsertRequest request, CancellationToken ct = default)
    {
        ValidateProveedorRequest(request);
        var entity = await _db.Proveedores.FirstOrDefaultAsync(p => p.Id == id && p.Activo, ct)
            ?? throw new InvalidOperationException("Proveedor no encontrado.");

        MapProveedorEntity(entity, request);
        await SyncProveedorSnapshotAsync(entity, ct);
        await _db.SaveChangesAsync(ct);
        return MapProveedor(entity);
    }

    public async Task DeleteProveedorAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Proveedores.FirstOrDefaultAsync(p => p.Id == id && p.Activo, ct)
            ?? throw new InvalidOperationException("Proveedor no encontrado.");
        var referenciado = await _db.PedidoProveedores.AnyAsync(pp => pp.ProveedorCatalogoId == id, ct);
        if (referenciado)
            throw new InvalidOperationException("No se puede eliminar el proveedor porque está asociado a pedidos.");

        entity.Activo = false;
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteAllProveedoresAsync(CancellationToken ct = default)
    {
        var referenciados = await _db.PedidoProveedores.AnyAsync(pp => pp.ProveedorCatalogoId != null, ct);
        if (referenciados)
            throw new InvalidOperationException("No se pueden eliminar todos los proveedores porque algunos están asociados a pedidos.");

        await _db.Proveedores.Where(p => p.Activo).ExecuteUpdateAsync(s => s.SetProperty(p => p.Activo, false), ct);
    }

    public async Task<ImportResultDto> ImportProveedoresExcelAsync(IFormFile file, CancellationToken ct = default)
    {
        ExcelPackage.LicenseContext = LicenseContext.NonCommercial;
        var insertados = 0;
        var actualizados = 0;
        var omitidos = 0;
        var errores = new List<string>();

        await using var stream = file.OpenReadStream();
        using var package = new ExcelPackage(stream);
        var ws = package.Workbook.Worksheets.FirstOrDefault()
            ?? throw new InvalidOperationException("El archivo Excel no contiene hojas.");

        var headers = ReadHeaders(ws);
        var colNombre = FindColumn(headers, "nombre", "compania", "compañía", "proveedor", "razon social", "razón social", "empresa");
        var colNit = FindColumn(headers, "nit", "documento", "identificacion", "identificación");
        var colCorreo = FindColumn(headers, "correo", "email", "e-mail");
        var colTelTrabajo = FindColumn(headers, "telefonotrabajo", "tel trabajo", "telefono trabajo", "teléfono trabajo");
        var colTelMovil = FindColumn(headers, "telefonomovil", "celular", "movil", "móvil");
        var colDireccion = FindColumn(headers, "direccion", "dirección", "address");
        var colCategoria = FindColumn(headers, "categoria", "categoría");
        var colTelefono = FindColumn(headers, "telefono", "teléfono", "phone");

        if (colNombre <= 0)
            throw new InvalidOperationException("No se encontró columna de nombre (Compañía/Proveedor/Nombre).");

        for (var row = 2; row <= ws.Dimension?.End.Row; row++)
        {
            var nombre = GetCell(ws, row, colNombre);
            if (string.IsNullOrWhiteSpace(nombre)) { omitidos++; continue; }

            try
            {
                var nit = colNit > 0 ? NullIfEmpty(GetCell(ws, row, colNit)) : null;
                var normalized = AlmacenCatalog.NormalizeName(nombre);
                var existing = await FindProveedorByMatchAsync(null, nombre, nit, ct);

                if (existing == null)
                {
                    _db.Proveedores.Add(new AlmacenProveedor
                    {
                        Id = Guid.NewGuid(),
                        Nombre = nombre.Trim(),
                        Nit = nit,
                        Correo = colCorreo > 0 ? NullIfEmpty(GetCell(ws, row, colCorreo)) : null,
                        TelefonoTrabajo = colTelTrabajo > 0 ? NullIfEmpty(GetCell(ws, row, colTelTrabajo)) : null,
                        TelefonoMovil = colTelMovil > 0 ? NullIfEmpty(GetCell(ws, row, colTelMovil)) : null,
                        Direccion = colDireccion > 0 ? NullIfEmpty(GetCell(ws, row, colDireccion)) : null,
                        Categoria = colCategoria > 0 ? NullIfEmpty(GetCell(ws, row, colCategoria)) : null,
                        Telefono = colTelefono > 0 ? NullIfEmpty(GetCell(ws, row, colTelefono)) : null,
                        Activo = true,
                        FechaRegistro = DateTime.UtcNow
                    });
                    insertados++;
                }
                else
                {
                    existing.Nombre = nombre.Trim();
                    existing.Nit = nit ?? existing.Nit;
                    if (colCorreo > 0) existing.Correo = NullIfEmpty(GetCell(ws, row, colCorreo));
                    if (colTelTrabajo > 0) existing.TelefonoTrabajo = NullIfEmpty(GetCell(ws, row, colTelTrabajo));
                    if (colTelMovil > 0) existing.TelefonoMovil = NullIfEmpty(GetCell(ws, row, colTelMovil));
                    if (colDireccion > 0) existing.Direccion = NullIfEmpty(GetCell(ws, row, colDireccion));
                    if (colCategoria > 0) existing.Categoria = NullIfEmpty(GetCell(ws, row, colCategoria));
                    if (colTelefono > 0) existing.Telefono = NullIfEmpty(GetCell(ws, row, colTelefono));
                    actualizados++;
                }
            }
            catch (Exception ex)
            {
                errores.Add($"Fila {row}: {ex.Message}");
                omitidos++;
            }
        }

        await _db.SaveChangesAsync(ct);
        return new ImportResultDto(insertados, actualizados, omitidos, errores);
    }

    public async Task<IReadOnlyList<OrdenProduccionLookupDto>> SearchOrdenesProduccionAsync(string? q, int limit, CancellationToken ct = default)
    {
        limit = Math.Clamp(limit <= 0 ? 30 : limit, 1, 100);
        var query = _productionDb.ProductionOrders.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLowerInvariant();
            query = query.Where(o =>
                o.OTNumber.ToLower().Contains(term) ||
                o.Cliente.ToLower().Contains(term) ||
                o.ProductName.ToLower().Contains(term));
        }

        return await query
            .OrderByDescending(o => o.CreatedAt)
            .Take(limit)
            .Select(o => new OrdenProduccionLookupDto(o.Id, o.OTNumber, o.Cliente, o.ProductName))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<RequisicionListDto>> ListRequisicionesAsync(string? tipo, string? estado, string? q, CancellationToken ct = default)
    {
        var rows = await LoadRequisicionesQuery(tipo, estado, q)
            .OrderByDescending(r => r.FechaRegistro)
            .ToListAsync(ct);
        return rows.Select(r => MapRequisicionList(r)).ToList();
    }

    public async Task<RequisicionDetailDto> GetRequisicionAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await LoadRequisicionTrackedAsync(id, ct)
            ?? throw new InvalidOperationException("Requisición no encontrada.");
        return MapRequisicionDetail(entity);
    }

    public async Task<RequisicionDetailDto> CreateRequisicionAsync(RequisicionUpsertRequest request, AlmacenUserContext user, CancellationToken ct = default)
    {
        ValidateRequisicionRequest(request);
        var (anio, secuencia, codigo) = await NextRequisicionCodigoAsync(ToUtc(request.FechaSolicitud), ct);

        var entity = new AlmacenRequisicion
        {
            Id = Guid.NewGuid(),
            Codigo = codigo,
            AnioCodigo = anio,
            SecuenciaCodigo = secuencia,
            TipoRequisicionId = request.TipoRequisicionId.Trim(),
            FechaSolicitud = ToUtc(request.FechaSolicitud),
            OrdenProduccionNumero = request.OrdenProduccionNumero.Trim(),
            CatalogoOpId = request.CatalogoOpId,
            Cliente = request.Cliente.Trim(),
            Referencia = request.Referencia.Trim(),
            ProductoId = request.ProductoId,
            ProductoNombre = request.ProductoNombre.Trim(),
            Cantidad = request.Cantidad,
            Unidad = request.Unidad.Trim(),
            FechaRequerida = ToUtc(request.FechaRequerida),
            Observacion = request.Observacion?.Trim(),
            Estado = AlmacenCatalog.EstadoPendiente,
            FechaRegistro = DateTime.UtcNow,
            CreadoPorId = user.UserId,
            CreadoPorNombre = user.UserName
        };

        _db.Requisiciones.Add(entity);
        await _db.SaveChangesAsync(ct);
        _email.NotifyNuevaRequisicion(entity);
        return MapRequisicionDetail(entity);
    }

    public async Task<RequisicionDetailDto> UpdateRequisicionAsync(Guid id, RequisicionUpsertRequest request, CancellationToken ct = default)
    {
        ValidateRequisicionRequest(request);
        var entity = await _db.Requisiciones.FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new InvalidOperationException("Requisición no encontrada.");
        if (entity.Estado != AlmacenCatalog.EstadoPendiente)
            throw new InvalidOperationException("Solo se pueden editar requisiciones en estado Pendiente.");

        entity.TipoRequisicionId = request.TipoRequisicionId.Trim();
        entity.FechaSolicitud = ToUtc(request.FechaSolicitud);
        entity.OrdenProduccionNumero = request.OrdenProduccionNumero.Trim();
        entity.CatalogoOpId = request.CatalogoOpId;
        entity.Cliente = request.Cliente.Trim();
        entity.Referencia = request.Referencia.Trim();
        entity.ProductoId = request.ProductoId;
        entity.ProductoNombre = request.ProductoNombre.Trim();
        entity.Cantidad = request.Cantidad;
        entity.Unidad = request.Unidad.Trim();
        entity.FechaRequerida = ToUtc(request.FechaRequerida);
        entity.Observacion = request.Observacion?.Trim();

        await _db.SaveChangesAsync(ct);
        return MapRequisicionDetail(await LoadRequisicionTrackedAsync(id, ct) ?? entity);
    }

    public async Task DeleteRequisicionAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.Requisiciones
            .Include(r => r.Pedido)
            .Include(r => r.Recepciones)
            .FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new InvalidOperationException("Requisición no encontrada.");
        if (entity.Estado != AlmacenCatalog.EstadoPendiente)
            throw new InvalidOperationException("Solo se pueden eliminar requisiciones en estado Pendiente.");

        _db.Requisiciones.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<RequisicionDetailDto> GuardarPedidoAsync(Guid requisicionId, GuardarPedidoRequest request, AlmacenUserContext user, CancellationToken ct = default)
    {
        ValidateGuardarPedidoRequest(request);
        var entity = await LoadRequisicionTrackedAsync(requisicionId, ct)
            ?? throw new InvalidOperationException("Requisición no encontrada.");
        if (entity.Estado == AlmacenCatalog.EstadoEnAlmacen)
            throw new InvalidOperationException("La requisición en estado En Almacen es de solo lectura.");

        var multiProveedor = request.Proveedores.Count > 1;
        foreach (var p in request.Proveedores)
        {
            if (string.IsNullOrWhiteSpace(p.Nombre))
                throw new InvalidOperationException("Cada proveedor debe tener nombre.");
            if (p.Cantidad <= 0)
                throw new InvalidOperationException("La cantidad de cada proveedor debe ser mayor a cero.");
            if (multiProveedor && !p.FechaEntregaEstimada.HasValue)
                throw new InvalidOperationException("Con múltiples proveedores, la fecha de entrega estimada es obligatoria para cada uno.");
        }

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            var pedido = entity.Pedido;
            if (pedido == null)
            {
                pedido = new AlmacenPedido
                {
                    Id = Guid.NewGuid(),
                    RequisicionId = entity.Id,
                    FechaRegistro = DateTime.UtcNow
                };
                _db.Pedidos.Add(pedido);
                entity.Pedido = pedido;
            }

            pedido.FechaPedido = ToUtc(request.FechaPedido);
            pedido.FechaEntregaEstimada = request.FechaEntregaEstimada.HasValue ? ToUtc(request.FechaEntregaEstimada.Value) : null;
            pedido.ProcesadoPorId = user.UserId;
            pedido.ProcesadoPorNombre = user.UserName;

            var incomingIds = request.Proveedores.Where(p => p.ProveedorCatalogoId.HasValue).Select(p => p.ProveedorCatalogoId!.Value).ToHashSet();
            var toRemove = pedido.Proveedores
                .Where(pp => !request.Proveedores.Any(r =>
                    (r.ProveedorCatalogoId.HasValue && r.ProveedorCatalogoId == pp.ProveedorCatalogoId) ||
                    AlmacenCatalog.NormalizeName(r.Nombre) == AlmacenCatalog.NormalizeName(pp.Nombre)))
                .ToList();

            foreach (var old in toRemove)
            {
                var tieneRecepciones = entity.Recepciones.Any(r => r.PedidoProveedorId == old.Id);
                if (tieneRecepciones)
                    throw new InvalidOperationException($"No se puede quitar el proveedor '{old.Nombre}' porque ya tiene recepciones.");

                if (old.OrdenCompraId.HasValue)
                {
                    var linea = await _db.OrdenCompraLineas.FirstOrDefaultAsync(l => l.PedidoProveedorId == old.Id, ct);
                    if (linea != null) _db.OrdenCompraLineas.Remove(linea);
                    await CleanupOrdenCompraIfEmptyAsync(old.OrdenCompraId.Value, ct);
                }
                _db.PedidoProveedores.Remove(old);
            }

            decimal totalCantidad = 0;
            decimal totalValor = 0;
            var orden = 1;

            foreach (var input in request.Proveedores)
            {
                var catalogoId = await UpsertProveedorCatalogoAsync(input.ProveedorCatalogoId, input.Nombre, input.Nit, input.Telefono, ct);
                var proveedorEntity = catalogoId.HasValue
                    ? await _db.Proveedores.AsNoTracking().FirstOrDefaultAsync(p => p.Id == catalogoId.Value, ct)
                    : null;

                var pp = pedido.Proveedores.FirstOrDefault(x =>
                    (catalogoId.HasValue && x.ProveedorCatalogoId == catalogoId) ||
                    AlmacenCatalog.NormalizeName(x.Nombre) == AlmacenCatalog.NormalizeName(input.Nombre));

                if (pp == null)
                {
                    pp = new AlmacenPedidoProveedor
                    {
                        Id = Guid.NewGuid(),
                        PedidoId = pedido.Id
                    };
                    pedido.Proveedores.Add(pp);
                }

                pp.ProveedorCatalogoId = catalogoId;
                pp.Nombre = proveedorEntity?.Nombre ?? input.Nombre.Trim();
                pp.Nit = proveedorEntity?.Nit ?? NullIfEmpty(input.Nit);
                pp.Telefono = proveedorEntity?.Telefono ?? proveedorEntity?.TelefonoTrabajo ?? NullIfEmpty(input.Telefono);
                pp.Cantidad = input.Cantidad;
                pp.PrecioUnitario = input.PrecioUnitario;
                pp.FechaEntregaEstimada = input.FechaEntregaEstimada.HasValue ? ToUtc(input.FechaEntregaEstimada.Value) : pedido.FechaEntregaEstimada;

                totalCantidad += input.Cantidad;
                totalValor += input.Cantidad * input.PrecioUnitario;

                var oc = await FindOrCreateOrdenCompraAsync(
                    pp, catalogoId, pp.Nombre, pp.Nit, pp.Telefono,
                    pedido.FechaPedido, pp.FechaEntregaEstimada, user, ct);

                pp.OrdenCompraId = oc.Id;
                pp.NumeroOrdenCompra = oc.NumeroOrdenCompra;

                var lineaExists = await _db.OrdenCompraLineas.AnyAsync(l => l.PedidoProveedorId == pp.Id, ct);
                if (!lineaExists)
                {
                    _db.OrdenCompraLineas.Add(new AlmacenOrdenCompraLinea
                    {
                        Id = Guid.NewGuid(),
                        OrdenCompraId = oc.Id,
                        PedidoProveedorId = pp.Id,
                        RequisicionId = entity.Id,
                        Orden = orden++
                    });
                }

                pp.Recibido = GetCantidadRecibida(entity, pp.Id) >= pp.Cantidad;
            }

            pedido.PrecioUnitario = totalCantidad > 0 ? Math.Round(totalValor / totalCantidad, 2) : null;
            entity.Estado = RecalcEstado(entity, pedido);
            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            var parcialRestante = entity.Estado is AlmacenCatalog.EstadoParcial or AlmacenCatalog.EstadoPedido;
            _email.NotifyPedido(entity, pedido, parcialRestante);
            return MapRequisicionDetail(await LoadRequisicionTrackedAsync(requisicionId, ct) ?? entity);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task PatchPagadoProveedorAsync(Guid requisicionId, Guid proveedorId, PagadoProveedorRequest request, CancellationToken ct = default)
    {
        var pp = await _db.PedidoProveedores
            .Include(x => x.Pedido)
            .FirstOrDefaultAsync(x => x.Id == proveedorId && x.Pedido!.RequisicionId == requisicionId, ct)
            ?? throw new InvalidOperationException("Proveedor de pedido no encontrado.");

        if (request.Pagado && string.IsNullOrWhiteSpace(request.FormaPago))
            throw new InvalidOperationException("La forma de pago es obligatoria cuando se marca como pagado.");
        if (request.Pagado && !AlmacenCatalog.FormasPago.Contains(request.FormaPago!.Trim().ToLowerInvariant()))
            throw new InvalidOperationException("Forma de pago inválida. Use 'credito' o 'efectivo'.");

        pp.Pagado = request.Pagado;
        pp.FormaPago = request.Pagado ? request.FormaPago!.Trim().ToLowerInvariant() : null;

        if (pp.OrdenCompraId.HasValue)
        {
            var oc = await _db.OrdenesCompra.FirstOrDefaultAsync(o => o.Id == pp.OrdenCompraId.Value, ct);
            if (oc != null)
            {
                var ppIds = await _db.OrdenCompraLineas.Where(l => l.OrdenCompraId == oc.Id)
                    .Select(l => l.PedidoProveedorId).ToListAsync(ct);
                var allPaid = await _db.PedidoProveedores.Where(p => ppIds.Contains(p.Id)).AllAsync(p => p.Pagado, ct);
                oc.Pagado = allPaid;
                oc.FormaPago = pp.FormaPago;
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task<RequisicionDetailDto> RegistrarRecepcionAsync(Guid requisicionId, RecepcionCreateRequest request, AlmacenUserContext user, CancellationToken ct = default)
    {
        var entity = await LoadRequisicionTrackedAsync(requisicionId, ct)
            ?? throw new InvalidOperationException("Requisición no encontrada.");
        if (entity.Pedido == null)
            throw new InvalidOperationException("La requisición no tiene pedido registrado.");
        if (entity.Estado == AlmacenCatalog.EstadoPendiente)
            throw new InvalidOperationException("No se puede registrar recepción en estado Pendiente.");

        var pp = entity.Pedido.Proveedores.FirstOrDefault(p => p.Id == request.PedidoProveedorId)
            ?? throw new InvalidOperationException("Proveedor de pedido no encontrado.");

        var saldo = GetSaldoPendiente(entity, pp);
        if (saldo <= 0)
            throw new InvalidOperationException("El proveedor no tiene saldo pendiente por recibir.");

        if (request.CantidadRecibida <= 0)
            throw new InvalidOperationException("La cantidad recibida debe ser mayor a cero.");
        if (request.CantidadRecibida > saldo)
            throw new InvalidOperationException("La cantidad recibida no puede superar el saldo pendiente.");
        if (request.PedidoCompleto && request.CantidadRecibida < saldo)
            throw new InvalidOperationException("Si el pedido está completo, la cantidad recibida debe cubrir todo el saldo.");
        if (!request.PedidoCompleto && string.IsNullOrWhiteSpace(request.MotivoCantidadParcial))
            throw new InvalidOperationException("Debe indicar el motivo de la recepción parcial.");
        if (!request.CalidadEsperada && string.IsNullOrWhiteSpace(request.MotivoCalidadNo))
            throw new InvalidOperationException("Debe indicar el motivo cuando la calidad no es la esperada.");
        if (!request.FacturaEntregada && string.IsNullOrWhiteSpace(request.MotivoFacturaNo))
            throw new InvalidOperationException("Debe indicar el motivo cuando no se entrega factura.");
        if (string.IsNullOrWhiteSpace(request.CodigoUsuario))
            throw new InvalidOperationException("El código de usuario (guía/remisión) es obligatorio.");

        var codigo = request.CodigoUsuario.Trim();
        var duplicado = entity.Recepciones.Any(r =>
            r.PedidoProveedorId == pp.Id &&
            string.Equals(r.CodigoUsuario.Trim(), codigo, StringComparison.OrdinalIgnoreCase));
        if (duplicado)
            throw new InvalidOperationException("Ya existe una recepción con el mismo código para este proveedor.");

        var recepcion = new AlmacenRecepcionLinea
        {
            Id = Guid.NewGuid(),
            RequisicionId = entity.Id,
            PedidoProveedorId = pp.Id,
            NombreProveedor = pp.Nombre,
            CodigoUsuario = codigo,
            FechaLlegada = ToUtc(request.FechaLlegada),
            CalidadEsperada = request.CalidadEsperada,
            MotivoCalidadNo = request.MotivoCalidadNo?.Trim(),
            FacturaEntregada = request.FacturaEntregada,
            MotivoFacturaNo = request.MotivoFacturaNo?.Trim(),
            CantidadRecibida = request.CantidadRecibida,
            CantidadPedidaEnMomento = pp.Cantidad,
            PedidoCompleto = request.PedidoCompleto,
            MotivoCantidadParcial = request.MotivoCantidadParcial?.Trim(),
            NuevaFechaEntrega = request.NuevaFechaEntrega.HasValue ? ToUtc(request.NuevaFechaEntrega.Value) : null,
            FechaRegistro = DateTime.UtcNow,
            RegistradoPorId = user.UserId,
            RegistradoPorNombre = user.UserName
        };

        _db.RecepcionLineas.Add(recepcion);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException ex) when (ex.InnerException is PostgresException pg && pg.SqlState == PostgresErrorCodes.UniqueViolation)
        {
            throw new InvalidOperationException("Ya existe una recepción con el mismo código para este proveedor.");
        }

        pp.Recibido = GetSaldoPendiente(entity, pp) - request.CantidadRecibida <= 0;
        if (!request.PedidoCompleto && request.NuevaFechaEntrega.HasValue)
            pp.FechaEntregaEstimada = ToUtc(request.NuevaFechaEntrega.Value);

        entity.Estado = RecalcEstado(entity, entity.Pedido);
        await _db.SaveChangesAsync(ct);

        var completa = entity.Estado == AlmacenCatalog.EstadoEnAlmacen;
        _email.NotifyRecepcion(entity, recepcion, request.PedidoCompleto && pp.Recibido);
        if (!completa && pp.Recibido)
            _email.NotifyPedido(entity, entity.Pedido, parcialRestante: true);

        return MapRequisicionDetail(await LoadRequisicionTrackedAsync(requisicionId, ct) ?? entity);
    }

    public async Task DeletePedidoAsync(Guid requisicionId, CancellationToken ct = default)
    {
        var entity = await LoadRequisicionTrackedAsync(requisicionId, ct)
            ?? throw new InvalidOperationException("Requisición no encontrada.");
        if (entity.Pedido == null)
            throw new InvalidOperationException("La requisición no tiene pedido.");
        if (entity.Recepciones.Count > 0)
            throw new InvalidOperationException("No se puede revertir el pedido porque ya existen recepciones.");

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            var ocIds = entity.Pedido.Proveedores.Where(p => p.OrdenCompraId.HasValue).Select(p => p.OrdenCompraId!.Value).Distinct().ToList();
            foreach (var pp in entity.Pedido.Proveedores.ToList())
            {
                var linea = await _db.OrdenCompraLineas.FirstOrDefaultAsync(l => l.PedidoProveedorId == pp.Id, ct);
                if (linea != null) _db.OrdenCompraLineas.Remove(linea);
            }

            _db.Pedidos.Remove(entity.Pedido);
            entity.Pedido = null;
            entity.Estado = AlmacenCatalog.EstadoPendiente;
            await _db.SaveChangesAsync(ct);

            foreach (var ocId in ocIds)
                await CleanupOrdenCompraIfEmptyAsync(ocId, ct);

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task<IReadOnlyList<OrdenCompraListDto>> ListOrdenesCompraAsync(
        string? estado, Guid? proveedorCatalogoId, string? nombreProveedor, string? nit, CancellationToken ct = default)
    {
        var query = _db.OrdenesCompra.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(estado))
            query = query.Where(o => o.Estado == estado.Trim());
        if (proveedorCatalogoId.HasValue)
            query = query.Where(o => o.ProveedorCatalogoId == proveedorCatalogoId);
        if (!string.IsNullOrWhiteSpace(nombreProveedor))
        {
            var n = AlmacenCatalog.NormalizeName(nombreProveedor);
            query = query.Where(o => o.NombreProveedor.ToUpper() == n);
        }
        if (!string.IsNullOrWhiteSpace(nit))
            query = query.Where(o => o.NitProveedor == nit.Trim());

        var rows = await query.OrderByDescending(o => o.FechaRegistro).ToListAsync(ct);
        var result = new List<OrdenCompraListDto>();
        foreach (var oc in rows)
        {
            var lineas = await _db.OrdenCompraLineas.AsNoTracking().Where(l => l.OrdenCompraId == oc.Id).ToListAsync(ct);
            var ppIds = lineas.Select(l => l.PedidoProveedorId).ToList();
            var pps = await _db.PedidoProveedores.AsNoTracking().Where(p => ppIds.Contains(p.Id)).ToListAsync(ct);
            result.Add(new OrdenCompraListDto(
                oc.Id, oc.NumeroOrdenCompra, oc.NombreProveedor, oc.NitProveedor,
                oc.FechaPedido, oc.FechaEntregaEstimada, oc.Estado, oc.Pagado, oc.FormaPago,
                lineas.Count, pps.Sum(p => p.Cantidad * p.PrecioUnitario)));
        }
        return result;
    }

    public async Task<OrdenCompraDetailDto> GetOrdenCompraAsync(Guid id, CancellationToken ct = default)
    {
        var oc = await _db.OrdenesCompra.AsNoTracking().FirstOrDefaultAsync(o => o.Id == id, ct)
            ?? throw new InvalidOperationException("Orden de compra no encontrada.");
        return await MapOrdenCompraDetailAsync(oc, ct);
    }

    public async Task<OrdenCompraDetailDto> ConsolidarOrdenCompraAsync(ConsolidarOrdenCompraRequest request, AlmacenUserContext user, CancellationToken ct = default)
    {
        if (request.RequisicionIds == null || request.RequisicionIds.Count < 2)
            throw new InvalidOperationException("Se requieren al menos 2 requisiciones para consolidar.");

        var ids = request.RequisicionIds.Distinct().ToList();
        var requisiciones = await _db.Requisiciones
            .Include(r => r.Pedido)
            .Where(r => ids.Contains(r.Id))
            .ToListAsync(ct);

        if (requisiciones.Count != ids.Count)
            throw new InvalidOperationException("Una o más requisiciones no existen.");
        if (requisiciones.Any(r => r.Estado != AlmacenCatalog.EstadoPendiente || r.Pedido != null))
            throw new InvalidOperationException("Todas las requisiciones deben estar en estado Pendiente sin pedido.");

        var catalogoId = await UpsertProveedorCatalogoAsync(
            request.ProveedorCatalogoId, request.NombreProveedor ?? string.Empty, request.Nit, null, ct);
        var proveedor = catalogoId.HasValue
            ? await _db.Proveedores.AsNoTracking().FirstAsync(p => p.Id == catalogoId.Value, ct)
            : null;
        var nombreProveedor = proveedor?.Nombre ?? request.NombreProveedor?.Trim()
            ?? throw new InvalidOperationException("El nombre del proveedor es obligatorio.");

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            var numeroOc = await NextNumeroOrdenCompraAsync(ct);
            var oc = new AlmacenOrdenCompra
            {
                Id = Guid.NewGuid(),
                NumeroOrdenCompra = numeroOc,
                ProveedorCatalogoId = catalogoId,
                NombreProveedor = nombreProveedor,
                NitProveedor = proveedor?.Nit ?? NullIfEmpty(request.Nit),
                TelefonoProveedor = proveedor?.Telefono ?? proveedor?.TelefonoTrabajo,
                FechaPedido = ToUtc(request.FechaPedido),
                FechaEntregaEstimada = request.FechaEntregaEstimada.HasValue ? ToUtc(request.FechaEntregaEstimada.Value) : null,
                Estado = AlmacenCatalog.OcEmitida,
                FechaRegistro = DateTime.UtcNow,
                CreadoPorId = user.UserId,
                CreadoPorNombre = user.UserName
            };
            _db.OrdenesCompra.Add(oc);

            var orden = 1;
            foreach (var req in requisiciones)
            {
                var pedido = new AlmacenPedido
                {
                    Id = Guid.NewGuid(),
                    RequisicionId = req.Id,
                    FechaPedido = ToUtc(request.FechaPedido),
                    FechaEntregaEstimada = oc.FechaEntregaEstimada,
                    PrecioUnitario = null,
                    ProcesadoPorId = user.UserId,
                    ProcesadoPorNombre = user.UserName,
                    FechaRegistro = DateTime.UtcNow
                };
                _db.Pedidos.Add(pedido);

                var pp = new AlmacenPedidoProveedor
                {
                    Id = Guid.NewGuid(),
                    PedidoId = pedido.Id,
                    ProveedorCatalogoId = catalogoId,
                    Nombre = nombreProveedor,
                    Nit = oc.NitProveedor,
                    Telefono = oc.TelefonoProveedor,
                    Cantidad = req.Cantidad,
                    PrecioUnitario = 0,
                    FechaEntregaEstimada = oc.FechaEntregaEstimada,
                    OrdenCompraId = oc.Id,
                    NumeroOrdenCompra = oc.NumeroOrdenCompra
                };
                _db.PedidoProveedores.Add(pp);

                _db.OrdenCompraLineas.Add(new AlmacenOrdenCompraLinea
                {
                    Id = Guid.NewGuid(),
                    OrdenCompraId = oc.Id,
                    PedidoProveedorId = pp.Id,
                    RequisicionId = req.Id,
                    Orden = orden++
                });

                req.Estado = AlmacenCatalog.EstadoPedido;
            }

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);

            foreach (var req in requisiciones)
            {
                var pedido = await _db.Pedidos.Include(p => p.Proveedores).FirstAsync(p => p.RequisicionId == req.Id, ct);
                _email.NotifyPedido(req, pedido, parcialRestante: false);
            }

            return await MapOrdenCompraDetailAsync(oc, ct);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task<int> RepararAsignacionesAsync(CancellationToken ct = default)
    {
        var reparadas = 0;
        var pps = await _db.PedidoProveedores.ToListAsync(ct);
        foreach (var pp in pps)
        {
            if (pp.OrdenCompraId.HasValue)
            {
                var oc = await _db.OrdenesCompra.FirstOrDefaultAsync(o => o.Id == pp.OrdenCompraId.Value, ct);
                if (oc != null && pp.NumeroOrdenCompra != oc.NumeroOrdenCompra)
                {
                    pp.NumeroOrdenCompra = oc.NumeroOrdenCompra;
                    reparadas++;
                }

                var lineaExists = await _db.OrdenCompraLineas.AnyAsync(l => l.PedidoProveedorId == pp.Id, ct);
                if (!lineaExists)
                {
                    var pedido = await _db.Pedidos.FirstAsync(p => p.Id == pp.PedidoId, ct);
                    _db.OrdenCompraLineas.Add(new AlmacenOrdenCompraLinea
                    {
                        Id = Guid.NewGuid(),
                        OrdenCompraId = pp.OrdenCompraId.Value,
                        PedidoProveedorId = pp.Id,
                        RequisicionId = pedido.RequisicionId,
                        Orden = 1
                    });
                    reparadas++;
                }
            }
            else if (!string.IsNullOrWhiteSpace(pp.NumeroOrdenCompra))
            {
                var oc = await _db.OrdenesCompra.FirstOrDefaultAsync(o => o.NumeroOrdenCompra == pp.NumeroOrdenCompra, ct);
                if (oc != null)
                {
                    pp.OrdenCompraId = oc.Id;
                    reparadas++;
                }
            }
        }

        await _db.SaveChangesAsync(ct);
        return reparadas;
    }

    public async Task ResetPruebasAsync(CancellationToken ct = default)
    {
        await _db.Database.ExecuteSqlRawAsync("""
            TRUNCATE TABLE
                almacen."RecepcionLineas",
                almacen."OrdenCompraLineas",
                almacen."PedidoProveedores",
                almacen."Pedidos",
                almacen."OrdenesCompra",
                almacen."Requisiciones"
            RESTART IDENTITY CASCADE;
            UPDATE almacen."OrdenCompraConsecutivo" SET "UltimoNumero" = 0 WHERE "Id" = 1;
            """, ct);
    }

    private IQueryable<AlmacenRequisicion> LoadRequisicionesQuery(string? tipo, string? estado, string? q)
    {
        var query = _db.Requisiciones.AsNoTracking()
            .Include(r => r.Pedido!).ThenInclude(p => p.Proveedores)
            .Include(r => r.Recepciones)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(tipo))
            query = query.Where(r => r.TipoRequisicionId == tipo.Trim());
        if (!string.IsNullOrWhiteSpace(estado))
            query = query.Where(r => r.Estado == estado.Trim());
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLowerInvariant();
            query = query.Where(r =>
                r.Codigo.ToLower().Contains(term) ||
                r.ProductoNombre.ToLower().Contains(term) ||
                r.OrdenProduccionNumero.ToLower().Contains(term) ||
                r.Cliente.ToLower().Contains(term));
        }
        return query;
    }

    private async Task<AlmacenRequisicion?> LoadRequisicionTrackedAsync(Guid id, CancellationToken ct) =>
        await _db.Requisiciones
            .Include(r => r.Pedido!).ThenInclude(p => p.Proveedores)
            .Include(r => r.Recepciones)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

    private async Task<(int Anio, int Secuencia, string Codigo)> NextRequisicionCodigoAsync(DateTime fecha, CancellationToken ct)
    {
        var anio = fecha.Year;
        var max = await _db.Requisiciones.Where(r => r.AnioCodigo == anio).MaxAsync(r => (int?)r.SecuenciaCodigo, ct) ?? 0;
        var secuencia = max + 1;
        return (anio, secuencia, $"REQ-{secuencia:D3}");
    }

    private async Task<string> NextNumeroOrdenCompraAsync(CancellationToken ct)
    {
        var connection = _db.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(ct);

        await using var cmd = connection.CreateCommand();
        cmd.CommandText = """
            UPDATE almacen."OrdenCompraConsecutivo"
            SET "UltimoNumero" = "UltimoNumero" + 1
            WHERE "Id" = 1
            RETURNING "UltimoNumero";
            """;
        if (_db.Database.CurrentTransaction != null)
            cmd.Transaction = _db.Database.CurrentTransaction.GetDbTransaction();

        var result = await cmd.ExecuteScalarAsync(ct);
        var numero = Convert.ToInt32(result);
        return $"OC-{numero:D5}";
    }

    private async Task<AlmacenOrdenCompra> FindOrCreateOrdenCompraAsync(
        AlmacenPedidoProveedor pp, Guid? catalogoId, string nombre, string? nit, string? telefono,
        DateTime fechaPedido, DateTime? fechaEntrega, AlmacenUserContext user, CancellationToken ct)
    {
        if (pp.OrdenCompraId.HasValue)
        {
            var existingLinked = await _db.OrdenesCompra.FirstOrDefaultAsync(o => o.Id == pp.OrdenCompraId.Value, ct);
            if (existingLinked != null && existingLinked.Estado == AlmacenCatalog.OcEmitida)
                return existingLinked;
        }

        var ocQuery = _db.OrdenesCompra.Where(o => o.Estado == AlmacenCatalog.OcEmitida);
        if (catalogoId.HasValue)
            ocQuery = ocQuery.Where(o => o.ProveedorCatalogoId == catalogoId);
        else
            ocQuery = ocQuery.Where(o => o.NombreProveedor == nombre && (nit == null || o.NitProveedor == nit));

        var oc = await ocQuery.OrderByDescending(o => o.FechaRegistro).FirstOrDefaultAsync(ct);
        if (oc != null) return oc;

        var numero = await NextNumeroOrdenCompraAsync(ct);
        oc = new AlmacenOrdenCompra
        {
            Id = Guid.NewGuid(),
            NumeroOrdenCompra = numero,
            ProveedorCatalogoId = catalogoId,
            NombreProveedor = nombre,
            NitProveedor = nit,
            TelefonoProveedor = telefono,
            FechaPedido = fechaPedido,
            FechaEntregaEstimada = fechaEntrega,
            Estado = AlmacenCatalog.OcEmitida,
            FechaRegistro = DateTime.UtcNow,
            CreadoPorId = user.UserId,
            CreadoPorNombre = user.UserName
        };
        _db.OrdenesCompra.Add(oc);
        return oc;
    }

    private async Task CleanupOrdenCompraIfEmptyAsync(Guid ocId, CancellationToken ct)
    {
        var hasLineas = await _db.OrdenCompraLineas.AnyAsync(l => l.OrdenCompraId == ocId, ct);
        if (!hasLineas)
        {
            var oc = await _db.OrdenesCompra.FirstOrDefaultAsync(o => o.Id == ocId, ct);
            if (oc != null) _db.OrdenesCompra.Remove(oc);
        }
    }

    private async Task<Guid?> UpsertProveedorCatalogoAsync(Guid? catalogoId, string nombre, string? nit, string? telefono, CancellationToken ct)
    {
        if (catalogoId.HasValue)
        {
            var byId = await _db.Proveedores.FirstOrDefaultAsync(p => p.Id == catalogoId && p.Activo, ct);
            if (byId != null) return byId.Id;
        }

        var existing = await FindProveedorByMatchAsync(catalogoId, nombre, nit, ct);
        if (existing != null) return existing.Id;

        var entity = new AlmacenProveedor
        {
            Id = Guid.NewGuid(),
            Nombre = nombre.Trim(),
            Nit = NullIfEmpty(nit),
            Telefono = NullIfEmpty(telefono),
            Activo = true,
            FechaRegistro = DateTime.UtcNow
        };
        _db.Proveedores.Add(entity);
        await _db.SaveChangesAsync(ct);
        return entity.Id;
    }

    private async Task<AlmacenProveedor?> FindProveedorByMatchAsync(Guid? catalogoId, string nombre, string? nit, CancellationToken ct)
    {
        if (catalogoId.HasValue)
        {
            var byId = await _db.Proveedores.FirstOrDefaultAsync(p => p.Id == catalogoId && p.Activo, ct);
            if (byId != null) return byId;
        }

        var normalized = AlmacenCatalog.NormalizeName(nombre);
        var candidates = await _db.Proveedores.Where(p => p.Activo).ToListAsync(ct);

        AlmacenProveedor? byName = null;
        foreach (var p in candidates)
        {
            if (AlmacenCatalog.NormalizeName(p.Nombre) != normalized) continue;
            if (!string.IsNullOrWhiteSpace(nit) && !string.IsNullOrWhiteSpace(p.Nit) && p.Nit != nit.Trim())
                continue;
            byName = p;
            break;
        }
        if (byName != null) return byName;

        if (!string.IsNullOrWhiteSpace(nit))
        {
            var byNit = candidates.FirstOrDefault(p => p.Nit == nit.Trim());
            if (byNit != null && AlmacenCatalog.NormalizeName(byNit.Nombre) != normalized)
                return null;
        }

        return null;
    }

    private async Task SyncProveedorSnapshotAsync(AlmacenProveedor proveedor, CancellationToken ct)
    {
        var snapshots = await _db.PedidoProveedores.Where(pp => pp.ProveedorCatalogoId == proveedor.Id).ToListAsync(ct);
        foreach (var pp in snapshots)
        {
            pp.Nombre = proveedor.Nombre;
            pp.Nit = proveedor.Nit;
            pp.Telefono = proveedor.Telefono ?? proveedor.TelefonoTrabajo ?? proveedor.TelefonoMovil;
        }

        var ordenes = await _db.OrdenesCompra.Where(o => o.ProveedorCatalogoId == proveedor.Id).ToListAsync(ct);
        foreach (var oc in ordenes)
        {
            oc.NombreProveedor = proveedor.Nombre;
            oc.NitProveedor = proveedor.Nit;
            oc.TelefonoProveedor = proveedor.Telefono ?? proveedor.TelefonoTrabajo;
        }
    }

    private async Task EnsureProductoNombreUnicoAsync(string nombre, Guid? excludeId, CancellationToken ct)
    {
        var normalized = AlmacenCatalog.NormalizeName(nombre);
        var activos = await _db.Productos.Where(p => p.Activo && p.Id != excludeId).ToListAsync(ct);
        if (activos.Any(p => AlmacenCatalog.NormalizeName(p.Nombre) == normalized))
            throw new InvalidOperationException("Ya existe un producto activo con el mismo nombre.");
    }

    private static string RecalcEstado(AlmacenRequisicion req, AlmacenPedido pedido)
    {
        if (pedido.Proveedores.Count == 0)
            return AlmacenCatalog.EstadoPendiente;

        var allComplete = pedido.Proveedores.All(pp => GetSaldoPendiente(req, pp) <= 0);
        if (allComplete) return AlmacenCatalog.EstadoEnAlmacen;

        var anyRecepcion = req.Recepciones.Count > 0;
        if (anyRecepcion) return AlmacenCatalog.EstadoParcial;

        return AlmacenCatalog.EstadoPedido;
    }

    private static decimal GetCantidadRecibida(AlmacenRequisicion req, Guid pedidoProveedorId) =>
        req.Recepciones.Where(r => r.PedidoProveedorId == pedidoProveedorId).Sum(r => r.CantidadRecibida);

    private static decimal GetSaldoPendiente(AlmacenRequisicion req, AlmacenPedidoProveedor pp) =>
        Math.Max(0, pp.Cantidad - GetCantidadRecibida(req, pp.Id));

    private async Task<OrdenCompraDetailDto> MapOrdenCompraDetailAsync(AlmacenOrdenCompra oc, CancellationToken ct)
    {
        var lineas = await _db.OrdenCompraLineas.AsNoTracking().Where(l => l.OrdenCompraId == oc.Id).OrderBy(l => l.Orden).ToListAsync(ct);
        var detailLineas = new List<OrdenCompraLineaDetailDto>();
        foreach (var linea in lineas)
        {
            var pp = await _db.PedidoProveedores.AsNoTracking().FirstOrDefaultAsync(p => p.Id == linea.PedidoProveedorId, ct);
            var req = await _db.Requisiciones.AsNoTracking().FirstOrDefaultAsync(r => r.Id == linea.RequisicionId, ct);
            if (pp == null || req == null) continue;
            detailLineas.Add(new OrdenCompraLineaDetailDto(
                linea.Id, req.Id, req.Codigo, req.ProductoNombre,
                pp.Cantidad, pp.PrecioUnitario, pp.Cantidad * pp.PrecioUnitario));
        }

        return new OrdenCompraDetailDto(
            oc.Id, oc.NumeroOrdenCompra, oc.NombreProveedor, oc.NitProveedor, oc.TelefonoProveedor,
            oc.FechaPedido, oc.FechaEntregaEstimada, oc.Estado, oc.Pagado, oc.FormaPago, detailLineas);
    }

    private static RequisicionListDto MapRequisicionList(AlmacenRequisicion r)
    {
        var proveedores = r.Pedido?.Proveedores.Select(p => p.Nombre).ToList() ?? [];
        decimal? precioUnitario = r.Pedido?.PrecioUnitario;
        decimal? total = precioUnitario.HasValue ? precioUnitario * r.Cantidad : null;
        return new RequisicionListDto(
            r.Id, r.Codigo, r.TipoRequisicionId, r.FechaSolicitud, r.OrdenProduccionNumero,
            r.Cliente, r.Referencia, r.ProductoNombre, r.Cantidad, r.Unidad, r.FechaRequerida,
            r.Observacion, r.Estado, r.CreadoPorNombre, precioUnitario, total, proveedores, 0);
    }

    private static RequisicionDetailDto MapRequisicionDetail(AlmacenRequisicion r)
    {
        var list = MapRequisicionList(r);
        PedidoDto? pedido = null;
        if (r.Pedido != null)
        {
            pedido = new PedidoDto(
                r.Pedido.Id, r.Pedido.FechaPedido, r.Pedido.FechaEntregaEstimada,
                r.Pedido.PrecioUnitario, r.Pedido.ProcesadoPorNombre,
                r.Pedido.Proveedores.Select(pp => new PedidoProveedorDto(
                    pp.Id, pp.ProveedorCatalogoId, pp.Nombre, pp.Nit, pp.Telefono,
                    pp.Cantidad, pp.PrecioUnitario, pp.FechaEntregaEstimada,
                    pp.Recibido, pp.Pagado, pp.FormaPago, pp.NumeroOrdenCompra, pp.OrdenCompraId,
                    GetCantidadRecibida(r, pp.Id), GetSaldoPendiente(r, pp))).ToList());
        }

        var recepciones = r.Recepciones.OrderByDescending(x => x.FechaRegistro).Select(x => new RecepcionLineaDto(
            x.Id, x.PedidoProveedorId, x.NombreProveedor, x.CodigoUsuario, x.FechaLlegada,
            x.CalidadEsperada, x.MotivoCalidadNo, x.FacturaEntregada, x.MotivoFacturaNo,
            x.CantidadRecibida, x.CantidadPedidaEnMomento, x.PedidoCompleto, x.MotivoCantidadParcial,
            x.NuevaFechaEntrega)).ToList();

        return new RequisicionDetailDto(
            list.Id, list.Codigo, list.TipoRequisicionId, list.FechaSolicitud, list.OrdenProduccionNumero,
            list.Cliente, list.Referencia, list.ProductoNombre, list.Cantidad, list.Unidad, list.FechaRequerida,
            list.Observacion, list.Estado, list.CreadoPorNombre, list.PrecioUnitario, list.TotalEstimado,
            list.ProveedoresNombres, list.ComentariosCount,
            r.ProductoId, r.CatalogoOpId, pedido, recepciones);
    }

    private static ProductoDto MapProducto(AlmacenProducto p) =>
        new(p.Id, p.Nombre, p.TipoRequisicionId, p.Descripcion, p.CostoEstandar, p.UnidadSugerida, p.Activo);

    private static ProveedorDto MapProveedor(AlmacenProveedor p) =>
        new(p.Id, p.Nombre, p.Nit, p.Correo, p.TelefonoTrabajo, p.TelefonoMovil, p.Direccion, p.Categoria, p.ResponsableIva, p.Telefono, p.Activo);

    private static AlmacenProveedor MapProveedorEntity(AlmacenProveedor entity, ProveedorUpsertRequest request)
    {
        entity.Nombre = request.Nombre.Trim();
        entity.Nit = NullIfEmpty(request.Nit);
        entity.Correo = NullIfEmpty(request.Correo);
        entity.TelefonoTrabajo = NullIfEmpty(request.TelefonoTrabajo);
        entity.TelefonoMovil = NullIfEmpty(request.TelefonoMovil);
        entity.Direccion = NullIfEmpty(request.Direccion);
        entity.Categoria = NullIfEmpty(request.Categoria);
        entity.ResponsableIva = request.ResponsableIva;
        entity.Telefono = NullIfEmpty(request.TelefonoTrabajo) ?? NullIfEmpty(request.TelefonoMovil);
        return entity;
    }

    private static void ValidateProductoRequest(ProductoUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            throw new InvalidOperationException("El nombre del producto es obligatorio.");
        if (string.IsNullOrWhiteSpace(request.TipoRequisicionId) || !AlmacenCatalog.TiposRequisicion.Any(t => t.Id == request.TipoRequisicionId))
            throw new InvalidOperationException("Tipo de requisición inválido.");
        if (string.IsNullOrWhiteSpace(request.UnidadSugerida))
            throw new InvalidOperationException("La unidad sugerida es obligatoria.");
        if (request.CostoEstandar < 0)
            throw new InvalidOperationException("El costo estándar no puede ser negativo.");
    }

    private static void ValidateProveedorRequest(ProveedorUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            throw new InvalidOperationException("El nombre del proveedor es obligatorio.");
    }

    private static void ValidateRequisicionRequest(RequisicionUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TipoRequisicionId) || !AlmacenCatalog.TiposRequisicion.Any(t => t.Id == request.TipoRequisicionId))
            throw new InvalidOperationException("Tipo de requisición inválido.");
        if (string.IsNullOrWhiteSpace(request.OrdenProduccionNumero))
            throw new InvalidOperationException("La orden de producción es obligatoria.");
        if (string.IsNullOrWhiteSpace(request.ProductoNombre))
            throw new InvalidOperationException("El producto es obligatorio.");
        if (string.IsNullOrWhiteSpace(request.Cliente))
            throw new InvalidOperationException("El cliente es obligatorio.");
        if (string.IsNullOrWhiteSpace(request.Referencia))
            throw new InvalidOperationException("La referencia es obligatoria.");
        if (request.Cantidad <= 0)
            throw new InvalidOperationException("La cantidad debe ser mayor a cero.");
        if (string.IsNullOrWhiteSpace(request.Unidad))
            throw new InvalidOperationException("La unidad es obligatoria.");
    }

    private static void ValidateGuardarPedidoRequest(GuardarPedidoRequest request)
    {
        if (request.Proveedores == null || request.Proveedores.Count == 0)
            throw new InvalidOperationException("Debe indicar al menos un proveedor.");
    }

    private static string ResolveTipoRequisicion(string? categoria)
    {
        if (string.IsNullOrWhiteSpace(categoria)) return AlmacenCatalog.TiposRequisicion[0].Id;
        var c = categoria.Trim().ToLowerInvariant();
        foreach (var t in AlmacenCatalog.TiposRequisicion)
        {
            if (t.Id.Equals(c, StringComparison.OrdinalIgnoreCase) ||
                t.Label.ToLowerInvariant().Contains(c))
                return t.Id;
        }
        return AlmacenCatalog.TiposRequisicion[0].Id;
    }

    private static Dictionary<int, string> ReadHeaders(ExcelWorksheet ws)
    {
        var headers = new Dictionary<int, string>();
        if (ws.Dimension == null) return headers;
        for (var col = 1; col <= ws.Dimension.End.Column; col++)
            headers[col] = NormalizeHeader(GetCell(ws, 1, col));
        return headers;
    }

    private static int FindColumn(Dictionary<int, string> headers, params string[] candidates)
    {
        foreach (var (col, header) in headers)
        {
            foreach (var c in candidates)
            {
                if (header.Contains(NormalizeHeader(c), StringComparison.Ordinal))
                    return col;
            }
        }
        return -1;
    }

    private static string NormalizeHeader(string value) =>
        value.Trim().ToLowerInvariant().Replace("á", "a").Replace("é", "e").Replace("í", "i").Replace("ó", "o").Replace("ú", "u");

    private static string GetCell(ExcelWorksheet ws, int row, int col) =>
        ws.Cells[row, col].Text?.Trim() ?? string.Empty;

    private static decimal ParseDecimal(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return 0;
        value = value.Replace("$", "").Replace(" ", "").Trim();
        if (decimal.TryParse(value, System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var d))
            return d;
        if (decimal.TryParse(value, System.Globalization.NumberStyles.Any, new System.Globalization.CultureInfo("es-CO"), out d))
            return d;
        return 0;
    }

    private static string? NullIfEmpty(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static DateTime ToUtc(DateTime value) =>
        value.Kind == DateTimeKind.Utc ? value : DateTime.SpecifyKind(value, DateTimeKind.Utc);
}
