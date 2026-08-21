using System;
using System.IO;
using System.Linq;
using System.Text;
using UglyToad.PdfPig;

static void Dump(string path, string outPath)
{
    using var doc = PdfDocument.Open(path);
    var sb = new StringBuilder();
    foreach (var page in doc.GetPages())
    {
        sb.AppendLine($"=== PAGE {page.Number} w={page.Width} h={page.Height} ===");
        var words = page.GetWords().OrderByDescending(w => w.BoundingBox.Bottom).ThenBy(w => w.BoundingBox.Left).ToList();
        double? lastY = null;
        var line = new StringBuilder();
        foreach (var w in words)
        {
            var y = Math.Round(w.BoundingBox.Bottom, 0);
            if (lastY != null && Math.Abs(y - lastY.Value) > 3)
            {
                sb.AppendLine(line.ToString().Trim());
                line.Clear();
            }
            line.Append(w.Text).Append(' ');
            lastY = y;
        }
        if (line.Length > 0) sb.AppendLine(line.ToString().Trim());
        sb.AppendLine();
        sb.AppendLine("--- RAW WORDS (x,y,text) ---");
        foreach (var w in words.Take(400))
            sb.AppendLine($"{w.BoundingBox.Left:0.0}\t{w.BoundingBox.Bottom:0.0}\t{w.Text}");
    }
    File.WriteAllText(outPath, sb.ToString(), Encoding.UTF8);
}

Dump(@"G:\github\Perlax\backend\src\Host\Perlax.Web\wwwroot\uploads\OTS\existente\viernes\20260813205210_1_ficha_f7858.pdf", @"G:\github\Perlax\backend\tmp-pdf-extract\ficha.txt");
Dump(@"G:\github\Perlax\backend\src\Host\Perlax.Web\wwwroot\uploads\OTS\existente\viernes\20260813205210_2_op_o7858.pdf", @"G:\github\Perlax\backend\tmp-pdf-extract\op.txt");
Console.WriteLine("ok");
