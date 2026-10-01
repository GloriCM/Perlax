using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Customers;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class CustomerService : ICustomerService
{
    private readonly ProductionDbContext _db;

    public CustomerService(ProductionDbContext db) => _db = db;

    public async Task<IReadOnlyList<CustomerDto>> ListAsync(string? q = null, bool onlyActive = true, CancellationToken ct = default)
    {
        var query = _db.Customers.AsNoTracking().AsQueryable();
        if (onlyActive) query = query.Where(c => c.IsActive);
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLower();
            query = query.Where(c => c.Name.ToLower().Contains(term) || (c.Nit != null && c.Nit.ToLower().Contains(term)));
        }

        return await query.OrderBy(c => c.Name)
            .Select(c => new CustomerDto(c.Id, c.Name, c.Nit, c.ContactName, c.Phone, c.Email, c.Address, c.ReceiptPercentage, c.IsActive))
            .ToListAsync(ct);
    }

    public async Task<CustomerDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var c = await _db.Customers.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Cliente no encontrado.");
        return Map(c);
    }

    public async Task<CustomerDto> CreateAsync(SaveCustomerCommand command, string userName, CancellationToken ct = default)
    {
        Validate(command);
        var name = NormalizeName(command.Name);
        var exists = await _db.Customers.AnyAsync(c => c.Name.ToLower() == name.ToLower(), ct);
        if (exists)
            throw new InvalidOperationException("Ya existe un cliente con ese nombre.");

        var c = new Customer
        {
            Id = Guid.NewGuid(),
            Name = name,
            Nit = command.Nit?.Trim(),
            ContactName = command.ContactName?.Trim(),
            Phone = command.Phone?.Trim(),
            Email = command.Email?.Trim(),
            Address = command.Address?.Trim(),
            ReceiptPercentage = command.ReceiptPercentage,
            IsActive = command.IsActive,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName
        };
        _db.Customers.Add(c);
        await _db.SaveChangesAsync(ct);
        return Map(c);
    }

    public async Task UpdateAsync(Guid id, SaveCustomerCommand command, string userName, CancellationToken ct = default)
    {
        Validate(command);
        var c = await _db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Cliente no encontrado.");

        var name = NormalizeName(command.Name);
        var dup = await _db.Customers.AnyAsync(x => x.Id != id && x.Name.ToLower() == name.ToLower(), ct);
        if (dup)
            throw new InvalidOperationException("Ya existe un cliente con ese nombre.");

        c.Name = name;
        c.Nit = command.Nit?.Trim();
        c.ContactName = command.ContactName?.Trim();
        c.Phone = command.Phone?.Trim();
        c.Email = command.Email?.Trim();
        c.Address = command.Address?.Trim();
        c.ReceiptPercentage = command.ReceiptPercentage;
        c.IsActive = command.IsActive;
        c.UpdatedAt = DateTime.UtcNow;
        c.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeactivateAsync(Guid id, string userName, CancellationToken ct = default)
    {
        var c = await _db.Customers.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Cliente no encontrado.");
        c.IsActive = false;
        c.UpdatedAt = DateTime.UtcNow;
        c.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<CustomerDto> EnsureByNameAsync(string name, string userName, CancellationToken ct = default)
    {
        var normalized = NormalizeName(name);
        if (string.IsNullOrWhiteSpace(normalized))
            throw new InvalidOperationException("El nombre del cliente es obligatorio.");

        var existing = await _db.Customers
            .FirstOrDefaultAsync(c => c.Name.ToLower() == normalized.ToLower(), ct);
        if (existing != null)
        {
            if (!existing.IsActive)
            {
                existing.IsActive = true;
                existing.UpdatedAt = DateTime.UtcNow;
                existing.UpdatedBy = userName;
                await _db.SaveChangesAsync(ct);
            }
            return Map(existing);
        }

        var created = new Customer
        {
            Id = Guid.NewGuid(),
            Name = normalized,
            ReceiptPercentage = 10m,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName
        };
        _db.Customers.Add(created);
        await _db.SaveChangesAsync(ct);
        return Map(created);
    }

    public async Task<CustomerSyncResultDto> SyncFromDocumentsAsync(string userName, CancellationToken ct = default)
    {
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var n in await _db.ProductionOrders.AsNoTracking()
                     .Where(o => o.Cliente != null && o.Cliente != "")
                     .Select(o => o.Cliente)
                     .Distinct()
                     .ToListAsync(ct))
            AddName(names, n);

        foreach (var n in await _db.CustomerOrders.AsNoTracking()
                     .Where(o => o.ClientName != null && o.ClientName != "")
                     .Select(o => o.ClientName)
                     .Distinct()
                     .ToListAsync(ct))
            AddName(names, n);

        foreach (var n in await _db.ManufacturingOrders.AsNoTracking()
                     .Where(o => o.ClientName != null && o.ClientName != "")
                     .Select(o => o.ClientName)
                     .Distinct()
                     .ToListAsync(ct))
            AddName(names, n);

        foreach (var n in await _db.Remisiones.AsNoTracking()
                     .Where(o => o.ClientName != null && o.ClientName != "")
                     .Select(o => o.ClientName)
                     .Distinct()
                     .ToListAsync(ct))
            AddName(names, n);

        foreach (var n in await _db.SalesInvoices.AsNoTracking()
                     .Where(o => o.ClientName != null && o.ClientName != "")
                     .Select(o => o.ClientName)
                     .Distinct()
                     .ToListAsync(ct))
            AddName(names, n);

        var existing = await _db.Customers.ToListAsync(ct);
        var byName = existing.ToDictionary(c => c.Name.Trim(), c => c, StringComparer.OrdinalIgnoreCase);

        var created = 0;
        foreach (var name in names.OrderBy(x => x))
        {
            if (byName.ContainsKey(name)) continue;
            var c = new Customer
            {
                Id = Guid.NewGuid(),
                Name = name,
                ReceiptPercentage = 10m,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userName
            };
            _db.Customers.Add(c);
            byName[name] = c;
            created++;
        }

        if (created > 0)
            await _db.SaveChangesAsync(ct);

        var linked = 0;
        linked += await LinkProductionOrdersAsync(byName, ct);
        linked += await LinkCustomerOrdersAsync(byName, ct);
        linked += await LinkManufacturingOrdersAsync(byName, ct);

        if (linked > 0)
            await _db.SaveChangesAsync(ct);

        var total = await _db.Customers.CountAsync(ct);
        return new CustomerSyncResultDto(created, linked, total);
    }

    private async Task<int> LinkProductionOrdersAsync(Dictionary<string, Customer> byName, CancellationToken ct)
    {
        var rows = await _db.ProductionOrders
            .Where(o => o.CustomerId == null && o.Cliente != null && o.Cliente != "")
            .ToListAsync(ct);
        var n = 0;
        foreach (var o in rows)
        {
            var key = NormalizeName(o.Cliente);
            if (!byName.TryGetValue(key, out var c)) continue;
            o.CustomerId = c.Id;
            o.Cliente = c.Name;
            n++;
        }
        return n;
    }

    private async Task<int> LinkCustomerOrdersAsync(Dictionary<string, Customer> byName, CancellationToken ct)
    {
        var rows = await _db.CustomerOrders
            .Where(o => o.CustomerId == null && o.ClientName != null && o.ClientName != "")
            .ToListAsync(ct);
        var n = 0;
        foreach (var o in rows)
        {
            var key = NormalizeName(o.ClientName);
            if (!byName.TryGetValue(key, out var c)) continue;
            o.CustomerId = c.Id;
            o.ClientName = c.Name;
            n++;
        }
        return n;
    }

    private async Task<int> LinkManufacturingOrdersAsync(Dictionary<string, Customer> byName, CancellationToken ct)
    {
        var rows = await _db.ManufacturingOrders
            .Where(o => o.CustomerId == null && o.ClientName != null && o.ClientName != "")
            .ToListAsync(ct);
        var n = 0;
        foreach (var o in rows)
        {
            var key = NormalizeName(o.ClientName);
            if (!byName.TryGetValue(key, out var c)) continue;
            o.CustomerId = c.Id;
            o.ClientName = c.Name;
            n++;
        }
        return n;
    }

    private static void AddName(HashSet<string> names, string? raw)
    {
        var n = NormalizeName(raw);
        if (!string.IsNullOrWhiteSpace(n)) names.Add(n);
    }

    private static string NormalizeName(string? name) => (name ?? string.Empty).Trim();

    private static CustomerDto Map(Customer c) =>
        new(c.Id, c.Name, c.Nit, c.ContactName, c.Phone, c.Email, c.Address, c.ReceiptPercentage, c.IsActive);

    private static void Validate(SaveCustomerCommand command)
    {
        if (string.IsNullOrWhiteSpace(command.Name))
            throw new InvalidOperationException("El nombre del cliente es obligatorio.");
        if (command.ReceiptPercentage is < 0 or > 100)
            throw new InvalidOperationException("El % de recibo debe estar entre 0 y 100.");
    }
}
