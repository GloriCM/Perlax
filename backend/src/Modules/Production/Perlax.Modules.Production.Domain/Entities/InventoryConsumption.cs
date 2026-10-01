namespace Perlax.Modules.Production.Domain.Entities;

/// <summary>Salida / aplicación de materia prima contra una OP.</summary>
public class InventoryConsumption
{
    public Guid Id { get; set; }
    public string ApplicationNumber { get; set; } = string.Empty;
    public Guid ManufacturingOrderId { get; set; }
    public string OpNumber { get; set; } = string.Empty;
    public Guid? ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = "UND";
    public decimal UnitCost { get; set; }
    public string DeliveredTo { get; set; } = string.Empty;
    public DateTime ApplicationDate { get; set; } = DateTime.UtcNow;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }

    public ManufacturingOrder? ManufacturingOrder { get; set; }
}

public class WarehouseStockMovement
{
    public Guid Id { get; set; }
    public Guid? ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string MovementType { get; set; } = "Entrada"; // Entrada | Salida
    public decimal Quantity { get; set; }
    public decimal UnitCost { get; set; }
    public string? Reference { get; set; }
    public Guid? ManufacturingOrderId { get; set; }
    public Guid? ConsumptionId { get; set; }
    public DateTime MovementDate { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
}
