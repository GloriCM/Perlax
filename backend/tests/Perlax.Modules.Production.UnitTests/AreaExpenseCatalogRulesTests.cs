using Perlax.Modules.Production.Domain.AreaExpense;
using Xunit;

namespace Perlax.Modules.Production.UnitTests;

public class AreaExpenseCatalogRulesTests
{
    [Fact]
    public void Nit_formats_nine_digits_and_verification()
    {
        Assert.True(AreaExpenseCatalogRules.TryFormatNit("9001234567", out var formatted, out var error));
        Assert.Equal("900.123.456-7", formatted);
        Assert.Equal("", error);
    }

    [Fact]
    public void Cedula_formats_thousands()
    {
        Assert.True(AreaExpenseCatalogRules.TryFormatCedula("149303837", out var formatted, out _));
        Assert.Equal("149.303.837", formatted);
    }

    [Fact]
    public void Empty_nit_and_cedula_are_optional()
    {
        Assert.True(AreaExpenseCatalogRules.TryFormatNit("  ", out var nit, out _));
        Assert.Null(nit);
        Assert.True(AreaExpenseCatalogRules.TryFormatCedula("", out var cc, out _));
        Assert.Null(cc);
    }

    [Theory]
    [InlineData("planeacion")]
    [InlineData("produccion")]
    [InlineData("mantenimiento")]
    [InlineData("sst")]
    public void Known_areas_are_accepted(string area)
    {
        Assert.True(AreaExpenseCatalogRules.TryNormalizeArea(area, out var key));
        Assert.Equal(area, key);
    }
}