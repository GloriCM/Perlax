namespace Perlax.Modules.Production.Application.DailyProduction;

public interface IDailyProductionService
{
    Task<DailyReportCatalogsDto> GetCatalogsAsync(CancellationToken ct = default);
    Task<DailyReportCatalogsDto> GetPlantaCatalogsAsync(CancellationToken ct = default);

    Task<IReadOnlyList<MachineDto>> ListMachinesAsync(bool includeInactive = false, CancellationToken ct = default);
    Task<MachineDto> UpsertMachineAsync(Guid? id, UpsertMachineRequest request, string actor, CancellationToken ct = default);
    Task DeleteMachineAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<OperatorDto>> ListOperatorsAsync(bool includeInactive = false, CancellationToken ct = default);
    Task<OperatorDto> UpsertOperatorAsync(Guid? id, UpsertOperatorRequest request, string actor, CancellationToken ct = default);
    Task DeleteOperatorAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<ActivityCodeDto>> ListActivityCodesAsync(bool includeInactive = false, CancellationToken ct = default);
    Task<ActivityCodeDto> UpsertActivityCodeAsync(Guid? id, UpsertActivityCodeRequest request, string actor, CancellationToken ct = default);
    Task DeleteActivityCodeAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<OrderLookupDto>> LookupOrdersAsync(string? query, int take = 50, CancellationToken ct = default);

    Task<IReadOnlyList<SessionDto>> ListSessionsAsync(DateOnly? date, string? status, Guid? machineId, Guid? operatorId, CancellationToken ct = default);
    Task<IReadOnlyList<ActivityDto>> ListActivitiesAsync(DateOnly? date, Guid? machineId, Guid? operatorId, string? source, bool finishedOnly, CancellationToken ct = default);

    Task<SessionDto> StartSessionAsync(StartSessionRequest request, string actor, CancellationToken ct = default);
    Task<SessionDto> PauseSessionAsync(Guid sessionId, string actor, CancellationToken ct = default);
    Task<SessionDto> ResumeSessionAsync(Guid sessionId, string actor, CancellationToken ct = default);
    Task<SessionDto> FinishSessionAsync(Guid sessionId, string actor, CancellationToken ct = default);

    Task<ActivityDto> StartActivityAsync(Guid sessionId, StartActivityRequest request, string actor, CancellationToken ct = default);
    Task<ActivityDto> FinishActivityAsync(Guid activityId, FinishActivityRequest request, string actor, CancellationToken ct = default);

    Task<IReadOnlyList<DailyReportListItemDto>> ListDailyReportsAsync(DateOnly? from, DateOnly? to, string? operatorName, CancellationToken ct = default);
    Task<DailyReportDetailDto?> GetDailyReportAsync(Guid operatorId, DateOnly processDate, string shiftCode, CancellationToken ct = default);
    Task<IReadOnlyList<DailyReportDetailDto>> SaveManualBatchAsync(SaveManualBatchRequest request, string actor, CancellationToken ct = default);

    Task<byte[]> ExportExcelAsync(DateOnly date, string groupBy, Guid? operatorId, Guid? machineId, CancellationToken ct = default);
    Task<ImportLocalResult> ImportLocalAsync(ImportLocalPayload payload, string actor, CancellationToken ct = default);
}
