namespace Perlax.Modules.Production.Domain.Entities;

public static class OpScheduleBlockTypes
{
    public const string Op = "Op";
    public const string Capacitacion = "Capacitacion";
    public const string Limpieza = "Limpieza";
}

public static class OpScheduleStatuses
{
    public const string Scheduled = "Programado";
    public const string InProgress = "EnProceso";
    public const string Done = "Hecho";
    public const string Cancelled = "Cancelado";
}

public static class ProductionProcessCatalog
{
    public sealed record ProcessEntry(string Code, string Label, int SortOrder);

    public static readonly ProcessEntry[] All =
    [
        new("Conversion", "Conversion", 1),
        new("Corrugacion", "Corrugacion", 2),
        new("Corte", "Corte", 3),
        new("Impresion", "Impresion", 4),
        new("Acabado", "Acabado", 5),
        new("Colaminado", "Colaminado", 6),
        new("Troquelado", "Troquelado", 7),
        new("Despique", "Despique", 8),
        new("Pegadora", "Pegadora", 9),
        new("TerminadoManual", "Terminado Manual", 10),
    ];
}

/// <summary>
/// Mapea máquinas/notas de OP expertiS (Guillotina, SpeedMaster, Pegadora…) al catálogo del programador.
/// </summary>
public static class ExpertisProcessCatalogMapper
{
    public static string? MapToCatalogCode(string? machine, string? notes = null)
    {
        var t = $"{machine} {notes}".ToUpperInvariant();
        if (string.IsNullOrWhiteSpace(t)) return null;
        if (t.Contains("CONVERT", StringComparison.Ordinal) || t.Contains("CONVERSI", StringComparison.Ordinal))
            return "Conversion";
        if (t.Contains("CORRUG", StringComparison.Ordinal))
            return "Corrugacion";
        if (t.Contains("GUILLOT", StringComparison.Ordinal) || t.Contains("REFILAR", StringComparison.Ordinal)
            || RegexContainsCorte(t))
            return "Corte";
        if (t.Contains("SPEED", StringComparison.Ordinal) || t.Contains("IMPRE", StringComparison.Ordinal)
            || t.Contains("C+M+Y", StringComparison.Ordinal))
            return "Impresion";
        if (t.Contains("COLAMIN", StringComparison.Ordinal))
            return "Colaminado";
        if (t.Contains("TROQUEL", StringComparison.Ordinal))
            return "Troquelado";
        if (t.Contains("DESPIQ", StringComparison.Ordinal))
            return "Despique";
        if (t.Contains("PEGAD", StringComparison.Ordinal) || t.Contains("PEGAR", StringComparison.Ordinal))
            return "Pegadora";
        if (t.Contains("MANUAL", StringComparison.Ordinal) || t.Contains("ARMAR", StringComparison.Ordinal))
            return "TerminadoManual";
        if (t.Contains("BARNIZ", StringComparison.Ordinal) || t.Contains("LAMIN", StringComparison.Ordinal))
            return "Acabado";
        return null;
    }

    private static bool RegexContainsCorte(string t) =>
        t.Contains(" CORTE", StringComparison.Ordinal) || t.StartsWith("CORTE", StringComparison.Ordinal);
}

public class OpProcessSchedule
{
    public Guid Id { get; set; }
    public Guid? ManufacturingOrderId { get; set; }
    public string ProcessCode { get; set; } = string.Empty;
    public Guid? MachineId { get; set; }
    public string BlockType { get; set; } = OpScheduleBlockTypes.Op;
    public DateTime PlannedStart { get; set; }
    public DateTime PlannedEnd { get; set; }
    public string Status { get; set; } = OpScheduleStatuses.Scheduled;
    public int SortOrder { get; set; }
    public bool IsUrgency { get; set; }
    public decimal? EstimatedHours { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }

    public ManufacturingOrder? ManufacturingOrder { get; set; }
}