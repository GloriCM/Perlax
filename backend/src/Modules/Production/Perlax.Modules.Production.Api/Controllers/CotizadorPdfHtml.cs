using System.Globalization;
using System.Text;
using System.Text.Json;
using Perlax.Modules.Production.Application.Cotizador;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Api.Controllers;

/// <summary>HTML imprimible estilo hoja Formato_Impresion del Excel Elliot.</summary>
internal static class CotizadorPdfHtml
{
    public static string BuildPropuesta(Quotation q, string tier, string? assetBase = null) => BuildCliente(q, tier, assetBase);
    public static string BuildProduccion(Quotation q) => Build(q, "Hoja de producción", null, produccion: true);

    /// <summary>Documento para el cliente: un solo precio, sin costos ni nombres internos de margen.</summary>
    private static string BuildCliente(Quotation q, string tier, string? assetBase)
    {
        var calc = TryParseCalc(q.CalculationResultJson);
        var pieces = ExtractClientPieces(q.FormDataJson, q.PartName);
        var processes = ExtractProcesses(q.FormDataJson);
        var plazo = ExtractPlazo(q.FormDataJson);
        var co = CultureInfo.GetCultureInfo("es-CO");
        var sb = new StringBuilder();
        sb.Append("<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>Cotización ")
          .Append(Esc(q.QuoteNumber))
          .Append("</title><style>")
          .Append("body{font-family:Segoe UI,Arial,sans-serif;margin:28px;color:#1a1a1a;background:#fff;line-height:1.45}")
          .Append(".letterhead{width:100%;border-collapse:collapse;border:none;border-bottom:3px solid #0f3d5c;margin:0 0 18px}")
          .Append(".letterhead td{border:none;vertical-align:middle;padding:0 0 14px 0}")
          .Append(".logo-wrap{width:200px;height:88px;display:flex;align-items:center}")
          .Append(".letterhead img{height:84px;width:auto;max-width:200px;object-fit:contain;display:block}")
          .Append(".logo-fallback{display:none;font-size:22px;font-weight:800;color:#0f3d5c;letter-spacing:.04em;line-height:1}")
          .Append(".logo-fallback small{display:block;font-size:11px;font-weight:600;letter-spacing:.14em;color:#5b6b76}")
          .Append(".company{font-size:12.5px;color:#24323c;line-height:1.45;padding-left:8px}")
          .Append(".company strong{display:block;font-size:16px;color:#0f3d5c;letter-spacing:.01em}")
          .Append(".docbox{text-align:right;border:2px solid #0f3d5c;padding:10px 14px;min-width:180px}")
          .Append(".docbox .kind{font-size:11px;letter-spacing:.14em;color:#0f3d5c;font-weight:700}")
          .Append(".docbox .num{font-size:20px;font-weight:800;color:#0f3d5c;margin:4px 0 2px}")
          .Append(".docbox .meta-line{font-size:12px;color:#24323c}")
          .Append("h1{font-size:22px;margin:0;color:#0f3d5c}")
          .Append("h2{font-size:15px;margin:22px 0 8px;color:#0f3d5c}")
          .Append(".lead{font-size:15px;margin:14px 0}")
          .Append(".meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 28px;margin:8px 0 4px;font-size:13px}")
          .Append("table{border-collapse:collapse;width:100%;margin:8px 0}")
          .Append("th,td{border:1px solid #d5dde3;padding:8px 10px;font-size:13px;text-align:left}")
          .Append("th{background:#eef4f8}")
          .Append(".right{text-align:right}")
          .Append(".main{background:#f3f8fc;font-weight:600}")
          .Append(".box{background:#f7fafc;border:1px solid #d5dde3;border-radius:8px;padding:12px 14px;font-size:13px}")
          .Append("ul{margin:6px 0 0;padding-left:18px}")
          .Append(".foot{margin-top:28px;font-size:12px;color:#555}")
          .Append(".toolbar{display:flex;gap:8px;margin:0 0 16px}")
          .Append(".toolbar button{padding:8px 14px;border:1px solid #0f3d5c;background:#0f3d5c;color:#fff;border-radius:6px;cursor:pointer;font-size:13px}")
          .Append(".toolbar button.secondary{background:#fff;color:#0f3d5c}")
          .Append("@media print{body{margin:12px}.toolbar{display:none!important}}")
          .Append("</style></head><body>");
        sb.Append("<div class=\"toolbar\"><button type=\"button\" onclick=\"window.print()\">Imprimir / Guardar PDF</button>")
          .Append("<button type=\"button\" class=\"secondary\" onclick=\"window.close()\">Cerrar</button></div>");

        sb.Append("<table class=\"letterhead\"><tr>");
        sb.Append("<td style=\"width:210px\"><div class=\"logo-wrap\">")
          .Append("<img id=\"co-logo\" alt=\"Aleph Impresores\" />")
          .Append("<div id=\"co-logo-fallback\" class=\"logo-fallback\">ALEPH<small>IMPRESORES</small></div>")
          .Append("</div></td>");
        sb.Append("<td><div class=\"company\"><strong>Aleph Impresores S.A.S.</strong>")
          .Append("NIT 901.442.622-6<br>")
          .Append("Carrera 1 #43-76<br>")
          .Append("Cali, Valle del Cauca<br>")
          .Append("Tel. 302 829 5169</div></td>");
        sb.Append("<td style=\"width:200px\"><div class=\"docbox\"><div class=\"kind\">COTIZACIÓN</div>")
          .Append("<div class=\"num\">No. ").Append(Esc(q.QuoteNumber)).Append("</div>")
          .Append("<div class=\"meta-line\">Fecha ").Append(q.RequestDate.ToString("dd/MM/yyyy")).Append("</div>")
          .Append("</div></td>");
        sb.Append("</tr></table>");
        sb.Append(LogoScript(assetBase));
        sb.Append("<p class=\"lead\">Propuesta de precio para <b>").Append(Esc(q.WorkName)).Append("</b>.</p>");

        sb.Append("<div class=\"meta\">");
        sb.Append("<div><b>Cliente:</b> ").Append(Esc(q.ClientName)).Append("</div>");
        sb.Append("<div><b>Fecha:</b> ").Append(q.RequestDate.ToString("dd/MM/yyyy")).Append("</div>");
        sb.Append("<div><b>Producto:</b> ").Append(Esc(ProductLabel(q.ProductType))).Append("</div>");
        sb.Append("<div><b>Asesor:</b> ").Append(Esc(q.SellerName)).Append("</div>");
        sb.Append("</div>");

        sb.Append("<h2>Qué incluye esta cotización</h2>");
        sb.Append("<table><thead><tr><th>Pieza</th><th>Material</th><th>Medidas del pliego</th><th>Acabados</th></tr></thead><tbody>");
        foreach (var p in pieces)
        {
            sb.Append("<tr><td>").Append(Esc(p.Name))
              .Append("</td><td>").Append(Esc(string.IsNullOrWhiteSpace(p.Material) ? "—" : p.Material))
              .Append("</td><td>").Append(Esc(string.IsNullOrWhiteSpace(p.Measures) ? "—" : p.Measures))
              .Append("</td><td>").Append(Esc(string.IsNullOrWhiteSpace(p.Finishes) ? "—" : p.Finishes))
              .Append("</td></tr>");
        }
        sb.Append("</tbody></table>");

        if (processes.Count > 0)
        {
            sb.Append("<p>Procesos incluidos: ").Append(Esc(string.Join(", ", processes))).Append(".</p>");
        }

        sb.Append("<div class=\"box\"><b>El precio es por cada unidad terminada.</b> ");
        sb.Append(Esc(FreightSentence(q.FreightType)));
        sb.Append(' ').Append(Esc(PlazoSentence(plazo)));
        sb.Append("</div>");

        if (calc?.Results is { Count: > 0 })
        {
            sb.Append("<h2>Precio</h2>");
            sb.Append("<p>El precio es por cada unidad. El total es la cantidad multiplicada por ese precio.</p>");
            sb.Append("<table><thead><tr><th>Cantidad</th><th class=\"right\">Precio por unidad</th><th class=\"right\">Total del pedido</th></tr></thead><tbody>");
            foreach (var r in calc.Results)
            {
                var unit = PickPrice(r, tier);
                sb.Append("<tr").Append(r.IsPrimary ? " class=\"main\"" : "").Append('>');
                sb.Append("<td>").Append(r.Quantity.ToString("N0", co)).Append(" unidades");
                if (r.IsPrimary) sb.Append("<br><span style=\"font-weight:400\">cantidad de referencia</span>");
                sb.Append("</td><td class=\"right\">$").Append(Money(unit));
                sb.Append("</td><td class=\"right\"><b>$").Append(Money(unit * r.Quantity)).Append("</b>");
                sb.Append("</td></tr>");
            }
            sb.Append("</tbody></table>");
        }
        else
        {
            sb.Append("<p>Esta cotización aún no tiene precios calculados.</p>");
        }

        sb.Append("<h2>Condiciones</h2><ul>");
        sb.Append("<li>").Append(Esc(string.IsNullOrWhiteSpace(q.DeliveryConditions)
            ? "Esta propuesta es válida por 30 días a partir de la fecha de emisión."
            : q.DeliveryConditions)).Append("</li>");
        sb.Append("<li>").Append(Esc(string.IsNullOrWhiteSpace(q.PriceConditions)
            ? "Los precios están sujetos a cambios según disponibilidad de materiales y confirmación de especificaciones finales."
            : q.PriceConditions)).Append("</li>");
        sb.Append("<li>El precio no incluye impuestos, salvo que se indique lo contrario.</li>");
        sb.Append("</ul>");

        sb.Append("<div class=\"foot\">Cotización preparada por ").Append(Esc(string.IsNullOrWhiteSpace(q.SellerName) ? "Aleph Impresores" : q.SellerName))
          .Append(". Para enviarla, use Imprimir / Guardar PDF y elija «Guardar como PDF».</div>");
        sb.Append("</body></html>");
        return sb.ToString();
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

    /// <summary>
    /// El HTML lo abre la API, así que el logo se pide al sitio donde está el archivo
    /// (el origen de la pantalla y, si falla, perlax.perla.work).
    /// </summary>
    private static string LogoScript(string? assetBase)
    {
        var origin = "";
        if (!string.IsNullOrWhiteSpace(assetBase)
            && Uri.TryCreate(assetBase.Trim(), UriKind.Absolute, out var uri)
            && (uri.Scheme == "http" || uri.Scheme == "https"))
            origin = uri.GetLeftPart(UriPartial.Authority).TrimEnd('/');

        var sb = new StringBuilder();
        sb.Append("<script>(function(){var img=document.getElementById('co-logo');var fb=document.getElementById('co-logo-fallback');if(!img)return;");
        sb.Append("var files=['/empresa-logo.jpeg','/empresa-logo.png','/Logo%20Aleph%20(fondo%20oscuro).png'];");
        sb.Append("var origins=[");
        if (origin.Length > 0)
            sb.Append('\'').Append(origin.Replace("'", "")).Append("',");
        sb.Append("'https://perlax.perla.work'];");
        sb.Append("var urls=[];origins.forEach(function(o){files.forEach(function(f){urls.push(o+f);});});");
        sb.Append("var i=0;function next(){if(i>=urls.length){img.style.display='none';if(fb)fb.style.display='block';return;}img.src=urls[i++];}");
        sb.Append("img.onload=function(){img.style.display='block';if(fb)fb.style.display='none';};img.onerror=next;next();})();</script>");
        return sb.ToString();
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
