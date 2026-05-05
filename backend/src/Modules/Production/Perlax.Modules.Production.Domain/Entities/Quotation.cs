namespace Perlax.Modules.Production.Domain.Entities;

public class Quotation
{
    public Guid Id { get; set; }
    public string QuoteNumber { get; set; } = string.Empty;
    public string SourceType { get; set; } = "FromOT"; // FromOT | Manual
    public Guid? ProductionOrderId { get; set; }
    public string? ProductionOrderNumber { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string? ProspectClientName { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public DateTime RequestDate { get; set; } = DateTime.UtcNow;
    public string FreightType { get; set; } = "Local"; // Local | Nacional
    public string QuantitiesJson { get; set; } = "[1000,2000,3000,5000,10000]";
    public string TabsDataJson { get; set; } = "{}";
    public string? CostValidationJson { get; set; }
    public string? SelectedPriceTier { get; set; } // Bajo | Ideal | Optimo
    public decimal? SelectedUnitPrice { get; set; }
    public string DeliveryConditions { get; set; } = "Entrega sujeta a programación de producción.";
    public string PriceConditions { get; set; } = "Precios sujetos a cambios según especificaciones finales.";
    public string Status { get; set; } = "Draft"; // Draft | Validated | Finalized
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}
