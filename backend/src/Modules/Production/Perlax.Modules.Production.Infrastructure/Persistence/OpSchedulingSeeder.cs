using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Infrastructure.Persistence;

public static class OpSchedulingSeeder
{
    public static async Task SeedAsync(ProductionDbContext context, CancellationToken ct = default)
    {
        if (!await context.OpProcessCatalogItems.AnyAsync(ct))
        {
            foreach (var item in ProductionProcessCatalog.All)
            {
                context.OpProcessCatalogItems.Add(new OpProcessCatalogItem
                {
                    Id = Guid.NewGuid(),
                    Code = item.Code,
                    Label = item.Label,
                    SortOrder = item.SortOrder,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "system"
                });
            }
            await context.SaveChangesAsync(ct);
        }

        if (!await context.ProductionShifts.AnyAsync(ct))
        {
            context.ProductionShifts.AddRange(
                new ProductionShift
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111101"),
                    Code = "D1",
                    Name = "7 am - 4:30 pm",
                    StartTime = new TimeOnly(7, 0),
                    EndTime = new TimeOnly(16, 30),
                    CrossesMidnight = false,
                    SortOrder = 1,
                },
                new ProductionShift
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111102"),
                    Code = "D2",
                    Name = "3 pm - 11:30 pm",
                    StartTime = new TimeOnly(15, 0),
                    EndTime = new TimeOnly(23, 30),
                    CrossesMidnight = false,
                    SortOrder = 2,
                },
                new ProductionShift
                {
                    Id = Guid.Parse("11111111-1111-1111-1111-111111111103"),
                    Code = "N1",
                    Name = "11 pm - 7:30 am",
                    StartTime = new TimeOnly(23, 0),
                    EndTime = new TimeOnly(7, 30),
                    CrossesMidnight = true,
                    SortOrder = 3,
                });
            await context.SaveChangesAsync(ct);
        }
    }
}