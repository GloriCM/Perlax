using Perlax.Modules.Production.Application.Customers;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Infrastructure.Services;

/// <summary>Enlaza CustomerId al crear/actualizar OT vía maestro de clientes.</summary>
public static class ProductionOrderCustomerLink
{
    public static async Task ApplyAsync(ProductionOrder order, ICustomerService customers, string userName, CancellationToken ct)
    {
        var customer = await customers.EnsureByNameAsync(order.Cliente, userName, ct);
        order.CustomerId = customer.Id;
        order.Cliente = customer.Name;
    }
}
