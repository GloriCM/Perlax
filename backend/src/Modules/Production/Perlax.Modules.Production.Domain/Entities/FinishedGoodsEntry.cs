namespace Perlax.Modules.Production.Domain.Entities;

/// <summary>
/// Entrada de producto terminado a stock (cuando se produce y no se despacha de inmediato).
/// El saldo PT = sum(entries) - sum(remisionado).
/// </summary>
public class FinishedGoodsEntry
{
    public Guid Id { get; set; }
    public Guid ManufacturingOrderId { get; set; }
    public DateTime EntryDate { get; set; } = DateTime.UtcNow;
    public decimal Quantity { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }

    public ManufacturingOrder? ManufacturingOrder { get; set; }
}
