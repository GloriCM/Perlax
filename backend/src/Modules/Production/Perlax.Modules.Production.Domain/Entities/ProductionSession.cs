namespace Perlax.Modules.Production.Domain.Entities;

public static class ProductionSessionStatuses
{
    public const string Live = "live";
    public const string Paused = "paused";
    public const string Finished = "finished";
}

public static class ProductionSessionSources
{
    public const string Planta = "planta";
    public const string ReporteDiario = "reporte-diario";
}

public class ProductionSession
{
    public Guid Id { get; set; }
    public DateOnly OperationalDate { get; set; }
    public Guid MachineId { get; set; }
    public string MachineCodeSnapshot { get; set; } = string.Empty;
    public string MachineNameSnapshot { get; set; } = string.Empty;
    public Guid OperatorId { get; set; }
    public string OperatorCodeSnapshot { get; set; } = string.Empty;
    public string OperatorNameSnapshot { get; set; } = string.Empty;
    public Guid ShiftId { get; set; }
    public string ShiftCodeSnapshot { get; set; } = string.Empty;
    public string Status { get; set; } = ProductionSessionStatuses.Live;
    public string Source { get; set; } = ProductionSessionSources.Planta;
    public int? MetaTiros { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public DateTime? PausedAt { get; set; }
    public int PausedSecondsAccumulated { get; set; }
    public Guid? CurrentActivityId { get; set; }
    public string? CurrentActivityCode { get; set; }
    public string? CurrentActivityName { get; set; }
    public string? CurrentOp { get; set; }
    public string? IdempotencyKey { get; set; }
    /// <summary>Stamp de concurrencia optimista (incrementado en cada actualización).</summary>
    public long ConcurrencyStamp { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }

    public ProductionMachine? Machine { get; set; }
    public ProductionOperator? Operator { get; set; }
    public ProductionShift? Shift { get; set; }
    public ICollection<ProductionActivity> Activities { get; set; } = new List<ProductionActivity>();
}
