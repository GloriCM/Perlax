using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Users.Domain.Entities;
using Perlax.Modules.Users.Infrastructure.Persistence;

namespace Perlax.Modules.Users.Api.Controllers;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "Admin,Administrador")]
public class UsersController : ControllerBase
{
    private const int MaxDetailsLength = 8000;
    private static readonly HashSet<string> AllowedAreas = new(StringComparer.OrdinalIgnoreCase)
    {
        "calidad",
        "produccion",
        "talleres",
        "planeaccion",
        "diseño",
        "ti",
        "mantenimiento",
        "sst",
        "gestion humana"
    };

    private readonly UsersDbContext _context;
    private readonly IAuditService _auditService;

    public UsersController(UsersDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetAll(CancellationToken cancellationToken)
    {
        var users = await _context.Users.AsNoTracking()
            .OrderBy(u => u.Username)
            .ToListAsync(cancellationToken);

        return Ok(users.Select(MapToDto));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<UserResponseDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user == null) return NotFound();
        return Ok(MapToDto(user));
    }

    [HttpPost]
    public async Task<ActionResult<UserResponseDto>> Create([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        if (!IsValidRole(request.Role)) return BadRequest("Rol inválido.");
        if (string.IsNullOrWhiteSpace(request.Username) || string.IsNullOrWhiteSpace(request.Password))
            return BadRequest("Usuario y contraseña son obligatorios.");
        if (string.IsNullOrWhiteSpace(request.Email)) return BadRequest("El correo es obligatorio.");

        var normalizedUser = request.Username.Trim().ToLowerInvariant();
        if (await _context.Users.AnyAsync(u => u.Username == normalizedUser, cancellationToken))
            return Conflict("Ya existe un usuario con ese nombre de login.");

        var email = request.Email.Trim();
        if (await _context.Users.AnyAsync(u => u.Email == email, cancellationToken))
            return Conflict("Ya existe un usuario con ese correo.");

        var entity = new User
        {
            Id = Guid.NewGuid(),
            Username = normalizedUser,
            Email = email,
            FirstName = NullIfWhite(request.FirstName),
            LastName = NullIfWhite(request.LastName),
            Role = NormalizeRole(request.Role),
            Area = NormalizeArea(request.Area),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            IsSystemUser = false,
            CreatedAt = DateTime.UtcNow,
            AllowedRoutesJson = AllowedRoutesPolicy.SerializeForUserRole(request.Role, request.AllowedRoutes)
        };

        var areaValidation = ValidateAreaForRole(entity.Role, entity.Area);
        if (areaValidation is not null) return BadRequest(areaValidation);

        _context.Users.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        await LogUserAuditAsync(
            "USER_CREATE",
            $"Se creó el usuario '{entity.Username}' ({entity.Email}). {DescribeUserPermissions(entity)}");

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, MapToDto(entity));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<UserResponseDto>> Update(Guid id, [FromBody] UpdateUserRequest request, CancellationToken cancellationToken)
    {
        if (!IsValidRole(request.Role)) return BadRequest("Rol inválido.");
        if (string.IsNullOrWhiteSpace(request.Email)) return BadRequest("El correo es obligatorio.");

        var entity = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (entity == null) return NotFound();

        var email = request.Email.Trim();
        if (await _context.Users.AnyAsync(u => u.Email == email && u.Id != id, cancellationToken))
            return Conflict("Ya existe otro usuario con ese correo.");

        var oldFirstName = entity.FirstName;
        var oldLastName = entity.LastName;
        var oldEmail = entity.Email;
        var oldRole = entity.Role;
        var oldArea = entity.Area;
        var oldRoutesJson = entity.AllowedRoutesJson;
        var passwordWillChange = !string.IsNullOrWhiteSpace(request.Password);

        entity.FirstName = NullIfWhite(request.FirstName);
        entity.LastName = NullIfWhite(request.LastName);
        entity.Email = email;
        entity.Role = NormalizeRole(request.Role);
        entity.Area = NormalizeArea(request.Area);
        var newRoutesJson = AllowedRoutesPolicy.SerializeForUserRole(request.Role, request.AllowedRoutes);
        entity.AllowedRoutesJson = newRoutesJson;

        var areaValidation = ValidateAreaForRole(entity.Role, entity.Area);
        if (areaValidation is not null) return BadRequest(areaValidation);

        if (passwordWillChange)
            entity.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password!);

        await _context.SaveChangesAsync(cancellationToken);

        var routesChanged = !string.Equals(
            NormalizeJsonToken(oldRoutesJson),
            NormalizeJsonToken(entity.AllowedRoutesJson),
            StringComparison.Ordinal);
        var profileOrSecurityChanged = passwordWillChange
            || !string.Equals(oldEmail, entity.Email, StringComparison.OrdinalIgnoreCase)
            || !string.Equals(oldRole, entity.Role, StringComparison.OrdinalIgnoreCase)
            || !string.Equals(oldFirstName ?? "", entity.FirstName ?? "", StringComparison.Ordinal)
            || !string.Equals(oldLastName ?? "", entity.LastName ?? "", StringComparison.Ordinal);

        if (profileOrSecurityChanged)
        {
            var details = BuildUserUpdateDetails(
                entity.Username,
                oldFirstName,
                oldLastName,
                oldEmail,
                oldRole,
                oldArea,
                entity,
                passwordWillChange);
            await LogUserAuditAsync("USER_UPDATE", details);
        }

        if (routesChanged)
        {
            await LogUserAuditAsync(
                "USER_PERMISSIONS_UPDATE",
                $"Usuario '{entity.Username}': permisos de [{DescribeRoutesSnapshot(oldRole, oldRoutesJson)}] " +
                $"a [{DescribeRoutesSnapshot(entity.Role, entity.AllowedRoutesJson)}].");
        }

        return Ok(MapToDto(entity));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (entity == null) return NotFound();
        if (entity.IsSystemUser) return BadRequest("No se puede eliminar un usuario del sistema.");

        var deletedUsername = entity.Username;
        var deletedId = entity.Id;
        _context.Users.Remove(entity);
        await _context.SaveChangesAsync(cancellationToken);

        await LogUserAuditAsync(
            "USER_DELETE",
            $"Se eliminó el usuario '{deletedUsername}' (id {deletedId}).");

        return NoContent();
    }

    private static UserResponseDto MapToDto(User u) => new(
        u.Id,
        u.Username,
        u.Email,
        u.FirstName,
        u.LastName,
        u.Area,
        u.Role,
        u.IsSystemUser,
        AllowedRoutesPolicy.DeserializeForResponse(u.Role, u.AllowedRoutesJson));

    private static bool IsAdminRole(string role) =>
        string.Equals(role, "Administrador", StringComparison.OrdinalIgnoreCase)
        || string.Equals(role, "Admin", StringComparison.OrdinalIgnoreCase);

    private static bool IsAdministrativeRole(string role) =>
        string.Equals(role, "Administrativo", StringComparison.OrdinalIgnoreCase)
        || string.Equals(role, "User", StringComparison.OrdinalIgnoreCase);

    private static bool IsValidRole(string role) =>
        IsAdminRole(role) || IsAdministrativeRole(role);

    private static string NormalizeRole(string role) =>
        IsAdminRole(role.Trim()) ? "Administrador" : "Administrativo";

    private static string? NormalizeArea(string? area)
    {
        if (string.IsNullOrWhiteSpace(area)) return null;
        return area.Trim();
    }

    private static string? ValidateAreaForRole(string role, string? area)
    {
        if (IsAdminRole(role))
            return null;

        if (string.IsNullOrWhiteSpace(area))
            return "El área es obligatoria para rol Administrativo.";

        if (!AllowedAreas.Contains(area))
            return "El área seleccionada no es válida.";

        return null;
    }

    private static string? NullIfWhite(string? s)
    {
        if (string.IsNullOrWhiteSpace(s)) return null;
        return s.Trim();
    }

    private string GetClientIp() =>
        HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    private string GetActorUserId() =>
        User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

    private string GetActorUsername() =>
        User.FindFirstValue(ClaimTypes.Name)
        ?? User.FindFirstValue(ClaimTypes.Email)
        ?? User.Identity?.Name
        ?? "unknown";

    private async Task LogUserAuditAsync(string action, string details)
    {
        var trimmed = details.Length <= MaxDetailsLength
            ? details
            : details[..MaxDetailsLength] + "…";
        await _auditService.LogAsync(
            GetActorUserId(),
            GetActorUsername(),
            action,
            trimmed,
            GetClientIp());
    }

    private static string DescribeUserPermissions(User u)
    {
        if (IsAdminRole(u.Role))
            return "Permisos: administrador (acceso completo).";

        var routes = AllowedRoutesPolicy.DeserializeForResponse(u.Role, u.AllowedRoutesJson);
        if (routes == null)
            return "Permisos: sin lista explícita (acceso completo).";
        if (routes.Length == 0)
            return "Permisos: solo pantalla de inicio.";
        return $"Permisos: {routes.Length} ruta(s) — {JoinRoutesPreview(routes)}.";
    }

    private static string JoinRoutesPreview(string[] routes)
    {
        const int max = 20;
        var slice = routes.Take(max).ToArray();
        var sb = new StringBuilder();
        for (var i = 0; i < slice.Length; i++)
        {
            if (i > 0) sb.Append(", ");
            sb.Append(slice[i]);
        }

        if (routes.Length > max)
            sb.Append(" …");
        return sb.ToString();
    }

    private static string DescribeRoutesSnapshot(string role, string? routesJson)
    {
        if (IsAdminRole(role))
            return "admin (completo)";
        var routes = AllowedRoutesPolicy.DeserializeForResponse(role, routesJson);
        if (routes == null) return "sin lista (completo)";
        if (routes.Length == 0) return "solo inicio";
        return $"{routes.Length} ruta(s): {JoinRoutesPreview(routes)}";
    }

    private static string BuildUserUpdateDetails(
        string username,
        string? oldFirstName,
        string? oldLastName,
        string oldEmail,
        string oldRole,
        string? oldArea,
        User updated,
        bool passwordChanged)
    {
        var parts = new List<string> { $"Usuario afectado: '{username}'." };

        var newFn = updated.FirstName;
        var newLn = updated.LastName;
        if (!string.Equals(oldFirstName ?? "", newFn ?? "", StringComparison.Ordinal)
            || !string.Equals(oldLastName ?? "", newLn ?? "", StringComparison.Ordinal))
        {
            parts.Add($"Nombre: «{oldFirstName ?? "—"} {oldLastName ?? ""}» → «{newFn ?? "—"} {newLn ?? ""}».");
        }

        if (!string.Equals(oldEmail, updated.Email, StringComparison.OrdinalIgnoreCase))
            parts.Add($"Correo: {oldEmail} → {updated.Email}.");

        if (!string.Equals(oldRole, updated.Role, StringComparison.OrdinalIgnoreCase))
            parts.Add($"Rol: {oldRole} → {updated.Role}.");

        if (!string.Equals(oldArea ?? "", updated.Area ?? "", StringComparison.OrdinalIgnoreCase))
            parts.Add($"Área: {oldArea ?? "—"} → {updated.Area ?? "—"}.");

        if (passwordChanged)
            parts.Add("Contraseña: actualizada.");

        return string.Join(" ", parts);
    }

    /// <summary>Compara JSON de rutas ignorando solo espacios finales.</summary>
    private static string NormalizeJsonToken(string? json) => (json ?? "").Trim();
}

public record UserResponseDto(
    Guid Id,
    string Username,
    string Email,
    string? FirstName,
    string? LastName,
    string? Area,
    string Role,
    bool IsSystemUser,
    string[]? AllowedRoutes);

public record CreateUserRequest(
    string? FirstName,
    string? LastName,
    string? Area,
    string Username,
    string Email,
    string Password,
    string Role,
    string[]? AllowedRoutes);

public record UpdateUserRequest(
    string? FirstName,
    string? LastName,
    string? Area,
    string Email,
    string? Password,
    string Role,
    string[]? AllowedRoutes);
