using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Common;
using Perlax.Modules.Production.Application.Cotizador;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed partial class CotizadorService
{
    public async Task<IReadOnlyList<CotizadorMachine>> GetCatalogMachinesAsync(CancellationToken ct = default) =>
        await _db.CotizadorMachines.AsNoTracking().OrderBy(x => x.ServiceRole).ThenBy(x => x.Name).ToListAsync(ct);

    public async Task<CotizadorMachine> CreateMachineAsync(CotizadorMachine item, CancellationToken ct = default)
    {
        item.Id = Guid.NewGuid();
        item.CreatedAt = DateTime.UtcNow;
        _db.CotizadorMachines.Add(item);
        await _db.SaveChangesAsync(ct);
        return item;
    }

    public async Task<CotizadorMachine> UpdateMachineAsync(Guid id, CotizadorMachine item, CancellationToken ct = default)
    {
        var entity = await _db.CotizadorMachines.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Maquina no encontrada.");
        entity.Name = item.Name;
        entity.ServiceRole = item.ServiceRole;
        entity.SetupTimeHours = item.SetupTimeHours;
        entity.ShotsPerHour = item.ShotsPerHour;
        entity.HourlyRate = item.HourlyRate;
        entity.IsActive = item.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task DeleteMachineAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.CotizadorMachines.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Maquina no encontrada.");
        _db.CotizadorMachines.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<CotizadorMaterial>> GetCatalogMaterialsAsync(CancellationToken ct = default) =>
        await _db.CotizadorMaterials.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);

    public async Task<CotizadorMaterial> CreateMaterialAsync(CotizadorMaterial item, CancellationToken ct = default)
    {
        item.Id = Guid.NewGuid();
        item.CreatedAt = DateTime.UtcNow;
        _db.CotizadorMaterials.Add(item);
        await _db.SaveChangesAsync(ct);
        return item;
    }

    public async Task<CotizadorMaterial> UpdateMaterialAsync(Guid id, CotizadorMaterial item, CancellationToken ct = default)
    {
        var entity = await _db.CotizadorMaterials.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Material no encontrado.");
        entity.Name = item.Name;
        entity.PricePerM2 = item.PricePerM2;
        entity.IsActive = item.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task DeleteMaterialAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.CotizadorMaterials.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Material no encontrado.");
        _db.CotizadorMaterials.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<CotizadorFactor>> GetFactorsAsync(CancellationToken ct = default) =>
        await _db.CotizadorFactors.AsNoTracking().OrderBy(x => x.Key).ToListAsync(ct);

    public async Task<CotizadorFactor> CreateFactorAsync(CotizadorFactor item, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(item.Key))
            throw new InvalidOperationException("El nombre del factor es obligatorio.");

        var key = item.Key.Trim();
        if (await _db.CotizadorFactors.AnyAsync(f => f.Key == key, ct))
            throw new ResourceConflictException($"Ya existe un factor con nombre '{key}'.");

        var entity = new CotizadorFactor
        {
            Id = Guid.NewGuid(),
            Key = key,
            Label = string.IsNullOrWhiteSpace(item.Label) ? key : item.Label.Trim(),
            Value = item.Value,
            Description = item.Description,
            CreatedAt = DateTime.UtcNow
        };

        _db.CotizadorFactors.Add(entity);
        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<CotizadorFactor> UpdateFactorAsync(Guid id, CotizadorFactor item, CancellationToken ct = default)
    {
        var entity = await _db.CotizadorFactors.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Factor no encontrado.");
        entity.Value = item.Value;
        entity.Label = string.IsNullOrWhiteSpace(item.Label) ? entity.Label : item.Label;
        entity.Description = item.Description;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task<IReadOnlyList<CotizadorMicroFlauta>> GetCatalogMicroFlautasAsync(CancellationToken ct = default) =>
        await _db.CotizadorMicroFlautas.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);

    public async Task<CotizadorMicroFlauta> CreateMicroFlautaAsync(CotizadorMicroFlauta item, CancellationToken ct = default)
    {
        item.Id = Guid.NewGuid();
        item.CreatedAt = DateTime.UtcNow;
        _db.CotizadorMicroFlautas.Add(item);
        await _db.SaveChangesAsync(ct);
        return item;
    }

    public async Task<CotizadorMicroFlauta> UpdateMicroFlautaAsync(Guid id, CotizadorMicroFlauta item, CancellationToken ct = default)
    {
        var entity = await _db.CotizadorMicroFlautas.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Micro flauta no encontrada.");
        entity.Name = item.Name;
        entity.PricePerM2 = item.PricePerM2;
        entity.IsActive = item.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task DeleteMicroFlautaAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.CotizadorMicroFlautas.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Micro flauta no encontrada.");
        _db.CotizadorMicroFlautas.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<CotizadorPlancha>> GetCatalogPlanchasAsync(CancellationToken ct = default) =>
        await _db.CotizadorPlanchas.AsNoTracking().OrderBy(x => x.Name).ToListAsync(ct);

    public async Task<CotizadorPlancha> CreatePlanchaAsync(CotizadorPlancha item, CancellationToken ct = default)
    {
        item.Id = Guid.NewGuid();
        item.CreatedAt = DateTime.UtcNow;
        _db.CotizadorPlanchas.Add(item);
        await _db.SaveChangesAsync(ct);
        return item;
    }

    public async Task<CotizadorPlancha> UpdatePlanchaAsync(Guid id, CotizadorPlancha item, CancellationToken ct = default)
    {
        var entity = await _db.CotizadorPlanchas.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Plancha no encontrada.");
        entity.Name = item.Name;
        entity.Price = item.Price;
        entity.IsActive = item.IsActive;
        entity.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return entity;
    }

    public async Task DeletePlanchaAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.CotizadorPlanchas.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Plancha no encontrada.");
        _db.CotizadorPlanchas.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }
}