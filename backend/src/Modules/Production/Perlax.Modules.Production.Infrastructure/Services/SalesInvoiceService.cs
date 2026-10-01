using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Facturacion;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class SalesInvoiceService : ISalesInvoiceService
{
    private readonly ProductionDbContext _db;

    public SalesInvoiceService(ProductionDbContext db) => _db = db;

    public async Task<string> GetNextNumberAsync(CancellationToken ct = default)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"FV-{year}-";
        var last = await _db.SalesInvoices
            .Where(x => x.InvoiceNumber.StartsWith(prefix))
            .OrderByDescending(x => x.InvoiceNumber)
            .Select(x => x.InvoiceNumber)
            .FirstOrDefaultAsync(ct);

        var next = 1;
        if (!string.IsNullOrEmpty(last) && int.TryParse(last.AsSpan(prefix.Length), out var n))
            next = n + 1;
        return $"{prefix}{next:D5}";
    }

    public async Task<IReadOnlyList<SalesInvoiceListItemDto>> ListAsync(CancellationToken ct = default)
    {
        return await _db.SalesInvoices.AsNoTracking()
            .OrderByDescending(x => x.InvoiceDate)
            .ThenByDescending(x => x.InvoiceNumber)
            .Select(x => new SalesInvoiceListItemDto(
                x.Id,
                x.InvoiceNumber,
                x.LegacyInvoiceNumber,
                x.RemisionNumber,
                x.ClientName,
                x.InvoiceDate,
                x.DueDate,
                x.Status,
                x.Subtotal,
                x.TaxAmount,
                x.TotalAmount))
            .ToListAsync(ct);
    }

    public async Task<SalesInvoiceDetailDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var inv = await _db.SalesInvoices.AsNoTracking()
            .Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Factura no encontrada.");

        return Map(inv);
    }

    public async Task<IReadOnlyList<PendingRemisionForInvoiceDto>> GetPendingRemisionesAsync(string? clientName = null, CancellationToken ct = default)
    {
        var q = _db.Remisiones.AsNoTracking()
            .Include(r => r.Items)
            .Where(r => r.InvoiceId == null && r.Status == RemisionStatuses.Confirmed);

        if (!string.IsNullOrWhiteSpace(clientName))
        {
            var c = clientName.Trim().ToLower();
            q = q.Where(r => r.ClientName.ToLower() == c);
        }

        var rows = await q.OrderByDescending(r => r.RemisionDate).ToListAsync(ct);
        return rows.Select(r => new PendingRemisionForInvoiceDto(
            r.Id,
            r.RemisionNumber,
            r.ClientName,
            r.RemisionDate,
            r.Items.Sum(i => i.Quantity),
            r.Items.Sum(i => i.Quantity * i.UnitPrice))).ToList();
    }

    public async Task<SalesInvoiceDetailDto> CreateAsync(CreateSalesInvoiceCommand command, string userName, CancellationToken ct = default)
    {
        var rem = await _db.Remisiones.Include(r => r.Items)
            .FirstOrDefaultAsync(r => r.Id == command.RemisionId, ct)
            ?? throw new KeyNotFoundException("Remisión no encontrada.");

        if (rem.InvoiceId != null)
            throw new InvalidOperationException("Esta remisión ya está facturada.");
        if (rem.Status != RemisionStatuses.Confirmed)
            throw new InvalidOperationException("Solo se facturan remisiones confirmadas.");
        if (rem.Items.Count == 0)
            throw new InvalidOperationException("La remisión no tiene ítems.");

        var taxRate = command.TaxRate ?? 19m;
        if (taxRate < 0 || taxRate > 100)
            throw new InvalidOperationException("La tarifa de IVA debe estar entre 0 y 100.");

        var subtotal = rem.Items.Sum(i => i.Quantity * i.UnitPrice);
        var tax = Math.Round(subtotal * taxRate / 100m, 2);
        var total = subtotal + tax;

        var inv = new SalesInvoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = await GetNextNumberAsync(ct),
            RemisionId = rem.Id,
            RemisionNumber = rem.RemisionNumber,
            ClientName = rem.ClientName,
            InvoiceDate = ToUtc(command.InvoiceDate),
            DueDate = command.DueDate.HasValue ? ToUtc(command.DueDate.Value) : null,
            Status = SalesInvoiceStatuses.Active,
            Notes = command.Notes ?? rem.Notes,
            Subtotal = subtotal,
            TaxAmount = tax,
            TotalAmount = total,
            TaxRate = taxRate,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName
        };

        foreach (var item in rem.Items)
        {
            inv.Items.Add(new SalesInvoiceItem
            {
                Id = Guid.NewGuid(),
                SalesInvoiceId = inv.Id,
                RemisionItemId = item.Id,
                ProductName = item.ProductName,
                ReferenceName = item.ReferenceName,
                Quantity = item.Quantity,
                UnitPrice = item.UnitPrice,
                LineTotal = item.Quantity * item.UnitPrice
            });
        }

        rem.InvoiceId = inv.Id;
        rem.UpdatedAt = DateTime.UtcNow;
        rem.UpdatedBy = userName;

        _db.SalesInvoices.Add(inv);
        await _db.SaveChangesAsync(ct);
        return await GetByIdAsync(inv.Id, ct);
    }

    public async Task UpdateAsync(Guid id, UpdateSalesInvoiceCommand command, string userName, CancellationToken ct = default)
    {
        var inv = await _db.SalesInvoices.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Factura no encontrada.");

        if (inv.Status == SalesInvoiceStatuses.Voided)
            throw new InvalidOperationException("No se puede editar una factura anulada.");

        inv.InvoiceDate = ToUtc(command.InvoiceDate);
        inv.DueDate = command.DueDate.HasValue ? ToUtc(command.DueDate.Value) : null;
        inv.Notes = command.Notes;
        inv.UpdatedAt = DateTime.UtcNow;
        inv.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);
    }

    public async Task VoidAsync(Guid id, string userName, CancellationToken ct = default)
    {
        var inv = await _db.SalesInvoices.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Factura no encontrada.");

        if (inv.Status == SalesInvoiceStatuses.Voided)
            throw new InvalidOperationException("La factura ya está anulada.");

        inv.Status = SalesInvoiceStatuses.Voided;
        inv.VoidedAt = DateTime.UtcNow;
        inv.VoidedBy = userName;
        inv.UpdatedAt = DateTime.UtcNow;
        inv.UpdatedBy = userName;

        var rem = await _db.Remisiones.FirstOrDefaultAsync(r => r.Id == inv.RemisionId, ct);
        if (rem != null)
        {
            rem.InvoiceId = null;
            rem.UpdatedAt = DateTime.UtcNow;
            rem.UpdatedBy = userName;
        }

        await _db.SaveChangesAsync(ct);
    }

    private static SalesInvoiceDetailDto Map(SalesInvoice inv) => new(
        inv.Id,
        inv.InvoiceNumber,
        inv.LegacyInvoiceNumber,
        inv.RemisionId,
        inv.RemisionNumber,
        inv.ClientName,
        inv.InvoiceDate,
        inv.DueDate,
        inv.Status,
        inv.Notes,
        inv.Subtotal,
        inv.TaxAmount,
        inv.TotalAmount,
        inv.TaxRate,
        inv.Items.Select(i => new SalesInvoiceItemDto(
            i.Id, i.RemisionItemId, i.ProductName, i.ReferenceName, i.Quantity, i.UnitPrice, i.LineTotal)).ToList());

    private static DateTime ToUtc(DateTime value) =>
        value.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(value, DateTimeKind.Utc)
            : value.ToUniversalTime();
}
