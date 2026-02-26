namespace Perlax.Modules.Production.Domain.Entities;

public class ProductionOrder
{
    public Guid Id { get; set; }
    public string ProductCode { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public int PlannedQuantity { get; set; }
    public int ProducedQuantity { get; set; }
    public DateTime ScheduledStart { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, InProgress, Completed, Cancelled
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
