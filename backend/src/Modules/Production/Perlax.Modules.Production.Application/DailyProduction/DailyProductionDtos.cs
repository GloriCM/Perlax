namespace Perlax.Modules.Production.Application.DailyProduction;

public record MachineDto(Guid Id, string Code, string Name, bool IsActive);
public record OperatorDto(Guid Id, string Code, string DisplayName, string? DocumentNumber, Guid? UserId, bool IsActive);
public record ActivitySubcodeDto(Guid Id, string Code, string Name, bool RequiresObservation, bool IsActive);
public record ActivityCodeDto(
    Guid Id,
    string Code,
    string Name,
    bool RequiresOrder,
    bool AllowsProductionQty,
    bool IsActive,
    IReadOnlyList<ActivitySubcodeDto> Subcodes);
public record ShiftDto(Guid Id, string Code, string Name, string StartTime, string EndTime, bool CrossesMidnight);
public record WasteReasonDto(Guid Id, string Code, string Name, bool RequiresObservation, bool IsActive);
public record OrderLookupDto(Guid Id, string OtNumber, string ClientName, string ProductName);

public record DailyReportCatalogsDto(
    IReadOnlyList<MachineDto> Machines,
    IReadOnlyList<OperatorDto> Operators,
    IReadOnlyList<ActivityCodeDto> ProcessCodes,
    IReadOnlyList<ShiftDto> Shifts,
    IReadOnlyList<WasteReasonDto> WasteReasons,
    IReadOnlyList<string> OrderNumbers);

public record WasteEntryDto(Guid? WasteReasonId, string? ReasonCode, string? ReasonName, decimal Quantity, string? Observations);

public record ActivityDto(
    Guid Id,
    Guid SessionId,
    int Sequence,
    DateOnly OperationalDate,
    Guid ActivityCodeId,
    string ActivityCode,
    string ActivityName,
    Guid? SubcodeId,
    string? Subcode,
    string? SubcodeDetail,
    Guid? ProductionOrderId,
    string? ProductionOrderNumber,
    DateTime StartAt,
    DateTime? EndAt,
    int? DurationSeconds,
    decimal QuantityProcessed,
    decimal Waste,
    string? Observations,
    string Status,
    string Source,
    Guid MachineId,
    string MachineName,
    Guid OperatorId,
    string OperatorName,
    string ShiftCode,
    IReadOnlyList<WasteEntryDto> WasteEntries);

public record SessionDto(
    Guid Id,
    DateOnly OperationalDate,
    Guid MachineId,
    string MachineCode,
    string MachineName,
    Guid OperatorId,
    string OperatorCode,
    string OperatorName,
    Guid ShiftId,
    string ShiftCode,
    string Status,
    string Source,
    int? MetaTiros,
    DateTime StartedAt,
    DateTime? EndedAt,
    DateTime? PausedAt,
    int PausedSecondsAccumulated,
    Guid? CurrentActivityId,
    string? CurrentActivityCode,
    string? CurrentActivityName,
    string? CurrentOp,
    long ConcurrencyStamp,
    IReadOnlyList<ActivityDto> Activities);

public record DailyReportListItemDto(
    Guid Id,
    DateOnly ProcessDate,
    Guid OperatorId,
    string OperatorName,
    string ShiftCode,
    int ProcessCount,
    decimal TotalHours,
    decimal TotalQuantityProcessed,
    decimal TotalWaste,
    DateTime CreatedAt,
    DateTime? UpdatedAt);

public record DailyReportDetailDto(
    Guid Id,
    DateOnly ProcessDate,
    Guid OperatorId,
    string OperatorName,
    string ShiftCode,
    DateTime CreatedAt,
    DateTime? UpdatedAt,
    IReadOnlyList<ActivityDto> Processes);

public record SaveManualProcessRequest(
    Guid? MachineId,
    string? MachineName,
    Guid? ActivityCodeId,
    string? ActivityCode,
    Guid? SubcodeId,
    string? Subcode,
    string? ProductionOrderNumber,
    DateTime StartAt,
    DateTime EndAt,
    decimal QuantityProcessed,
    decimal Waste,
    string? Observations,
    IReadOnlyList<WasteEntryDto>? WasteEntries);

public record SaveManualReportRequest(
    DateOnly ProcessDate,
    Guid? OperatorId,
    string? OperatorName,
    string ShiftCode,
    string? IdempotencyKey,
    IReadOnlyList<SaveManualProcessRequest> Processes);

public record SaveManualBatchRequest(
    DateOnly ProcessDate,
    string ShiftCode,
    string? IdempotencyKey,
    IReadOnlyList<SaveManualReportRequest> Reports);

public record StartSessionRequest(
    Guid MachineId,
    Guid OperatorId,
    string ShiftCode,
    int? MetaTiros,
    string? IdempotencyKey);

public record StartActivityRequest(
    Guid ActivityCodeId,
    Guid? SubcodeId,
    string? ProductionOrderNumber,
    DateTime? StartAt,
    string? Observations,
    string? IdempotencyKey);

public record FinishActivityRequest(
    DateTime? EndAt,
    decimal QuantityProcessed,
    decimal Waste,
    string? Observations,
    IReadOnlyList<WasteEntryDto>? WasteEntries,
    long? ConcurrencyStamp);

public record UpsertMachineRequest(string Code, string Name, bool IsActive = true);
public record UpsertOperatorRequest(string Code, string DisplayName, string? DocumentNumber, Guid? UserId, bool IsActive = true);
public record UpsertActivitySubcodeRequest(string Code, string Name, bool RequiresObservation = false, bool IsActive = true);
public record UpsertActivityCodeRequest(
    string Code,
    string Name,
    bool RequiresOrder = false,
    bool AllowsProductionQty = false,
    bool IsActive = true,
    IReadOnlyList<UpsertActivitySubcodeRequest>? Subcodes = null);

public record ImportLocalPayload(
    IReadOnlyList<ImportLocalMachine>? Machines,
    IReadOnlyList<ImportLocalOperator>? Operators,
    IReadOnlyList<ImportLocalSession>? Sessions,
    IReadOnlyList<ImportLocalActivity>? Activities);

public record ImportLocalMachine(string Code, string Name);
public record ImportLocalOperator(string Code, string DisplayName);
public record ImportLocalSession(
    string LocalId,
    DateOnly OperationalDate,
    string MachineCode,
    string MachineName,
    string OperatorCode,
    string OperatorName,
    string ShiftCode,
    string Status,
    string Source,
    DateTime StartedAt,
    DateTime? EndedAt,
    string? CurrentActivityCode,
    string? CurrentOp);

public record ImportLocalActivity(
    string LocalId,
    string SessionLocalId,
    DateOnly OperationalDate,
    string ActivityCode,
    string ActivityName,
    string? Subcode,
    string? SubcodeDetail,
    string? ProductionOrderNumber,
    DateTime StartAt,
    DateTime? EndAt,
    decimal QuantityProcessed,
    decimal Waste,
    string? Observations,
    string Status);

public record ImportLocalResult(
    int MachinesCreated,
    int OperatorsCreated,
    int SessionsCreated,
    int ActivitiesCreated,
    IReadOnlyList<string> Warnings);
