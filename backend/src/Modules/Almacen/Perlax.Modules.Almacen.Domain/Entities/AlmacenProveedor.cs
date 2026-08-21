namespace Perlax.Modules.Almacen.Domain.Entities;

public class AlmacenProveedor
{
    public Guid Id { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string? Nit { get; set; }
    public string? Correo { get; set; }
    public string? TelefonoTrabajo { get; set; }
    public string? TelefonoMovil { get; set; }
    public string? Direccion { get; set; }
    public string? Categoria { get; set; }
    public bool ResponsableIva { get; set; }
    public string? Telefono { get; set; }
    public bool Activo { get; set; } = true;
    public DateTime FechaRegistro { get; set; } = DateTime.UtcNow;
}