using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Cotizador;

public class CotizadorCalculator
{
    private readonly ProductionDbContext _db;

    public CotizadorCalculator(ProductionDbContext db)
    {
        _db = db;
    }

    public async Task<CotizadorCalculateResponse> CalculateAsync(CotizadorCalculateRequest request, CancellationToken ct = default)
    {
        var response = new CotizadorCalculateResponse();
        var missing = Validate(request);
        if (missing.Count > 0)
        {
            response.MissingFields = missing;
            return response;
        }

        var factors = await LoadFactorsAsync(ct);
        var machines = await LoadMachinesAsync(ct);
        var isBolsa = string.Equals(request.ProductType, "Bolsa", StringComparison.OrdinalIgnoreCase);

        foreach (var qty in request.Quantities.Where(q => q > 0).Distinct())
        {
            var idx = request.Quantities.IndexOf(qty);
            var result = ComputeForQuantity(request, qty, factors, machines, isBolsa);
            result.IsPrimary = idx == request.PrimaryQuantityIndex;
            response.Results.Add(result);
        }

        return response;
    }

    private static List<string> Validate(CotizadorCalculateRequest r)
    {
        var missing = new List<string>();
        if (r.LargoPliego <= 0) missing.Add("Largo del pliego");
        if (r.AnchoPliego <= 0) missing.Add("Ancho del pliego");
        if (r.Cabida <= 0) missing.Add("Cabida");
        if (r.PrecioMaterialM2 <= 0) missing.Add("Precio material por m²");
        if (r.NumeroPlanchas <= 0) missing.Add("Número de planchas");
        if (r.PrecioPlancha <= 0) missing.Add("Precio por plancha");
        if (r.CubrimientoPct <= 0) missing.Add("Cubrimiento");
        if (r.FactorBarniz <= 0) missing.Add("Factor barniz");
        if (r.PrecioTroquel <= 0) missing.Add("Precio troquel");
        if (!r.Quantities.Any(q => q > 0)) missing.Add("Cantidad total");
        if (!r.Servicios.Conversion && !r.Servicios.Corte1 && !r.Servicios.Corte2 &&
            !r.Servicios.Impresion && !r.Servicios.Corrugado && !r.Servicios.Laminado &&
            !r.Servicios.Troquelado && !r.Servicios.Pegado)
            missing.Add("Al menos un proceso de máquina");
        return missing;
    }

    private CotizadorQuantityResult ComputeForQuantity(
        CotizadorCalculateRequest r,
        int cantidad,
        Dictionary<string, decimal> f,
        Dictionary<string, CotizadorMachineSnapshot> machines,
        bool isBolsa)
    {
        var cantidadDec = (decimal)cantidad;
        var area = CotizadorFormulas.AreaPorUnidad(r.LargoPliego, r.AnchoPliego, r.Cabida);
        var material = CotizadorFormulas.Material(area, r.PrecioMaterialM2);
        var tinta = CotizadorFormulas.Tinta(area, f[CotizadorFormulas.FactorTintaPorUnidad], f[CotizadorFormulas.FactorCostoTinta], r.CubrimientoPct);
        var planchas = CotizadorFormulas.Planchas(r.NumeroPlanchas, r.PrecioPlancha, cantidadDec);
        var barniz = CotizadorFormulas.Barniz(material, f[CotizadorFormulas.FactorDivisorBarniz], r.FactorBarniz);
        var terminado = CotizadorFormulas.Terminado(area, r.PrecioTerminadoM2);
        var micro = CotizadorFormulas.MicroFlauta(area, r.PrecioMicroM2);

        var cordon = isBolsa ? CotizadorFormulas.Cordon(r.LargoCordonCm, r.PrecioCordonManija) : 0;
        var refuerzo = isBolsa
            ? CotizadorFormulas.Refuerzo(r.NumeroRefuerzos, area, f[CotizadorFormulas.FactorRefuerzo], r.PrecioMaterialM2)
            : 0;
        var ventanilla = isBolsa
            ? CotizadorFormulas.Ventanilla(r.AnchoVentanillaCm, r.LargoVentanillaCm, f[CotizadorFormulas.FactorVentanilla])
            : 0;

        var troquel = CotizadorFormulas.Troquel(r.PrecioTroquel, cantidadDec);
        var subMateria = material + tinta + planchas + barniz + terminado + micro + cordon + refuerzo + ventanilla + troquel;
        var desperdicio = subMateria * f[CotizadorFormulas.FactorDesperdicio];

        var impresora = ResolveImpresora(machines, r.ImpresoraMachineId);
        var servicios = ComputeServicios(r, cantidadDec, machines, impresora, f[CotizadorFormulas.FactorTiempoPlancha]);

        var flete = ComputeFlete(r.FreightType, area, f);
        var costoTotal = CotizadorFormulas.CostoTotal(subMateria, f[CotizadorFormulas.FactorDesperdicio], servicios.Total, r.ContratoServicios, flete);
        var precios = CotizadorFormulas.PreciosVenta(
            costoTotal,
            f[CotizadorFormulas.FactorMargenAl15],
            f[CotizadorFormulas.FactorMargenIdeal],
            f[CotizadorFormulas.FactorMargenAl5],
            f[CotizadorFormulas.FactorMargenAdmin]);

        return new CotizadorQuantityResult
        {
            Quantity = cantidad,
            CostoTotalUnitario = Math.Round(costoTotal, 2),
            PrecioAl15 = Math.Round(precios.Al15, 2),
            PrecioAl3 = Math.Round(precios.Al3, 2),
            PrecioAl5 = Math.Round(precios.Al5, 2),
            Breakdown = new CotizadorCostBreakdown
            {
                AreaPorUnidad = Math.Round(area, 4),
                Material = Math.Round(material, 2),
                Tinta = Math.Round(tinta, 2),
                Planchas = Math.Round(planchas, 2),
                Barniz = Math.Round(barniz, 2),
                Terminado = Math.Round(terminado, 2),
                MicroFlauta = Math.Round(micro, 2),
                Cordon = Math.Round(cordon, 2),
                Refuerzo = Math.Round(refuerzo, 2),
                Ventanilla = Math.Round(ventanilla, 2),
                Troquel = Math.Round(troquel, 2),
                SubtotalMateriaPrima = Math.Round(subMateria, 2),
                Desperdicio = Math.Round(desperdicio, 2),
                MateriaPrimaConDesperdicio = Math.Round(subMateria * (1 + f[CotizadorFormulas.FactorDesperdicio]), 2),
                Conversion = Math.Round(servicios.Conversion, 2),
                Corte1 = Math.Round(servicios.Corte1, 2),
                Corte2 = Math.Round(servicios.Corte2, 2),
                Impresion = Math.Round(servicios.Impresion, 2),
                Corrugado = Math.Round(servicios.Corrugado, 2),
                Laminado = Math.Round(servicios.Laminado, 2),
                Troquelado = Math.Round(servicios.Troquelado, 2),
                Pegado = Math.Round(servicios.Pegado, 2),
                SubtotalServicios = Math.Round(servicios.Total, 2),
                ContratoServicios = Math.Round(r.ContratoServicios, 2),
                Flete = Math.Round(flete, 2),
            }
        };
    }

    private static (decimal Conversion, decimal Corte1, decimal Corte2, decimal Impresion, decimal Corrugado, decimal Laminado, decimal Troquelado, decimal Pegado, decimal Total) ComputeServicios(
        CotizadorCalculateRequest r, decimal cantidad, Dictionary<string, CotizadorMachineSnapshot> machines,
        CotizadorMachineSnapshot? impresora, decimal tiempoPlancha)
    {
        decimal conv = 0, c1 = 0, c2 = 0, imp = 0, corr = 0, lam = 0, troq = 0, peg = 0;
        if (r.Servicios.Conversion && machines.TryGetValue("Conversion", out var m))
            conv = CotizadorFormulas.ServicioEstandar(cantidad, r.Cabida, m.ShotsPerHour, m.SetupTimeHours, m.HourlyRate);
        if (r.Servicios.Corte1 && machines.TryGetValue("Corte", out m))
            c1 = CotizadorFormulas.ServicioEstandar(cantidad, r.Cabida, m.ShotsPerHour, m.SetupTimeHours, m.HourlyRate);
        if (r.Servicios.Corte2 && machines.TryGetValue("Corte", out m))
            c2 = CotizadorFormulas.ServicioEstandar(cantidad, r.Cabida, m.ShotsPerHour, m.SetupTimeHours, m.HourlyRate);
        if (r.Servicios.Impresion && impresora != null)
            imp = CotizadorFormulas.ServicioImpresion(cantidad, r.Cabida, r.VecesImprimir, r.NumeroPlanchas,
                impresora.ShotsPerHour, impresora.SetupTimeHours, impresora.HourlyRate, tiempoPlancha);
        if (r.Servicios.Corrugado && machines.TryGetValue("Corrugado", out m))
            corr = CotizadorFormulas.ServicioCorrugado(cantidad, r.Cabida, r.LargoPliego, r.AnchoPliego, m.ShotsPerHour, m.HourlyRate);
        if (r.Servicios.Laminado && machines.TryGetValue("Laminado", out m))
            lam = CotizadorFormulas.ServicioEstandar(cantidad, r.Cabida, m.ShotsPerHour, m.SetupTimeHours, m.HourlyRate);
        if (r.Servicios.Troquelado && machines.TryGetValue("Troquelado", out m))
            troq = CotizadorFormulas.ServicioEstandar(cantidad, r.Cabida, m.ShotsPerHour, m.SetupTimeHours, m.HourlyRate);
        if (r.Servicios.Pegado && machines.TryGetValue("Pegado", out m))
            peg = CotizadorFormulas.ServicioPegado(cantidad, m.ShotsPerHour, m.SetupTimeHours, m.HourlyRate);
        return (conv, c1, c2, imp, corr, lam, troq, peg, conv + c1 + c2 + imp + corr + lam + troq + peg);
    }

    private static decimal ComputeFlete(string freightType, decimal area, Dictionary<string, decimal> f)
    {
        if (string.Equals(freightType, "SinFlete", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(freightType, "Sin flete", StringComparison.OrdinalIgnoreCase))
            return 0;
        var rel = area * f[CotizadorFormulas.FactorFleteRelativo];
        if (string.Equals(freightType, "Nacional", StringComparison.OrdinalIgnoreCase))
            return CotizadorFormulas.Flete(area, f[CotizadorFormulas.FactorFleteRelativo], f[CotizadorFormulas.FactorFleteNacional]);
        return CotizadorFormulas.Flete(area, f[CotizadorFormulas.FactorFleteRelativo], f[CotizadorFormulas.FactorFleteLocal]);
    }

    private static CotizadorMachineSnapshot? ResolveImpresora(Dictionary<string, CotizadorMachineSnapshot> machines, Guid? id)
    {
        if (id.HasValue)
        {
            var byId = machines.Values.FirstOrDefault(m => m.Id == id.Value);
            if (byId != null) return byId;
        }
        return machines.TryGetValue("Impresora", out var imp) ? imp : machines.Values.FirstOrDefault(m => m.ServiceRole == "Impresora");
    }

    private async Task<Dictionary<string, decimal>> LoadFactorsAsync(CancellationToken ct)
    {
        var fromDb = await _db.CotizadorFactors.AsNoTracking().ToListAsync(ct);
        var dict = CotizadorFormulas.DefaultFactors.ToDictionary(x => x.Key, x => x.Default);
        foreach (var row in fromDb)
            dict[row.Key] = row.Value;
        return dict;
    }

    private async Task<Dictionary<string, CotizadorMachineSnapshot>> LoadMachinesAsync(CancellationToken ct)
    {
        var list = await _db.CotizadorMachines.AsNoTracking().Where(m => m.IsActive).ToListAsync(ct);
        var dict = new Dictionary<string, CotizadorMachineSnapshot>(StringComparer.OrdinalIgnoreCase);
        foreach (var m in list)
        {
            var snap = new CotizadorMachineSnapshot
            {
                Id = m.Id,
                Name = m.Name,
                ServiceRole = m.ServiceRole,
                SetupTimeHours = m.SetupTimeHours,
                ShotsPerHour = m.ShotsPerHour,
                HourlyRate = m.HourlyRate
            };
            if (!dict.ContainsKey(m.ServiceRole))
                dict[m.ServiceRole] = snap;
        }
        return dict;
    }
}
