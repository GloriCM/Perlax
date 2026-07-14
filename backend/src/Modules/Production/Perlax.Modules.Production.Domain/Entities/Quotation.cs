namespace Perlax.Modules.Production.Domain.Entities;

public class Quotation
{
    public Guid Id { get; set; }
    public string QuoteNumber { get; set; } = string.Empty;
    public string SourceType { get; set; } = "Manual"; // Manual | FromOT
    public string ProductType { get; set; } = "Caja"; // Caja | Bolsa
    public Guid? ProductionOrderId { get; set; }
    public string? ProductionOrderNumber { get; set; }
    public string ClientName { get; set; } = string.Empty;
    public string? ProspectClientName { get; set; }
    public string SellerName { get; set; } = string.Empty;
    public string WorkName { get; set; } = string.Empty;
    public string PartName { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public DateTime RequestDate { get; set; } = DateTime.UtcNow;
    public string FreightType { get; set; } = "Local"; // SinFlete | Local | Nacional
    public string QuantitiesJson { get; set; } = "[5000,10000,20000,50000,100000]";
    /// <summary>Índice 0-4 de la cantidad cotizada principal (para PDF).</summary>
    public int PrimaryQuantityIndex { get; set; }
    public string FormDataJson { get; set; } = "{}";
    public string? CalculationResultJson { get; set; }
    public string TabsDataJson { get; set; } = "{}";
    public string? CostValidationJson { get; set; }
    public string? SelectedPriceTier { get; set; } // Al1_5 | Al3 | Al5
    public decimal? SelectedUnitPrice { get; set; }
    public string DeliveryConditions { get; set; } = "Esta propuesta es válida por 30 días a partir de la fecha de emisión.";
    public string PriceConditions { get; set; } = "Los precios están sujetos a cambios según disponibilidad de materiales y confirmación de especificaciones finales.";
    public string Status { get; set; } = "Draft"; // Draft | Calculated | Finalized
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }
}

