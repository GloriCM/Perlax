using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Application.Cotizador;

public interface ICotizadorService
{
    Task<CotizadorCalculateResponse> CalculateAsync(CotizadorCalculateRequest request, CancellationToken ct = default);

    Task<IReadOnlyList<CotizadorMaterialOptionDto>> GetActiveMaterialsAsync(CancellationToken ct = default);
    Task<IReadOnlyList<CotizadorMachineOptionDto>> GetActivePrintersAsync(CancellationToken ct = default);
    Task<IReadOnlyList<CotizadorPlanchaOptionDto>> GetActivePlanchasAsync(CancellationToken ct = default);
    Task<IReadOnlyList<CotizadorMicroOptionDto>> GetActiveMicroFlautasAsync(CancellationToken ct = default);
    Task<IReadOnlyList<CotizadorOrderForQuoteDto>> GetOrdersForQuoteAsync(CancellationToken ct = default);

    Task<IReadOnlyList<Quotation>> ListQuotationsAsync(CancellationToken ct = default);
    Task<Quotation> GetQuotationAsync(Guid id, CancellationToken ct = default);
    Task<Quotation> CreateQuotationAsync(CotizadorSaveCommand command, string userName, CancellationToken ct = default);
    Task<Quotation> UpdateQuotationAsync(Guid id, CotizadorSaveCommand command, string userName, CancellationToken ct = default);
    Task DeleteQuotationAsync(Guid id, CancellationToken ct = default);
    Task<ConvertQuoteToOtResultDto> ConvertToOtAsync(Guid id, string userName, CancellationToken ct = default);

    Task<IReadOnlyList<CotizadorMachine>> GetCatalogMachinesAsync(CancellationToken ct = default);
    Task<CotizadorMachine> CreateMachineAsync(CotizadorMachine item, CancellationToken ct = default);
    Task<CotizadorMachine> UpdateMachineAsync(Guid id, CotizadorMachine item, CancellationToken ct = default);
    Task DeleteMachineAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<CotizadorMaterial>> GetCatalogMaterialsAsync(CancellationToken ct = default);
    Task<CotizadorMaterial> CreateMaterialAsync(CotizadorMaterial item, CancellationToken ct = default);
    Task<CotizadorMaterial> UpdateMaterialAsync(Guid id, CotizadorMaterial item, CancellationToken ct = default);
    Task DeleteMaterialAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<CotizadorFactor>> GetFactorsAsync(CancellationToken ct = default);
    Task<CotizadorFactor> CreateFactorAsync(CotizadorFactor item, CancellationToken ct = default);
    Task<CotizadorFactor> UpdateFactorAsync(Guid id, CotizadorFactor item, CancellationToken ct = default);

    Task<IReadOnlyList<CotizadorMicroFlauta>> GetCatalogMicroFlautasAsync(CancellationToken ct = default);
    Task<CotizadorMicroFlauta> CreateMicroFlautaAsync(CotizadorMicroFlauta item, CancellationToken ct = default);
    Task<CotizadorMicroFlauta> UpdateMicroFlautaAsync(Guid id, CotizadorMicroFlauta item, CancellationToken ct = default);
    Task DeleteMicroFlautaAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<CotizadorPlancha>> GetCatalogPlanchasAsync(CancellationToken ct = default);
    Task<CotizadorPlancha> CreatePlanchaAsync(CotizadorPlancha item, CancellationToken ct = default);
    Task<CotizadorPlancha> UpdatePlanchaAsync(Guid id, CotizadorPlancha item, CancellationToken ct = default);
    Task DeletePlanchaAsync(Guid id, CancellationToken ct = default);
}