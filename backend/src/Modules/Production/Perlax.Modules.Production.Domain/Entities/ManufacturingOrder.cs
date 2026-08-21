namespace Perlax.Modules.Production.Domain.Entities;

/// <summary>
/// Orden de produccion (OP) generada desde un pedido de cliente.
/// Distinto de ProductionOrder, que en PerlaX es la OT de diseno.
/// </summary>
public class ManufacturingOrder
{
    public Guid Id { get; set; }
    public string OpNumber { get; set; } = string.Empty;
    public Guid CustomerOrderId { get; set; }
    public Guid OrderPartId { get; set; }
    public Guid ProductionOrderId { get; set; }
    public string OrderNumber { get; set; } = string.Empty;
    public string OtNumber { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string ReferenceName { get; set; } = string.Empty;
    public string PurchaseOrderNumber { get; set; } = string.Empty;
    public DateTime? AgreedDeliveryDate { get; set; }
    public decimal QuantityOrdered { get; set; }
    public decimal ReceiptPercentage { get; set; } = 10m;
    public decimal QuantityToProduce { get; set; }
    public decimal ApprovedUnitPrice { get; set; }
    public DateTime? OpeningDate { get; set; }
    public string Status { get; set; } = "PendienteApertura";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public string? OpenedBy { get; set; }

    public CustomerOrder? CustomerOrder { get; set; }
}