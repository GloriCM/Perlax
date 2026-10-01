using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.ManagementReports;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class ManagementReportsService : IManagementReportsService
{
    private readonly ProductionDbContext _db;

    private sealed class ReportDef
    {
        public required string Key { get; init; }
        public required string Title { get; init; }
        public required string Description { get; init; }
    }

    private static readonly ReportDef[] ReportDefs =
    [
        new ReportDef { Key = "fechas-entrega", Title = "Fechas de entrega", Description = "OP abiertas: entrega pactada vs fecha de producción." },
        new ReportDef { Key = "pedidos-pendientes", Title = "Pedidos pendientes de apertura", Description = "Pedidos aprobados sin OP abierta." },
        new ReportDef { Key = "op-sin-remision", Title = "OP con saldo por remisionar", Description = "Producido / a producir vs remisionado." },
        new ReportDef { Key = "remisiones-sin-factura", Title = "Remisiones sin facturar", Description = "Remisiones confirmadas pendientes de factura." },
        new ReportDef { Key = "ventas-totales", Title = "Ventas totales", Description = "Facturas activas agrupadas por mes." },
        new ReportDef { Key = "transporte", Title = "Informe de transporte", Description = "Fletes asignados a remisiones." },
        new ReportDef { Key = "talleres-externos", Title = "Trabajos en talleres", Description = "Talleres externos asignados a OP." },
        new ReportDef { Key = "desperdicios", Title = "Desperdicios", Description = "% no remisionado sobre cantidad a producir (OP cerradas)." },
        new ReportDef { Key = "kardex-mp", Title = "Kardex / saldos MP", Description = "Movimientos y saldos de materia prima." },
        new ReportDef { Key = "compras-sin-recepcion", Title = "Compras sin recepción", Description = "Seguimiento en módulo Compras & Almacén." },
    ];

    public ManagementReportsService(ProductionDbContext db) => _db = db;

    public IReadOnlyList<(string Key, string Title, string Description)> ListAvailable() =>
        ReportDefs.Select(c => (c.Key, c.Title, c.Description)).ToList();

    public async Task<ManagementReportResultDto> GetReportAsync(
        string reportKey,
        DateTime? from = null,
        DateTime? to = null,
        string? client = null,
        string? q = null,
        CancellationToken ct = default)
    {
        var key = (reportKey ?? string.Empty).Trim().ToLowerInvariant();
        var meta = ReportDefs.FirstOrDefault(c => c.Key == key)
            ?? throw new KeyNotFoundException($"Informe '{reportKey}' no existe.");

        var fromUtc = from.HasValue ? ToUtcStart(from.Value) : (DateTime?)null;
        var toUtc = to.HasValue ? ToUtcEnd(to.Value) : (DateTime?)null;
        var clientFilter = string.IsNullOrWhiteSpace(client) ? null : client.Trim().ToLowerInvariant();
        var qFilter = string.IsNullOrWhiteSpace(q) ? null : q.Trim().ToLowerInvariant();

        // Self-heal: informes need ClosedAt / ProductionDeliveryDate on ManufacturingOrders.
        await CommercialChainSchemaFixes.EnsureManufacturingOrderColumnsAsync(_db, ct);

        try
        {
            return await BuildReportAsync(key, meta, fromUtc, toUtc, clientFilter, qFilter, ct);
        }
        catch (Exception ex) when (LooksLikeMissingClosedAt(ex))
        {
            await CommercialChainSchemaFixes.EnsureManufacturingOrderColumnsAsync(_db, ct);
            return await BuildReportAsync(key, meta, fromUtc, toUtc, clientFilter, qFilter, ct);
        }
    }

    private static bool LooksLikeMissingClosedAt(Exception ex)
    {
        var msg = ex.ToString();
        return msg.Contains("ClosedAt", StringComparison.OrdinalIgnoreCase)
               || msg.Contains("ProductionDeliveryDate", StringComparison.OrdinalIgnoreCase)
               || msg.Contains("42703", StringComparison.Ordinal);
    }

    private async Task<ManagementReportResultDto> BuildReportAsync(
        string key,
        ReportDef meta,
        DateTime? fromUtc,
        DateTime? toUtc,
        string? clientFilter,
        string? qFilter,
        CancellationToken ct)
    {
        switch (key)
        {
            case "fechas-entrega":
                return await FechasEntregaAsync(meta, fromUtc, toUtc, clientFilter, qFilter, ct);
            case "pedidos-pendientes":
                return await PedidosPendientesAsync(meta, fromUtc, toUtc, clientFilter, qFilter, ct);
            case "op-sin-remision":
                return await OpSinRemisionAsync(meta, clientFilter, qFilter, ct);
            case "remisiones-sin-factura":
                return await RemisionesSinFacturaAsync(meta, fromUtc, toUtc, clientFilter, qFilter, ct);
            case "ventas-totales":
                return await VentasTotalesAsync(meta, fromUtc, toUtc, clientFilter, ct);
            case "transporte":
                return await TransporteAsync(meta, fromUtc, toUtc, clientFilter, qFilter, ct);
            case "talleres-externos":
                return await TalleresAsync(meta, fromUtc, toUtc, clientFilter, qFilter, ct);
            case "desperdicios":
                return await DesperdiciosAsync(meta, fromUtc, toUtc, clientFilter, qFilter, ct);
            case "kardex-mp":
                return await KardexAsync(meta, fromUtc, toUtc, qFilter, ct);
            case "compras-sin-recepcion":
                return ComprasSinRecepcion(meta);
            default:
                throw new KeyNotFoundException($"Informe '{key}' no existe.");
        }
    }

    private async Task<ManagementReportResultDto> FechasEntregaAsync(
        ReportDef meta, DateTime? from, DateTime? to, string? client, string? q, CancellationToken ct)
    {
        var query = _db.ManufacturingOrders.AsNoTracking()
            .Where(m => m.OpeningDate != null && m.Status != "Cerrada");

        if (from.HasValue) query = query.Where(m => m.AgreedDeliveryDate >= from || m.ProductionDeliveryDate >= from);
        if (to.HasValue) query = query.Where(m => m.AgreedDeliveryDate <= to || m.ProductionDeliveryDate <= to);
        if (client != null) query = query.Where(m => m.ClientName.ToLower().Contains(client));
        if (q != null) query = query.Where(m => m.OpNumber.ToLower().Contains(q) || m.ProductName.ToLower().Contains(q));

        var rows = await query.OrderBy(m => m.AgreedDeliveryDate).Take(2000).ToListAsync(ct);
        return Build(meta,
            [
                Col("opNumber", "OP"),
                Col("clientName", "Cliente"),
                Col("productName", "Producto"),
                Col("agreedDeliveryDate", "Entrega pactada"),
                Col("productionDeliveryDate", "Entrega producción"),
                Col("quantityToProduce", "Cant. producir"),
                Col("status", "Estado"),
            ],
            rows.Select(m => Dict(
                P("opNumber", m.OpNumber),
                P("clientName", m.ClientName),
                P("productName", m.ProductName),
                P("agreedDeliveryDate", FmtDate(m.AgreedDeliveryDate)),
                P("productionDeliveryDate", FmtDate(m.ProductionDeliveryDate)),
                P("quantityToProduce", m.QuantityToProduce),
                P("status", m.Status))));
    }

    private async Task<ManagementReportResultDto> PedidosPendientesAsync(
        ReportDef meta, DateTime? from, DateTime? to, string? client, string? q, CancellationToken ct)
    {
        var openedParts = await _db.ManufacturingOrders.AsNoTracking()
            .Where(m => m.OpeningDate != null)
            .Select(m => new { m.CustomerOrderId, m.OrderPartId })
            .ToListAsync(ct);
        var openedSet = openedParts.Select(x => (x.CustomerOrderId, x.OrderPartId)).ToHashSet();

        var orders = await _db.CustomerOrders.AsNoTracking()
            .Include(o => o.Items)
            .Where(o => o.IsApproved)
            .ToListAsync(ct);

        var rows = new List<IReadOnlyDictionary<string, object?>>();
        foreach (var order in orders)
        {
            if (from.HasValue && order.OrderDate < from) continue;
            if (to.HasValue && order.OrderDate > to) continue;
            if (client != null && !order.ClientName.ToLower().Contains(client)) continue;

            foreach (var item in order.Items)
            {
                if (openedSet.Contains((order.Id, item.OrderPartId))) continue;
                if (q != null &&
                    !order.OrderNumber.ToLower().Contains(q) &&
                    !item.ProductName.ToLower().Contains(q))
                    continue;

                rows.Add(Dict(
                    P("orderNumber", order.OrderNumber),
                    P("clientName", order.ClientName),
                    P("productName", item.ProductName),
                    P("referenceName", item.ReferenceName),
                    P("quantity", item.Quantity),
                    P("orderDate", FmtDate(order.OrderDate)),
                    P("agreedDeliveryDate", FmtDate(order.AgreedDeliveryDate))));
            }
        }

        return Build(meta,
            [
                Col("orderNumber", "Pedido"),
                Col("clientName", "Cliente"),
                Col("productName", "Producto"),
                Col("referenceName", "Referencia"),
                Col("quantity", "Cantidad"),
                Col("orderDate", "Fecha pedido"),
                Col("agreedDeliveryDate", "Entrega pactada"),
            ],
            rows);
    }

    private async Task<ManagementReportResultDto> OpSinRemisionAsync(
        ReportDef meta, string? client, string? q, CancellationToken ct)
    {
        var ops = await _db.ManufacturingOrders.AsNoTracking()
            .Where(m => m.OpeningDate != null)
            .ToListAsync(ct);

        var entries = await _db.FinishedGoodsEntries.AsNoTracking()
            .GroupBy(e => e.ManufacturingOrderId)
            .Select(g => new { MoId = g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.MoId, x => x.Qty, ct);

        var remisioned = await _db.RemisionItems.AsNoTracking()
            .Include(i => i.Remision)
            .Where(i => i.ManufacturingOrderId != null
                        && i.Remision != null
                        && i.Remision.Status != RemisionStatuses.Cancelled)
            .GroupBy(i => i.ManufacturingOrderId!.Value)
            .Select(g => new { MoId = g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.MoId, x => x.Qty, ct);

        var rows = new List<IReadOnlyDictionary<string, object?>>();
        foreach (var mo in ops)
        {
            if (client != null && !mo.ClientName.ToLower().Contains(client)) continue;
            if (q != null && !mo.OpNumber.ToLower().Contains(q) && !mo.ProductName.ToLower().Contains(q)) continue;

            entries.TryGetValue(mo.Id, out var produced);
            if (produced <= 0 && (mo.Status is "Abierta" or "Cerrada"))
                produced = mo.QuantityToProduce;
            remisioned.TryGetValue(mo.Id, out var remQty);
            var pending = produced - remQty;
            if (pending <= 0) continue;

            rows.Add(Dict(
                P("opNumber", mo.OpNumber),
                P("clientName", mo.ClientName),
                P("productName", mo.ProductName),
                P("produced", produced),
                P("remisioned", remQty),
                P("pending", pending),
                P("status", mo.Status)));
        }

        return Build(meta,
            [
                Col("opNumber", "OP"),
                Col("clientName", "Cliente"),
                Col("productName", "Producto"),
                Col("produced", "Producido"),
                Col("remisioned", "Remisionado"),
                Col("pending", "Pendiente"),
                Col("status", "Estado"),
            ],
            rows);
    }

    private async Task<ManagementReportResultDto> RemisionesSinFacturaAsync(
        ReportDef meta, DateTime? from, DateTime? to, string? client, string? q, CancellationToken ct)
    {
        var query = _db.Remisiones.AsNoTracking()
            .Include(r => r.Items)
            .Where(r => r.InvoiceId == null && r.Status == RemisionStatuses.Confirmed);

        if (from.HasValue) query = query.Where(r => r.RemisionDate >= from);
        if (to.HasValue) query = query.Where(r => r.RemisionDate <= to);
        if (client != null) query = query.Where(r => r.ClientName.ToLower().Contains(client));
        if (q != null) query = query.Where(r => r.RemisionNumber.ToLower().Contains(q));

        var list = await query.OrderByDescending(r => r.RemisionDate).Take(2000).ToListAsync(ct);
        return Build(meta,
            [
                Col("remisionNumber", "Remisión"),
                Col("clientName", "Cliente"),
                Col("remisionDate", "Fecha"),
                Col("totalQuantity", "Cantidad"),
                Col("estimatedSubtotal", "Subtotal est."),
            ],
            list.Select(r => Dict(
                P("remisionNumber", r.RemisionNumber),
                P("clientName", r.ClientName),
                P("remisionDate", FmtDate(r.RemisionDate)),
                P("totalQuantity", r.Items.Sum(i => i.Quantity)),
                P("estimatedSubtotal", r.Items.Sum(i => i.Quantity * i.UnitPrice)))));
    }

    private async Task<ManagementReportResultDto> VentasTotalesAsync(
        ReportDef meta, DateTime? from, DateTime? to, string? client, CancellationToken ct)
    {
        var query = _db.SalesInvoices.AsNoTracking()
            .Where(i => i.Status == SalesInvoiceStatuses.Active);

        if (from.HasValue) query = query.Where(i => i.InvoiceDate >= from);
        if (to.HasValue) query = query.Where(i => i.InvoiceDate <= to);
        if (client != null) query = query.Where(i => i.ClientName.ToLower().Contains(client));

        var list = await query.ToListAsync(ct);
        var grouped = list
            .GroupBy(i => new { i.InvoiceDate.Year, i.InvoiceDate.Month })
            .OrderByDescending(g => g.Key.Year).ThenByDescending(g => g.Key.Month)
            .Select(g => Dict(
                P("period", $"{g.Key.Year}-{g.Key.Month:D2}"),
                P("invoiceCount", g.Count()),
                P("subtotal", g.Sum(x => x.Subtotal)),
                P("tax", g.Sum(x => x.TaxAmount)),
                P("total", g.Sum(x => x.TotalAmount))))
            .ToList();

        return Build(meta,
            [
                Col("period", "Periodo"),
                Col("invoiceCount", "Facturas"),
                Col("subtotal", "Bruto"),
                Col("tax", "IVA"),
                Col("total", "Neto"),
            ],
            grouped);
    }

    private async Task<ManagementReportResultDto> TransporteAsync(
        ReportDef meta, DateTime? from, DateTime? to, string? client, string? q, CancellationToken ct)
    {
        var query = _db.Remisiones.AsNoTracking()
            .Where(r => r.HasTransport && r.Status != RemisionStatuses.Cancelled);

        if (from.HasValue) query = query.Where(r => r.RemisionDate >= from);
        if (to.HasValue) query = query.Where(r => r.RemisionDate <= to);
        if (client != null) query = query.Where(r => r.ClientName.ToLower().Contains(client));
        if (q != null) query = query.Where(r =>
            r.RemisionNumber.ToLower().Contains(q) ||
            (r.TransportCarrier != null && r.TransportCarrier.ToLower().Contains(q)));

        var list = await query.OrderByDescending(r => r.RemisionDate).Take(2000).ToListAsync(ct);
        return Build(meta,
            [
                Col("remisionNumber", "Remisión"),
                Col("clientName", "Cliente"),
                Col("carrier", "Transportador"),
                Col("plate", "Placa"),
                Col("driver", "Conductor"),
                Col("cost", "Costo"),
                Col("remisionDate", "Fecha"),
            ],
            list.Select(r => Dict(
                P("remisionNumber", r.RemisionNumber),
                P("clientName", r.ClientName),
                P("carrier", r.TransportCarrier),
                P("plate", r.TransportPlate),
                P("driver", r.TransportDriver),
                P("cost", r.TransportCost),
                P("remisionDate", FmtDate(r.RemisionDate)))));
    }

    private async Task<ManagementReportResultDto> TalleresAsync(
        ReportDef meta, DateTime? from, DateTime? to, string? client, string? q, CancellationToken ct)
    {
        var query = _db.OpExternalWorkshops.AsNoTracking()
            .Include(w => w.ManufacturingOrder)
            .AsQueryable();

        if (from.HasValue) query = query.Where(w => w.DeliveryToWorkshopDate >= from || w.CreatedAt >= from);
        if (to.HasValue) query = query.Where(w => w.DeliveryToWorkshopDate <= to || w.CreatedAt <= to);

        var list = await query.OrderByDescending(w => w.CreatedAt).Take(2000).ToListAsync(ct);
        var filtered = list.Where(w =>
        {
            var mo = w.ManufacturingOrder;
            if (mo == null) return false;
            if (client != null && !mo.ClientName.ToLower().Contains(client)) return false;
            if (q != null &&
                !mo.OpNumber.ToLower().Contains(q) &&
                !w.WorkshopName.ToLower().Contains(q))
                return false;
            return true;
        }).ToList();

        return Build(meta,
            [
                Col("opNumber", "OP"),
                Col("clientName", "Cliente"),
                Col("workshop", "Taller"),
                Col("workType", "Trabajo"),
                Col("quantity", "Cantidad"),
                Col("unitPrice", "P.U."),
                Col("total", "Total"),
                Col("deliveryDate", "Entrega"),
            ],
            filtered.Select(w => Dict(
                P("opNumber", w.ManufacturingOrder!.OpNumber),
                P("clientName", w.ManufacturingOrder.ClientName),
                P("workshop", w.WorkshopName),
                P("workType", w.WorkType),
                P("quantity", w.QuantityDelivered),
                P("unitPrice", w.UnitPrice),
                P("total", w.QuantityDelivered * w.UnitPrice),
                P("deliveryDate", FmtDate(w.DeliveryToWorkshopDate)))));
    }

    private async Task<ManagementReportResultDto> DesperdiciosAsync(
        ReportDef meta, DateTime? from, DateTime? to, string? client, string? q, CancellationToken ct)
    {
        var ops = await _db.ManufacturingOrders.AsNoTracking()
            .Where(m => m.Status == "Cerrada")
            .ToListAsync(ct);

        var remisioned = await _db.RemisionItems.AsNoTracking()
            .Include(i => i.Remision)
            .Where(i => i.ManufacturingOrderId != null
                        && i.Remision != null
                        && i.Remision.Status != RemisionStatuses.Cancelled)
            .GroupBy(i => i.ManufacturingOrderId!.Value)
            .Select(g => new { MoId = g.Key, Qty = g.Sum(x => x.Quantity) })
            .ToDictionaryAsync(x => x.MoId, x => x.Qty, ct);

        var rows = new List<IReadOnlyDictionary<string, object?>>();
        foreach (var mo in ops)
        {
            if (from.HasValue)
            {
                var closed = mo.ClosedAt ?? mo.UpdatedAt;
                if (closed.HasValue && closed < from) continue;
            }
            if (to.HasValue)
            {
                var closed = mo.ClosedAt ?? mo.UpdatedAt;
                if (closed.HasValue && closed > to) continue;
            }
            if (client != null && !mo.ClientName.ToLower().Contains(client)) continue;
            if (q != null && !mo.OpNumber.ToLower().Contains(q) && !mo.ProductName.ToLower().Contains(q)) continue;

            remisioned.TryGetValue(mo.Id, out var remQty);
            var waste = Math.Max(0, mo.QuantityToProduce - remQty);
            var pct = mo.QuantityToProduce > 0 ? Math.Round(waste / mo.QuantityToProduce * 100m, 2) : 0m;

            rows.Add(Dict(
                P("opNumber", mo.OpNumber),
                P("clientName", mo.ClientName),
                P("productName", mo.ProductName),
                P("quantityToProduce", mo.QuantityToProduce),
                P("remisioned", remQty),
                P("waste", waste),
                P("wastePercent", pct),
                P("closedAt", FmtDate(mo.ClosedAt))));
        }

        return Build(meta,
            [
                Col("opNumber", "OP"),
                Col("clientName", "Cliente"),
                Col("productName", "Producto"),
                Col("quantityToProduce", "A producir"),
                Col("remisioned", "Remisionado"),
                Col("waste", "Desperdicio"),
                Col("wastePercent", "%"),
                Col("closedAt", "Cierre"),
            ],
            rows);
    }

    private async Task<ManagementReportResultDto> KardexAsync(
        ReportDef meta, DateTime? from, DateTime? to, string? q, CancellationToken ct)
    {
        var query = _db.WarehouseStockMovements.AsNoTracking().AsQueryable();
        if (from.HasValue) query = query.Where(m => m.MovementDate >= from);
        if (to.HasValue) query = query.Where(m => m.MovementDate <= to);
        if (q != null) query = query.Where(m => m.ProductName.ToLower().Contains(q));

        var list = await query.OrderByDescending(m => m.MovementDate).Take(3000).ToListAsync(ct);
        return Build(meta,
            [
                Col("movementDate", "Fecha"),
                Col("movementType", "Tipo"),
                Col("productName", "Producto"),
                Col("quantity", "Cantidad"),
                Col("unitCost", "Costo u."),
                Col("reference", "Referencia"),
            ],
            list.Select(m => Dict(
                P("movementDate", FmtDate(m.MovementDate)),
                P("movementType", m.MovementType),
                P("productName", m.ProductName),
                P("quantity", m.Quantity),
                P("unitCost", m.UnitCost),
                P("reference", m.Reference))));
    }

    private static ManagementReportResultDto ComprasSinRecepcion(ReportDef meta) =>
        Build(meta,
            [Col("info", "Info")],
            [Dict(P("info", "Consulte requisiciones Pedido/Parcial en Compras & Almacen -> Recepcion."))],
            "/compras/recepcion",
            "Ir a recepcion de compras");

    private static ManagementReportResultDto Build(
        ReportDef meta,
        IReadOnlyList<ManagementReportColumnDto> columns,
        IEnumerable<IReadOnlyDictionary<string, object?>> rows,
        string? link = null,
        string? linkLabel = null) =>
        new(
            ReportKey: meta.Key,
            Title: meta.Title,
            Description: meta.Description,
            Columns: columns,
            Rows: rows.ToList(),
            ExternalLink: link,
            ExternalLinkLabel: linkLabel);

    private static ManagementReportColumnDto Col(string field, string label) =>
        new(Field: field, Label: label);

    private static IReadOnlyDictionary<string, object?> Dict(params (string Key, object? Value)[] pairs)
    {
        var dict = new Dictionary<string, object?>(pairs.Length);
        foreach (var pair in pairs)
            dict[pair.Key] = pair.Value;
        return dict;
    }

    /// <summary>Evita CS0029 por inferencia de ValueTuple con tipos mixtos (string/int/decimal).</summary>
    private static (string Key, object? Value) P(string key, object? value) => (key, value);

    private static string? FmtDate(DateTime? value) =>
        value?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private static DateTime ToUtcStart(DateTime value) =>
        DateTime.SpecifyKind(value.Date, DateTimeKind.Utc);

    private static DateTime ToUtcEnd(DateTime value) =>
        DateTime.SpecifyKind(value.Date.AddDays(1).AddTicks(-1), DateTimeKind.Utc);
}
