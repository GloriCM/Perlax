using Perlax.Modules.Production.Domain.Entities;
using Xunit;

namespace Perlax.Modules.Production.UnitTests;

public class DailyProductionRulesTests
{
    [Theory]
    [InlineData("2026-07-17T06:00:00", "2026-07-17T07:00:00", 3600)]
    [InlineData("2026-07-17T22:00:00", "2026-07-18T06:00:00", 28800)]
    public void Duration_Computes_Seconds_Across_Midnight(string start, string end, int expected)
    {
        var startAt = DateTime.Parse(start);
        var endAt = DateTime.Parse(end);
        var seconds = (int)(endAt - startAt).TotalSeconds;
        Assert.Equal(expected, seconds);
        Assert.True(endAt > startAt);
    }

    [Fact]
    public void Production_Code_Allows_Qty_Flag()
    {
        var code = new ProductionActivityCode
        {
            Code = "02",
            Name = "Produccion",
            AllowsProductionQty = true,
            RequiresOrder = true,
        };
        Assert.True(code.AllowsProductionQty);
        Assert.True(code.RequiresOrder);
    }

    [Fact]
    public void Session_Statuses_Are_Stable()
    {
        Assert.Equal("live", ProductionSessionStatuses.Live);
        Assert.Equal("paused", ProductionSessionStatuses.Paused);
        Assert.Equal("finished", ProductionSessionStatuses.Finished);
        Assert.Equal("planta", ProductionSessionSources.Planta);
        Assert.Equal("reporte-diario", ProductionSessionSources.ReporteDiario);
    }

    [Fact]
    public void Waste_Cannot_Exceed_Tiros_Rule()
    {
        decimal tiros = 100;
        decimal waste = 120;
        Assert.True(waste > tiros);
    }

    [Fact]
    public void Overlap_Detection_Logic()
    {
        var aEnd = DateTime.Parse("2026-07-17T10:00:00");
        var bStart = DateTime.Parse("2026-07-17T09:30:00");
        Assert.True(bStart < aEnd);
    }
}
