namespace Perlax.Modules.Production.Domain.Entities;

public class ProductionMachineShift
{
    public Guid Id { get; set; }
    public Guid MachineId { get; set; }
    public Guid ShiftId { get; set; }
    public bool IsEnabled { get; set; } = true;
    public int SortOrder { get; set; }
}