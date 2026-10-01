using System.Globalization;
using System.Net;
using System.Text;
using Perlax.Modules.Production.Application.Facturacion;
using Perlax.Modules.Production.Application.Remisiones;

namespace Perlax.Modules.Production.Application.Printing;

/// <summary>Plantillas HTML imprimibles (mismo patrón que cotizador: text/html + window.print).</summary>
public static class CommercialPrintHtml
{
    private static readonly CultureInfo Co = CultureInfo.GetCultureInfo("es-CO");

    public static string Remision(RemisionDetailDto rem)
    {
        var sb = new StringBuilder();
        sb.Append(DocStart($"Remisión {rem.RemisionNumber}"));
        sb.Append("<div class=\"doc\">");
        sb.Append("<h1>REMISIÓN DE DESPACHO</h1>");
        sb.Append("<table class=\"meta\">");
        sb.Append(Row("No. remisión", rem.RemisionNumber));
        sb.Append(Row("Fecha", FormatDate(rem.RemisionDate)));
        sb.Append(Row("Cliente", rem.ClientName));
        sb.Append(Row("Pedido", rem.CustomerOrderNumber));
        sb.Append(Row("Estado", rem.Status));
        if (!string.IsNullOrWhiteSpace(rem.Notes))
            sb.Append(Row("Observaciones", rem.Notes));
        sb.Append("</table>");

        if (rem.HasTransport)
        {
            sb.Append("<h2>Transporte</h2><table class=\"meta\">");
            sb.Append(Row("Transportador", rem.TransportCarrier));
            sb.Append(Row("Placa", rem.TransportPlate));
            sb.Append(Row("Conductor", rem.TransportDriver));
            sb.Append(Row("Costo flete", Money(rem.TransportCost)));
            if (!string.IsNullOrWhiteSpace(rem.TransportNotes))
                sb.Append(Row("Notas flete", rem.TransportNotes));
            sb.Append("</table>");
        }

        sb.Append("<h2>Detalle</h2>");
        sb.Append("<table class=\"grid\"><thead><tr>");
        sb.Append("<th>Producto</th><th>Referencia</th><th>Cantidad</th><th>PV unit.</th><th>Obs. despacho</th><th>Despacho final</th>");
        sb.Append("</tr></thead><tbody>");
        foreach (var i in rem.Items)
        {
            sb.Append("<tr>");
            sb.Append(Td(i.ProductName));
            sb.Append(Td(i.ReferenceName));
            sb.Append(Td(FormatQty(i.Quantity)));
            sb.Append(Td(Money(i.UnitPrice)));
            sb.Append(Td(i.DispatchNotes));
            sb.Append(Td(i.IsFinalDispatch ? $"Sí ({i.FinalDispatchCode})" : "—"));
            sb.Append("</tr>");
        }
        sb.Append("</tbody></table>");

        sb.Append("<div class=\"signs\"><div>Entrega ________________</div><div>Recibe ________________</div></div>");
        sb.Append("<p class=\"foot\">Perlax · Documento interno de despacho</p>");
        sb.Append("</div>");
        sb.Append(DocEnd());
        return sb.ToString();
    }

    public static string DispatchTicket(RemisionDetailDto rem, string format)
    {
        var kind = (string.IsNullOrWhiteSpace(format) ? "tickets" : format).Trim().ToLowerInvariant();
        var title = kind switch
        {
            "local" => "FICHA DESPACHO LOCAL",
            "expor" or "export" => "FICHA DESPACHO EXPORTACIÓN",
            _ => "TICKET DE DESPACHO"
        };

        var sb = new StringBuilder();
        sb.Append(DocStart($"{title} {rem.RemisionNumber}"));
        sb.Append("<div class=\"ticket\">");
        sb.Append($"<h1>{H(title)}</h1>");
        sb.Append($"<p class=\"big\">{H(rem.RemisionNumber)}</p>");
        sb.Append($"<p><b>Cliente:</b> {H(rem.ClientName)}</p>");
        sb.Append($"<p><b>Pedido:</b> {H(rem.CustomerOrderNumber)}</p>");
        sb.Append($"<p><b>Fecha:</b> {H(FormatDate(rem.RemisionDate))}</p>");

        if (rem.HasTransport)
        {
            sb.Append($"<p><b>Transportador:</b> {H(rem.TransportCarrier)}</p>");
            sb.Append($"<p><b>Placa:</b> {H(rem.TransportPlate)} · <b>Conductor:</b> {H(rem.TransportDriver)}</p>");
        }

        if (kind is "expor" or "export")
            sb.Append("<p class=\"badge\">EXPORTACIÓN — verificar documentos aduaneros</p>");
        else if (kind == "local")
            sb.Append("<p class=\"badge\">DESPACHO LOCAL</p>");

        sb.Append("<table class=\"grid\"><thead><tr><th>Producto / Ref</th><th>Cant.</th><th>Obs.</th></tr></thead><tbody>");
        foreach (var i in rem.Items)
        {
            sb.Append("<tr>");
            sb.Append(Td($"{i.ProductName} / {i.ReferenceName}"));
            sb.Append(Td(FormatQty(i.Quantity)));
            sb.Append(Td(i.DispatchNotes));
            sb.Append("</tr>");
        }
        sb.Append("</tbody></table>");
        sb.Append("<p class=\"foot\">Pegar en embalaje · Perlax</p>");
        sb.Append("</div>");
        sb.Append(DocEnd());
        return sb.ToString();
    }

    public static string Factura(SalesInvoiceDetailDto inv)
    {
        var sb = new StringBuilder();
        sb.Append(DocStart($"Factura {inv.InvoiceNumber}"));
        sb.Append("<div class=\"doc\">");
        sb.Append("<h1>FACTURA DE VENTA</h1>");
        sb.Append("<p class=\"warn\">Documento interno Perlax — no es factura electrónica DIAN</p>");
        sb.Append("<table class=\"meta\">");
        sb.Append(Row("No. factura", inv.InvoiceNumber));
        if (!string.IsNullOrWhiteSpace(inv.LegacyInvoiceNumber))
            sb.Append(Row("No. anterior", inv.LegacyInvoiceNumber));
        sb.Append(Row("Fecha", FormatDate(inv.InvoiceDate)));
        sb.Append(Row("Vencimiento", inv.DueDate.HasValue ? FormatDate(inv.DueDate.Value) : "—"));
        sb.Append(Row("Cliente", inv.ClientName));
        sb.Append(Row("Remisión", inv.RemisionNumber));
        sb.Append(Row("Estado", inv.Status));
        if (!string.IsNullOrWhiteSpace(inv.Notes))
            sb.Append(Row("Observaciones", inv.Notes));
        sb.Append("</table>");

        sb.Append("<h2>Detalle</h2>");
        sb.Append("<table class=\"grid\"><thead><tr>");
        sb.Append("<th>Producto</th><th>Referencia</th><th>Cantidad</th><th>PV unit.</th><th>Total línea</th>");
        sb.Append("</tr></thead><tbody>");
        foreach (var i in inv.Items)
        {
            sb.Append("<tr>");
            sb.Append(Td(i.ProductName));
            sb.Append(Td(i.ReferenceName));
            sb.Append(Td(FormatQty(i.Quantity)));
            sb.Append(Td(Money(i.UnitPrice)));
            sb.Append(Td(Money(i.LineTotal)));
            sb.Append("</tr>");
        }
        sb.Append("</tbody></table>");

        sb.Append("<table class=\"totals\">");
        sb.Append(Row("Subtotal", Money(inv.Subtotal)));
        sb.Append(Row($"IVA ({inv.TaxRate:0.##}%)", Money(inv.TaxAmount)));
        sb.Append(Row("Total", Money(inv.TotalAmount)));
        sb.Append("</table>");

        sb.Append("<p class=\"foot\">Perlax · Facturación interna</p>");
        sb.Append("</div>");
        sb.Append(DocEnd());
        return sb.ToString();
    }

    private static string DocStart(string title) =>
        "<!DOCTYPE html><html><head><meta charset=\"utf-8\"><title>" + H(title) + "</title>" +
        "<style>" +
        "body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;padding:24px;background:#fff}" +
        ".doc,.ticket{max-width:900px;margin:0 auto}" +
        "h1{font-size:20px;margin:0 0 12px;letter-spacing:.04em}" +
        "h2{font-size:14px;margin:20px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px}" +
        ".meta,.totals{width:100%;border-collapse:collapse;margin-bottom:12px}" +
        ".meta td,.totals td{padding:4px 8px;vertical-align:top}" +
        ".meta td:first-child,.totals td:first-child{width:160px;color:#555;font-weight:600}" +
        ".grid{width:100%;border-collapse:collapse;font-size:13px}" +
        ".grid th,.grid td{border:1px solid #bbb;padding:6px 8px;text-align:left}" +
        ".grid th{background:#f3f4f6}" +
        ".signs{display:flex;justify-content:space-between;margin-top:40px;font-size:13px}" +
        ".foot{margin-top:28px;font-size:11px;color:#666}" +
        ".warn{color:#9a3412;font-size:12px;margin:0 0 12px}" +
        ".big{font-size:22px;font-weight:700;margin:4px 0 12px}" +
        ".badge{display:inline-block;padding:4px 10px;border:1px solid #111;font-weight:700;font-size:12px}" +
        "@media print{body{padding:0}.foot{position:fixed;bottom:8px}}" +
        "</style></head><body>";

    private static string DocEnd() => "<script>window.print()</script></body></html>";

    private static string Row(string label, string? value) =>
        $"<tr><td>{H(label)}</td><td>{H(value)}</td></tr>";

    private static string Td(string? value) => $"<td>{H(value)}</td>";

    private static string H(string? value) => WebUtility.HtmlEncode(value ?? "—");

    private static string FormatDate(DateTime dt) =>
        dt.ToLocalTime().ToString("dd/MM/yyyy HH:mm", Co);

    private static string FormatQty(decimal q) => q.ToString("0.##", Co);

    private static string Money(decimal v) => v.ToString("C0", Co);
}
