namespace Perlax.Modules.Users.Domain.Entities;

public class User
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? FirstName { get; set; }
    public string? LastName { get; set; }
    /// <summary>Rutas permitidas (paths de la SPA), JSON array. null = acceso completo (compatibilidad).</summary>
    public string? AllowedRoutesJson { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public string Role { get; set; } = "User"; // Admin, User
    public bool IsSystemUser { get; set; } = false; // Cannot be deleted
    public int AccessFailedCount { get; set; } = 0;
    public DateTime? LockoutEnd { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
