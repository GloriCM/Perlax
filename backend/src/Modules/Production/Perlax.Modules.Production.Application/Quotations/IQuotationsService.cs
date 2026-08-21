using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Application.Quotations;

public record QuotationOtOptionDto(Guid Id, string OtNumber, string Cliente, string ProductName, DateTime CreatedAt);

public record SaveQuotationCommand(
    string SourceType,
    Guid? ProductionOrderId,
    string? ProductionOrderNumber,
    string ClientName,
    string? ProspectClientName,
    string ProductName,
    DateTime? RequestDate,
    string FreightType,
    IReadOnlyList<int> Quantities,
    string? TabsDataJson,
    string? DeliveryConditions,
    string? PriceConditions);

public record ValidateCostsCommand(
    IReadOnlyList<int> Quantities,
    string FreightType,
    decimal MaterialCost,
    decimal PrintCost,
    decimal FinishingCost,
    decimal HandleCost,
    decimal WindowCost,
    decimal ProcessCost,
    decimal WorkshopCost,
    decimal OverheadPercent);

public record SelectPriceCommand(
    string SelectedPriceTier,
    decimal SelectedUnitPrice,
    string? DeliveryConditions,
    string? PriceConditions);

public interface IQuotationsService
{
    Task<IReadOnlyList<QuotationOtOptionDto>> GetOrdersForQuotationAsync(CancellationToken ct = default);
    Task<IReadOnlyList<Quotation>> ListAsync(CancellationToken ct = default);
    Task<Quotation> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<Quotation> CreateAsync(SaveQuotationCommand command, string userName, CancellationToken ct = default);
    Task<Quotation> UpdateAsync(Guid id, SaveQuotationCommand command, string userName, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    object ValidateCosts(ValidateCostsCommand command);
    Task<Quotation> SelectPriceAsync(Guid id, SelectPriceCommand command, string userName, CancellationToken ct = default);
}