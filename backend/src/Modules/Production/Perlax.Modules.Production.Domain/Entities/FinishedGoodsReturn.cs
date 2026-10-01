namespace Perlax.Modules.Production.Domain.Entities;

/// <summary>
/// Devolución de producto terminado desde el cliente (vuelve a stock PT).
/// Reduce el neto remisionado: Disponible = Producido − Remisionado + Devuelto.
/// </summary>
public class FinishedGoodsReturn
{
    public Guid Id { get; set; }
    public string ReturnNumber { get; set; } = string.Empty;
    public Guid ManufacturingOrderId { get; set; }
    public Guid? RemisionId { get; set; }
    public Guid? RemisionItemId { get; set; }
    public string OpNumber { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string ProductName { get; set; } = string.Empty;
    public string ReferenceName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public DateTime ReturnDate { get; set; } = DateTime.UtcNow;
    public string? Reason { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }

    public ManufacturingOrder? ManufacturingOrder { get; set; }
    public Remision? Remision { get; set; }
}
