namespace Perlax.Modules.Production.Domain.Entities;

public static class CustomerOrderStatuses
{
    public const string Pending = "Pendiente";
    public const string Approved = "Aprobado";
}

public class CustomerOrder
{
    public Guid Id { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public DateTime OrderDate { get; set; } = DateTime.UtcNow;
    public string ClientName { get; set; } = string.Empty;
    public string PurchaseOrderNumber { get; set; } = string.Empty;
    public DateTime? AgreedDeliveryDate { get; set; }
    public string Status { get; set; } = CustomerOrderStatuses.Pending;
    public bool IsApproved { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public string? ApprovedBy { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }

    public ICollection<CustomerOrderItem> Items { get; set; } = new List<CustomerOrderItem>();
}
