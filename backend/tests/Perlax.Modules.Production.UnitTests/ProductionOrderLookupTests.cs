using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;
using Perlax.Web.Services;
using Xunit;

namespace Perlax.Modules.Production.UnitTests;

public class ProductionOrderLookupTests
{
    private static (ProductionOrderLookup Sut, ProductionDbContext Db) CreateSut()
    {
        var options = new DbContextOptionsBuilder<ProductionDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        var db = new ProductionDbContext(options);
        return (new ProductionOrderLookup(db), db);
    }

    private static async Task SeedAsync(ProductionDbContext db)
    {
        db.ProductionOrders.AddRange(
            new ProductionOrder
            {
                Id = Guid.NewGuid(),
                OTNumber = "1001",
                Cliente = "Cliente Alfa",
                ProductName = "Caja Premium",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            },
            new ProductionOrder
            {
                Id = Guid.NewGuid(),
                OTNumber = "1002",
                Cliente = "Cliente Beta",
                ProductName = "Bolsa Simple",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            });

        db.ManufacturingOrders.AddRange(
            new ManufacturingOrder
            {
                Id = Guid.NewGuid(),
                OpNumber = "OP-10",
                OrderNumber = "PED-10",
                OtNumber = "1001",
                ClientName = "Cliente Alfa",
                ProductName = "Caja Premium",
                OpeningDate = DateTime.UtcNow.AddHours(-5),
                Status = "Abierta",
                CreatedAt = DateTime.UtcNow
            },
            new ManufacturingOrder
            {
                Id = Guid.NewGuid(),
                OpNumber = "OP-11",
                OrderNumber = "PED-11",
                OtNumber = "1002",
                ClientName = "Cliente Beta",
                ProductName = "Bolsa Simple",
                OpeningDate = null,
                Status = "PendienteApertura",
                CreatedAt = DateTime.UtcNow
            },
            new ManufacturingOrder
            {
                Id = Guid.NewGuid(),
                OpNumber = "OP-12",
                OrderNumber = "PED-12",
                OtNumber = "1002",
                ClientName = "Cliente Beta",
                ProductName = "Bolsa Cerrada",
                OpeningDate = DateTime.UtcNow.AddDays(-1),
                Status = "Cerrada",
                CreatedAt = DateTime.UtcNow
            });

        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task Search_Without_Term_Returns_Ot_And_Open_Op_Only()
    {
        var (sut, db) = CreateSut();
        await SeedAsync(db);

        var rows = await sut.SearchAsync(null, 30);

        Assert.Contains(rows, r => r.OTNumber == "1001");
        Assert.Contains(rows, r => r.OTNumber == "1002");
        Assert.Contains(rows, r => r.OTNumber == "OP-10");
        Assert.DoesNotContain(rows, r => r.OTNumber == "OP-11"); // sin apertura
        Assert.DoesNotContain(rows, r => r.OTNumber == "OP-12"); // cerrada
    }

    [Fact]
    public async Task Search_By_Client_Matches_Ot_And_Op()
    {
        var (sut, db) = CreateSut();
        await SeedAsync(db);

        var rows = await sut.SearchAsync("alfa", 30);

        Assert.All(rows, r => Assert.Contains("Alfa", r.Cliente ?? string.Empty, StringComparison.OrdinalIgnoreCase));
        Assert.Contains(rows, r => r.OTNumber == "1001");
        Assert.Contains(rows, r => r.OTNumber == "OP-10");
    }

    [Fact]
    public async Task Search_By_OpNumber_Finds_Open_Op()
    {
        var (sut, db) = CreateSut();
        await SeedAsync(db);

        var rows = await sut.SearchAsync("OP-10", 30);

        Assert.Contains(rows, r => r.OTNumber == "OP-10");
    }

    [Fact]
    public async Task Search_Clamps_Limit_To_Max_100_And_Min_Default()
    {
        var (sut, db) = CreateSut();
        await SeedAsync(db);

        var withZero = await sut.SearchAsync(null, 0);
        Assert.True(withZero.Count <= 30);

        for (var i = 0; i < 40; i++)
        {
            db.ProductionOrders.Add(new ProductionOrder
            {
                Id = Guid.NewGuid(),
                OTNumber = $"9{i:D3}",
                Cliente = $"Extra {i}",
                ProductName = $"Prod {i}",
                CreatedAt = DateTime.UtcNow
            });
        }
        await db.SaveChangesAsync();

        var capped = await sut.SearchAsync(null, 500);
        Assert.True(capped.Count <= 100);
    }

    [Fact]
    public async Task Search_Respects_Requested_Limit()
    {
        var (sut, db) = CreateSut();
        await SeedAsync(db);

        var rows = await sut.SearchAsync(null, 2);
        Assert.Equal(2, rows.Count);
    }
}