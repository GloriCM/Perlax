using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Cotizador;

namespace Perlax.Modules.Production.Infrastructure.Persistence;

public static class CotizadorDbSeeder
{
    public static async Task SeedAsync(ProductionDbContext context)
    {
        foreach (var (key, label, value, desc) in CotizadorFormulas.DefaultFactors)
        {
            if (await context.CotizadorFactors.AnyAsync(f => f.Key == key))
                continue;

            context.CotizadorFactors.Add(new CotizadorFactor
            {
                Id = Guid.NewGuid(),
                Key = key,
                Label = label,
                Value = value,
                Description = desc,
                CreatedAt = DateTime.UtcNow
            });
        }

        var machineDefaults = new[]
        {
            ("Conversion", "Convertidora", 1m, 3000m, 80000m),
            ("Corte", "Guillotina", 0m, 5000m, 80000m),
            ("Impresora", "Impresora", 1m, 3000m, 130000m),
            ("Corrugado", "Corrugadora", 0m, 210m, 75000m),
            ("Laminado", "Laminadora", 0m, 800m, 170000m),
            ("Troquelado", "Troqueladora", 1m, 2000m, 80000m),
            ("Pegado", "Pegadora", 0m, 15000m, 290000m),
        };
        foreach (var (role, name, seteo, tiros, tarifa) in machineDefaults)
        {
            if (await context.CotizadorMachines.AnyAsync(m => m.ServiceRole == role && m.Name == name))
                continue;

            context.CotizadorMachines.Add(new CotizadorMachine
            {
                Id = Guid.NewGuid(),
                ServiceRole = role,
                Name = name,
                SetupTimeHours = seteo,
                ShotsPerHour = tiros,
                HourlyRate = tarifa,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        var materialDefaults = new[]
        {
            ("Cartulina SBS 250g", 1850m),
            ("Cartón corrugado BC", 1200m),
            ("Papel kraft 80g", 980m),
        };
        foreach (var (name, price) in materialDefaults)
        {
            if (await context.CotizadorMaterials.AnyAsync(m => m.Name == name))
                continue;

            context.CotizadorMaterials.Add(new CotizadorMaterial
            {
                Id = Guid.NewGuid(),
                Name = name,
                PricePerM2 = price,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        var planchaDefaults = new[]
        {
            ("Plancha CTP estándar", 45000m),
            ("Plancha CTP premium", 62000m),
        };
        foreach (var (name, price) in planchaDefaults)
        {
            if (await context.CotizadorPlanchas.AnyAsync(p => p.Name == name))
                continue;

            context.CotizadorPlanchas.Add(new CotizadorPlancha
            {
                Id = Guid.NewGuid(),
                Name = name,
                Price = price,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        var microDefaults = new[]
        {
            ("Micro E", 420m),
            ("Flauta C", 380m),
            ("Flauta B", 350m),
        };
        foreach (var (name, price) in microDefaults)
        {
            if (await context.CotizadorMicroFlautas.AnyAsync(m => m.Name == name))
                continue;

            context.CotizadorMicroFlautas.Add(new CotizadorMicroFlauta
            {
                Id = Guid.NewGuid(),
                Name = name,
                PricePerM2 = price,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        if (context.ChangeTracker.HasChanges())
            await context.SaveChangesAsync();
    }
}