namespace Perlax.Modules.Production.Domain.Entities;

public static class SalesInvoiceStatuses
{
    public const string Active = "Activa";
    public const string Voided = "Anulada";
}

public class SalesInvoice
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string? LegacyInvoiceNumber { get; set; }
    public Guid RemisionId { get; set; }
    public string RemisionNumber { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public DateTime InvoiceDate { get; set; } = DateTime.UtcNow;
    public DateTime? DueDate { get; set; }
    public string Status { get; set; } = SalesInvoiceStatuses.Active;
    public string? Notes { get; set; }
    public decimal Subtotal { get; set; }
    public decimal TaxAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal TaxRate { get; set; } = 19m;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public DateTime? VoidedAt { get; set; }
    public string? VoidedBy { get; set; }

    public Remision? Remision { get; set; }
    public ICollection<SalesInvoiceItem> Items { get; set; } = new List<SalesInvoiceItem>();
}

public class SalesInvoiceItem
{
    public Guid Id { get; set; }
    public Guid SalesInvoiceId { get; set; }
    public Guid RemisionItemId { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ReferenceName { get; set; } = string.Empty;
    public decimal Quantity { get; set; }
    public decimal UnitPrice { get; set; }
    public decimal LineTotal { get; set; }

    public SalesInvoice? SalesInvoice { get; set; }
}
