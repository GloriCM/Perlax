namespace Perlax.Modules.Almacen.Application.Abstractions;

/// <summary>
/// Puerto hacia el libro de saldos de Producción.
/// La implementación vive en el Host para no acoplar los DbContext.
/// </summary>
public interface IWarehouseStockEntry
{
    Task RegisterEntryAsync(string productName, Guid? productId, decimal quantity, decimal unitCost, string? reference, string userName, CancellationToken ct = default);
}
