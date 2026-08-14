namespace Perlax.Modules.Production.Application.Scheduling;

public record ScheduleProcessDto(Guid Id, string Code, string Label, int SortOrder, bool IsActive = true);

public record ScheduleBlockDto(
    Guid Id,
    Guid? ManufacturingOrderId,
    string ProcessCode,
    Guid? MachineId,
    string BlockType,
    DateTime PlannedStart,
    DateTime PlannedEnd,
    string Status,
    int SortOrder,
    bool IsUrgency,
    decimal? EstimatedHours,
    string? Notes,
    string? OpNumber,
    string? OtNumber,
    string? ClientName,
    string? ProductName,
    string? ReferenceName);

public record GanttWeekDto(int WeekIndex, string Label, int StartDay, int EndDay, string RangeLabel);

public record GanttMonthDto(
    int Year,
    int Month,
    DateTime MonthStart,
    DateTime MonthEnd,
    int DaysInMonth,
    IReadOnlyList<GanttWeekDto> Weeks,
    IReadOnlyList<ScheduleProcessDto> Processes,
    IReadOnlyList<ScheduleBlockDto> Blocks);

public record OpScheduleListGroupDto(
    Guid ManufacturingOrderId,
    string? OpNumber,
    string? OtNumber,
    string? ClientName,
    string? ProductName,
    string? ReferenceName,
    bool IsUrgency,
    string GeneralStatus,
    DateTime PlannedStart,
    DateTime PlannedEnd,
    int ProcessCount,
    IReadOnlyList<ScheduleBlockDto> Processes);

public record OpenOrderDto(
    Guid Id,
    string OpNumber,
    string OtNumber,
    string ClientName,
    string? ProductName,
    string? ReferenceName,
    decimal QuantityToProduce,
    bool HasSchedule);

public record SuggestedOpProcessDto(
    string ProcessCode,
    string Label,
    string? Machine,
    string? Notes,
    string? PartName = null);

public record OpenOrderPrefillDto(
    Guid Id,
    string OpNumber,
    string OtNumber,
    string ClientName,
    string? ProductName,
    string? ReferenceName,
    string? PurchaseOrderNumber,
    DateTime? AgreedDeliveryDate,
    decimal QuantityToProduce,
    decimal? ApprovedUnitPrice,
    string Status,
    IReadOnlyList<ScheduleBlockDto> ExistingProcesses,
    IReadOnlyList<SuggestedOpProcessDto> SuggestedProcesses);

public record UpsertScheduleBlockCommand(
    Guid? ManufacturingOrderId,
    string ProcessCode,
    Guid? MachineId,
    string? BlockType,
    DateTime PlannedStart,
    DateTime PlannedEnd,
    string? Status,
    int SortOrder,
    string? Notes,
    bool IsUrgency = false,
    decimal? EstimatedHours = null);

public record ProgramProcessCommand(
    string ProcessCode,
    Guid? MachineId,
    DateTime PlannedStart,
    DateTime PlannedEnd,
    int SortOrder,
    decimal? EstimatedHours,
    string? Notes);

public record ProgramOrderCommand(
    Guid ManufacturingOrderId,
    bool IsUrgency,
    IReadOnlyList<ProgramProcessCommand> Processes);

public record ProgramOrderResultDto(
    Guid ManufacturingOrderId,
    string OpNumber,
    bool IsUrgency,
    IReadOnlyList<ScheduleBlockDto> Processes);

public record UpsertProcessCommand(string Label, string? Code, int SortOrder, bool? IsActive);

public record UpsertShiftCommand(
    string Name,
    string? Code,
    TimeOnly StartTime,
    TimeOnly EndTime,
    bool CrossesMidnight,
    int SortOrder,
    bool? IsActive);

public record SchedulingMachineDto(Guid Id, string Code, string Name, string? ProcessCode);

public record ProductionShiftDto(
    Guid Id,
    string Code,
    string Name,
    TimeOnly StartTime,
    TimeOnly EndTime,
    bool CrossesMidnight,
    decimal Hours,
    int SortOrder = 0,
    bool IsActive = true);

public record MachineShiftItemDto(
    Guid ShiftId,
    string Code,
    string Name,
    TimeOnly StartTime,
    TimeOnly EndTime,
    bool IsEnabled,
    int SortOrder);

public record MachineShiftsDto(
    SchedulingMachineDto Machine,
    IReadOnlyList<MachineShiftItemDto> Shifts);

public record RosterDayDto(
    Guid? Id,
    int DayOfWeek,
    DateTime Date,
    Guid? ShiftId,
    string? ShiftLabel,
    bool IsOff,
    decimal Hours);

public record RosterRowDto(
    Guid Id,
    string RowKind,
    string ProcessCode,
    string ProcessLabel,
    Guid? MachineId,
    string? MachineName,
    string DisplayLabel,
    Guid? OperatorId,
    string? OperatorName,
    string? RoleTag,
    int SortOrder,
    IReadOnlyList<RosterDayDto> Days,
    decimal TotalHours,
    decimal OvertimeHours);

public record RosterWeekDto(DateTime WeekStart, DateTime WeekEnd, IReadOnlyList<RosterRowDto> Rows);

public record RosterDayCommand(int DayOfWeek, Guid? ShiftId, bool IsOff);

public record UpsertRosterRowCommand(
    DateTime WeekStart,
    string? ProcessCode,
    Guid? MachineId,
    Guid? OperatorId,
    string? RoleTag,
    IReadOnlyList<RosterDayCommand>? Days);

public record AvailableOperatorDto(
    Guid? OperatorId,
    string? OperatorName,
    string? RoleTag,
    Guid ShiftId,
    string ShiftName,
    string ShiftLabel,
    decimal Hours);

public record AvailableMachineBriefDto(Guid Id, string Code, string Name);

public record AvailableOperatorsDto(
    string ProcessCode,
    string ProcessLabel,
    DateTime Date,
    IReadOnlyList<AvailableMachineBriefDto> Machines,
    IReadOnlyList<AvailableOperatorDto> Operators);

public record CoverageShiftInfoDto(
    Guid ShiftId,
    string Code,
    string Name,
    TimeOnly StartTime,
    TimeOnly EndTime,
    string Label);

public record CoverageSlotAssignmentDto(
    Guid Id,
    Guid OperatorId,
    string? OperatorName,
    string RoleTag);

public record CoverageShiftSlotDto(
    Guid ShiftId,
    string Code,
    string Name,
    string Label,
    IReadOnlyList<CoverageSlotAssignmentDto> Assignments,
    bool HasOperator,
    bool IsCovered);

public record CoverageDayDto(
    int DayOfWeek,
    DateTime Date,
    IReadOnlyList<CoverageShiftSlotDto> Shifts,
    bool IsConfigured,
    bool IsCovered);

public record CoverageMachineDto(
    Guid Id,
    string Code,
    string Name,
    string? ProcessCode,
    int EnabledShiftCount,
    IReadOnlyList<CoverageShiftInfoDto> EnabledShifts,
    IReadOnlyList<CoverageDayDto> Days,
    string Status);

public record CoverageWeekDto(DateTime WeekStart, DateTime WeekEnd, IReadOnlyList<CoverageMachineDto> Machines);

public record UpsertCoverageAssignmentCommand(
    DateTime WeekStart,
    Guid MachineId,
    int DayOfWeek,
    Guid ShiftId,
    Guid OperatorId,
    string? RoleTag);

public record CoverageAssignmentDto(Guid Id, Guid OperatorId, string? OperatorName, string RoleTag);

public record BillingWeekDto(
    int WeekIndex,
    string Label,
    int StartDay,
    int EndDay,
    decimal Generated,
    decimal BaseMeta,
    decimal TotalMeta,
    decimal Delta,
    decimal CarryOut);

public record BillingSummaryDto(
    int Year,
    int Month,
    decimal MonthlyGoal,
    int WeekCount,
    decimal BaseMetaPerWeek,
    IReadOnlyList<BillingWeekDto> Weeks);

public record BillingMetaDto(int Year, int Month, decimal MonthlyGoal, int WeekCount);
public interface IOpSchedulingService
{
    Task<IReadOnlyList<ScheduleBlockDto>> GetMachineScheduleAsync(Guid machineId, DateOnly? date = null, CancellationToken ct = default);
    Task<GanttMonthDto> GetGanttAsync(int year, int month, string? q = null, string? status = null, CancellationToken ct = default);
    Task<IReadOnlyList<OpScheduleListGroupDto>> GetMonthListAsync(int year, int month, string? q = null, string? status = null, CancellationToken ct = default);
    Task<IReadOnlyList<OpenOrderDto>> GetOpenOrdersAsync(string? q = null, CancellationToken ct = default);
    Task<OpenOrderPrefillDto> GetOpenOrderPrefillAsync(Guid manufacturingOrderId, CancellationToken ct = default);

    Task<ScheduleBlockDto> CreateBlockAsync(UpsertScheduleBlockCommand command, string userName, CancellationToken ct = default);
    Task<ScheduleBlockDto> UpdateBlockAsync(Guid id, UpsertScheduleBlockCommand command, string userName, CancellationToken ct = default);
    Task DeleteBlockAsync(Guid id, CancellationToken ct = default);
    Task<ProgramOrderResultDto> ProgramOrderAsync(ProgramOrderCommand command, string userName, CancellationToken ct = default);
    Task DeleteProgramAsync(Guid manufacturingOrderId, CancellationToken ct = default);

    Task<IReadOnlyList<ScheduleProcessDto>> GetActiveProcessesAsync(CancellationToken ct = default);
    Task<IReadOnlyList<ScheduleProcessDto>> GetAllProcessesAsync(CancellationToken ct = default);
    Task<ScheduleProcessDto> CreateProcessAsync(UpsertProcessCommand command, string userName, CancellationToken ct = default);
    Task<ScheduleProcessDto> UpdateProcessAsync(Guid id, UpsertProcessCommand command, string userName, CancellationToken ct = default);
    Task ReorderProcessesAsync(IReadOnlyList<Guid> orderedIds, string userName, CancellationToken ct = default);
    Task DeleteProcessAsync(Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<SchedulingMachineDto>> GetSchedulingMachinesAsync(string? processCode = null, CancellationToken ct = default);
    Task<IReadOnlyList<ProductionShiftDto>> GetShiftsAsync(CancellationToken ct = default);
    Task<ProductionShiftDto> CreateShiftAsync(UpsertShiftCommand command, CancellationToken ct = default);
    Task<ProductionShiftDto> UpdateShiftAsync(Guid id, UpsertShiftCommand command, CancellationToken ct = default);
    Task DeleteShiftAsync(Guid id, CancellationToken ct = default);

    Task<MachineShiftsDto> GetMachineShiftsAsync(Guid machineId, CancellationToken ct = default);
    Task SetMachineShiftsAsync(Guid machineId, IReadOnlyList<Guid> enabledShiftIds, CancellationToken ct = default);

    Task<RosterWeekDto> GetRosterAsync(DateTime weekStart, string? q = null, CancellationToken ct = default);
    Task<Guid> CreateRosterRowAsync(UpsertRosterRowCommand command, string userName, CancellationToken ct = default);
    Task UpdateRosterRowAsync(Guid id, UpsertRosterRowCommand command, string userName, CancellationToken ct = default);
    Task DeleteRosterRowAsync(Guid id, CancellationToken ct = default);
    Task<int> CopyPreviousRosterAsync(DateTime weekStart, string userName, CancellationToken ct = default);
    Task<AvailableOperatorsDto> GetAvailableOperatorsAsync(DateTime weekStart, string processCode, DateTime? date = null, CancellationToken ct = default);

    Task<CoverageWeekDto> GetCoverageAsync(DateTime weekStart, string? q = null, CancellationToken ct = default);
    Task<CoverageAssignmentDto> CreateCoverageAssignmentAsync(UpsertCoverageAssignmentCommand command, string userName, CancellationToken ct = default);
    Task DeleteCoverageAssignmentAsync(Guid id, CancellationToken ct = default);

    Task<BillingSummaryDto> GetBillingSummaryAsync(int? year = null, int? month = null, CancellationToken ct = default);
    Task<BillingMetaDto> GetBillingMetaAsync(int? year = null, int? month = null, CancellationToken ct = default);
    Task<BillingMetaDto> SetBillingMetaAsync(int year, int month, decimal monthlyGoal, string userName, CancellationToken ct = default);
}