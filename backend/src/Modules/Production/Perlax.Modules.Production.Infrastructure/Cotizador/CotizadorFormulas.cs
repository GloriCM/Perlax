namespace Perlax.Modules.Production.Infrastructure.Cotizador;

/// <summary>
/// Constantes y fórmulas del cotizador Link't.
/// Los valores numéricos se leen del catálogo de factores en BD; aquí están las fórmulas documentadas.
/// </summary>
public static class CotizadorFormulas
{
    public const string FactorTintaPorUnidad = "TINTA_POR_UNIDAD";
    public const string FactorCostoTinta = "COSTO_TINTA";
    public const string FactorRefuerzo = "REFUERZO";
    public const string FactorVentanilla = "VENTANILLA";
    public const string FactorDesperdicio = "DESPERDICIO";
    public const string FactorFleteRelativo = "FLETE_RELATIVO";
    public const string FactorFleteLocal = "FLETE_LOCAL";
    public const string FactorFleteNacional = "FLETE_NACIONAL";
    public const string FactorMargenIdeal = "MARGEN_IDEAL";
    public const string FactorMargenAdmin = "MARGEN_ADMINISTRATIVO";
    public const string FactorMargenAl15 = "MARGEN_AL_1_5";
    public const string FactorMargenAl5 = "MARGEN_AL_5";
    public const string FactorTiempoPlancha = "TIEMPO_PLANCHA_IMPRESION";
    public const string FactorDivisorBarniz = "DIVISOR_BARNIZ";

    public static readonly IReadOnlyList<(string Key, string Label, decimal Default, string Description)> DefaultFactors =
    [
        (FactorTintaPorUnidad, "Tinta por unidad", 3m, "Multiplicador en: area × TINTA_POR_UNIDAD × COSTO_TINTA × (cubrimiento/100)"),
        (FactorCostoTinta, "Costo tinta por unidad", 50m, "Segundo multiplicador del cálculo de tinta"),
        (FactorRefuerzo, "Factor refuerzo", 0.055m, "area × REFUERZO × precio_material cuando nº refuerzos > 0"),
        (FactorVentanilla, "Valor ventanilla", 200m, "ancho × largo × VENTANILLA"),
        (FactorDesperdicio, "Desperdicio materia prima", 0.03m, "subtotal_materia_prima × DESPERDICIO (incorporado como ×1.03)"),
        (FactorFleteRelativo, "Flete relativo", 0.35m, "area × FLETE_RELATIVO antes del multiplicador local/nacional"),
        (FactorFleteLocal, "Multiplicador flete local", 96.3m, "flete_relativo × FLETE_LOCAL"),
        (FactorFleteNacional, "Multiplicador flete nacional", 428m, "flete_relativo × FLETE_NACIONAL"),
        (FactorMargenIdeal, "Margen ideal (Al 3)", 0.15m, "Precio Al 3: costo / (1 - MARGEN_IDEAL - MARGEN_ADMIN)"),
        (FactorMargenAdmin, "Margen administrativo", 0.18m, "Aplicado en todos los precios de venta"),
        (FactorMargenAl15, "Margen utilidad Al 1.5", 0.10m, "Precio Al 1.5: costo / (1 - MARGEN_AL_1_5 - MARGEN_ADMIN)"),
        (FactorMargenAl5, "Margen utilidad Al 5", 0.18m, "Precio Al 5: costo / (1 - MARGEN_AL_5 - MARGEN_ADMIN)"),
        (FactorTiempoPlancha, "Horas por plancha (impresión)", 0.75m, "nº_planchas × TIEMPO_PLANCHA en servicio impresión"),
        (FactorDivisorBarniz, "Divisor barniz", 0.5m, "Barniz: (costo_material / DIVISOR_BARNIZ) × factor_barniz"),
    ];

    /// <summary>Área por unidad = (largo × ancho) / cabida</summary>
    public static decimal AreaPorUnidad(decimal largo, decimal ancho, decimal cabida) =>
        cabida <= 0 ? 0 : (largo * ancho) / cabida;

    /// <summary>Material = área × precio_m2</summary>
    public static decimal Material(decimal area, decimal precioM2) => area * precioM2;

    /// <summary>Tinta = área × tintaPorUnidad × costoTinta × (cubrimiento/100)</summary>
    public static decimal Tinta(decimal area, decimal tintaPorUnidad, decimal costoTinta, decimal cubrimientoPct) =>
        area * tintaPorUnidad * costoTinta * (cubrimientoPct / 100m);

    /// <summary>Planchas = (nº_planchas × precio_plancha) / cantidad_total</summary>
    public static decimal Planchas(int numeroPlanchas, decimal precioPlancha, decimal cantidadTotal) =>
        cantidadTotal <= 0 ? 0 : (numeroPlanchas * precioPlancha) / cantidadTotal;

    /// <summary>Barniz = (costo_material / divisorBarniz) × factor_barniz</summary>
    public static decimal Barniz(decimal costoMaterial, decimal divisorBarniz, decimal factorBarniz) =>
        (costoMaterial / divisorBarniz) * factorBarniz;

    /// <summary>Terminado = área × precio_terminado_m2</summary>
    public static decimal Terminado(decimal area, decimal precioM2) => area * precioM2;

    /// <summary>Micro/flauta = área × precio_m2</summary>
    public static decimal MicroFlauta(decimal area, decimal precioM2) => area * precioM2;

    /// <summary>Cordón = largo × precio_por_manija</summary>
    public static decimal Cordon(decimal largoCm, decimal precioManija) => largoCm * precioManija;

    /// <summary>Refuerzo: si nº > 0 → área × factor × precio_material; si no → 0</summary>
    public static decimal Refuerzo(int numeroRefuerzos, decimal area, decimal factorRefuerzo, decimal precioMaterialM2) =>
        numeroRefuerzos > 0 ? area * factorRefuerzo * precioMaterialM2 : 0;

    /// <summary>Ventanilla = ancho × largo × factorVentanilla</summary>
    public static decimal Ventanilla(decimal anchoCm, decimal largoCm, decimal factorVentanilla) =>
        anchoCm * largoCm * factorVentanilla;

    /// <summary>Troquel = precio_troquel / cantidad_total</summary>
    public static decimal Troquel(decimal precioTroquel, decimal cantidadTotal) =>
        cantidadTotal <= 0 ? 0 : precioTroquel / cantidadTotal;

    /// <summary>Conversión / Corte / Laminado / Troquelado: tiempo = pliegos/tiros + seteo; costo/u = tiempo×tarifa/cantidad</summary>
    public static decimal ServicioEstandar(decimal cantidadTotal, decimal cabida, decimal tirosHora, decimal seteoHoras, decimal tarifaHora)
    {
        if (cantidadTotal <= 0 || cabida <= 0 || tirosHora <= 0) return 0;
        var pliegos = cantidadTotal / cabida;
        var tiempo = (pliegos / tirosHora) + seteoHoras;
        return (tiempo * tarifaHora) / cantidadTotal;
    }

    /// <summary>Impresión: tiempo = ((cantidad/cabida × veces_imprimir)/tiros) + (planchas × tiempo_plancha)</summary>
    public static decimal ServicioImpresion(
        decimal cantidadTotal, decimal cabida, int vecesImprimir, int numeroPlanchas,
        decimal tirosHora, decimal seteoHoras, decimal tarifaHora, decimal tiempoPlancha)
    {
        if (cantidadTotal <= 0 || cabida <= 0 || tirosHora <= 0) return 0;
        var tiempo = ((cantidadTotal / cabida * vecesImprimir) / tirosHora) + (numeroPlanchas * tiempoPlancha);
        return (tiempo * tarifaHora) / cantidadTotal;
    }

    /// <summary>Corrugado: (((cantidad/cabida) × (largo×ancho))/tiros × tarifa) / cantidad</summary>
    public static decimal ServicioCorrugado(decimal cantidadTotal, decimal cabida, decimal largo, decimal ancho, decimal tirosHora, decimal tarifaHora)
    {
        if (cantidadTotal <= 0 || cabida <= 0 || tirosHora <= 0) return 0;
        return ((((cantidadTotal / cabida) * (largo * ancho)) / tirosHora) * tarifaHora) / cantidadTotal;
    }

    /// <summary>Pegado: ((cantidad/tiros + seteo) × tarifa) / cantidad</summary>
    public static decimal ServicioPegado(decimal cantidadTotal, decimal tirosHora, decimal seteoHoras, decimal tarifaHora)
    {
        if (cantidadTotal <= 0 || tirosHora <= 0) return 0;
        return ((cantidadTotal / tirosHora + seteoHoras) * tarifaHora) / cantidadTotal;
    }

    /// <summary>Flete local o nacional según tipo.</summary>
    public static decimal Flete(decimal area, decimal factorRelativo, decimal multiplicador) =>
        area * factorRelativo * multiplicador;

    /// <summary>Costo total = (subtotal_materia × (1+desperdicio)) + servicios + contrato + flete</summary>
    public static decimal CostoTotal(decimal subtotalMateria, decimal factorDesperdicio, decimal servicios, decimal contrato, decimal flete)
    {
        var materiaConDesperdicio = subtotalMateria * (1 + factorDesperdicio);
        return materiaConDesperdicio + servicios + contrato + flete;
    }

    public static (decimal Al15, decimal Al3, decimal Al5) PreciosVenta(
        decimal costoTotal, decimal margenAl15, decimal margenIdeal, decimal margenAl5, decimal margenAdmin)
    {
        decimal Div(decimal utilidad) => 1 - utilidad - margenAdmin;
        var d15 = Div(margenAl15);
        var d3 = Div(margenIdeal);
        var d5 = Div(margenAl5);
        return (
            d15 > 0 ? costoTotal / d15 : 0,
            d3 > 0 ? costoTotal / d3 : 0,
            d5 > 0 ? costoTotal / d5 : 0
        );
    }
}
