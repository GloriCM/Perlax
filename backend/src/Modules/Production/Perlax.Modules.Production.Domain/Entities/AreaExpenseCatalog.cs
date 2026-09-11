namespace Perlax.Modules.Production.Domain.Entities;

public class AreaExpenseRubro
{
    public Guid Id { get; set; }
    public string Area { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class AreaExpenseProveedor
{
    public Guid Id { get; set; }
    public string Area { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Nit { get; set; }
    public string? Cedula { get; set; }
    public string? Telefono { get; set; }
    public string? Asesor { get; set; }
    public string RubrosJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}

public class AreaExpenseCaptura
{
    public Guid Id { get; set; }
    public string Area { get; set; } = string.Empty;
    public DateOnly ExpenseDate { get; set; }
    public Guid? RubroId { get; set; }
    public string RubroName { get; set; } = string.Empty;
    public Guid? ProveedorId { get; set; }
    public string ProveedorName { get; set; } = string.Empty;
    public string? Invoice { get; set; }
    public string? OpNumber { get; set; }
    public string? Description { get; set; }
    public decimal BaseAmount { get; set; }
    public decimal IvaAmount { get; set; }
    public decimal TotalAmount { get; set; }
    public string Status { get; set; } = "pendiente";
    public string RegisteredBy { get; set; } = string.Empty;
    public Guid? OvertimeGroupId { get; set; }
    public string? OvertimeJson { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}