using Perlax.Modules.Production.Infrastructure.Cotizador;
using Xunit;

namespace Perlax.Modules.Production.UnitTests;

public class CotizadorFormulasTests
{
    [Fact]
    public void AreaPorUnidad_MatchesExcelGH_I()
    {
        Assert.Equal(0.0875m, CotizadorFormulas.AreaPorUnidad(0.7m, 0.5m, 4m));
    }

    [Fact]
    public void Peliculas_MatchesExcelAW_WithFactor30()
    {
        // AW$5 = 30 → G*H*N*10000*30/AM
        var cost = CotizadorFormulas.Peliculas(true, 0.7m, 0.5m, 4, 30m, 10000m);
        Assert.Equal(42m, Math.Round(cost, 2));
        Assert.Equal(0m, CotizadorFormulas.Peliculas(false, 0.7m, 0.5m, 4, 30m, 10000m));
    }

    [Fact]
    public void PreciosVenta_Al5_IsAl3_Div095()
    {
        var p = CotizadorFormulas.PreciosVenta(1000m, 0.10m, 0.15m, 0.18m, 0.15m, 0);
        Assert.True(p.Al3 > p.Al15);
        Assert.Equal(Math.Round(p.Al3 / 0.95m, 6), Math.Round(p.Al5, 6));
    }

    [Fact]
    public void AjustePlazoPago_MatchesExcelCF()
    {
        // (CF-30)/(30*100)
        Assert.Equal(-0.01m, CotizadorFormulas.AjustePlazoPago(0));
        Assert.Equal(0m, CotizadorFormulas.AjustePlazoPago(30));
        Assert.Equal(0.01m, CotizadorFormulas.AjustePlazoPago(60));
        Assert.Equal(0.02m, CotizadorFormulas.AjustePlazoPago(90));
    }

    [Fact]
    public void AjustePlazoPago_IgnoresLegacyPercentBase()
    {
        // Si BD tiene PLAZO_PAGO_30=0.04 (legado), no debe tumbar precios.
        Assert.Equal(0.01m, CotizadorFormulas.AjustePlazoPago(60, 0.04m));
        Assert.Equal(0m, CotizadorFormulas.AjustePlazoPago(30, 0.04m));
    }

    [Fact]
    public void PreciosVenta_NotZero_WhenAjusteCorrupt()
    {
        var p = CotizadorFormulas.PreciosVenta(385.49m, 0.10m, 0.15m, 0.18m, 0.15m, 14.99m);
        Assert.True(p.Al15 > 0);
        Assert.True(p.Al3 > 0);
        Assert.True(p.Al5 > 0);
    }

    [Fact]
    public void PreciosVenta_AcceptsMarginsStoredAsPercent()
    {
        // BD con 10/15 en vez de 0.10/0.15
        var p = CotizadorFormulas.PreciosVenta(385.49m, 10m, 15m, 18m, 15m, 0);
        Assert.True(p.Al15 > 385.49m);
        Assert.True(p.Al3 > p.Al15);
        Assert.True(p.Al5 > p.Al3);
    }

    [Fact]
    public void Row1923_Prices_MatchExcelMugDisney()
    {
        // Costo CD de la fila 1923 y plazo contado (ajuste −0,01), admin 0,18.
        const decimal cost = 2114.0493333333334m;
        var ajuste = CotizadorFormulas.AjustePlazoPago(0);
        var p = CotizadorFormulas.PreciosVenta(cost, 0.10m, 0.15m, 0.18m, 0.18m, ajuste);
        Assert.Equal(2895.96m, Math.Round(p.Al15, 2));
        Assert.Equal(3108.90m, Math.Round(p.Al3, 2));
        Assert.Equal(3272.52m, Math.Round(p.Al5, 2));
    }

    [Fact]
    public void Tinta_TreatsFractionAndPercentTheSame()
    {
        var asPercent = CotizadorFormulas.Tinta(0.14m, 3m, 50m, 80m);
        var asFraction = CotizadorFormulas.Tinta(0.14m, 3m, 50m, 0.8m);
        Assert.Equal(16.8m, Math.Round(asPercent, 1));
        Assert.Equal(Math.Round(asPercent, 4), Math.Round(asFraction, 4));
    }

    [Fact]
    public void Barniz_MatchesExcelAQ()
    {
        Assert.Equal(148m, CotizadorFormulas.Barniz(1850m, 0.5m, 0.04m));
    }

    [Fact]
    public void ServicioCorte_HasNoSeteo()
    {
        // Con seteo 1 el estándar sería mayor; Corte Excel ignora seteo
        var conSeteo = CotizadorFormulas.ServicioEstandar(10000m, 4m, 5000m, 1m, 80000m);
        var corte = CotizadorFormulas.ServicioCorte(10000m, 4m, 5000m, 80000m);
        Assert.True(conSeteo > corte);
    }
}
