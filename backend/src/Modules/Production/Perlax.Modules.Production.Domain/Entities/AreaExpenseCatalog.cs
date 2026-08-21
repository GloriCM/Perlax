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