namespace Perlax.Modules.Production.Domain.Entities;

public class CustomerOrderItem
{
    public Guid Id { get; set; }
    public Guid CustomerOrderId { get; set; }
    public Guid OrderPartId { get; set; }
    public decimal Quantity { get; set; }
    public decimal ApprovedUnitPrice { get; set; }
    public string ProductName { get; set; } = string.Empty;
    public string ReferenceName { get; set; } = string.Empty;

    public CustomerOrder? CustomerOrder { get; set; }
}
