using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Cotizador;
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
        Normalize(request);
        var parts = ResolveParts(request);
        var missing = Validate(request, parts);
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
            CotizadorQuantityResult? combined = null;
            foreach (var part in parts)
            {
                var partRequest = MergePart(request, part);
                var result = ComputeForQuantity(partRequest, qty, factors, machines, isBolsa);
                combined = combined == null ? result : SumResults(combined, result);
            }

            if (request.FleteManual is decimal fleteManual)
                ReplaceFreight(combined!, fleteManual, factors);
            combined!.IsPrimary = idx == request.PrimaryQuantityIndex;
            response.Results.Add(combined);
        }

        return response;
    }

    private static List<CotizadorPartInput> ResolveParts(CotizadorCalculateRequest r)
    {
        if (r.Parts is { Count: > 0 })
            return r.Parts;

        return
        [
            new CotizadorPartInput
            {
                PartName = "Pieza 1",
                LargoPliego = r.LargoPliego,
                AnchoPliego = r.AnchoPliego,
                Cabida = r.Cabida,
                PrecioMaterialM2 = r.PrecioMaterialM2,
                NumeroPlanchas = r.NumeroPlanchas,
                PrecioPlancha = r.PrecioPlancha,
                CubrimientoPct = r.CubrimientoPct,
                VecesImprimir = r.VecesImprimir,
                FactorBarniz = r.FactorBarniz,
                PrecioTerminadoM2 = r.PrecioTerminadoM2,
                PrecioMicroM2 = r.PrecioMicroM2,
                LargoCordonCm = r.LargoCordonCm,
                PrecioCordonManija = r.PrecioCordonManija,
                NumeroRefuerzos = r.NumeroRefuerzos,
                AnchoVentanillaCm = r.AnchoVentanillaCm,
                LargoVentanillaCm = r.LargoVentanillaCm,
                PrecioTroquel = r.PrecioTroquel,
                UsaPeliculas = r.UsaPeliculas,
                ImpresoraMachineId = r.ImpresoraMachineId
            }
        ];
    }

    private static CotizadorCalculateRequest MergePart(CotizadorCalculateRequest root, CotizadorPartInput part) => new()
    {
        ProductType = root.ProductType,
        LargoPliego = part.LargoPliego,
        AnchoPliego = part.AnchoPliego,
        Cabida = part.Cabida,
        PrecioMaterialM2 = part.PrecioMaterialM2,
        NumeroPlanchas = part.NumeroPlanchas,
        PrecioPlancha = part.PrecioPlancha,
        CubrimientoPct = part.CubrimientoPct,
        VecesImprimir = part.VecesImprimir > 0 ? part.VecesImprimir : 1,
        FactorBarniz = part.FactorBarniz,
        PrecioTerminadoM2 = part.PrecioTerminadoM2,
        PrecioMicroM2 = part.PrecioMicroM2,
        LargoCordonCm = part.LargoCordonCm,
        PrecioCordonManija = part.PrecioCordonManija,
        NumeroRefuerzos = part.NumeroRefuerzos,
        AnchoVentanillaCm = part.AnchoVentanillaCm,
        LargoVentanillaCm = part.LargoVentanillaCm,
        PrecioTroquel = part.PrecioTroquel,
        UsaPeliculas = part.UsaPeliculas,
        PlazoPagoDias = root.PlazoPagoDias,
        Quantities = root.Quantities,
        PrimaryQuantityIndex = root.PrimaryQuantityIndex,
        ContratoServicios = root.ContratoServicios,
        FreightType = root.FreightType,
        Servicios = root.Servicios,
        ImpresoraMachineId = part.ImpresoraMachineId ?? root.ImpresoraMachineId
    };

    private static CotizadorQuantityResult SumResults(CotizadorQuantityResult a, CotizadorQuantityResult b)
    {
        decimal R(decimal x, decimal y) => Math.Round(x + y, 2);
        var ba = a.Breakdown;
        var bb = b.Breakdown;
        return new CotizadorQuantityResult
        {
            Quantity = a.Quantity,
            CostoTotalUnitario = R(a.CostoTotalUnitario, b.CostoTotalUnitario),
            PrecioAl15 = R(a.PrecioAl15, b.PrecioAl15),
            PrecioAl3 = R(a.PrecioAl3, b.PrecioAl3),
            PrecioAl5 = R(a.PrecioAl5, b.PrecioAl5),
            Breakdown = new CotizadorCostBreakdown
            {
                AreaPorUnidad = Math.Round(ba.AreaPorUnidad + bb.AreaPorUnidad, 4),
                Material = R(ba.Material, bb.Material),
                Tinta = R(ba.Tinta, bb.Tinta),
                Planchas = R(ba.Planchas, bb.Planchas),
                Barniz = R(ba.Barniz, bb.Barniz),
                Terminado = R(ba.Terminado, bb.Terminado),
                MicroFlauta = R(ba.MicroFlauta, bb.MicroFlauta),
                Cordon = R(ba.Cordon, bb.Cordon),
                Refuerzo = R(ba.Refuerzo, bb.Refuerzo),
                Ventanilla = R(ba.Ventanilla, bb.Ventanilla),
                Peliculas = R(ba.Peliculas, bb.Peliculas),
                Troquel = R(ba.Troquel, bb.Troquel),
                SubtotalMateriaPrima = R(ba.SubtotalMateriaPrima, bb.SubtotalMateriaPrima),
                Desperdicio = R(ba.Desperdicio, bb.Desperdicio),
                MateriaPrimaConDesperdicio = R(ba.MateriaPrimaConDesperdicio, bb.MateriaPrimaConDesperdicio),
                Conversion = R(ba.Conversion, bb.Conversion),
                Corte = R(ba.Corte, bb.Corte),
                Impresion = R(ba.Impresion, bb.Impresion),
                Corrugado = R(ba.Corrugado, bb.Corrugado),
                Laminado = R(ba.Laminado, bb.Laminado),
                Troquelado = R(ba.Troquelado, bb.Troquelado),
                Pegado = R(ba.Pegado, bb.Pegado),
                SubtotalServicios = R(ba.SubtotalServicios, bb.SubtotalServicios),
                ContratoServicios = R(ba.ContratoServicios, bb.ContratoServicios),
                Flete = R(ba.Flete, bb.Flete),
                AjustePlazoPago = ba.AjustePlazoPago
            }
        };
    }

    private static void Normalize(CotizadorCalculateRequest r)
    {
        r.Servicios ??= new CotizadorServiciosRequest();
        if (r.Quantities == null || r.Quantities.Count == 0)
            r.Quantities = [5000];

        r.LargoPliego = PreferLength(r.LargoPliego, r.LargoMm);
        r.AnchoPliego = PreferLength(r.AnchoPliego, r.AnchoMm);
        if (r.CubrimientoPct <= 0 && r.Cubrimiento > 0)
            r.CubrimientoPct = r.Cubrimiento;
        if (r.VecesImprimir <= 0)
            r.VecesImprimir = 1;

        if (r.Parts == null) return;
        foreach (var p in r.Parts)
        {
            p.LargoPliego = p.LargoPliego > 0 ? ToMeters(p.LargoPliego) : 0;
            p.AnchoPliego = p.AnchoPliego > 0 ? ToMeters(p.AnchoPliego) : 0;
            if (p.PrecioMaterialM2 <= 0) p.PrecioMaterialM2 = r.PrecioMaterialM2;
            if (p.NumeroPlanchas <= 0) p.NumeroPlanchas = r.NumeroPlanchas;
            if (p.PrecioPlancha <= 0) p.PrecioPlancha = r.PrecioPlancha;
            if (p.CubrimientoPct <= 0) p.CubrimientoPct = r.CubrimientoPct;
            if (p.PrecioTroquel <= 0) p.PrecioTroquel = r.PrecioTroquel;
            if (p.VecesImprimir <= 0) p.VecesImprimir = r.VecesImprimir;
            if (p.PrecioTerminadoM2 <= 0) p.PrecioTerminadoM2 = r.PrecioTerminadoM2;
            if (p.PrecioMicroM2 <= 0) p.PrecioMicroM2 = r.PrecioMicroM2;
            if (p.FactorBarniz <= 0) p.FactorBarniz = r.FactorBarniz;
        }
    }

    private static decimal PreferLength(decimal primary, decimal alias)
    {
        if (primary > 0) return ToMeters(primary);
        if (alias > 0) return ToMeters(alias);
        return 0;
    }

    private static decimal ToMeters(decimal value) => value >= 50m ? value / 1000m : value;

    private static List<string> Validate(CotizadorCalculateRequest r, List<CotizadorPartInput> parts)
    {
        var missing = new List<string>();
        for (var i = 0; i < parts.Count; i++)
        {
            var p = parts[i];
            var label = parts.Count > 1 ? $" (pieza {i + 1})" : "";
            if (p.LargoPliego <= 0) missing.Add("Largo del pliego" + label);
            if (p.AnchoPliego <= 0) missing.Add("Ancho del pliego" + label);
            if (p.Cabida <= 0) missing.Add("Cabida" + label);
            if (p.PrecioMaterialM2 <= 0) missing.Add("Precio material por m²" + label);
            if (p.NumeroPlanchas <= 0) missing.Add("Número de planchas" + label);
            if (p.PrecioPlancha <= 0) missing.Add("Precio por plancha" + label);
            if (p.CubrimientoPct <= 0) missing.Add("Cubrimiento" + label);
        }
        if (!r.Quantities.Any(q => q > 0)) missing.Add("Cantidad total");
        if (!r.Servicios.Conversion && !r.Servicios.UsaCorte &&
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
        var precioRefuerzo = f.GetValueOrDefault(CotizadorFormulas.FactorPrecioRefuerzoM2, 2700m);
        var refuerzo = isBolsa
            ? CotizadorFormulas.Refuerzo(r.NumeroRefuerzos, area, f[CotizadorFormulas.FactorRefuerzo], precioRefuerzo)
            : 0;
        var ventanilla = isBolsa
            ? CotizadorFormulas.Ventanilla(r.AnchoVentanillaCm, r.LargoVentanillaCm, f[CotizadorFormulas.FactorVentanilla])
            : 0;
        var peliculas = CotizadorFormulas.Peliculas(
            r.UsaPeliculas, r.LargoPliego, r.AnchoPliego, r.NumeroPlanchas,
            f[CotizadorFormulas.FactorPeliculas], cantidadDec);

        var troquel = CotizadorFormulas.Troquel(r.PrecioTroquel, cantidadDec);
        var subMateria = material + tinta + planchas + barniz + terminado + micro + cordon + refuerzo + ventanilla + peliculas + troquel;
        var desperdicio = subMateria * f[CotizadorFormulas.FactorDesperdicio];

        var impresora = ResolveImpresora(machines, r.ImpresoraMachineId);
        var servicios = ComputeServicios(r, cantidadDec, machines, impresora, f[CotizadorFormulas.FactorTiempoPlancha]);

        var flete = ComputeFlete(r.FreightType, area, f);
        var costoTotal = CotizadorFormulas.CostoTotal(subMateria, f[CotizadorFormulas.FactorDesperdicio], servicios.Total, r.ContratoServicios, flete);
        var ajustePlazo = CotizadorFormulas.AjustePlazoPago(
            r.PlazoPagoDias,
            f.GetValueOrDefault(CotizadorFormulas.FactorPlazoPago30, 30m));
        var precios = CotizadorFormulas.PreciosVenta(
            costoTotal,
            f[CotizadorFormulas.FactorMargenAl15],
            f[CotizadorFormulas.FactorMargenIdeal],
            f[CotizadorFormulas.FactorMargenAl5],
            f[CotizadorFormulas.FactorMargenAdmin],
            ajustePlazo);

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
                Peliculas = Math.Round(peliculas, 2),
                Troquel = Math.Round(troquel, 2),
                SubtotalMateriaPrima = Math.Round(subMateria, 2),
                Desperdicio = Math.Round(desperdicio, 2),
                MateriaPrimaConDesperdicio = Math.Round(subMateria * (1 + f[CotizadorFormulas.FactorDesperdicio]), 2),
                Conversion = Math.Round(servicios.Conversion, 2),
                Corte = Math.Round(servicios.Corte, 2),
                Impresion = Math.Round(servicios.Impresion, 2),
                Corrugado = Math.Round(servicios.Corrugado, 2),
                Laminado = Math.Round(servicios.Laminado, 2),
                Troquelado = Math.Round(servicios.Troquelado, 2),
                Pegado = Math.Round(servicios.Pegado, 2),
                SubtotalServicios = Math.Round(servicios.Total, 2),
                ContratoServicios = Math.Round(r.ContratoServicios, 2),
                Flete = Math.Round(flete, 2),
                AjustePlazoPago = ajustePlazo
            }
        };
    }

    private static (decimal Conversion, decimal Corte, decimal Impresion, decimal Corrugado, decimal Laminado, decimal Troquelado, decimal Pegado, decimal Total) ComputeServicios(
        CotizadorCalculateRequest r, decimal cantidad, Dictionary<string, CotizadorMachineSnapshot> machines,
        CotizadorMachineSnapshot? impresora, decimal tiempoPlancha)
    {
        decimal conv = 0, corte = 0, imp = 0, corr = 0, lam = 0, troq = 0, peg = 0;
        if (r.Servicios.Conversion && machines.TryGetValue("Conversion", out var m))
            conv = CotizadorFormulas.ServicioEstandar(cantidad, r.Cabida, m.ShotsPerHour, m.SetupTimeHours, m.HourlyRate);
        if (r.Servicios.UsaCorte && (machines.TryGetValue("Corte", out m) || machines.TryGetValue("Corte1", out m) || machines.TryGetValue("Corte2", out m)))
            corte = CotizadorFormulas.ServicioCorte(cantidad, r.Cabida, m.ShotsPerHour, m.HourlyRate);
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
        return (conv, corte, imp, corr, lam, troq, peg, conv + corte + imp + corr + lam + troq + peg);
    }

    private static void ReplaceFreight(CotizadorQuantityResult result, decimal fleteManual, Dictionary<string, decimal> f)
    {
        var bd = result.Breakdown;
        var costo = result.CostoTotalUnitario - bd.Flete + fleteManual;
        var precios = CotizadorFormulas.PreciosVenta(
            costo,
            f[CotizadorFormulas.FactorMargenAl15],
            f[CotizadorFormulas.FactorMargenIdeal],
            f[CotizadorFormulas.FactorMargenAl5],
            f[CotizadorFormulas.FactorMargenAdmin],
            bd.AjustePlazoPago);
        result.CostoTotalUnitario = Math.Round(costo, 2);
        result.PrecioAl15 = Math.Round(precios.Al15, 2);
        result.PrecioAl3 = Math.Round(precios.Al3, 2);
        result.PrecioAl5 = Math.Round(precios.Al5, 2);
        bd.Flete = Math.Round(fleteManual, 2);
    }

    private static decimal ComputeFlete(string freightType, decimal area, Dictionary<string, decimal> f)
    {
        if (string.Equals(freightType, "SinFlete", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(freightType, "Sin flete", StringComparison.OrdinalIgnoreCase))
            return 0;
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
