using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using UglyToad.PdfPig;
using Perlax.Modules.Production.Application.Manufacturing;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Infrastructure.Parsing;

/// <summary>
/// Extrae campos de PDFs expertiS (ficha FO PD 63 + OP) usando posiciones X/Y.
/// </summary>
public static class ExpertisLegacyPdfParser
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private static readonly string[] StopLabels =
    [
        "Cliente", "Ejec. de cuenta", "Ejecutivo de cuenta", "Ejec de cuenta",
        "Linea de Producto", "Línea de Producto", "Nombre del producto y ref", "Nombre del producto",
        "Pieza", "Referencia", "Fecha de creación", "Fecha Modific", "Fecha Apertura", "Fecha de apertura",
        "Fecha de despacho", "Fecha despacho", "Dirección", "NIT/CC", "Trabajo", "O. compra Cliente",
        "O compra Cliente", "Codigo Troquel", "Código Troquel", "Codigo Troq", "Código Troq",
        "Ctd a producir", "Cantidad a producir", "Alto", "Ancho", "Largo", "Fuelle",
        "Terminado 1", "Terminado 2", "Pie de imprenta", "Estampado", "Tipo de manija",
        "Sustrato Sup", "Sustrato med", "Sustrato Inf", "Dirección de la fibra", "Tipo de flauta",
        "Dirección de la flauta", "Cantidad Tinta", "Especiales", "Material", "Proceso", "Notas",
        "Observaciones", "Troquel nuevo", "ORDEN DE PRODUCCIÓN", "ORDEN DE PRODUCCION"
    ];

    private sealed record PdfWord(string Text, double Left, double Right, double Bottom, double Top)
    {
        public double MidY => (Bottom + Top) / 2.0;
    }

    private sealed record LabelHit(int StartIndex, int EndIndex, double Left, double Right, string Matched);

    public static ExistingOpParsedDto Parse(Stream fichaPdf, Stream opPdf)
    {
        var ficha = LoadPage(fichaPdf);
        var op = LoadPage(opPdf);
        return ParsePages(ficha, op);
    }

    public static ExistingOpParsedDto ParseTexts(string fichaText, string opText)
    {
        // Fallback sin coordenadas: solo para tests simples / texto ya linealizado por líneas.
        var fichaLines = (fichaText ?? string.Empty).Split('\n').Select(l => l.Trim()).Where(l => l.Length > 0).ToList();
        var opLines = (opText ?? string.Empty).Split('\n').Select(l => l.Trim()).Where(l => l.Length > 0).ToList();
        return ParseFromLineTexts(fichaLines, opLines, fichaText ?? string.Empty, opText ?? string.Empty);
    }

    private static (List<List<PdfWord>> Lines, string LayoutText) LoadPage(Stream pdfStream)
    {
        if (pdfStream.CanSeek) pdfStream.Position = 0;
        using var doc = PdfDocument.Open(pdfStream);
        // Una página a la vez: las Y se reinician y mezclar todas las palabras rompe piezas en pág. 2+.
        var allLines = new List<List<PdfWord>>();
        var layoutParts = new List<string>();
        foreach (var page in doc.GetPages())
        {
            var pageWords = new List<PdfWord>();
            foreach (var w in page.GetWords())
            {
                if (string.IsNullOrWhiteSpace(w.Text)) continue;
                pageWords.Add(new PdfWord(
                    w.Text.Trim(),
                    w.BoundingBox.Left,
                    w.BoundingBox.Right,
                    w.BoundingBox.Bottom,
                    w.BoundingBox.Top));
            }
            var pageLines = BuildLines(pageWords);
            allLines.AddRange(pageLines);
            layoutParts.Add(string.Join("\n", pageLines.Select(LineText)));
        }

        return (allLines, string.Join("\n", layoutParts));
    }

    private static ExistingOpParsedDto ParsePages(
        (List<List<PdfWord>> Lines, string LayoutText) ficha,
        (List<List<PdfWord>> Lines, string LayoutText) op)
    {
        var fichaLines = ficha.Lines;
        var opLines = op.Lines;

        var opNumber = First(
            ValueRightOf(opLines, "ORDEN DE PRODUCCIÓN No.", "ORDEN DE PRODUCCION No.", "PRODUCCIÓN No.", "PRODUCCION No."),
            FindOpNumber(opLines));

        var client = First(
            ValueRightOf(opLines, "Cliente"),
            ValueRightOf(fichaLines, "Cliente"));

        var product = First(
            ValueRightOf(opLines, "Trabajo"),
            ValueRightOf(fichaLines, "Nombre del producto y ref", "Nombre del producto"));

        var reference = First(
            MatchGroup(product ?? string.Empty, @"Ref\s*:\s*(.+)"),
            ValueRightOf(fichaLines, "Referencia"),
            product);

        var ejecutivo = First(
            ValueRightOf(fichaLines, "Ejec. de cuenta", "Ejecutivo de cuenta", "Ejec de cuenta"),
            ValueRightOf(opLines, "Ejec. de cuenta"));

        var linea = ValueRightOf(fichaLines, "Linea de Producto", "Línea de Producto", "Linea de producto");
        var troquel = First(
            ValueRightOf(opLines, "Codigo Troquel", "Código Troquel"),
            ValueRightOf(fichaLines, "Codigo Troq", "Código Troq", "Codigo Troquel"));

        var oc = ValueRightOf(opLines, "O. compra Cliente", "O compra Cliente");
        var qty = ParseDecimal(ValueRightOf(opLines, "Ctd a producir", "Cantidad a producir", "Ctd. a producir"));

        var opening = ParseDate(First(
            ValueRightOf(opLines, "Fecha Apertura", "Fecha de apertura"),
            ValueRightOf(fichaLines, "Fecha de creación")));

        var dispatch = ParseDate(ValueRightOf(opLines, "Fecha de despacho", "Fecha despacho"));

        var alto = ParseDecimal(ValueRightOf(fichaLines, "Alto"));
        var largo = ParseDecimal(ValueRightOf(fichaLines, "Largo"));
        var ancho = ParseDecimal(ValueRightOf(fichaLines, "Ancho"));
        var fuelle = ParseDecimal(ValueRightOf(fichaLines, "Fuelle"));

        var terminado1 = ValueRightOf(fichaLines, "Terminado 1", "Terminado 1:");
        var terminado2 = ValueRightOf(fichaLines, "Terminado 2", "Terminado 2:");
        var pieImprenta = ValueRightOf(fichaLines, "Pie de imprenta");
        var notasFicha = ValueBelowLabel(fichaLines, "Notas:");

        var (c, m, y, k) = DetectCmyk(ficha.LayoutText + " " + op.LayoutText);
        var partDtos = ExtractParts(opLines, troquel, alto, ancho, largo, fuelle, notasFicha);
        var allProcesses = partDtos
            .SelectMany(p => ParseProcessArray(p.FabricationProcessesJson))
            .ToList();
        var processesJson = JsonSerializer.Serialize(allProcesses, JsonOpts);
        var firstPart = partDtos.FirstOrDefault();
        var material = firstPart?.Material;
        var notes = firstPart?.Notas;

        if (string.IsNullOrWhiteSpace(opNumber))
            throw new InvalidOperationException("No se pudo leer el número de OP del PDF de orden de producción.");
        if (string.IsNullOrWhiteSpace(client))
            throw new InvalidOperationException("No se pudo leer el cliente de los PDFs.");
        if (string.IsNullOrWhiteSpace(product))
            throw new InvalidOperationException("No se pudo leer el producto/trabajo de los PDFs.");

        // Si la cantidad cayó en el gramaje (p.ej. 295), intentar recuperar desde "Ctd a producir" en texto de layout.
        if (qty is null or <= 0 || LooksLikeGramaje(qty.Value, material))
        {
            var qty2 = ParseDecimal(MatchGroup(op.LayoutText, @"Ctd\s+a\s+producir\s+([0-9\.,]+)"));
            // layout has label then value on same line sometimes reversed in plain text - also try number near label
            var qty3 = ParseDecimal(MatchGroup(op.LayoutText, @"([0-9]{2,6}(?:[.,][0-9]+)?)\s+Ctd\s+a\s+producir"));
            qty = FirstDecimal(qty3, qty2, qty);
        }

        return new ExistingOpParsedDto(
            OpNumber: Clean(opNumber),
            OtNumber: null,
            ClientName: Clean(client),
            ProductName: Clean(product),
            ReferenceName: Clean(reference ?? product),
            PurchaseOrderNumber: string.IsNullOrWhiteSpace(oc) ? null : Clean(oc),
            EjecutivoCuenta: string.IsNullOrWhiteSpace(ejecutivo) ? null : Clean(ejecutivo),
            LineaPT: string.IsNullOrWhiteSpace(linea) ? "Otro" : Clean(linea),
            QuantityToProduce: qty is > 0 ? qty.Value : 1m,
            QuantityOrdered: qty is > 0 ? qty.Value : 1m,
            OpeningDate: opening ?? DateTime.UtcNow.Date,
            AgreedDeliveryDate: dispatch,
            CodigoTroquel: string.IsNullOrWhiteSpace(troquel) ? null : Clean(troquel),
            MaterialNotes: string.IsNullOrWhiteSpace(notes) ? null : notes,
            FabricationProcessesJson: processesJson,
            Alto: alto,
            Ancho: ancho,
            Largo: largo,
            Fuelle: fuelle,
            Terminado1: NormalizeFinish(terminado1),
            Terminado2: NormalizeFinish(terminado2),
            PieImprenta: string.IsNullOrWhiteSpace(pieImprenta) ? null : Clean(pieImprenta),
            TintaC: c,
            TintaM: m,
            TintaY: y,
            TintaK: k,
            Warnings: BuildWarnings(qty, allProcesses.Count, partDtos.Count),
            RawFichaText: ficha.LayoutText,
            RawOpText: op.LayoutText,
            Parts: partDtos);
    }

    private static ExistingOpParsedDto ParseFromLineTexts(
        List<string> fichaLines,
        List<string> opLines,
        string fichaRaw,
        string opRaw)
    {
        // Construye "palabras" sintéticas en una sola columna X creciente por línea.
        List<List<PdfWord>> ToWords(List<string> lines)
        {
            var result = new List<List<PdfWord>>();
            for (var i = 0; i < lines.Count; i++)
            {
                var y = 1000 - i * 12;
                var x = 0.0;
                var row = new List<PdfWord>();
                foreach (var token in lines[i].Split(' ', StringSplitOptions.RemoveEmptyEntries))
                {
                    var w = token.Length * 5.0;
                    row.Add(new PdfWord(token, x, x + w, y, y + 10));
                    x += w + 4;
                }
                if (row.Count > 0) result.Add(row);
            }
            return result;
        }

        return ParsePages((ToWords(fichaLines), fichaRaw), (ToWords(opLines), opRaw));
    }

    private static List<List<PdfWord>> BuildLines(List<PdfWord> words, double yTol = 3.5)
    {
        var ordered = words.OrderByDescending(w => w.Bottom).ThenBy(w => w.Left).ToList();
        var lines = new List<List<PdfWord>>();
        List<PdfWord>? current = null;
        double? currentY = null;
        foreach (var w in ordered)
        {
            if (current == null || currentY == null || Math.Abs(w.Bottom - currentY.Value) > yTol)
            {
                current = new List<PdfWord>();
                lines.Add(current);
                currentY = w.Bottom;
            }
            current.Add(w);
        }
        foreach (var line in lines)
            line.Sort((a, b) => a.Left.CompareTo(b.Left));
        return lines;
    }

    private static string LineText(List<PdfWord> line) => string.Join(" ", line.Select(w => w.Text));

    private static string? ValueRightOf(List<List<PdfWord>> lines, params string[] labelVariants)
    {
        foreach (var line in lines)
        {
            var hit = FindLabel(line, labelVariants);
            if (hit == null) continue;

            var next = FindNextStopLabel(line, hit.Right + 0.5);
            var limit = next?.Left ?? double.MaxValue;
            var valueWords = line
                .Where(w => w.Left >= hit.Right - 0.2 && w.Left < limit - 0.5)
                .OrderBy(w => w.Left)
                .Select(w => w.Text)
                .ToList();

            // En algunos renglones el valor está justo a la derecha aunque el label ocupe tokens intermedios.
            var joined = Clean(string.Join(" ", valueWords));
            if (!string.IsNullOrWhiteSpace(joined) && !IsOnlyLabelNoise(joined))
                return joined;
        }
        return null;
    }

    private static string? ValueBelowLabel(List<List<PdfWord>> lines, params string[] labelVariants)
    {
        for (var i = 0; i < lines.Count; i++)
        {
            var hit = FindLabel(lines[i], labelVariants);
            if (hit == null) continue;
            if (i + 1 >= lines.Count) return null;
            var nextLine = LineText(lines[i + 1]);
            // Detener si la siguiente línea parece otra sección
            if (nextLine.StartsWith("Revisado", StringComparison.OrdinalIgnoreCase) ||
                nextLine.StartsWith("IMPORTANTE", StringComparison.OrdinalIgnoreCase))
                return null;
            return Clean(nextLine);
        }
        return null;
    }

    private static LabelHit? FindLabel(List<PdfWord> line, IEnumerable<string> labelVariants)
    {
        var texts = line.Select(w => w.Text).ToArray();
        foreach (var variant in labelVariants.OrderByDescending(v => v.Length))
        {
            var parts = variant.Split(' ', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) continue;
            for (var i = 0; i <= texts.Length - parts.Length; i++)
            {
                var ok = true;
                for (var j = 0; j < parts.Length; j++)
                {
                    var token = texts[i + j].TrimEnd(':', '.');
                    var expect = parts[j].TrimEnd(':', '.');
                    if (!token.Equals(expect, StringComparison.OrdinalIgnoreCase))
                    {
                        ok = false;
                        break;
                    }
                }
                if (!ok) continue;
                return new LabelHit(i, i + parts.Length - 1, line[i].Left, line[i + parts.Length - 1].Right, variant);
            }
        }
        return null;
    }

    private static LabelHit? FindNextStopLabel(List<PdfWord> line, double afterX)
    {
        LabelHit? best = null;
        foreach (var label in StopLabels)
        {
            var hit = FindLabel(line, new[] { label });
            if (hit == null) continue;
            if (hit.Left < afterX) continue;
            if (best == null || hit.Left < best.Left) best = hit;
        }
        return best;
    }

    private static string? FindOpNumber(List<List<PdfWord>> opLines)
    {
        foreach (var line in opLines)
        {
            var text = LineText(line);
            if (!text.Contains("ORDEN", StringComparison.OrdinalIgnoreCase) ||
                !text.Contains("PRODUCCI", StringComparison.OrdinalIgnoreCase))
                continue;

            // Prefer number to the right of "No."
            var no = FindLabel(line, new[] { "No." });
            if (no != null)
            {
                var num = line.Where(w => w.Left >= no.Right - 0.2)
                    .Select(w => w.Text)
                    .FirstOrDefault(t => Regex.IsMatch(t, @"^\d{3,6}$"));
                if (num != null) return num;
            }

            var any = line.Select(w => w.Text).FirstOrDefault(t => Regex.IsMatch(t, @"^\d{3,6}$"));
            if (any != null) return any;
        }

        // Number alone on line above/near title
        foreach (var line in opLines.Take(8))
        {
            var only = LineText(line);
            if (Regex.IsMatch(only, @"^\d{3,6}$")) return only.Trim();
        }
        return null;
    }

    private static string? ExtractMaterial(List<List<PdfWord>> opLines)
    {
        for (var i = 0; i < opLines.Count; i++)
        {
            var hit = FindLabel(opLines[i], new[] { "Material" });
            if (hit == null) continue;
            // Fila de encabezados: Material AnchoRollo... — el valor está en la siguiente línea
            if (i + 1 < opLines.Count)
            {
                var row = LineText(opLines[i + 1]);
                // Quitar cantidades tabulares al final; conservar descripción cartulina
                var m = Regex.Match(row, @"(CARTULINA|PAPEL|KRAFT|SULFATO|BOND|PROPALCOTE|CART[OÓ]N|MICRO|FLAUTA|LINNER)[^0-9]{0,80}(?:\d+\s*GRS?)?", RegexOptions.IgnoreCase);
                if (m.Success) return Clean(m.Value);
                // fallback: primeros tokens no numéricos
                var tokens = opLines[i + 1]
                    .Select(w => w.Text)
                    .Where(t => !Regex.IsMatch(t, @"^[\d,\.xX\-]+$"))
                    .Take(8);
                var joined = Clean(string.Join(" ", tokens));
                if (!string.IsNullOrWhiteSpace(joined)) return joined;
            }
        }
        return null;
    }

    private static List<ExistingOpParsedPartDto> ExtractParts(
        List<List<PdfWord>> opLines,
        string? headerTroquel,
        decimal? fichaAlto,
        decimal? fichaAncho,
        decimal? fichaLargo,
        decimal? fichaFuelle,
        string? notasFicha)
    {
        var slices = SplitPieceSlices(opLines);
        var parts = new List<ExistingOpParsedPartDto>();
        for (var i = 0; i < slices.Count; i++)
        {
            var (name, lines) = slices[i];
            var material = ExtractMaterial(lines);
            var processes = ExtractProcesses(lines);
            var tagged = processes.Select(p => TagPartName(p, name)).ToList();
            var processesJson = JsonSerializer.Serialize(tagged, JsonOpts);
            var dims = ExtractPieceDimensions(lines);
            var isPrimary = i == 0;
            var notes = string.Join("\n", new[]
            {
                string.IsNullOrWhiteSpace(material) ? null : $"Material: {material}",
                isPrimary && !string.IsNullOrWhiteSpace(notasFicha) ? $"Notas ficha: {notasFicha}" : null,
            }.Where(x => x != null)!);

            var altoPliego = dims.AltoPliego;
            var anchoPliego = dims.AnchoPliego;
            var alto = isPrimary ? fichaAlto ?? dims.Alto ?? altoPliego : dims.Alto ?? altoPliego;
            var ancho = isPrimary ? fichaAncho ?? dims.Ancho ?? anchoPliego : dims.Ancho ?? anchoPliego;

            parts.Add(new ExistingOpParsedPartDto(
                PartName: name,
                Material: material,
                FabricationProcessesJson: processesJson,
                Alto: alto,
                Ancho: ancho,
                Largo: isPrimary ? fichaLargo : null,
                Fuelle: isPrimary ? fichaFuelle : null,
                AltoPliego: altoPliego,
                AnchoPliego: anchoPliego,
                Hojas: dims.Hojas,
                CodigoTroquel: isPrimary ? headerTroquel : null,
                Notas: string.IsNullOrWhiteSpace(notes) ? null : notes));
        }

        if (parts.Count == 0)
        {
            parts.Add(new ExistingOpParsedPartDto(
                "Pieza Unica",
                ExtractMaterial(opLines),
                JsonSerializer.Serialize(ExtractProcesses(opLines).Select(p => TagPartName(p, "Pieza Unica")), JsonOpts),
                fichaAlto, fichaAncho, fichaLargo, fichaFuelle, null, null, null, headerTroquel, null));
        }

        return parts;
    }

    private static object TagPartName(object process, string partName)
    {
        var json = JsonSerializer.Serialize(process, JsonOpts);
        using var doc = JsonDocument.Parse(json);
        var map = new Dictionary<string, object?>();
        foreach (var prop in doc.RootElement.EnumerateObject())
        {
            map[prop.Name] = prop.Value.ValueKind switch
            {
                JsonValueKind.String => prop.Value.GetString(),
                JsonValueKind.Number => prop.Value.TryGetDecimal(out var d) ? d : prop.Value.GetDouble(),
                JsonValueKind.True => true,
                JsonValueKind.False => false,
                JsonValueKind.Null => null,
                _ => prop.Value.GetRawText()
            };
        }
        map["partName"] = partName;
        return map;
    }

    private static List<object> ParseProcessArray(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            using var doc = JsonDocument.Parse(json);
            if (doc.RootElement.ValueKind != JsonValueKind.Array) return [];
            var list = new List<object>();
            foreach (var el in doc.RootElement.EnumerateArray())
            {
                var map = new Dictionary<string, object?>();
                foreach (var prop in el.EnumerateObject())
                {
                    map[prop.Name] = prop.Value.ValueKind switch
                    {
                        JsonValueKind.String => prop.Value.GetString(),
                        JsonValueKind.Number => prop.Value.TryGetDecimal(out var d) ? d : prop.Value.GetDouble(),
                        JsonValueKind.True => true,
                        JsonValueKind.False => false,
                        JsonValueKind.Null => null,
                        _ => prop.Value.GetRawText()
                    };
                }
                list.Add(map);
            }
            return list;
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static List<(string Name, List<List<PdfWord>> Lines)> SplitPieceSlices(List<List<PdfWord>> opLines)
    {
        var starts = new List<(int Index, string Name)>();
        for (var i = 0; i < opLines.Count; i++)
        {
            var text = LineText(opLines[i]);
            var match = Regex.Match(text, @"Pieza\s*:\s*(.+)$", RegexOptions.IgnoreCase);
            if (!match.Success) continue;
            var name = Clean(match.Groups[1].Value);
            if (string.IsNullOrWhiteSpace(name)) name = "Pieza Unica";
            starts.Add((i, name));
        }

        if (starts.Count == 0)
            return [("Pieza Unica", opLines)];

        var result = new List<(string Name, List<List<PdfWord>> Lines)>();
        for (var s = 0; s < starts.Count; s++)
        {
            var from = starts[s].Index;
            var to = s + 1 < starts.Count ? starts[s + 1].Index : opLines.Count;
            result.Add((starts[s].Name, opLines.GetRange(from, to - from)));
        }
        return result;
    }

    private sealed record PieceDimensions(
        decimal? AnchoPliego,
        decimal? AltoPliego,
        decimal? Ancho,
        decimal? Alto,
        decimal? Hojas);

    /// <summary>
    /// expertiS pone AnchoPlieg/AltoPliego en una grilla (valor debajo de la etiqueta)
    /// o apilados (etiqueta y número en líneas consecutivas). Tamaño Final y REFILAR son respaldo.
    /// </summary>
    private static PieceDimensions ExtractPieceDimensions(List<List<PdfWord>> lines)
    {
        decimal? anchoPliego = null, altoPliego = null, ancho = null, alto = null, hojas = null;

        for (var i = 0; i < lines.Count; i++)
        {
            var header = lines[i];
            var anchoHit = FindLabel(header, ["AnchoPlieg", "AnchoPliego", "Ancho Plieg"]);
            var altoHit = FindLabel(header, ["AltoPliego", "AltoPlieg", "Alto Pliego"]);
            var hojasHit = FindLabel(header, ["Hojas"]);
            var tamHit = FindLabel(header, ["Tamaño Final", "Tamano Final"]);
            if (anchoHit == null && altoHit == null && tamHit == null)
                continue;
            if (i + 1 >= lines.Count)
                break;

            var valueLine = lines[i + 1];
            if (anchoHit != null)
                anchoPliego = NumberNearX(valueLine, (anchoHit.Left + anchoHit.Right) / 2.0);
            if (altoHit != null)
                altoPliego = NumberNearX(valueLine, (altoHit.Left + altoHit.Right) / 2.0);
            if (hojasHit != null)
                hojas = NumberNearX(valueLine, (hojasHit.Left + hojasHit.Right) / 2.0);
            if (tamHit != null)
            {
                var tamText = WordsFromX(valueLine, tamHit.Left - 8);
                if (TryParseSizePair(tamText, out var tamAncho, out var tamAlto))
                {
                    ancho ??= tamAncho;
                    alto ??= tamAlto;
                }
            }
            break;
        }

        anchoPliego ??= ValueBelowNumber(lines, "AnchoPlieg", "AnchoPliego", "Ancho Plieg");
        altoPliego ??= ValueBelowNumber(lines, "AltoPliego", "AltoPlieg", "Alto Pliego");
        hojas ??= ValueBelowNumber(lines, "Hojas");

        var layout = string.Join("\n", lines.Select(LineText));
        if (TryParseSizePair(MatchGroup(layout, @"Tama[ñn]o\s*Final[^\d]{0,40}(\d+[.,]\d+\s*[xX]\s*\d+[.,]\d+)") ?? layout, out var finalAncho, out var finalAlto)
            && Regex.IsMatch(layout, @"Tama[ñn]o\s*Final", RegexOptions.IgnoreCase))
        {
            ancho ??= finalAncho;
            alto ??= finalAlto;
        }

        if (TryParseSizePair(MatchGroup(layout, @"REFILAR\s+A\s+(?:x\s*)?(\d+[.,]\d+\s*[xX]\s*\d+[.,]\d+)") ?? string.Empty, out var refAncho, out var refAlto))
        {
            anchoPliego ??= refAncho;
            altoPliego ??= refAlto;
            ancho ??= refAncho;
            alto ??= refAlto;
        }

        ancho ??= anchoPliego;
        alto ??= altoPliego;
        return new PieceDimensions(anchoPliego, altoPliego, ancho, alto, hojas);
    }

    private static decimal? ValueBelowNumber(List<List<PdfWord>> lines, params string[] labels)
    {
        for (var i = 0; i < lines.Count; i++)
        {
            var hit = FindLabel(lines[i], labels);
            if (hit == null) continue;
            if (i + 1 >= lines.Count) return null;
            var next = lines[i + 1];
            var aligned = NumberNearX(next, (hit.Left + hit.Right) / 2.0);
            if (aligned != null) return aligned;
            var text = Clean(LineText(next));
            if (Regex.IsMatch(text, @"^[\d\.,]+$"))
                return ParseDecimal(text);
        }
        return null;
    }

    private static decimal? NumberNearX(List<PdfWord> line, double x, double maxDx = 45)
    {
        PdfWord? best = null;
        var bestDx = double.MaxValue;
        foreach (var w in line)
        {
            if (!LooksLikeMeasureToken(w.Text)) continue;
            var mid = (w.Left + w.Right) / 2.0;
            var dx = Math.Abs(mid - x);
            if (dx < bestDx)
            {
                bestDx = dx;
                best = w;
            }
        }
        if (best == null || bestDx > maxDx) return null;
        return ParseDecimal(best.Text);
    }

    private static bool LooksLikeMeasureToken(string text) =>
        Regex.IsMatch(text ?? string.Empty, @"^\d{1,4}([.,]\d{1,3})?$");

    private static string WordsFromX(List<PdfWord> line, double minLeft) =>
        Clean(string.Join(" ", line.Where(w => w.Left >= minLeft).Select(w => w.Text)));

    private static bool TryParseSizePair(string? text, out decimal? ancho, out decimal? alto)
    {
        ancho = null;
        alto = null;
        if (string.IsNullOrWhiteSpace(text)) return false;
        var m = Regex.Match(text, @"(\d+[.,]\d+)\s*[xX×]\s*(\d+[.,]\d+)");
        if (!m.Success) return false;
        ancho = ParseDecimal(m.Groups[1].Value);
        alto = ParseDecimal(m.Groups[2].Value);
        return ancho != null && alto != null;
    }

    private static List<object> ExtractProcesses(List<List<PdfWord>> opLines)
    {
        var list = new List<object>();
        var codeRx = new Regex(@"^(\d{1,2}[a-zA-Z]?|[0-9]+[A-Za-z])$", RegexOptions.IgnoreCase);
        var inProcess = false;

        for (var i = 0; i < opLines.Count; i++)
        {
            var line = opLines[i];
            var text = LineText(line);
            if (text.Contains("Proceso", StringComparison.OrdinalIgnoreCase) &&
                text.Contains("Notas", StringComparison.OrdinalIgnoreCase))
            {
                inProcess = true;
                continue;
            }
            if (!inProcess) continue;
            if (text.StartsWith("Observaciones", StringComparison.OrdinalIgnoreCase)) break;
            if (Regex.IsMatch(text, @"^Pieza\s*:", RegexOptions.IgnoreCase)) break;
            if (text.Contains("TIEMPOS MAQUINA", StringComparison.OrdinalIgnoreCase)) break;
            if (text.StartsWith("ESTE ES UN DOCUMENTO", StringComparison.OrdinalIgnoreCase)) break;

            // Continuación de notas (sin código a la izquierda)
            var left = line.FirstOrDefault();
            if (left == null) continue;

            if (codeRx.IsMatch(left.Text) && left.Left < 160)
            {
                var code = left.Text;
                var machineWords = line.Skip(1).TakeWhile(w => w.Left < 200).Select(w => w.Text);
                var machine = Clean(code + " " + string.Join(" ", machineWords));
                var notesWords = line.Where(w => w.Left >= 200 && w.Left < 500).Select(w => w.Text);
                var notes = Clean(string.Join(" ", notesWords));
                // Continuación en siguiente línea sin código
                if (i + 1 < opLines.Count)
                {
                    var next = opLines[i + 1];
                    var nextLeft = next.FirstOrDefault();
                    if (nextLeft != null && nextLeft.Left >= 180 && !codeRx.IsMatch(nextLeft.Text))
                    {
                        var cont = Clean(string.Join(" ", next.Where(w => w.Left < 500).Select(w => w.Text)));
                        if (!string.IsNullOrWhiteSpace(cont) &&
                            !cont.StartsWith("Observaciones", StringComparison.OrdinalIgnoreCase) &&
                            !cont.StartsWith("ALMACEN", StringComparison.OrdinalIgnoreCase))
                            notes = Clean(notes + " " + cont);
                    }
                }

                var catalogCode = ExpertisProcessCatalogMapper.MapToCatalogCode(machine, notes);
                list.Add(new
                {
                    machine,
                    process = catalogCode ?? "Proceso",
                    processCode = catalogCode,
                    notes,
                    quantity = 0,
                    capacity = 0,
                    equiv = 0
                });
                continue;
            }

            if (text.StartsWith("ALMACEN", StringComparison.OrdinalIgnoreCase))
            {
                var notesAlmacen = Clean(text);
                list.Add(new
                {
                    machine = "ALMACEN",
                    process = "Almacen",
                    processCode = (string?)null,
                    notes = notesAlmacen,
                    quantity = 0,
                    capacity = 0,
                    equiv = 0
                });
            }
        }

        return list;
    }

    private static (bool c, bool m, bool y, bool k) DetectCmyk(string text)
    {
        var t = text.ToUpperInvariant();
        if (t.Contains("C+M+Y+K") || t.Contains("POLICROM") || Regex.IsMatch(t, @"\bC\s+M\s+Y\s+K\b"))
            return (true, true, true, true);
        return (t.Contains(" TINTA") && Regex.IsMatch(t, @"\bC\b"),
            t.Contains(" TINTA") && Regex.IsMatch(t, @"\bM\b"),
            t.Contains(" TINTA") && Regex.IsMatch(t, @"\bY\b"),
            t.Contains(" TINTA") && Regex.IsMatch(t, @"\bK\b"));
    }

    private static bool LooksLikeGramaje(decimal qty, string? material)
    {
        if (string.IsNullOrWhiteSpace(material)) return false;
        return material.Contains(qty.ToString("0", CultureInfo.InvariantCulture), StringComparison.Ordinal) &&
               material.Contains("GR", StringComparison.OrdinalIgnoreCase);
    }

    private static string? NormalizeFinish(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var v = Clean(value);
        if (v.Equals("Ninguno", StringComparison.OrdinalIgnoreCase) ||
            v.Equals("N/A", StringComparison.OrdinalIgnoreCase))
            return null;
        return v;
    }

    private static bool IsOnlyLabelNoise(string value)
    {
        var v = value.Trim();
        return StopLabels.Any(l => v.Equals(l, StringComparison.OrdinalIgnoreCase));
    }

    private static IReadOnlyList<string> BuildWarnings(decimal? qty, int processCount, int partCount)
    {
        var w = new List<string>();
        if (qty is null or <= 0) w.Add("Cantidad a producir no clara en el PDF; se usó 1 por defecto (revise).");
        if (processCount == 0) w.Add("No se detectaron procesos en el PDF de OP; puede editarlos luego en la OT.");
        if (partCount > 1) w.Add($"Se detectaron {partCount} piezas en la OP. Revise material y procesos de cada una.");
        return w;
    }

    private static string Clean(string value)
    {
        var v = Regex.Replace(value ?? string.Empty, @"\s+", " ").Trim();
        return v.Trim(' ', '-', ':', ';', '.');
    }

    private static string? First(params string?[] values) =>
        values.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));

    private static decimal? FirstDecimal(params decimal?[] values) =>
        values.FirstOrDefault(v => v is > 0);

    private static string? MatchGroup(string text, string pattern)
    {
        var match = Regex.Match(text ?? string.Empty, pattern, RegexOptions.IgnoreCase | RegexOptions.Singleline);
        return match.Success ? Clean(match.Groups[1].Value) : null;
    }

    private static decimal? ParseDecimal(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var s = raw.Trim();
        s = Regex.Match(s, @"[0-9]{1,3}(?:\.[0-9]{3})*(?:,[0-9]+)?|[0-9]+(?:[.,][0-9]+)?").Value;
        if (string.IsNullOrWhiteSpace(s)) return null;
        if (s.Contains(',') && s.Contains('.'))
            s = s.Replace(".", "").Replace(',', '.');
        else if (s.Contains(',') && !s.Contains('.'))
            s = s.Replace(',', '.');
        else if (Regex.IsMatch(s, @"^\d{1,3}(\.\d{3})+$"))
            s = s.Replace(".", "");
        return decimal.TryParse(s, NumberStyles.Number, CultureInfo.InvariantCulture, out var d) ? d : null;
    }

    private static DateTime? ParseDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        var s = Clean(raw);
        var match = Regex.Match(s, @"(\d{1,2})\s+de\s+([A-Za-zÁÉÍÓÚáéíóú]+)\s+de\s+(\d{4})", RegexOptions.IgnoreCase);
        if (match.Success)
        {
            var day = int.Parse(match.Groups[1].Value);
            var year = int.Parse(match.Groups[3].Value);
            var month = MonthFromSpanish(match.Groups[2].Value);
            if (month != null) return new DateTime(year, month.Value, day, 0, 0, 0, DateTimeKind.Utc);
        }

        // 25/06/2026 (a veces truncado 25/06/202)
        var slash = Regex.Match(s, @"\b(\d{1,2})/(\d{1,2})/(\d{2,4})\b");
        if (slash.Success)
        {
            var day = int.Parse(slash.Groups[1].Value);
            var month = int.Parse(slash.Groups[2].Value);
            var yearRaw = slash.Groups[3].Value;
            var year = yearRaw.Length <= 2 ? 2000 + int.Parse(yearRaw) : int.Parse(yearRaw);
            if (yearRaw.Length == 3) year = 2000 + int.Parse(yearRaw[1..]); // 202 -> rare; keep simple
            if (yearRaw == "202") year = 2026; // PDF truncado observado
            if (month is >= 1 and <= 12 && day is >= 1 and <= 31)
                return new DateTime(year, month, Math.Min(day, DateTime.DaysInMonth(year, month)), 0, 0, 0, DateTimeKind.Utc);
        }

        string[] formats =
        [
            "d-MMM-yy", "d-MMM.-yy", "dd-MMM-yy", "dd-MMM.-yy",
            "d/M/yyyy", "dd/MM/yyyy", "yyyy-MM-dd", "d-M-yyyy"
        ];
        var normalized = s.Replace("ago.", "ago").Replace("sept.", "sep").Replace("jul.", "jul");
        if (DateTime.TryParseExact(normalized, formats, new CultureInfo("es-CO"), DateTimeStyles.AssumeUniversal, out var dt))
            return DateTime.SpecifyKind(dt.Date, DateTimeKind.Utc);
        if (DateTime.TryParse(s, new CultureInfo("es-CO"), DateTimeStyles.AssumeUniversal, out dt))
            return DateTime.SpecifyKind(dt.Date, DateTimeKind.Utc);
        return null;
    }

    private static int? MonthFromSpanish(string name)
    {
        var n = name.Trim().ToLowerInvariant();
        return n switch
        {
            "enero" => 1,
            "febrero" => 2,
            "marzo" => 3,
            "abril" => 4,
            "mayo" => 5,
            "junio" => 6,
            "julio" => 7,
            "agosto" or "ago" => 8,
            "septiembre" or "setiembre" or "sep" => 9,
            "octubre" or "oct" => 10,
            "noviembre" or "nov" => 11,
            "diciembre" or "dic" => 12,
            _ => null
        };
    }
}