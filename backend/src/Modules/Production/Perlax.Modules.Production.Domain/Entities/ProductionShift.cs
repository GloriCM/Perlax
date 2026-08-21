namespace Perlax.Modules.Production.Domain.Entities;

public class ProductionShift
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public TimeOnly StartTime { get; set; }
    public TimeOnly EndTime { get; set; }
    /// <summary>Si true, la fecha operativa del turno nocturno es la del inicio (antes de medianoche).</summary>
    public bool CrossesMidnight { get; set; }
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; }
}
