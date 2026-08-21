using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Scheduling;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;
using Perlax.Modules.Production.Infrastructure.Services;
using Xunit;

namespace Perlax.Modules.Production.UnitTests;

public class OpSchedulingServiceTests
{
    private static (OpSchedulingService Sut, ProductionDbContext Db) CreateSut(string? dbName = null)
    {
        var options = new DbContextOptionsBuilder<ProductionDbContext>()
            .UseInMemoryDatabase(dbName ?? Guid.NewGuid().ToString())
            .Options;
        var db = new ProductionDbContext(options);
        return (new OpSchedulingService(db), db);
    }

    private static async Task SeedBasicsAsync(ProductionDbContext db, Guid? moId = null, Guid? machineId = null)
    {
        db.OpProcessCatalogItems.Add(new OpProcessCatalogItem
        {
            Id = Guid.NewGuid(),
            Code = "Impresion",
            Label = "Impresion",
            SortOrder = 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });
        db.OpProcessCatalogItems.Add(new OpProcessCatalogItem
        {
            Id = Guid.NewGuid(),
            Code = "Troquel",
            Label = "Troquel",
            SortOrder = 2,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        });

        var orderId = moId ?? Guid.NewGuid();
        db.ManufacturingOrders.Add(new ManufacturingOrder
        {
            Id = orderId,
            OpNumber = "OP-0001",
            CustomerOrderId = Guid.NewGuid(),
            OrderPartId = Guid.NewGuid(),
            ProductionOrderId = Guid.NewGuid(),
            OrderNumber = "PED-1",
            OtNumber = "OT-1",
            ClientName = "Cliente Demo",
            ProductName = "Caja",
            QuantityToProduce = 1000,
            ApprovedUnitPrice = 12.5m,
            OpeningDate = DateTime.UtcNow,
            Status = "Abierta",
            CreatedAt = DateTime.UtcNow
        });

        if (machineId.HasValue)
        {
            db.ProductionMachines.Add(new ProductionMachine
            {
                Id = machineId.Value,
                Code = "M1",
                Name = "Maquina 1",
                ProcessCode = "Impresion",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            });
        }

        await db.SaveChangesAsync();
    }

    [Fact]
    public async Task CreateBlock_Persists_Schedule_For_Open_Op()
    {
        var (sut, db) = CreateSut();
        var moId = Guid.NewGuid();
        await SeedBasicsAsync(db, moId);

        var start = new DateTime(2026, 8, 12, 8, 0, 0, DateTimeKind.Utc);
        var end = new DateTime(2026, 8, 12, 16, 0, 0, DateTimeKind.Utc);

        var block = await sut.CreateBlockAsync(new UpsertScheduleBlockCommand(
            moId, "Impresion", null, OpScheduleBlockTypes.Op, start, end,
            OpScheduleStatuses.Scheduled, 0, null), "tester");

        Assert.Equal(moId, block.ManufacturingOrderId);
        Assert.Equal("Impresion", block.ProcessCode);
        Assert.Equal("OP-0001", block.OpNumber);
        Assert.Equal(1, await db.OpProcessSchedules.CountAsync());
    }

    [Fact]
    public async Task CreateBlock_Rejects_Invalid_Date_Range()
    {
        var (sut, db) = CreateSut();
        var moId = Guid.NewGuid();
        await SeedBasicsAsync(db, moId);

        var start = new DateTime(2026, 8, 12, 16, 0, 0, DateTimeKind.Utc);
        var end = new DateTime(2026, 8, 12, 8, 0, 0, DateTimeKind.Utc);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateBlockAsync(new UpsertScheduleBlockCommand(
                moId, "Impresion", null, OpScheduleBlockTypes.Op, start, end,
                OpScheduleStatuses.Scheduled, 0, null), "tester"));

        Assert.Contains("fecha fin", ex.Message, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task CreateBlock_Rejects_Duplicate_Process_On_Same_Op()
    {
        var (sut, db) = CreateSut();
        var moId = Guid.NewGuid();
        await SeedBasicsAsync(db, moId);

        var start = new DateTime(2026, 8, 12, 8, 0, 0, DateTimeKind.Utc);
        var end = new DateTime(2026, 8, 12, 12, 0, 0, DateTimeKind.Utc);
        var cmd = new UpsertScheduleBlockCommand(
            moId, "Impresion", null, OpScheduleBlockTypes.Op, start, end,
            OpScheduleStatuses.Scheduled, 0, null);

        await sut.CreateBlockAsync(cmd, "tester");

        var laterStart = new DateTime(2026, 8, 13, 8, 0, 0, DateTimeKind.Utc);
        var laterEnd = new DateTime(2026, 8, 13, 12, 0, 0, DateTimeKind.Utc);
        var dup = new UpsertScheduleBlockCommand(
            moId, "Impresion", null, OpScheduleBlockTypes.Op, laterStart, laterEnd,
            OpScheduleStatuses.Scheduled, 1, null);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateBlockAsync(dup, "tester"));
        Assert.Contains("Ya existe un bloque", ex.Message);
    }

    [Fact]
    public async Task CreateBlock_Rejects_Machine_Overlap()
    {
        var (sut, db) = CreateSut();
        var moId = Guid.NewGuid();
        var machineId = Guid.NewGuid();
        await SeedBasicsAsync(db, moId, machineId);

        var start = new DateTime(2026, 8, 12, 8, 0, 0, DateTimeKind.Utc);
        var end = new DateTime(2026, 8, 12, 16, 0, 0, DateTimeKind.Utc);

        await sut.CreateBlockAsync(new UpsertScheduleBlockCommand(
            moId, "Impresion", machineId, OpScheduleBlockTypes.Op, start, end,
            OpScheduleStatuses.Scheduled, 0, null), "tester");

        var otherMo = Guid.NewGuid();
        db.ManufacturingOrders.Add(new ManufacturingOrder
        {
            Id = otherMo,
            OpNumber = "OP-0002",
            CustomerOrderId = Guid.NewGuid(),
            OrderPartId = Guid.NewGuid(),
            ProductionOrderId = Guid.NewGuid(),
            OpeningDate = DateTime.UtcNow,
            Status = "Abierta",
            CreatedAt = DateTime.UtcNow
        });
        await db.SaveChangesAsync();

        var overlapStart = new DateTime(2026, 8, 12, 12, 0, 0, DateTimeKind.Utc);
        var overlapEnd = new DateTime(2026, 8, 12, 18, 0, 0, DateTimeKind.Utc);

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.CreateBlockAsync(new UpsertScheduleBlockCommand(
                otherMo, "Troquel", machineId, OpScheduleBlockTypes.Op, overlapStart, overlapEnd,
                OpScheduleStatuses.Scheduled, 0, null), "tester"));

        Assert.Contains("Cruce de horario", ex.Message);
    }

    [Fact]
    public async Task ProgramOrder_Creates_Process_Blocks()
    {
        var (sut, db) = CreateSut();
        var moId = Guid.NewGuid();
        await SeedBasicsAsync(db, moId);

        var result = await sut.ProgramOrderAsync(new ProgramOrderCommand(
            moId,
            false,
            new[]
            {
                new ProgramProcessCommand("Impresion", null,
                    new DateTime(2026, 8, 12, 8, 0, 0, DateTimeKind.Utc),
                    new DateTime(2026, 8, 12, 12, 0, 0, DateTimeKind.Utc),
                    0, 4m, null),
                new ProgramProcessCommand("Troquel", null,
                    new DateTime(2026, 8, 13, 8, 0, 0, DateTimeKind.Utc),
                    new DateTime(2026, 8, 13, 12, 0, 0, DateTimeKind.Utc),
                    1, 4m, null)
            }), "tester");

        Assert.Equal(2, result.Processes.Count);
        Assert.Equal(2, await db.OpProcessSchedules.CountAsync());
    }

    [Fact]
    public async Task ProgramOrder_Requires_Urgency_To_Reprogram()
    {
        var (sut, db) = CreateSut();
        var moId = Guid.NewGuid();
        await SeedBasicsAsync(db, moId);

        var processes = new[]
        {
            new ProgramProcessCommand("Impresion", null,
                new DateTime(2026, 8, 12, 8, 0, 0, DateTimeKind.Utc),
                new DateTime(2026, 8, 12, 12, 0, 0, DateTimeKind.Utc),
                0, 4m, null)
        };

        await sut.ProgramOrderAsync(new ProgramOrderCommand(moId, false, processes), "tester");

        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.ProgramOrderAsync(new ProgramOrderCommand(moId, false, processes), "tester"));
        Assert.Contains("urgencia", ex.Message, StringComparison.OrdinalIgnoreCase);

        var reprogrammed = await sut.ProgramOrderAsync(new ProgramOrderCommand(moId, true, processes), "tester");
        Assert.True(reprogrammed.IsUrgency);
        Assert.Equal(1, await db.OpProcessSchedules.CountAsync());
    }

    [Fact]
    public async Task GetMachineSchedule_Returns_Only_Blocks_For_Machine_And_Day()
    {
        var (sut, db) = CreateSut();
        var moId = Guid.NewGuid();
        var machineId = Guid.NewGuid();
        await SeedBasicsAsync(db, moId, machineId);

        await sut.CreateBlockAsync(new UpsertScheduleBlockCommand(
            moId, "Impresion", machineId, OpScheduleBlockTypes.Op,
            new DateTime(2026, 8, 12, 8, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 12, 12, 0, 0, DateTimeKind.Utc),
            OpScheduleStatuses.Scheduled, 0, null), "tester");

        await sut.CreateBlockAsync(new UpsertScheduleBlockCommand(
            moId, "Troquel", null, OpScheduleBlockTypes.Op,
            new DateTime(2026, 8, 12, 13, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 12, 16, 0, 0, DateTimeKind.Utc),
            OpScheduleStatuses.Scheduled, 1, null, IsUrgency: true), "tester");

        var day = await sut.GetMachineScheduleAsync(machineId, new DateOnly(2026, 8, 12));
        Assert.Single(day);
        Assert.Equal(machineId, day[0].MachineId);
    }

    [Fact]
    public async Task SetBillingMeta_And_Summary_Carry_Weekly_Deficit()
    {
        var (sut, db) = CreateSut();
        var moId = Guid.NewGuid();
        await SeedBasicsAsync(db, moId);

        await sut.SetBillingMetaAsync(2026, 8, 4000m, "tester");
        await sut.CreateBlockAsync(new UpsertScheduleBlockCommand(
            moId, "Impresion", null, OpScheduleBlockTypes.Op,
            new DateTime(2026, 8, 3, 8, 0, 0, DateTimeKind.Utc),
            new DateTime(2026, 8, 3, 12, 0, 0, DateTimeKind.Utc),
            OpScheduleStatuses.Scheduled, 0, null), "tester");

        var summary = await sut.GetBillingSummaryAsync(2026, 8);
        Assert.Equal(4000m, summary.MonthlyGoal);
        Assert.True(summary.WeekCount >= 4);
        Assert.Equal(1000m * 12.5m, summary.Weeks[0].Generated);
        Assert.True(summary.Weeks[0].CarryOut >= 0);
    }

    [Fact]
    public void MapSuggestedProcesses_maps_expertis_machines_to_catalog()
    {
        const string json = """
            [
              {"machine":"02a Guillotina A","process":"Proceso","notes":"REFILAR A 43 X 55,5"},
              {"machine":"06 SpeedMaster 72","process":"Proceso","notes":"C+M+Y+K+BARNIZ"},
              {"machine":"8B Troqueladora","process":"Proceso","notes":"TROQUELAR : NUEVO"},
              {"machine":"14 Pegadora","process":"Proceso","notes":"PEGAR -550 UNDS"},
              {"machine":"ALMACEN","process":"Almacen","notes":"ENTREGAR CAJA"}
            ]
            """;
        var labels = new Dictionary<string, string>
        {
            ["Corte"] = "Corte",
            ["Impresion"] = "Impresion",
            ["Troquelado"] = "Troquelado",
            ["Pegadora"] = "Pegadora",
        };

        var suggested = OpSchedulingService.MapSuggestedProcesses(json, labels);

        Assert.Equal(4, suggested.Count);
        Assert.Equal(["Corte", "Impresion", "Troquelado", "Pegadora"], suggested.Select(s => s.ProcessCode).ToArray());
        Assert.Contains("Guillotina", suggested[0].Machine);
    }

    [Fact]
    public void MapSuggestedProcesses_keeps_same_catalog_code_per_part()
    {
        const string jsonA = """[{"machine":"10a Colaminadora","processCode":"Colaminado","notes":"COLAMINAR CON MICRO"}]""";
        const string jsonB = """[{"machine":"10a Colaminadora","processCode":"Colaminado","notes":"COLAMINAR"}]""";
        var labels = new Dictionary<string, string> { ["Colaminado"] = "Colaminado" };

        var a = OpSchedulingService.MapSuggestedProcesses(jsonA, labels, "Pieza Unica");
        var b = OpSchedulingService.MapSuggestedProcesses(jsonB, labels, "Micro Flauta E");
        var all = a.Concat(b).ToList();

        Assert.Equal(2, all.Count);
        Assert.Equal("Pieza Unica", all[0].PartName);
        Assert.Equal("Micro Flauta E", all[1].PartName);
        Assert.All(all, s => Assert.Equal("Colaminado", s.ProcessCode));
    }
}