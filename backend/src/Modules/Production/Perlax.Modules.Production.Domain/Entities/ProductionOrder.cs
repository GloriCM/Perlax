namespace Perlax.Modules.Production.Domain.Entities;

public class ProductionOrder
{
    public Guid Id { get; set; }
    public string OTNumber { get; set; } = string.Empty; // e.g. "7451"
    public string Cliente { get; set; } = string.Empty;
    public string EjecutivoCuenta { get; set; } = string.Empty;
    public DateTime FechaSolicitud { get; set; } = DateTime.UtcNow;
    public string Asignacion { get; set; } = "Otro"; // e.g. "Asignación para Diseño"
    public string LineaPT { get; set; } = "Otro"; // e.g. "Bolsa", "Caja"
    public int NumeroPartes { get; set; } = 1;
    public string ProductCode { get; set; } = string.Empty; // SAP Code or internal code
    public string ProductName { get; set; } = string.Empty; // Reference name
    public string Status { get; set; } = "Borrador"; // Borrador, Autorizada
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
    public string? CreatedBy { get; set; }
    public string? UpdatedBy { get; set; }

    // Relationships
    public ICollection<OrderPart> Parts { get; set; } = new List<OrderPart>();
}
