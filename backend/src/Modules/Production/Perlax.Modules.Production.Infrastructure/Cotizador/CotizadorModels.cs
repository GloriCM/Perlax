namespace Perlax.Modules.Production.Infrastructure.Cotizador;

public sealed class CotizadorCalculateRequest
{
    public string ProductType { get; set; } = "Caja";
    public decimal LargoPliego { get; set; }
    public decimal AnchoPliego { get; set; }
    public decimal Cabida { get; set; }
    public decimal PrecioMaterialM2 { get; set; }
    public int NumeroPlanchas { get; set; }
    public decimal PrecioPlancha { get; set; }
    public decimal CubrimientoPct { get; set; }
    public int VecesImprimir { get; set; } = 1;
    public decimal FactorBarniz { get; set; }
    public decimal PrecioTerminadoM2 { get; set; }
    public decimal PrecioMicroM2 { get; set; }
    public decimal LargoCordonCm { get; set; }
    public decimal PrecioCordonManija { get; set; }
    public int NumeroRefuerzos { get; set; }
    public decimal AnchoVentanillaCm { get; set; }
    public decimal LargoVentanillaCm { get; set; }
    public decimal PrecioTroquel { get; set; }
    public List<int> Quantities { get; set; } = [5000, 10000, 20000, 50000, 100000];
    public int PrimaryQuantityIndex { get; set; }
    public decimal ContratoServicios { get; set; }
    public string FreightType { get; set; } = "Local";
    public CotizadorServiciosRequest Servicios { get; set; } = new();
    public Guid? ImpresoraMachineId { get; set; }
}

public sealed class CotizadorServiciosRequest
{
    public bool Conversion { get; set; }
    public bool Corte1 { get; set; }
    public bool Corte2 { get; set; }
    public bool Impresion { get; set; }
    public bool Corrugado { get; set; }
    public bool Laminado { get; set; }
    public bool Troquelado { get; set; }
    public bool Pegado { get; set; }
}

public sealed class CotizadorMachineSnapshot
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ServiceRole { get; set; } = string.Empty;
    public decimal SetupTimeHours { get; set; }
    public decimal ShotsPerHour { get; set; }
    public decimal HourlyRate { get; set; }
}

public sealed class CotizadorQuantityResult
{
    public int Quantity { get; set; }
    public bool IsPrimary { get; set; }
    public CotizadorCostBreakdown Breakdown { get; set; } = new();
    public decimal CostoTotalUnitario { get; set; }
    public decimal PrecioAl15 { get; set; }
    public decimal PrecioAl3 { get; set; }
    public decimal PrecioAl5 { get; set; }
}

public sealed class CotizadorCostBreakdown
{
    public decimal AreaPorUnidad { get; set; }
    public decimal Material { get; set; }
    public decimal Tinta { get; set; }
    public decimal Planchas { get; set; }
    public decimal Barniz { get; set; }
    public decimal Terminado { get; set; }
    public decimal MicroFlauta { get; set; }
    public decimal Cordon { get; set; }
    public decimal Refuerzo { get; set; }
    public decimal Ventanilla { get; set; }
    public decimal Troquel { get; set; }
    public decimal SubtotalMateriaPrima { get; set; }
    public decimal Desperdicio { get; set; }
    public decimal MateriaPrimaConDesperdicio { get; set; }
    public decimal Conversion { get; set; }
    public decimal Corte1 { get; set; }
    public decimal Corte2 { get; set; }
    public decimal Impresion { get; set; }
    public decimal Corrugado { get; set; }
    public decimal Laminado { get; set; }
    public decimal Troquelado { get; set; }
    public decimal Pegado { get; set; }
    public decimal SubtotalServicios { get; set; }
    public decimal ContratoServicios { get; set; }
    public decimal Flete { get; set; }
}

public sealed class CotizadorCalculateResponse
{
    public List<CotizadorQuantityResult> Results { get; set; } = [];
    public List<string> MissingFields { get; set; } = [];
    public bool IsValid => MissingFields.Count == 0;
}
