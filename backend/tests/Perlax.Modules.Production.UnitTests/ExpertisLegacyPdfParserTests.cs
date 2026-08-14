using Xunit;
using Perlax.Modules.Production.Infrastructure.Parsing;

namespace Perlax.Modules.Production.UnitTests;

public class ExpertisLegacyPdfParserTests
{
    private static string Testdata(string name) =>
        Path.Combine(AppContext.BaseDirectory, "Testdata", name);

    [Fact]
    public void Parse_real_expertis_pdfs_extracts_coherent_fields()
    {
        var fichaPath = Testdata("ficha7858.pdf");
        var opPath = Testdata("op7858.pdf");
        Assert.True(File.Exists(fichaPath), "Falta Testdata/ficha7858.pdf");
        Assert.True(File.Exists(opPath), "Falta Testdata/op7858.pdf");

        using var ficha = File.OpenRead(fichaPath);
        using var op = File.OpenRead(opPath);
        var parsed = ExpertisLegacyPdfParser.Parse(ficha, op);

        Assert.Equal("7858", parsed.OpNumber);
        Assert.Equal("LINK'T SYSTEMS LLC", parsed.ClientName);
        Assert.Contains("Empanada Argentina Carne KERO", parsed.ProductName);
        Assert.Equal(550m, parsed.QuantityToProduce);
        Assert.Equal("P1-021", parsed.CodigoTroquel);
        Assert.Equal(55.5m, parsed.Alto);
        Assert.Equal(43m, parsed.Ancho);
        Assert.Equal(24.1m, parsed.Largo);
        Assert.Equal("Barniz Brillante", parsed.Terminado1);
        Assert.True(parsed.TintaC && parsed.TintaM && parsed.TintaY && parsed.TintaK);
        Assert.False(string.IsNullOrWhiteSpace(parsed.RawFichaText));
        Assert.False(string.IsNullOrWhiteSpace(parsed.RawOpText));
        Assert.Contains("SpeedMaster", parsed.FabricationProcessesJson);
        Assert.Contains("Corte", parsed.FabricationProcessesJson);
        Assert.Contains("Impresion", parsed.FabricationProcessesJson);
        Assert.Contains("Troquelado", parsed.FabricationProcessesJson);
        Assert.Contains("Pegadora", parsed.FabricationProcessesJson);
        Assert.NotNull(parsed.Parts);
        Assert.Single(parsed.Parts);
        Assert.Equal("Pieza Unica", parsed.Parts[0].PartName);
    }

    [Fact]
    public void Parse_op_7774_extracts_two_pieces()
    {
        var fichaPath = Testdata("ficha7774.pdf");
        var opPath = Testdata("op7774.pdf");
        Assert.True(File.Exists(fichaPath), "Falta Testdata/ficha7774.pdf");
        Assert.True(File.Exists(opPath), "Falta Testdata/op7774.pdf");

        using var ficha = File.OpenRead(fichaPath);
        using var op = File.OpenRead(opPath);
        var parsed = ExpertisLegacyPdfParser.Parse(ficha, op);

        Assert.Equal("7774", parsed.OpNumber);
        Assert.Equal(22000m, parsed.QuantityToProduce);
        Assert.Equal("T2-091", parsed.CodigoTroquel);
        Assert.NotNull(parsed.Parts);
        Assert.Equal(2, parsed.Parts.Count);
        Assert.Equal("Pieza Unica", parsed.Parts[0].PartName);
        Assert.Contains("Micro Flauta", parsed.Parts[1].PartName, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("Convertidora", parsed.Parts[0].FabricationProcessesJson);
        Assert.Contains("SpeedMaster", parsed.Parts[0].FabricationProcessesJson);
        Assert.Contains("Colaminadora", parsed.Parts[0].FabricationProcessesJson);
        Assert.Contains("Convertidora", parsed.Parts[1].FabricationProcessesJson);
        Assert.Contains("Colaminadora", parsed.Parts[1].FabricationProcessesJson);
        Assert.Equal(63.5m, parsed.Parts[1].AnchoPliego);
        Assert.Equal(44.5m, parsed.Parts[1].AltoPliego);
        Assert.Equal(63.5m, parsed.Parts[1].Ancho);
        Assert.Equal(44.5m, parsed.Parts[1].Alto);
        Assert.True(
            parsed.Parts[0].FabricationProcessesJson!.Contains("Manual", StringComparison.OrdinalIgnoreCase)
            || parsed.Parts[0].FabricationProcessesJson!.Contains("ARMAR", StringComparison.OrdinalIgnoreCase));
    }
}