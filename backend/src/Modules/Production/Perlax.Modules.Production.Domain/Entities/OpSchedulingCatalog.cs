namespace Perlax.Modules.Production.Domain.Entities;

public class OpProcessCatalogItem
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}

public class OpRosterRow
{
    public Guid Id { get; set; }
    public DateTime WeekStart { get; set; }
    public string ProcessCode { get; set; } = string.Empty;
    public Guid? MachineId { get; set; }
    public Guid? OperatorId { get; set; }
    public string RoleTag { get; set; } = "Op";
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }

    public ICollection<OpRosterDay> Days { get; set; } = [];
}

public class OpRosterDay
{
    public Guid Id { get; set; }
    public Guid RosterRowId { get; set; }
    public int DayOfWeek { get; set; }
    public Guid? ShiftId { get; set; }
    public bool IsOff { get; set; }
    public OpRosterRow? RosterRow { get; set; }
}

public class OpCoverageAssignment
{
    public Guid Id { get; set; }
    public DateTime WeekStart { get; set; }
    public Guid MachineId { get; set; }
    public int DayOfWeek { get; set; }
    public Guid ShiftId { get; set; }
    public Guid OperatorId { get; set; }
    public string RoleTag { get; set; } = "Op";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
}

public class OpBillingMonthGoal
{
    public Guid Id { get; set; }
    public int Year { get; set; }
    public int Month { get; set; }
    public decimal MonthlyGoal { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
}