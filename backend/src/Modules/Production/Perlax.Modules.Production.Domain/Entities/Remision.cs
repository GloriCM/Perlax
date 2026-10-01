namespace Perlax.Modules.Production.Domain.Entities;

public static class RemisionStatuses
{
    public const string Draft = "Borrador";
    public const string Confirmed = "Confirmada";
    public const string Cancelled = "Anulada";
}

public class Remision
{
    public Guid Id { get; set; }
    public string RemisionNumber { get; set; } = string.Empty;
    public Guid CustomerOrderId { get; set; }
    public string CustomerOrderNumber { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public DateTime RemisionDate { get; set; } = DateTime.UtcNow;
    public string Status { get; set; } = RemisionStatuses.Confirmed;
    public string? Notes { get; set; }
    public bool HasTransport { get; set; }
    public string? TransportCarrier { get; set; }
    public string? TransportPlate { get; set; }
    public string? TransportDriver { get; set; }
    public decimal TransportCost { get; set; }
    public string? TransportNotes { get; set; }
    public Guid? InvoiceId { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }

    public CustomerOrder? CustomerOrder { get; set; }
    public ICollection<RemisionItem> Items { get; set; } = new List<RemisionItem>();
}

public class RemisionItem
{
    public Guid Id { get; set; }
    public Guid RemisionId { get; set; }
    public Guid CustomerOrderItemId { get; set; }
    public Guid? ManufacturingOrderId { get; set; }
    public Guid OrderPartId { get; set; }
    public Guid ProductionOrderId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ReferenceName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public string? DispatchNotes { get; set; }
    public bool IsFinalDispatch { get; set; }
    public string? FinalDispatchCode { get; set; }

    public Remision? Remision { get; set; }
}
