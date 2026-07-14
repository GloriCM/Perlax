using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Infrastructure.Persistence;

public static class DesignPlannerDbSeeder
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    public static async Task SeedAsync(ProductionDbContext context)
    {
        if (await context.DesignPlannerJobs.AnyAsync()) return;

        var job1Id = Guid.NewGuid();
        var job2Id = Guid.NewGuid();
        var job3Id = Guid.NewGuid();

        context.DesignPlannerJobs.AddRange(
            new DesignPlannerJob
            {
                Id = job1Id,
                JobNumber = "PJ-2026-001",
                Cliente = "Linkt Systems LLC",
                Vendedor = "Claude",
                Trabajo = "Plegadiza RAH Dubai Chocolates",
                Responsable = "Juan",
                Estado = "En Desarrollo",
                CreatedAt = new DateTime(2026, 6, 15, 0, 0, 0, DateTimeKind.Utc),
                FechaRecepcion = new DateTime(2026, 6, 15, 0, 0, 0, DateTimeKind.Utc),
                FechaEntrega = new DateTime(2026, 6, 24, 0, 0, 0, DateTimeKind.Utc),
                Requerimientos = "Ajuste de línea grafica + pruebas de troquel.",
                HistorialJson = SerializeHistorial(["Trabajo creado por jefe de área."])
            },
            new DesignPlannerJob
            {
                Id = job2Id,
                JobNumber = "PJ-2026-002",
                Cliente = "Instanta",
                Vendedor = "Karen",
                Trabajo = "Caja Pet 200 x 12",
                Responsable = "Karen",
                Estado = "Nuevo Trabajo Pendiente",
                CreatedAt = new DateTime(2026, 6, 18, 0, 0, 0, DateTimeKind.Utc),
                FechaEntrega = new DateTime(2026, 6, 28, 0, 0, 0, DateTimeKind.Utc),
                HistorialJson = SerializeHistorial(["Trabajo creado y notificado a Diseño."])
            },
            new DesignPlannerJob
            {
                Id = job3Id,
                JobNumber = "PJ-2026-003",
                Cliente = "Disney",
                Vendedor = "Claude",
                Trabajo = "Golden OAK",
                Responsable = "Juan",
                Estado = "Aprobación",
                CreatedAt = new DateTime(2026, 6, 20, 0, 0, 0, DateTimeKind.Utc),
                FechaRecepcion = new DateTime(2026, 6, 20, 0, 0, 0, DateTimeKind.Utc),
                FechaEntrega = new DateTime(2026, 6, 30, 0, 0, 0, DateTimeKind.Utc),
                Requerimientos = "Validar versión final de ficha técnica.",
                HistorialJson = SerializeHistorial(["Trabajo en aprobación final."])
            });

        context.DesignPlannerActivities.AddRange(
            new DesignPlannerActivity { Id = Guid.NewGuid(), DesignPlannerJobId = job1Id, Nombre = "Planchas", FechaEnvio = new DateOnly(2026, 6, 16), FechaRecepcion = new DateOnly(2026, 6, 17), Repeticiones = 1, Completada = true, SortOrder = 0 },
            new DesignPlannerActivity { Id = Guid.NewGuid(), DesignPlannerJobId = job1Id, Nombre = "Troquel", FechaEnvio = new DateOnly(2026, 6, 18), FechaRecepcion = new DateOnly(2026, 6, 20), Repeticiones = 1, Observaciones = "Pendiente ajuste final", SortOrder = 1 },
            new DesignPlannerActivity { Id = Guid.NewGuid(), DesignPlannerJobId = job1Id, Nombre = "Muestras", FechaEnvio = new DateOnly(2026, 6, 20), Repeticiones = 1, SortOrder = 2 },
            new DesignPlannerActivity { Id = Guid.NewGuid(), DesignPlannerJobId = job3Id, Nombre = "Arte", FechaEnvio = new DateOnly(2026, 6, 21), FechaRecepcion = new DateOnly(2026, 6, 21), Repeticiones = 1, Completada = true, SortOrder = 0 },
            new DesignPlannerActivity { Id = Guid.NewGuid(), DesignPlannerJobId = job3Id, Nombre = "Impresión digital", FechaEnvio = new DateOnly(2026, 6, 22), FechaRecepcion = new DateOnly(2026, 6, 23), Repeticiones = 2, Completada = true, SortOrder = 1 });

        await context.SaveChangesAsync();
    }

    private static string SerializeHistorial(IEnumerable<string> entries) =>
        JsonSerializer.Serialize(entries.ToArray(), JsonOpts);
}