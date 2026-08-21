namespace Perlax.Modules.Production.Domain.Entities;

public static class ProductionActivityStatuses
{
    public const string Running = "running";
    public const string Done = "done";
}

public class ProductionActivity
{
    public Guid Id { get; set; }
    public Guid SessionId { get; set; }
    public int Sequence { get; set; }
    public DateOnly OperationalDate { get; set; }
    public Guid ActivityCodeId { get; set; }
    public string ActivityCodeSnapshot { get; set; } = string.Empty;
    public string ActivityNameSnapshot { get; set; } = string.Empty;
    public Guid? SubcodeId { get; set; }
    public string? SubcodeSnapshot { get; set; }
    public string? SubcodeDetailSnapshot { get; set; }
    public Guid? ProductionOrderId { get; set; }
    public string? ProductionOrderNumber { get; set; }
    public DateTime StartAt { get; set; }
    public DateTime? EndAt { get; set; }
    public int? DurationSeconds { get; set; }
    public decimal QuantityProcessed { get; set; }
    public decimal Waste { get; set; }
    public string? Observations { get; set; }
    public string Status { get; set; } = ProductionActivityStatuses.Running;
    public string? IdempotencyKey { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }

    public ProductionSession? Session { get; set; }
    public ProductionActivityCode? ActivityCode { get; set; }
    public ProductionActivitySubcode? Subcode { get; set; }
    public ProductionOrder? ProductionOrder { get; set; }
    public ICollection<ProductionWasteEntry> WasteEntries { get; set; } = new List<ProductionWasteEntry>();
}

public class ProductionWasteEntry
{
    public Guid Id { get; set; }
    public Guid ActivityId { get; set; }
    public Guid? WasteReasonId { get; set; }
    public string ReasonCodeSnapshot { get; set; } = string.Empty;
    public string ReasonNameSnapshot { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string? Observations { get; set; }

    public ProductionActivity? Activity { get; set; }
    public ProductionWasteReason? WasteReason { get; set; }
}
