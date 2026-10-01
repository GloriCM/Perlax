using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Cotizador;

namespace Perlax.Modules.Production.Infrastructure.Persistence;

/// <summary>
/// Semilla estricta: solo datos de «Cotizador Grupo Elliot 2026.xlsx» hoja Materiales.
/// Upsert por nombre + desactiva cualquier registro que no esté en el Excel.
/// </summary>
public static class CotizadorDbSeeder
{
    // Materiales!C3:G39 + Acetatos C46 + Pegante K32
    private static readonly (string Name, decimal Price)[] ExcelMaterials =
    [
        ("earthpact 150 gr", 650m),
        ("Cartulina Bristol 125 gr", 800m),
        ("Propal greese proof 310 gr", 2200m),
        ("Cartulina Came cal 36", 815m),
        ("Cartulina Came cal 40", 900m),
        ("Cartulina Came cal 48", 1080m),
        ("Cartulina Optima 36", 2400m),
        ("Cartulina Optima 40", 2350m),
        ("Cartulina Optima 48", 2700m),
        ("Cartulina Basica 56", 1550m),
        ("PVP 30 245 gr", 1000m),
        ("PVP 36 272 gr", 1200m),
        ("PVP 40 310 gr", 1300m),
        ("PVP 46 342 gr", 1500m),
        ("Cartulina Ultra/ Duplex 48", 1900m),
        ("Cartulina Ultra/ Duplex 52", 1900m),
        ("Cartulina Chip 48", 1500m),
        ("Autoadhesivo de seguridad", 3300m),
        ("Earth Pact Natural 200 gr", 1500m),
        ("Cartulina Esmaltada Maule revso Bco cal 30", 1200m),
        ("Cartulina Esmaltada Maule revso Bco cal 36", 2100m),
        ("Cartulina Esmaltada Maule revso Bco cal 40", 2400m),
        ("Cartulina Esmaltada Maule revso Bco cal 46", 2700m),
        ("Cartulina Esmaltada Maule revso Bco cal 50", 2800m),
        ("Cartulina Kraft 220", 770m),
        ("Cartulina Negra", 1800m),
        ("pcote 150 c2s", 1400m),
        ("pcote 200 c2s", 1700m),
        ("pcote 240 c2s", 2000m),
        ("Pcote 160 c1s", 1500m),
        ("pcote 225 c1s", 1900m),
        ("pcote 250 c1s", 2200m),
        ("Pcote 320 C1s", 2400m),
        ("Liner 127 gr", 440m),
        ("Liner 160 gr", 450m),
        ("Papel Copia de 30 gr", 270m),
        ("Papel Bond 115", 850m),
        ("Acetatos", 2000m),
        ("Pegante", 3500m),
    ];

    // Materiales!D41:G44
    private static readonly (string Name, decimal Price)[] ExcelPlanchas =
    [
        ("Conv 1/2", 25000m),
        ("Conv Pliego", 45000m),
        ("CTP 1/2", 30000m),
        ("CTP Pliego", 70000m),
    ];

    // Materiales!K14:M20
    private static readonly (string Name, decimal Price)[] ExcelMicros =
    [
        ("Flauta E", 1300m),
        ("Flauta B", 1300m),
        ("Flauta C", 5000m),
        ("Flauta E earthpact/kraft", 1800m),
        ("Flauta E rvso Bond", 1800m),
        ("Fibra Solida", 3450m),
        ("MDF", 8000m),
    ];

    // Materiales!K3:M4
    private static readonly (string Name, decimal Factor)[] ExcelBarnices =
    [
        ("Barniz Brillante", 0.015m),
        ("Barniz Mate", 0.04m),
    ];

    // Materiales!K8:M12
    private static readonly (string Name, decimal Price)[] ExcelTerminados =
    [
        ("Plastificado Brillante", 550m),
        ("Barniz UV", 250m),
        ("Barniz UV reserva", 315m),
        ("Laminado Brillante", 800m),
        ("Laminado Mate", 900m),
    ];

    // Materiales!K25:M28
    private static readonly (string Name, decimal Price)[] ExcelCordones =
    [
        ("Cordon normal", 200m),
        ("Cinta Satinada", 450m),
        ("Cinta Falla 2,5", 350m),
        ("entorchado", 250m),
    ];

    // Cabecera oculta hoja cotizador filas 4–5 (BB–BO): seteo / tiros / tarifa.
    // NO usar tarifas Materiales!C49:E54 para el cálculo (son otra lista).
    private static readonly (string Role, string Name, decimal Seteo, decimal Tiros, decimal Tarifa)[] ExcelMachines =
    [
        ("Conversion", "Conversion", 1m, 3000m, 80000m),
        ("Corte", "Corte", 0m, 5000m, 80000m),
        ("Impresora", "Impresion", 0m, 3000m, 130000m),
        ("Corrugado", "Corrugado", 0m, 210m, 75000m),
        ("Laminado", "Laminado", 1m, 800m, 170000m),
        ("Troquelado", "Troquelado", 1m, 2000m, 80000m),
        ("Pegado", "Pega", 0m, 15000m, 290000m),
    ];

    public static async Task SeedAsync(ProductionDbContext context)
    {
        // Factores mínimos del Excel Materiales + PV hoja cotizador
        await UpsertFactorAsync(context, CotizadorFormulas.FactorVentanilla, "Valor ventanilla", 2000m, "Materiales!M23");
        await UpsertFactorAsync(context, CotizadorFormulas.FactorCostoTinta, "Costo tinta", 50m, "Materiales!M35");
        // Filas vigentes del Excel (desde ~500): CG/CH usan 0.18 administrativo, no 0.15.
        await UpsertFactorAsync(context, CotizadorFormulas.FactorMargenAdmin, "Margen administrativo", 0.18m, "cotizador CG/CH: fijo 0.18");
        await UpsertFactorAsync(context, CotizadorFormulas.FactorMargenIdeal, "Margen ideal (Al 3)", 0.15m, "cotizador!CE");
        await UpsertFactorAsync(context, CotizadorFormulas.FactorMargenAl15, "Margen utilidad Al 1.5", 0.10m, "cotizador CG");
        await UpsertFactorAsync(context, CotizadorFormulas.FactorFleteRelativo, "Flete relativo", 0.35m, "cotizador!BX$4");
        await UpsertFactorAsync(context, CotizadorFormulas.FactorFleteLocal, "Multiplicador flete local", 96.3m, "cotizador!BY$4");
        await UpsertFactorAsync(context, CotizadorFormulas.FactorFleteNacional, "Multiplicador flete nacional", 428m, "cotizador!BZ$4");
        await UpsertFactorAsync(context, CotizadorFormulas.FactorDesperdicio, "Desperdicio materia prima", 0.03m, "cotizador!AY$5");
        await UpsertFactorAsync(context, CotizadorFormulas.FactorPrecioRefuerzoM2, "Precio m² del refuerzo", 2700m, "Materiales!G11 Cartulina Optima 48");
        await UpsertFactorAsync(context, CotizadorFormulas.FactorTiempoPlancha, "Horas por plancha (impresión)", 0.75m, "cotizador BG: N*0.75");
        await UpsertFactorAsync(context, CotizadorFormulas.FactorPeliculas, "Factor películas (AW$5)", 30m, "cotizador!AW$5");

        foreach (var (key, label, value, desc) in CotizadorFormulas.DefaultFactors)
        {
            if (context.CotizadorFactors.Local.Any(f => f.Key == key)
                || await context.CotizadorFactors.AnyAsync(f => f.Key == key))
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

        foreach (var (name, price) in ExcelMaterials)
            await UpsertMaterialAsync(context, name, price);
        await DeactivateOthersAsync(context.CotizadorMaterials, ExcelMaterials.Select(x => x.Name));

        foreach (var (name, price) in ExcelPlanchas)
            await UpsertPlanchaAsync(context, name, price);
        await DeactivateOthersAsync(context.CotizadorPlanchas, ExcelPlanchas.Select(x => x.Name));

        foreach (var (name, price) in ExcelMicros)
            await UpsertMicroAsync(context, name, price);
        await DeactivateOthersAsync(context.CotizadorMicroFlautas, ExcelMicros.Select(x => x.Name));

        foreach (var (name, factor) in ExcelBarnices)
            await UpsertBarnizAsync(context, name, factor);
        await DeactivateOthersAsync(context.CotizadorBarnices, ExcelBarnices.Select(x => x.Name));

        foreach (var (name, price) in ExcelTerminados)
            await UpsertTerminadoAsync(context, name, price);
        await DeactivateOthersAsync(context.CotizadorTerminados, ExcelTerminados.Select(x => x.Name));

        foreach (var (name, price) in ExcelCordones)
            await UpsertCordonAsync(context, name, price);
        await DeactivateOthersAsync(context.CotizadorCordones, ExcelCordones.Select(x => x.Name));

        foreach (var (role, name, seteo, tiros, tarifa) in ExcelMachines)
            await UpsertMachineAsync(context, role, name, seteo, tiros, tarifa);

        // Unificar legado «Corte 1/2» → un solo servicio «Corte»
        await UnifyCorteMachinesAsync(context);

        await DeactivateOtherMachinesAsync(context, ExcelMachines.Select(x => x.Name));

        if (context.ChangeTracker.HasChanges())
            await context.SaveChangesAsync();
    }

    private static async Task UpsertFactorAsync(ProductionDbContext db, string key, string label, decimal value, string desc)
    {
        var row = await db.CotizadorFactors.FirstOrDefaultAsync(f => f.Key == key);
        if (row == null)
        {
            db.CotizadorFactors.Add(new CotizadorFactor
            {
                Id = Guid.NewGuid(),
                Key = key,
                Label = label,
                Value = value,
                Description = desc,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            row.Value = value;
            row.Label = label;
            row.Description = desc;
            row.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static async Task UpsertMaterialAsync(ProductionDbContext db, string name, decimal price)
    {
        var row = await db.CotizadorMaterials.FirstOrDefaultAsync(m => m.Name == name);
        if (row == null)
        {
            db.CotizadorMaterials.Add(new CotizadorMaterial
            {
                Id = Guid.NewGuid(),
                Name = name,
                PricePerM2 = price,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            row.PricePerM2 = price;
            row.IsActive = true;
            row.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static async Task UpsertPlanchaAsync(ProductionDbContext db, string name, decimal price)
    {
        var row = await db.CotizadorPlanchas.FirstOrDefaultAsync(p => p.Name == name);
        if (row == null)
        {
            db.CotizadorPlanchas.Add(new CotizadorPlancha
            {
                Id = Guid.NewGuid(),
                Name = name,
                Price = price,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            row.Price = price;
            row.IsActive = true;
            row.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static async Task UpsertMicroAsync(ProductionDbContext db, string name, decimal price)
    {
        var row = await db.CotizadorMicroFlautas.FirstOrDefaultAsync(m => m.Name == name);
        if (row == null)
        {
            db.CotizadorMicroFlautas.Add(new CotizadorMicroFlauta
            {
                Id = Guid.NewGuid(),
                Name = name,
                PricePerM2 = price,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            row.PricePerM2 = price;
            row.IsActive = true;
            row.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static async Task UpsertBarnizAsync(ProductionDbContext db, string name, decimal factor)
    {
        var row = await db.CotizadorBarnices.FirstOrDefaultAsync(b => b.Name == name);
        if (row == null)
        {
            db.CotizadorBarnices.Add(new CotizadorBarniz
            {
                Id = Guid.NewGuid(),
                Name = name,
                Factor = factor,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            row.Factor = factor;
            row.IsActive = true;
            row.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static async Task UpsertTerminadoAsync(ProductionDbContext db, string name, decimal price)
    {
        var row = await db.CotizadorTerminados.FirstOrDefaultAsync(t => t.Name == name);
        if (row == null)
        {
            db.CotizadorTerminados.Add(new CotizadorTerminado
            {
                Id = Guid.NewGuid(),
                Name = name,
                PricePerM2 = price,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            row.PricePerM2 = price;
            row.IsActive = true;
            row.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static async Task UpsertCordonAsync(ProductionDbContext db, string name, decimal price)
    {
        var row = await db.CotizadorCordones.FirstOrDefaultAsync(c => c.Name == name);
        if (row == null)
        {
            db.CotizadorCordones.Add(new CotizadorCordon
            {
                Id = Guid.NewGuid(),
                Name = name,
                PricePerManija = price,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            row.PricePerManija = price;
            row.IsActive = true;
            row.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static async Task UpsertMachineAsync(
        ProductionDbContext db, string role, string name, decimal seteo, decimal tiros, decimal hourlyRate)
    {
        var row = await db.CotizadorMachines.FirstOrDefaultAsync(m => m.Name == name || m.ServiceRole == role);
        if (row == null)
        {
            db.CotizadorMachines.Add(new CotizadorMachine
            {
                Id = Guid.NewGuid(),
                ServiceRole = role,
                Name = name,
                SetupTimeHours = seteo,
                ShotsPerHour = tiros,
                HourlyRate = hourlyRate,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }
        else
        {
            row.ServiceRole = role;
            row.Name = name;
            row.SetupTimeHours = seteo;
            row.ShotsPerHour = tiros;
            row.HourlyRate = hourlyRate;
            row.IsActive = true;
            row.UpdatedAt = DateTime.UtcNow;
        }
    }

    private static async Task DeactivateOthersAsync<T>(DbSet<T> set, IEnumerable<string> allowedNames) where T : class
    {
        var allowed = new HashSet<string>(allowedNames, StringComparer.OrdinalIgnoreCase);
        var rows = await set.ToListAsync();
        foreach (var row in rows)
        {
            var nameProp = typeof(T).GetProperty("Name");
            var activeProp = typeof(T).GetProperty("IsActive");
            var updatedProp = typeof(T).GetProperty("UpdatedAt");
            if (nameProp == null || activeProp == null) continue;
            var name = nameProp.GetValue(row) as string ?? "";
            if (allowed.Contains(name)) continue;
            if (activeProp.GetValue(row) is true)
            {
                activeProp.SetValue(row, false);
                updatedProp?.SetValue(row, DateTime.UtcNow);
            }
        }
    }

    private static async Task UnifyCorteMachinesAsync(ProductionDbContext db)
    {
        // En el proceso (paso 8) solo existe «Corte». Materiales traía tarifas «Corte 1/2»:
        // se consolidan en una sola máquina «Corte» y se eliminan las demás.
        var all = await db.CotizadorMachines
            .Where(m =>
                m.Name == "Corte" || m.Name == "Corte 1" || m.Name == "Corte 2" ||
                m.ServiceRole == "Corte" || m.ServiceRole == "Corte1" || m.ServiceRole == "Corte2")
            .ToListAsync();

        var keep = all.FirstOrDefault(m => m.Name == "Corte" || m.ServiceRole == "Corte")
            ?? all.FirstOrDefault(m => m.Name == "Corte 1" || m.ServiceRole == "Corte1")
            ?? all.FirstOrDefault();

        if (keep != null)
        {
            keep.Name = "Corte";
            keep.ServiceRole = "Corte";
            keep.SetupTimeHours = 0;
            keep.ShotsPerHour = 5000m;
            keep.HourlyRate = 80000m;
            keep.IsActive = true;
            keep.UpdatedAt = DateTime.UtcNow;
        }

        foreach (var row in all)
        {
            if (keep != null && row.Id == keep.Id) continue;
            db.CotizadorMachines.Remove(row);
        }
    }

    private static async Task DeactivateOtherMachinesAsync(ProductionDbContext db, IEnumerable<string> allowedNames)
    {
        var allowed = new HashSet<string>(allowedNames, StringComparer.OrdinalIgnoreCase);
        var rows = await db.CotizadorMachines.ToListAsync();
        foreach (var row in rows)
        {
            if (allowed.Contains(row.Name)) continue;
            if (!row.IsActive) continue;
            row.IsActive = false;
            row.UpdatedAt = DateTime.UtcNow;
        }
    }
}
