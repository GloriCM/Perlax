namespace Perlax.Modules.Budgets.Domain.Elliot;

public static class ElliotPayrollRates
{
    public const decimal CesantiaPrima = 0.0833m;
    public const decimal InteresCesantia = 0.12m;
    public const decimal Vacaciones = 0.0416m;
    public const decimal Arl = 0.025m;
    public const decimal Salud = 0.085m;
    public const decimal Pension = 0.12m;
    public const decimal Caja = 0.04m;
    public const decimal CooperativaPrestaciones = 0.52m;
    public const decimal DefaultMaterialPct = 0.45m;
}

public static class ElliotPayrollSections
{
    public const string Admin = "Admin";
    public const string Sales = "Sales";
    public const string Production = "Production";
    public const string Cooperative = "Cooperative";
}

public static class ElliotFixedGroups
{
    public const string Honorarios = "Honorarios";
    public const string Impuestos = "Impuestos";
    public const string Arrendamientos = "Arrendamientos";
    public const string Contribuciones = "Contribuciones";
    public const string ServiciosAdmin = "ServiciosAdmin";
    public const string GastosLegales = "GastosLegales";
    public const string MantenimientoAdmin = "MantenimientoAdmin";
    public const string Adecuacion = "Adecuacion";
    public const string ViajesAdmin = "ViajesAdmin";
    public const string DepreciacionAdmin = "DepreciacionAdmin";
    public const string Diferidos = "Diferidos";
    public const string DiversosAdmin = "DiversosAdmin";
    public const string ArrendamientosVentas = "ArrendamientosVentas";
    public const string ServiciosVentas = "ServiciosVentas";
    public const string ViajesVentas = "ViajesVentas";
    public const string DiversosVentas = "DiversosVentas";
    public const string Financieros = "Financieros";
    public const string AuxiliosAdmin = "AuxiliosAdmin";
    public const string AuxiliosVentas = "AuxiliosVentas";
    public const string AuxiliosProduccion = "AuxiliosProduccion";
    public const string AdmonCooperativa = "AdmonCooperativa";
    public const string MantenimientoMaquinas = "MantenimientoMaquinas";
    public const string CostosIndirectos = "CostosIndirectos";
    public const string ContratosServicios = "ContratosServicios";
}
