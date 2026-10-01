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
    public const string FactorPrecioRefuerzoM2 = "PRECIO_REFUERZO_M2";
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
    public const string FactorPeliculas = "PELICULAS";
    public const string FactorPlazoPago30 = "PLAZO_PAGO_30";
    public const string FactorPlazoPago60 = "PLAZO_PAGO_60";
    public const string FactorPlazoPago90 = "PLAZO_PAGO_90";

    public static readonly IReadOnlyList<(string Key, string Label, decimal Default, string Description)> DefaultFactors =
    [
        (FactorTintaPorUnidad, "Tinta por unidad", 3m, "Multiplicador en: area × TINTA_POR_UNIDAD × COSTO_TINTA × (cubrimiento/100)"),
        (FactorCostoTinta, "Costo tinta por unidad", 50m, "Segundo multiplicador del cálculo de tinta"),
        (FactorRefuerzo, "Factor refuerzo", 0.055m, "area × 0,055 × precio fijo del refuerzo cuando nº refuerzos > 0"),
        (FactorPrecioRefuerzoM2, "Precio m² del refuerzo", 2700m, "Excel Materiales!G11: Cartulina Optima 48. No usa el papel de la pieza."),
        (FactorVentanilla, "Valor ventanilla", 2000m, "ancho × largo × VENTANILLA (Excel Materiales!M23)"),
        (FactorDesperdicio, "Desperdicio materia prima", 0.03m, "subtotal_materia_prima × DESPERDICIO (incorporado como ×1.03)"),
        (FactorFleteRelativo, "Flete relativo", 0.35m, "area × FLETE_RELATIVO antes del multiplicador local/nacional"),
        (FactorFleteLocal, "Multiplicador flete local", 96.3m, "flete_relativo × FLETE_LOCAL"),
        (FactorFleteNacional, "Multiplicador flete nacional", 428m, "flete_relativo × FLETE_NACIONAL"),
        (FactorMargenIdeal, "Margen ideal (Al 3)", 0.15m, "Precio Al 3: costo / (1 - MARGEN_IDEAL - MARGEN_ADMIN)"),
        (FactorMargenAdmin, "Margen administrativo", 0.18m, "Excel CG/CH filas vigentes: fijo 0.18 en el denominador"),
        (FactorMargenAl15, "Margen utilidad Al 1.5", 0.10m, "Precio Al 1.5: costo / (1 - 0.10 - 0.15 - ajustePlazo)"),
        (FactorMargenAl5, "Margen utilidad Al 5", 0.18m, "Excel Al 5 = Al3 / 0.95 (no usa este factor directamente)"),
        (FactorTiempoPlancha, "Horas por plancha (impresión)", 0.75m, "nº_planchas × TIEMPO_PLANCHA en servicio impresión"),
        (FactorDivisorBarniz, "Divisor barniz", 0.5m, "Barniz: (costo_material / DIVISOR_BARNIZ) × factor_barniz"),
        (FactorPeliculas, "Factor películas (AW$5)", 30m, "Excel AW$5=30: largo×ancho×nº_planchas×10000×PELICULAS/cantidad"),
        (FactorPlazoPago30, "Base plazo pago (CF$5)", 30m, "Excel: ajuste = (CF-30)/(CF$5×100)"),
        (FactorPlazoPago60, "Ajuste plazo pago ≤60 días", 0.04m, "Legado; PV usa fórmula Excel continua"),
        (FactorPlazoPago90, "Ajuste plazo pago >60 días", 0.06m, "Legado; PV usa fórmula Excel continua"),
    ];

    /// <summary>Área por unidad = (largo × ancho) / cabida</summary>
    public static decimal AreaPorUnidad(decimal largo, decimal ancho, decimal cabida) =>
        cabida <= 0 ? 0 : (largo * ancho) / cabida;

    /// <summary>Material = área × precio_m2</summary>
    public static decimal Material(decimal area, decimal precioM2) => area * precioM2;

    /// <summary>
    /// Tinta = área × 3 × 50 × cubrimiento × columna S (en Excel S suele ser 1).
    /// El Excel guarda el cubrimiento como fracción (0,8 = 80%). La pantalla pide %.
    /// </summary>
    public static decimal Tinta(decimal area, decimal tintaPorUnidad, decimal costoTinta, decimal cubrimientoPct)
    {
        var frac = cubrimientoPct > 2m ? cubrimientoPct / 100m : cubrimientoPct;
        return area * tintaPorUnidad * costoTinta * frac;
    }

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

    /// <summary>Refuerzo: si nº > 0 → área × 0,055 × precio fijo (G11); si no → 0</summary>
    public static decimal Refuerzo(int numeroRefuerzos, decimal area, decimal factorRefuerzo, decimal precioMaterialM2) =>
        numeroRefuerzos > 0 ? area * factorRefuerzo * precioMaterialM2 : 0;

    /// <summary>Ventanilla = ancho × largo × factorVentanilla</summary>
    public static decimal Ventanilla(decimal anchoCm, decimal largoCm, decimal factorVentanilla) =>
        anchoCm * largoCm * factorVentanilla;

    /// <summary>Troquel = precio_troquel / cantidad_total</summary>
    public static decimal Troquel(decimal precioTroquel, decimal cantidadTotal) =>
        cantidadTotal <= 0 ? 0 : precioTroquel / cantidadTotal;

    /// <summary>Películas (Excel AW): si aplica → largo×ancho×nº_planchas×10000×factor / cantidad</summary>
    public static decimal Peliculas(
        bool usaPeliculas, decimal largoM, decimal anchoM, int numeroPlanchas, decimal factorPeliculas, decimal cantidadTotal)
    {
        if (!usaPeliculas || cantidadTotal <= 0 || numeroPlanchas <= 0) return 0;
        return (largoM * anchoM * numeroPlanchas * 10000m * factorPeliculas) / cantidadTotal;
    }

    /// <summary>
    /// Ajuste de margen por plazo (Excel): (días − 30) / 3000.
    /// Contado (0 días) da −0,01, igual que la fórmula del Excel. 30 días da 0.
    /// </summary>
    public static decimal AjustePlazoPago(int plazoPagoDias, decimal basePlazoDias = 30m)
    {
        // CF$5 son días (30). Si en BD quedó un % legado (0.04), no sirve como base.
        if (basePlazoDias < 1m) basePlazoDias = 30m;
        if (plazoPagoDias < 0) plazoPagoDias = 0;
        if (plazoPagoDias > 365) plazoPagoDias = 365;
        return (plazoPagoDias - basePlazoDias) / (basePlazoDias * 100m);
    }

    /// <summary>Conversión / Laminado / Troquelado: tiempo = pliegos/tiros + seteo; costo/u = tiempo×tarifa/cantidad</summary>
    public static decimal ServicioEstandar(decimal cantidadTotal, decimal cabida, decimal tirosHora, decimal seteoHoras, decimal tarifaHora)
    {
        if (cantidadTotal <= 0 || cabida <= 0 || tirosHora <= 0) return 0;
        var pliegos = cantidadTotal / cabida;
        var tiempo = (pliegos / tirosHora) + seteoHoras;
        return (tiempo * tarifaHora) / cantidadTotal;
    }

    /// <summary>Corte Excel BE: sin seteo — (((AM/I)/tiros)*tarifa)/AM</summary>
    public static decimal ServicioCorte(decimal cantidadTotal, decimal cabida, decimal tirosHora, decimal tarifaHora) =>
        ServicioEstandar(cantidadTotal, cabida, tirosHora, 0, tarifaHora);

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

    /// <summary>
    /// Precios de las filas vigentes del Excel:
    /// Al 1.5 = costo / (1 − 0,10 − 0,18 − ajuste)
    /// Al 3   = costo / (1 − 0,15 − 0,18 − ajuste)
    /// Al 5   = Al 3 / 0,95
    /// 0,10 y 0,18 van escritos en la fórmula. No se leen del catálogo:
    /// si la base sigue en 0,15 el precio no cambia.
    /// </summary>
    public static (decimal Al15, decimal Al3, decimal Al5) PreciosVenta(
        decimal costoTotal, decimal margenAl15, decimal margenIdeal, decimal margenAl5, decimal margenAdmin,
        decimal ajustePlazo = 0)
    {
        _ = margenAl15;
        _ = margenAl5;
        _ = margenAdmin;
        margenAl15 = 0.10m;
        margenAdmin = 0.18m;
        margenIdeal = AsFraction(margenIdeal);
        if (margenIdeal <= 0 || margenIdeal > 0.5m) margenIdeal = 0.15m;

        // Tope solo si el ajuste viene corrupto (p.ej. 14.99). El Excel sí usa ajuste negativo en contado.
        if (ajustePlazo > 0.20m) ajustePlazo = 0.20m;
        if (ajustePlazo < -0.05m) ajustePlazo = -0.05m;

        decimal Div(decimal utilidad)
        {
            var d = 1m - utilidad - margenAdmin - ajustePlazo;
            // Nunca tumbar PV a 0 por factores mal cargados.
            return d < 0.05m ? 0.05m : d;
        }

        var al15 = costoTotal <= 0 ? 0 : costoTotal / Div(margenAl15);
        var al3 = costoTotal <= 0 ? 0 : costoTotal / Div(margenIdeal);
        var al5 = al3 > 0 ? al3 / 0.95m : 0;
        return (al15, al3, al5);
    }

    /// <summary>Si en BD quedó 15 en vez de 0.15, convierte a fracción.</summary>
    public static decimal AsFraction(decimal value)
    {
        if (value < 0) return 0;
        if (value > 1m) value /= 100m;
        if (value > 0.9m) value = 0.9m;
        return value;
    }
}
