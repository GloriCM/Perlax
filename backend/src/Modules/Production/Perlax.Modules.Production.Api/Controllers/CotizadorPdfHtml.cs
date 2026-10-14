using System.Globalization;
using System.Text;
using System.Text.Json;
using Perlax.Modules.Production.Application.Cotizador;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Api.Controllers;

/// <summary>HTML imprimible estilo hoja Formato_Impresion del Excel Elliot.</summary>
internal static class CotizadorPdfHtml
{
    public static string BuildPropuesta(Quotation q, string tier, string? assetBase = null)
    {
        _ = assetBase;
        return BuildCliente(q, tier);
    }
    public static string BuildProduccion(Quotation q) => Build(q, "Hoja de producción", null, produccion: true);

    /// <summary>Cotización al cliente con el formato de nota: membrete, datos, tabla de valores, IVA y firmas.</summary>
    private static string BuildCliente(Quotation q, string tier)
    {
        var calc = TryParseCalc(q.CalculationResultJson);
        var pieces = ExtractClientPieces(q.FormDataJson, q.PartName);
        var processes = ExtractProcesses(q.FormDataJson);
        var incluyeIva = ExtractIncluyeIva(q.FormDataJson);
        var observaciones = ExtractObservaciones(q.FormDataJson);
        var condicionesPago = ExtractCondicionesPago(q.FormDataJson);
        var co = CultureInfo.GetCultureInfo("es-CO");
        var results = calc?.Results ?? new List<CotizadorQuantityResult>();
        var primary = results.FirstOrDefault(r => r.IsPrimary) ?? results.FirstOrDefault();
        var descripcion = BuildDescripcion(q, pieces, processes);
        var sb = new StringBuilder();

        sb.Append("<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Cotización ")
          .Append(Esc(q.QuoteNumber))
          .Append("</title><style>")
          .Append("@page{size:letter portrait;margin:12mm}")
          .Append("body{font-family:Arial,Helvetica,sans-serif;margin:16px auto;color:#000;background:#fff;font-size:12px;max-width:190mm}")
          .Append("table{border-collapse:collapse;width:100%}")
          .Append(".head td{border:2px solid #000;vertical-align:middle}")
          .Append(".logo{width:150px;text-align:center;padding:8px 6px}")
          .Append(".logo img{height:58px;width:auto;max-width:140px;object-fit:contain}")
          .Append(".title{text-align:center;font-size:18px;font-weight:700;letter-spacing:.08em;line-height:1.25}")
          .Append(".meta{width:210px;padding:0}")
          .Append(".meta table td{border:none;border-bottom:1px solid #000;padding:3px 8px;font-size:11px}")
          .Append(".meta table tr:last-child td{border-bottom:none}")
          .Append(".datos{margin-top:14px;line-height:1.55}")
          .Append(".datos b{display:inline-block;min-width:168px}")
          .Append(".pago{display:inline-block;border:2px solid #000;min-width:220px;text-align:center;font-weight:700;padding:2px 8px}")
          .Append(".tipo{margin-top:6px}")
          .Append(".tipo span{display:inline-block;border:2px solid #000;font-weight:700;padding:2px 16px;letter-spacing:.04em}")
          .Append(".grid{margin-top:12px}")
          .Append(".grid th,.grid td{border:1px solid #000;padding:5px 6px;font-size:11px}")
          .Append(".grid th{text-align:center;font-weight:700}")
          .Append(".right{text-align:right}")
          .Append(".center{text-align:center}")
          .Append(".ref{font-weight:700}")
          .Append(".tot td{font-weight:700}")
          .Append(".notes{margin-top:12px}")
          .Append(".notes td{border:none;padding:4px 0;vertical-align:top}")
          .Append(".firmas{margin-top:36px}")
          .Append(".firmas td{border:none;width:50%;font-weight:700;padding-top:8px}")
          .Append(".linea{display:inline-block;border-bottom:1px solid #000;width:80%;max-width:220px;height:18px}")
          .Append(".toolbar{display:flex;gap:8px;margin:0 0 12px}")
          .Append(".toolbar button{padding:8px 14px;border:1px solid #000;background:#000;color:#fff;cursor:pointer;font-size:13px}")
          .Append(".toolbar button.secondary{background:#fff;color:#000}")
          .Append("@media print{.toolbar{display:none!important}body{margin:0}}")
          .Append("</style></head><body>");

        sb.Append("<div class=\"toolbar\"><button type=\"button\" onclick=\"window.print()\">Imprimir / Guardar PDF</button>")
          .Append("<button type=\"button\" class=\"secondary\" onclick=\"window.close()\">Cerrar</button></div>");

        sb.Append("<table class=\"head\"><tr>");
        sb.Append("<td class=\"logo\"><img alt=\"Aleph Impresores\" src=\"").Append(LogoDataUri()).Append("\" /></td>");
        sb.Append("<td class=\"title\">COTIZACIÓN</td>");
        sb.Append("<td class=\"meta\"><table>");
        sb.Append("<tr><td><b>No.</b> ").Append(Esc(q.QuoteNumber)).Append("</td></tr>");
        sb.Append("<tr><td><b>Fecha</b> ").Append(q.RequestDate.ToString("dd/MM/yyyy")).Append("</td></tr>");
        sb.Append("<tr><td>Aleph Impresores S.A.S.</td></tr>");
        sb.Append("<tr><td>NIT 901.442.622-6</td></tr>");
        sb.Append("<tr><td>Cra. 1 #43-76, Cali · Tel. 302 829 5169</td></tr>");
        sb.Append("</table></td>");
        sb.Append("</tr></table>");

        sb.Append("<div class=\"datos\">");
        sb.Append("<div><b>FECHA:</b> ").Append(q.RequestDate.ToString("dd/MM/yyyy")).Append("</div>");
        sb.Append("<div><b>RAZÓN SOCIAL:</b> ").Append(Esc(string.IsNullOrWhiteSpace(q.ClientName) ? q.ProspectClientName : q.ClientName)).Append("</div>");
        sb.Append("<div><b>TRABAJO:</b> ").Append(Esc(q.WorkName)).Append("</div>");
        sb.Append("<div><b>PRODUCTO:</b> ").Append(Esc(ProductLabel(q.ProductType))).Append("</div>");
        sb.Append("<div><b>CONTACTO:</b> ").Append(Esc(q.SellerName)).Append("</div>");
        sb.Append("<div><b>CONDICIONES DE PAGO:</b> <span class=\"pago\">").Append(Esc(string.IsNullOrWhiteSpace(condicionesPago) ? "50% anticipo y 50% contraentrega" : condicionesPago)).Append("</span></div>");
        sb.Append("<div class=\"tipo\"><b>TIPO DE TRABAJO</b> <span>").Append(Esc(ProductLabel(q.ProductType).ToUpperInvariant())).Append("</span></div>");
        sb.Append("</div>");

        sb.Append("<table class=\"grid\"><thead><tr>");
        sb.Append("<th>DESCRIPCIÓN</th><th>CANTIDAD</th><th>V/UNITARIO</th><th>V/TOTAL</th><th>OBSERVACIONES</th>");
        sb.Append("</tr></thead><tbody>");

        if (primary != null)
        {
            var unit = PickPrice(primary, tier);
            var line = unit * primary.Quantity;
            sb.Append("<tr class=\"ref\">");
            sb.Append("<td>").Append(Esc(descripcion)).Append("</td>");
            sb.Append("<td class=\"right\">").Append(primary.Quantity.ToString("N0", co)).Append("</td>");
            sb.Append("<td class=\"right\">$ ").Append(Money(unit)).Append("</td>");
            sb.Append("<td class=\"right\">$ ").Append(Money(line)).Append("</td>");
            sb.Append("<td>").Append(Esc(observaciones)).Append("</td></tr>");
        }
        else
        {
            sb.Append("<tr><td>").Append(Esc(descripcion)).Append("</td><td></td><td></td><td></td><td>Sin precio calculado</td></tr>");
        }

        var subtotal = primary == null ? 0m : PickPrice(primary, tier) * primary.Quantity;
        var ivaValor = incluyeIva ? decimal.Round(subtotal * 0.19m, 2, MidpointRounding.AwayFromZero) : 0m;
        var total = subtotal + ivaValor;

        sb.Append("<tr class=\"tot\"><td colspan=\"3\" class=\"right\">SUBTOTAL</td>");
        sb.Append("<td class=\"right\">$ ").Append(Money(subtotal)).Append("</td><td></td></tr>");
        sb.Append("<tr class=\"tot\"><td colspan=\"3\" class=\"right\">IVA 19 %</td>");
        sb.Append("<td class=\"right\">");
        if (incluyeIva) sb.Append("$ ").Append(Money(ivaValor));
        else sb.Append("No incluido");
        sb.Append("</td><td></td></tr>");
        sb.Append("<tr class=\"tot\"><td colspan=\"3\" class=\"right\">TOTAL</td>");
        sb.Append("<td class=\"right\">$ ").Append(Money(total)).Append("</td><td></td></tr>");
        sb.Append("</tbody></table>");

        sb.Append("<table class=\"notes\"><tr>");
        sb.Append("<td style=\"width:55%\"><b>10 +/- % CANTIDAD A RECIBIR</b></td>");
        sb.Append("<td><b>NÚMERO DE COTIZACIÓN:</b> ").Append(Esc(q.QuoteNumber)).Append("</td>");
        sb.Append("</tr></table>");
        sb.Append("<div class=\"datos\" style=\"margin-top:8px\">");
        sb.Append(Esc(string.IsNullOrWhiteSpace(q.DeliveryConditions)
            ? "Esta propuesta es válida por 30 días a partir de la fecha de emisión."
            : q.DeliveryConditions));
        sb.Append("<br>");
        sb.Append(Esc(string.IsNullOrWhiteSpace(q.PriceConditions)
            ? "Los precios están sujetos a cambios según disponibilidad de materiales y confirmación de especificaciones finales."
            : q.PriceConditions));
        sb.Append("</div>");

        sb.Append("<table class=\"firmas\"><tr>");
        sb.Append("<td>FIRMA VENDEDOR<br><span class=\"linea\"></span><br>")
          .Append(Esc(q.SellerName)).Append("</td>");
        sb.Append("<td>FIRMA CLIENTE<br><span class=\"linea\"></span></td>");
        sb.Append("</tr></table>");
        sb.Append("</body></html>");
        return sb.ToString();
    }

    private static string BuildDescripcion(Quotation q, List<ClientPiece> pieces, List<string> processes)
    {
        var parts = new List<string>();
        if (!string.IsNullOrWhiteSpace(q.WorkName)) parts.Add(q.WorkName.Trim());
        foreach (var p in pieces)
        {
            var bit = string.Join(", ", new[] { p.Name, p.Material, p.Measures, p.Finishes }.Where(s => !string.IsNullOrWhiteSpace(s)));
            if (!string.IsNullOrWhiteSpace(bit)) parts.Add(bit);
        }
        if (processes.Count > 0) parts.Add(string.Join(", ", processes));
        return string.Join(" — ", parts);
    }

    private static string Build(Quotation q, string title, string? tier, bool produccion)
    {
        var calc = TryParseCalc(q.CalculationResultJson);
        var primary = calc?.Results?.FirstOrDefault(r => r.IsPrimary) ?? calc?.Results?.FirstOrDefault();
        var pieces = ExtractPieceNames(q.FormDataJson, q.PartName);
        var price = PickPrice(primary, tier);
        var sb = new StringBuilder();
        sb.Append("<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>")
          .Append(Esc(title)).Append(' ').Append(Esc(q.QuoteNumber))
          .Append("</title><style>")
          .Append("body{font-family:Segoe UI,Arial,sans-serif;margin:24px;color:#1a1a1a;background:#fff}")
          .Append("h1{font-size:20px;margin:0 0 4px;color:#0f3d5c}")
          .Append(".sub{color:#555;margin-bottom:16px}")
          .Append("table{border-collapse:collapse;width:100%;margin:12px 0}")
          .Append("th,td{border:1px solid #ccc;padding:6px 8px;font-size:12px;text-align:left}")
          .Append("th{background:#eef4f8}")
          .Append(".right{text-align:right}")
          .Append(".meta{display:grid;grid-template-columns:1fr 1fr;gap:6px 24px;margin:12px 0;font-size:13px}")
          .Append(".foot{margin-top:28px;font-size:11px;color:#666}")
          .Append(".toolbar{display:flex;gap:8px;margin:0 0 16px;flex-wrap:wrap}")
          .Append(".toolbar button{padding:8px 14px;border:1px solid #0f3d5c;background:#0f3d5c;color:#fff;border-radius:6px;cursor:pointer;font-size:13px}")
          .Append(".toolbar button.secondary{background:#fff;color:#0f3d5c}")
          .Append("@media print{body{margin:12px}.toolbar{display:none!important}}")
          .Append("</style></head><body>");
        sb.Append("<div class=\"toolbar no-print\">")
          .Append("<button type=\"button\" onclick=\"window.print()\">Imprimir / Guardar PDF</button>")
          .Append("<button type=\"button\" class=\"secondary\" onclick=\"window.close()\">Cerrar</button>")
          .Append("</div>");
        sb.Append("<h1>").Append(Esc(title)).Append("</h1>");
        sb.Append("<div class=\"sub\">Perla — Cotización ").Append(Esc(q.QuoteNumber)).Append("</div>");
        sb.Append("<div class=\"meta\">");
        sb.Append("<div><b>Cliente:</b> ").Append(Esc(q.ClientName)).Append("</div>");
        sb.Append("<div><b>Vendedor:</b> ").Append(Esc(q.SellerName)).Append("</div>");
        sb.Append("<div><b>Trabajo:</b> ").Append(Esc(q.WorkName)).Append("</div>");
        sb.Append("<div><b>Tipo:</b> ").Append(Esc(q.ProductType)).Append("</div>");
        sb.Append("<div><b>Fecha:</b> ").Append(q.RequestDate.ToString("dd/MM/yyyy")).Append("</div>");
        sb.Append("<div><b>Flete:</b> ").Append(Esc(FreightLabel(q.FreightType))).Append("</div>");
        sb.Append("</div>");

        sb.Append("<h2 style=\"font-size:15px\">Piezas</h2><table><thead><tr><th>#</th><th>Nombre</th></tr></thead><tbody>");
        for (var i = 0; i < pieces.Count; i++)
            sb.Append("<tr><td>").Append(i + 1).Append("</td><td>").Append(Esc(pieces[i])).Append("</td></tr>");
        sb.Append("</tbody></table>");

        if (calc?.Results is { Count: > 0 })
        {
            if (produccion)
            {
                sb.Append("<h2 style=\"font-size:15px\">Precios por cantidad</h2><table><thead><tr>")
                  .Append("<th>Cantidad</th><th class=\"right\">Costo/u</th>")
                  .Append("<th class=\"right\">Al 1.5</th><th class=\"right\">Al 3</th><th class=\"right\">Al 5</th>")
                  .Append("</tr></thead><tbody>");
                foreach (var r in calc.Results)
                {
                    sb.Append("<tr")
                      .Append(r.IsPrimary ? " style=\"background:#f0f7ff\"" : "")
                      .Append("><td>").Append(r.Quantity.ToString("N0", CultureInfo.InvariantCulture))
                      .Append(r.IsPrimary ? " (principal)" : "")
                      .Append("</td><td class=\"right\">").Append(Money(r.CostoTotalUnitario))
                      .Append("</td><td class=\"right\">").Append(Money(r.PrecioAl15))
                      .Append("</td><td class=\"right\">").Append(Money(r.PrecioAl3))
                      .Append("</td><td class=\"right\">").Append(Money(r.PrecioAl5))
                      .Append("</td></tr>");
                }
                sb.Append("</tbody></table>");
            }
        }

        if (tier != null && primary != null)
        {
            sb.Append("<p><b>Margen propuesto (").Append(Esc(tier)).Append("):</b> $")
              .Append(Money(price)).Append(" / unidad</p>");
        }

        if (produccion && primary?.Breakdown != null)
        {
            var b = primary.Breakdown;
            sb.Append("<h2 style=\"font-size:15px\">Desglose de costo (cantidad principal)</h2><table><thead><tr>")
              .Append("<th>Concepto</th><th class=\"right\">$/u</th></tr></thead><tbody>");
            void Row(string label, decimal val) =>
                sb.Append("<tr><td>").Append(Esc(label)).Append("</td><td class=\"right\">").Append(Money(val)).Append("</td></tr>");
            Row("Material", b.Material);
            Row("Tinta", b.Tinta);
            Row("Planchas", b.Planchas);
            Row("Barniz", b.Barniz);
            Row("Terminado", b.Terminado);
            Row("Micro/Flauta", b.MicroFlauta);
            Row("Cordón", b.Cordon);
            Row("Refuerzo", b.Refuerzo);
            Row("Ventanilla", b.Ventanilla);
            Row("Películas", b.Peliculas);
            Row("Troquel", b.Troquel);
            Row("Desperdicio", b.Desperdicio);
            Row("Servicios máquina", b.SubtotalServicios);
            Row("Contrato", b.ContratoServicios);
            Row("Flete", b.Flete);
            Row("Costo total unitario", primary.CostoTotalUnitario);
            sb.Append("</tbody></table>");
        }

        sb.Append("<div class=\"foot\">Hoja interna de producción. Use Imprimir / Guardar PDF si necesita archivarla.</div>");
        // No auto-print: el diálogo bloqueado dejaba la pestaña en blanco / “sin PDF”.
        sb.Append("</body></html>");
        return sb.ToString();
    }

    private sealed record ClientPiece(string Name, string Material, string Measures, string Finishes);

    private static List<ClientPiece> ExtractClientPieces(string? formJson, string fallback)
    {
        var list = new List<ClientPiece>();
        if (!string.IsNullOrWhiteSpace(formJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(formJson);
                var root = doc.RootElement;
                if (root.TryGetProperty("pieces", out var arr) && arr.ValueKind == JsonValueKind.Array && arr.GetArrayLength() > 0)
                {
                    foreach (var el in arr.EnumerateArray())
                        list.Add(ReadPiece(el, fallback));
                }
                else
                {
                    list.Add(ReadPiece(root, fallback));
                }
            }
            catch { /* ignore */ }
        }
        if (list.Count == 0)
            list.Add(new ClientPiece(string.IsNullOrWhiteSpace(fallback) ? "Pieza 1" : fallback, "", "", ""));
        return list;
    }

    private static ClientPiece ReadPiece(JsonElement el, string fallback)
    {
        string Str(string name) =>
            el.TryGetProperty(name, out var p) && p.ValueKind == JsonValueKind.String ? (p.GetString() ?? "") : "";
        decimal Dec(string name)
        {
            if (!el.TryGetProperty(name, out var p)) return 0;
            if (p.ValueKind == JsonValueKind.Number && p.TryGetDecimal(out var d)) return d;
            if (p.ValueKind == JsonValueKind.String &&
                decimal.TryParse(p.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var s))
                return s;
            return 0;
        }

        var name = Str("partName");
        if (string.IsNullOrWhiteSpace(name)) name = string.IsNullOrWhiteSpace(fallback) ? "Pieza 1" : fallback;

        var finishes = new List<string>();
        foreach (var part in new[] { Str("terminadoNombre"), Str("tipoBarniz"), Str("microName"), Str("tipoCordon") })
        {
            if (!string.IsNullOrWhiteSpace(part)) finishes.Add(part);
        }

        return new ClientPiece(name, Str("materialName"), FormatMeasures(Dec("largoMm"), Dec("anchoMm")), string.Join(", ", finishes));
    }

    private static string FormatMeasures(decimal largo, decimal ancho)
    {
        if (largo <= 0 || ancho <= 0) return "";
        var co = CultureInfo.GetCultureInfo("es-CO");
        if (largo >= 50 || ancho >= 50)
            return $"{largo.ToString("0", co)} mm × {ancho.ToString("0", co)} mm";
        return $"{largo.ToString("0.##", co)} m × {ancho.ToString("0.##", co)} m";
    }

    private static List<string> ExtractProcesses(string? formJson)
    {
        var labels = new (string Key, string Label)[]
        {
            ("conversion", "conversión"),
            ("corte", "corte"),
            ("impresion", "impresión"),
            ("corrugado", "corrugado"),
            ("laminado", "laminado"),
            ("troquelado", "troquelado"),
            ("pegado", "pegado")
        };
        var found = new List<string>();
        if (string.IsNullOrWhiteSpace(formJson)) return found;
        try
        {
            using var doc = JsonDocument.Parse(formJson);
            if (!doc.RootElement.TryGetProperty("servicios", out var s) || s.ValueKind != JsonValueKind.Object)
                return found;
            foreach (var (key, label) in labels)
            {
                if (s.TryGetProperty(key, out var v) && v.ValueKind == JsonValueKind.True)
                    found.Add(label);
            }
        }
        catch { /* ignore */ }
        return found;
    }

    private static int ExtractPlazo(string? formJson)
    {
        if (string.IsNullOrWhiteSpace(formJson)) return 0;
        try
        {
            using var doc = JsonDocument.Parse(formJson);
            if (!doc.RootElement.TryGetProperty("plazoPagoDias", out var p)) return 0;
            if (p.ValueKind == JsonValueKind.Number && p.TryGetInt32(out var n)) return n;
            if (p.ValueKind == JsonValueKind.String && int.TryParse(p.GetString(), out var s)) return s;
        }
        catch { /* ignore */ }
        return 0;
    }

    private static bool ExtractIncluyeIva(string? formJson)
    {
        if (string.IsNullOrWhiteSpace(formJson)) return false;
        try
        {
            using var doc = JsonDocument.Parse(formJson);
            foreach (var name in new[] { "incluyeIva", "IncluyeIva" })
            {
                if (!doc.RootElement.TryGetProperty(name, out var p)) continue;
                if (p.ValueKind == JsonValueKind.True) return true;
                if (p.ValueKind == JsonValueKind.False) return false;
            }
        }
        catch { /* ignore */ }
        return false;
    }

    private static string ExtractObservaciones(string? formJson)
    {
        if (string.IsNullOrWhiteSpace(formJson)) return "";
        try
        {
            using var doc = JsonDocument.Parse(formJson);
            foreach (var name in new[] { "observaciones", "Observaciones" })
            {
                if (!doc.RootElement.TryGetProperty(name, out var p) || p.ValueKind != JsonValueKind.String)
                    continue;
                return (p.GetString() ?? "").Trim();
            }
        }
        catch { /* ignore */ }
        return "";
    }

    private static string ExtractCondicionesPago(string? formJson)
    {
        if (string.IsNullOrWhiteSpace(formJson)) return "";
        try
        {
            using var doc = JsonDocument.Parse(formJson);
            foreach (var name in new[] { "condicionesPago", "CondicionesPago" })
            {
                if (!doc.RootElement.TryGetProperty(name, out var p) || p.ValueKind != JsonValueKind.String)
                    continue;
                return (p.GetString() ?? "").Trim();
            }
        }
        catch { /* ignore */ }
        return "";
    }

    private static string? _logoDataUri;

    /// <summary>Logo de Aleph embebido para que salga en la impresión aunque el navegador no cargue archivos externos.</summary>
    private static string LogoDataUri()
    {
        if (_logoDataUri != null) return _logoDataUri;
        var asm = typeof(CotizadorPdfHtml).Assembly;
        var name = asm.GetManifestResourceNames()
            .FirstOrDefault(n => n.EndsWith("LogoAleph.jpeg", StringComparison.OrdinalIgnoreCase));
        if (name == null)
        {
            _logoDataUri = "";
            return _logoDataUri;
        }
        using var stream = asm.GetManifestResourceStream(name);
        if (stream == null)
        {
            _logoDataUri = "";
            return _logoDataUri;
        }
        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        _logoDataUri = "data:image/jpeg;base64," + Convert.ToBase64String(ms.ToArray());
        return _logoDataUri;
    }

    private static string ProductLabel(string? productType) =>
        string.Equals(productType, "Bolsa", StringComparison.OrdinalIgnoreCase) ? "Bolsa" : "Caja";

    private static string FreightSentence(string? freightType)
    {
        if (string.Equals(freightType, "Nacional", StringComparison.OrdinalIgnoreCase))
            return "El envío a otras ciudades del país ya está incluido en el precio.";
        if (string.Equals(freightType, "SinFlete", StringComparison.OrdinalIgnoreCase)
            || string.Equals(freightType, "Sin flete", StringComparison.OrdinalIgnoreCase))
            return "El envío no está incluido: el flete se cotiza aparte.";
        return "El envío local ya está incluido en el precio.";
    }

    private static string PlazoSentence(int dias) =>
        dias <= 0 ? "Forma de pago: contado." : $"Forma de pago: {dias} días.";

    private static string FreightLabel(string? freightType) =>
        string.Equals(freightType, "Nacional", StringComparison.OrdinalIgnoreCase) ? "Nacional"
        : string.Equals(freightType, "SinFlete", StringComparison.OrdinalIgnoreCase)
          || string.Equals(freightType, "Sin flete", StringComparison.OrdinalIgnoreCase) ? "Sin flete"
        : "Local";

    private static CotizadorCalculateResponse? TryParseCalc(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            return JsonSerializer.Deserialize<CotizadorCalculateResponse>(json, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });
        }
        catch { return null; }
    }

    private static List<string> ExtractPieceNames(string? formJson, string fallback)
    {
        var list = new List<string>();
        if (!string.IsNullOrWhiteSpace(formJson))
        {
            try
            {
                using var doc = JsonDocument.Parse(formJson);
                if (doc.RootElement.TryGetProperty("pieces", out var arr) && arr.ValueKind == JsonValueKind.Array)
                {
                    foreach (var el in arr.EnumerateArray())
                    {
                        if (el.TryGetProperty("partName", out var n) && n.ValueKind == JsonValueKind.String)
                        {
                            var name = n.GetString();
                            if (!string.IsNullOrWhiteSpace(name)) list.Add(name!);
                        }
                    }
                }
                else if (doc.RootElement.TryGetProperty("partName", out var single) && single.ValueKind == JsonValueKind.String)
                {
                    var name = single.GetString();
                    if (!string.IsNullOrWhiteSpace(name)) list.Add(name!);
                }
            }
            catch { /* ignore */ }
        }
        if (list.Count == 0)
            list.Add(string.IsNullOrWhiteSpace(fallback) ? "Pieza 1" : fallback);
        return list;
    }

    private static decimal PickPrice(CotizadorQuantityResult? r, string? tier)
    {
        if (r == null) return 0;
        return tier?.ToUpperInvariant() switch
        {
            "AL15" or "AL1.5" or "AL_1_5" => r.PrecioAl15,
            "AL5" => r.PrecioAl5,
            _ => r.PrecioAl3
        };
    }

    private static string Money(decimal v) => v.ToString("N2", CultureInfo.GetCultureInfo("es-CO"));
    private static string Esc(string? s) => System.Net.WebUtility.HtmlEncode(s ?? "");
}
