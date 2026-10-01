namespace Perlax.Modules.Production.Application.Customers;

public record CustomerDto(
    Guid Id,
    string Name,
    string? Nit,
    string? ContactName,
    string? Phone,
    string? Email,
    string? Address,
    decimal ReceiptPercentage,
    bool IsActive);

public record SaveCustomerCommand(
    string Name,
    string? Nit,
    string? ContactName,
    string? Phone,
    string? Email,
    string? Address,
    decimal ReceiptPercentage,
    bool IsActive = true);

public record CustomerSyncResultDto(int Created, int Linked, int TotalInMaster);

public interface ICustomerService
{
    Task<IReadOnlyList<CustomerDto>> ListAsync(string? q = null, bool onlyActive = true, CancellationToken ct = default);
    Task<CustomerDto> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<CustomerDto> CreateAsync(SaveCustomerCommand command, string userName, CancellationToken ct = default);
    Task UpdateAsync(Guid id, SaveCustomerCommand command, string userName, CancellationToken ct = default);
    Task DeactivateAsync(Guid id, string userName, CancellationToken ct = default);

    /// <summary>Obtiene o crea el cliente por razón social (canónico del maestro).</summary>
    Task<CustomerDto> EnsureByNameAsync(string name, string userName, CancellationToken ct = default);

    /// <summary>
    /// Importa nombres de cliente desde OT, pedidos, OP, remisiones y facturas al maestro
    /// y enlaza CustomerId donde falte.
    /// </summary>
    Task<CustomerSyncResultDto> SyncFromDocumentsAsync(string userName, CancellationToken ct = default);
}
