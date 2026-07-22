using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Infrastructure.Persistence;

public static class DailyProductionDbSeeder
{
    public static async Task SeedAsync(ProductionDbContext db, CancellationToken ct = default)
    {
        await SeedShiftsAsync(db, ct);
        await SeedMachinesAsync(db, ct);
        await RemoveSeedOperatorsAsync(db, ct);
        await SeedActivityCodesAsync(db, ct);
        await SeedWasteReasonsAsync(db, ct);
        await db.SaveChangesAsync(ct);
    }

    private static async Task SeedShiftsAsync(ProductionDbContext db, CancellationToken ct)
    {
        if (await db.ProductionShifts.AnyAsync(ct)) return;

        db.ProductionShifts.AddRange(
            new ProductionShift
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111101"),
                Code = "T1",
                Name = "Turno 1 (06:00-14:00)",
                StartTime = new TimeOnly(6, 0),
                EndTime = new TimeOnly(14, 0),
                CrossesMidnight = false,
                SortOrder = 1,
            },
            new ProductionShift
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111102"),
                Code = "T2",
                Name = "Turno 2 (14:00-22:00)",
                StartTime = new TimeOnly(14, 0),
                EndTime = new TimeOnly(22, 0),
                CrossesMidnight = false,
                SortOrder = 2,
            },
            new ProductionShift
            {
                Id = Guid.Parse("11111111-1111-1111-1111-111111111103"),
                Code = "T3",
                Name = "Turno 3 (22:00-06:00)",
                StartTime = new TimeOnly(22, 0),
                EndTime = new TimeOnly(6, 0),
                CrossesMidnight = true,
                SortOrder = 3,
            });
    }

    private static async Task SeedMachinesAsync(ProductionDbContext db, CancellationToken ct)
    {
        if (await db.ProductionMachines.AnyAsync(ct)) return;

        db.ProductionMachines.AddRange(
            new ProductionMachine { Id = Guid.Parse("22222222-2222-2222-2222-222222222201"), Code = "1a", Name = "1A CONVERTIDORA", CreatedBy = "seed" },
            new ProductionMachine { Id = Guid.Parse("22222222-2222-2222-2222-222222222206"), Code = "6sm", Name = "6 SpeedMaster", CreatedBy = "seed" },
            new ProductionMachine { Id = Guid.Parse("22222222-2222-2222-2222-222222222210"), Code = "10a", Name = "10A Colaminadora Carton", CreatedBy = "seed" });
    }

    /// <summary>
    /// Los operarios ahora provienen de Usuarios (rol Operario). Este método elimina
    /// los operarios demo sembrados originalmente; si alguno ya tiene reportes, solo se desactiva.
    /// </summary>
    private static async Task RemoveSeedOperatorsAsync(ProductionDbContext db, CancellationToken ct)
    {
        var seedIds = new[]
        {
            Guid.Parse("33333333-3333-3333-3333-333333333301"),
            Guid.Parse("33333333-3333-3333-3333-333333333302"),
            Guid.Parse("33333333-3333-3333-3333-333333333303"),
            Guid.Parse("33333333-3333-3333-3333-333333333304"),
        };

        var seeded = await db.ProductionOperators
            .Where(o => seedIds.Contains(o.Id) && o.UserId == null)
            .ToListAsync(ct);
        if (seeded.Count == 0) return;

        foreach (var op in seeded)
        {
            var inUse = await db.ProductionSessions.AnyAsync(s => s.OperatorId == op.Id, ct);
            if (inUse)
            {
                op.IsActive = false;
                op.UpdatedAt = DateTime.UtcNow;
                op.UpdatedBy = "seed-cleanup";
            }
            else
            {
                db.ProductionOperators.Remove(op);
            }
        }
    }

    private static async Task SeedActivityCodesAsync(ProductionDbContext db, CancellationToken ct)
    {
        if (await db.ProductionActivityCodes.AnyAsync(ct)) return;

        var definitions = new (string Code, string Name, bool RequiresOrder, bool AllowsQty, (string Code, string Name, bool ReqObs)[] Subs)[]
        {
            ("01", "Puesta a Punto", true, false, Array.Empty<(string, string, bool)>()),
            ("02", "Produccion", true, true, Array.Empty<(string, string, bool)>()),
            ("03", "Reparacion", false, false, new[]
            {
                ("301", "Daño electrico", false),
                ("302", "Daño mecanico", false),
                ("303", "Daño electroMecanico", false),
                ("399", "Otro (especificar en observaciones)", true),
            }),
            ("04", "Descanso", false, false, Array.Empty<(string, string, bool)>()),
            ("08", "Otro Tiempo Muerto", false, false, new[]
            {
                ("801", "Cambio de mantilla", false),
                ("802", "Esperando repuesto/Mecanico/Tecnico", false),
                ("803", "Material Defectuoso", false),
                ("804", "Problemas de humedad", false),
                ("805", "Problemas de Registro", false),
                ("806", "Sin fluido electrico", false),
                ("807", "Tinta no conforme", false),
                ("808", "Cambio de cuchilla", false),
                ("809", "Limpieza de cilindros", false),
                ("810", "Hoja en bateria", false),
                ("899", "Otro (especificar en observaciones)", true),
            }),
            ("10", "Mantenimiento y Aseo", false, false, Array.Empty<(string, string, bool)>()),
            ("13", "Falta de Trabajo", false, false, new[]
            {
                ("1301", "Esperando material", false),
                ("1302", "Esperando OP", false),
                ("1303", "Sin programacion", false),
                ("1399", "Otro (especificar en observaciones)", true),
            }),
            ("14", "Otros Tiempos", false, false, new[]
            {
                ("1401", "Cambio de bateria", false),
                ("1402", "Calibracion de franjas", false),
                ("1403", "Reunion programada", false),
                ("1404", "Lavada de baterias", false),
                ("1499", "Otro (especificar en observaciones)", true),
            }),
        };

        var sort = 0;
        foreach (var def in definitions)
        {
            sort++;
            var codeId = Guid.NewGuid();
            var entity = new ProductionActivityCode
            {
                Id = codeId,
                Code = def.Code,
                Name = def.Name,
                RequiresOrder = def.RequiresOrder,
                AllowsProductionQty = def.AllowsQty,
                SortOrder = sort,
                CreatedBy = "seed",
            };

            var subSort = 0;
            foreach (var sub in def.Subs)
            {
                subSort++;
                entity.Subcodes.Add(new ProductionActivitySubcode
                {
                    Id = Guid.NewGuid(),
                    ActivityCodeId = codeId,
                    Code = sub.Code,
                    Name = sub.Name,
                    RequiresObservation = sub.ReqObs,
                    SortOrder = subSort,
                });
            }

            db.ProductionActivityCodes.Add(entity);
        }
    }

    private static async Task SeedWasteReasonsAsync(ProductionDbContext db, CancellationToken ct)
    {
        if (await db.ProductionWasteReasons.AnyAsync(ct)) return;

        var reasons = new (string Code, string Name, bool ReqObs)[]
        {
            ("01", "Arranque / puesta a punto", false),
            ("02", "Mal registro", false),
            ("03", "Tinta / color", false),
            ("04", "Material defectuoso", false),
            ("05", "Humedad", false),
            ("06", "Rotura / daño mecánico", false),
            ("07", "Cambio de trabajo", false),
            ("08", "Error de operario", false),
            ("09", "Cliente / especificación", false),
            ("10", "Suciedad / manchas", false),
            ("11", "Cuchilla / corte", false),
            ("12", "Pegue / cola", false),
            ("13", "Doblez / troquel", false),
            ("14", "Empaque", false),
            ("99", "Otro (especificar)", true),
        };

        var sort = 0;
        foreach (var r in reasons)
        {
            sort++;
            db.ProductionWasteReasons.Add(new ProductionWasteReason
            {
                Id = Guid.NewGuid(),
                Code = r.Code,
                Name = r.Name,
                RequiresObservation = r.ReqObs,
                SortOrder = sort,
            });
        }
    }
}
