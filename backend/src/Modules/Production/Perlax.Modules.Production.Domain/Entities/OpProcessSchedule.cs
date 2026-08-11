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
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }

    public ManufacturingOrder? ManufacturingOrder { get; set; }
}