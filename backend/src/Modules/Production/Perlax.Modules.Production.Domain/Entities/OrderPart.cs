using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace Perlax.Modules.Production.Domain.Entities;

public class OrderPart
{
    public Guid Id { get; set; }
    public Guid ProductionOrderId { get; set; }
    public string PartName { get; set; } = "Pieza Unica";
    
    // Technical Specifications
    public string? SustratoSup { get; set; }
    public string? SustratoMed { get; set; }
    public string? SustratoInf { get; set; }
    public string? DireccionFibra { get; set; }
    public string? TipoFlauta { get; set; }
    public string? DireccionFlauta { get; set; }
    
    // Dimensions
    public decimal Alto { get; set; }
    public decimal Largo { get; set; }
    public decimal Ancho { get; set; }
    public decimal Fuelle { get; set; }
    public string? Cabida { get; set; }
    public decimal AltoPliego { get; set; }
    public decimal AnchoPliego { get; set; }
    
    // Design and Planning status
    public string Prioridad { get; set; } = "Normal"; // Baja, Normal, Alta, Urgente
    public string? Disenador { get; set; }
    public string EstadoBoceto { get; set; } = "Pendiente"; // Pendiente, OK, No
    public string EstadoArtes { get; set; } = "Pendiente"; // Pendiente, OK, No
    public string EstadoFicha { get; set; } = "No"; // No, OK, Pendiente
    public string EstadoMuestra { get; set; } = "No"; // No, Sí, Pendiente
    public string EstadoAprobacion { get; set; } = "Pendiente"; // Pendiente, Aprobado, Rechazado
    public string EstadoPlancha { get; set; } = "No"; // No, OK, Pendiente
    public string? EstadoFotomecanica { get; set; } // e.g. "Enviado", "-"
    
    // Technical sheet approval flow
    public bool IsTechnicalSheetApproved { get; set; }
    public DateTime? TechnicalSheetApprovedAt { get; set; }
    public string? TechnicalSheetApprovedBy { get; set; }
    
    // Extras
    public bool TroquelNuevo { get; set; }
    public string? CodigoTroquel { get; set; }
    
    // Manija
    public string? ManijaTipo { get; set; }
    public string? ManijaRef { get; set; }
    public decimal ManijaLargo { get; set; }
    
    // Inks (Stored as JSON or individual bools)
    public bool TintaC { get; set; }
    public bool TintaM { get; set; }
    public bool TintaY { get; set; }
    public bool TintaK { get; set; }
    public string? TintasEspeciales { get; set; }
    
    // Finishes
    public string? Terminado1 { get; set; }
    public string? Terminado2 { get; set; }
    public bool Estampado { get; set; }
    public string? PieImprenta { get; set; }

    // Delivery Conditions
    public bool CondicionRemision { get; set; }
    public bool CondicionCertificado { get; set; }
    public bool CondicionFactura { get; set; }
    public bool CondicionOrdenCompra { get; set; }
    
    public string? Notas { get; set; }
    public string? FabricationProcessesJson { get; set; } // JSON list of machines/processes
    public string? AdjuntosJson { get; set; } // URLs list as JSON string

    // Navigation
    [ForeignKey("ProductionOrderId")]
    [JsonIgnore]
    public ProductionOrder? Order { get; set; }
}
