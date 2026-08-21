namespace Perlax.Modules.Production.Domain.Entities;

public class CotizadorMachine
{
    public Guid Id { get; set; }
    public string ServiceRole { get; set; } = "Impresora";
    public string Name { get; set; } = string.Empty;
    public decimal SetupTimeHours { get; set; }
    public decimal ShotsPerHour { get; set; }
    public decimal HourlyRate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}