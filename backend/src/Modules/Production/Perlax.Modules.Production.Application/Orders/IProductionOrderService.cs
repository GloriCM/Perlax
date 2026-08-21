using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Application.Orders;

public record OtDesignSummaryDto(string OtNumber, string ProductName, DateTime CreatedAt);

public record OtAttachmentDto(
    string Kind,
    string Category,
    string StoredFileName,
    string OriginalFileName,
    string RelativePath,
    string PublicUrl,
    string? ContentType,
    long SizeBytes,
    DateTime UploadedAtUtc);

public record OtUploadFileDto(string FileName, string? ContentType, long Length, Stream Content);

public record UploadAttachmentsResultDto(int AddedCount, IReadOnlyList<OtAttachmentDto> Files);

public record UpdatePartDesignPlanCommand(string? Prioridad, string? Disenador);

public record ReusableOrderSummaryDto(
    Guid Id,
    string OtNumber,
    string Cliente,
    string ProductName,
    string Asignacion,
    int PartsCount,
    bool HasApprovedFicha,
    string? LastOpNumber,
    DateTime CreatedAt);

public record CloneOtTemplateDto(
    Guid SourceOrderId,
    string SourceOtNumber,
    string? LastOpNumber,
    ProductionOrder Draft);


public record PartDesignPlanResultDto(Guid Id, string? Prioridad, string? Disenador);

public interface IProductionOrderService
{
    Task<IReadOnlyList<ProductionOrder>> ListAsync(CancellationToken ct = default);
    Task<ProductionOrder> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<ProductionOrder> CreateAsync(ProductionOrder order, string userName, CancellationToken ct = default);
    Task<ProductionOrder> UpdateAsync(Guid id, ProductionOrder request, string userName, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
    Task<bool> ExistsDuplicateAsync(string cliente, string productName, CancellationToken ct = default);
    Task<IReadOnlyList<OtDesignSummaryDto>> GetDesignsByClientAsync(string cliente, CancellationToken ct = default);
    Task<string> GetNextNumberAsync(CancellationToken ct = default);
    Task<IReadOnlyList<string>> GetClientSuggestionsAsync(string? q = null, int limit = 30, CancellationToken ct = default);
    Task<IReadOnlyList<ReusableOrderSummaryDto>> SearchReusableAsync(string? q, int limit = 30, CancellationToken ct = default);
    Task<CloneOtTemplateDto> GetCloneTemplateAsync(Guid sourceOrderId, CancellationToken ct = default);
    Task<UploadAttachmentsResultDto> UploadAttachmentsAsync(
        Guid orderId,
        Guid partId,
        string category,
        string uploadsRoot,
        IReadOnlyList<OtUploadFileDto> files,
        string userName,
        CancellationToken ct = default);
    Task DeleteAttachmentAsync(Guid orderId, Guid partId, string publicUrl, string uploadsRoot, string userName, CancellationToken ct = default);
    Task<PartDesignPlanResultDto> UpdatePartDesignPlanAsync(
        Guid orderId,
        Guid partId,
        UpdatePartDesignPlanCommand command,
        string userName,
        CancellationToken ct = default);
}