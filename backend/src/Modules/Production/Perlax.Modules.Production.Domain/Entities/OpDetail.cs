namespace Perlax.Modules.Production.Domain.Entities;

public class OpMaterialLine
{
    public Guid Id { get; set; }
    public Guid ManufacturingOrderId { get; set; }
    public string PartName { get; set; } = string.Empty;
    public string Category { get; set; } = "MateriaPrima";
    public Guid? ProductId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public string Unit { get; set; } = "UND";
    public decimal UnitCost { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }

    public ManufacturingOrder? ManufacturingOrder { get; set; }
}

public class OpLaborProcess
{
    public Guid Id { get; set; }
    public Guid ManufacturingOrderId { get; set; }
    public string PartName { get; set; } = string.Empty;
    public string WorkStation { get; set; } = string.Empty;
    public string? Observations { get; set; }
    public decimal Quantity { get; set; }
    public decimal? RollWidth { get; set; }
    public decimal? CutLength { get; set; }
    public decimal? SheetWidth { get; set; }
    public decimal? SheetLength { get; set; }
    public decimal? Cabida { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }

    public ManufacturingOrder? ManufacturingOrder { get; set; }
}

public class OpExternalWorkshop
{
    public Guid Id { get; set; }
    public Guid ManufacturingOrderId { get; set; }
    public string WorkshopName { get; set; } = string.Empty;
    public string WorkType { get; set; } = string.Empty;
    public DateTime? DeliveryToWorkshopDate { get; set; }
    public decimal QuantityDelivered { get; set; }
    public decimal Fajado { get; set; }
    public decimal Estresado { get; set; }
    public decimal Empacado { get; set; }
    public decimal UnitPrice { get; set; }
    public string? Observations { get; set; }
    public DateTime? ReturnDate { get; set; }
    public decimal? ReturnQuantity { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }

    public ManufacturingOrder? ManufacturingOrder { get; set; }
}
