using Perlax.Modules.Production.Application.Manufacturing;

namespace Perlax.Modules.Production.Application.Manufacturing;

public interface IManufacturingOrderSyncService
{
    Task EnsureApprovedOrdersSyncedAsync(CancellationToken ct = default);
    Task SyncForCustomerOrderAsync(Guid customerOrderId, string? userName = null, CancellationToken ct = default);
}