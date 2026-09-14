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
[Authorize]
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
        "gestion humana",
        "presupuestos",
        "financiera",
        "contabilidad"
    };

    private readonly UsersDbContext _context;
    private readonly IAuditService _auditService;

    public UsersController(UsersDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<ActionResult<IEnumerable<UserResponseDto>>> GetAll(CancellationToken cancellationToken)
    {
        var users = await _context.Users.AsNoTracking()
            .OrderBy(u => u.Username)
            .ToListAsync(cancellationToken);

        return Ok(users.Select(MapToDto));
    }

    /// <summary>Directorio de personal para horas extras (sin datos de acceso).</summary>
    [HttpGet("personnel")]
    [Authorize(Roles = "Admin,Administrador,Administrativo")]
    public async Task<ActionResult<IEnumerable<object>>> GetPersonnel(
        [FromQuery] string? roles,
        CancellationToken cancellationToken)
    {
        var wanted = (roles ?? string.Empty)
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(UserRoles.Normalize)
            .Where(r => UserRoles.IsShopFloor(r) || UserRoles.IsAdministrative(r))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var query = _context.Users.AsNoTracking().Where(u => u.IsActive);
        if (wanted.Count > 0)
            query = query.Where(u => wanted.Contains(u.Role));
        else
            query = query.Where(u =>
                u.Role == UserRoles.Operario
                || u.Role == UserRoles.Auxiliar
                || u.Role == UserRoles.Almacen
                || u.Role == UserRoles.Taller
                || u.Role == UserRoles.Administrativo);

        var users = await query
            .OrderBy(u => u.Role)
            .ThenBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .ToListAsync(cancellationToken);

        return Ok(users.Select(u =>
        {
            var fullName = $"{u.FirstName} {u.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(fullName)) fullName = u.Username;
            return new
            {
                id = u.Id,
                displayName = fullName,
                documentNumber = u.DocumentNumber,
                salary = u.Salary,
                role = u.Role,
                area = u.Area,
                hasOvertime = UserRoles.HasOvertime(u.Role),
                appearsInPlanta = UserRoles.AppearsInPlanta(u.Role),
                overtimeExpenseArea = UserRoles.OvertimeExpenseArea(u.Role),
                overtimeExpenseLabel = UserRoles.OvertimeExpenseLabel(u.Role)
            };
        }));
    }

    [HttpGet("{id:guid}")]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<ActionResult<UserResponseDto>> GetById(Guid id, CancellationToken cancellationToken)
    {
        var user = await _context.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (user == null) return NotFound();
        return Ok(MapToDto(user));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<ActionResult<UserResponseDto>> Create([FromBody] CreateUserRequest request, CancellationToken cancellationToken)
    {
        if (!IsValidRole(request.Role)) return BadRequest("Rol inválido.");

        var role = NormalizeRole(request.Role);
        var isAdmin = UserRoles.IsAdmin(role);
        var documentNumber = NormalizeDocument(request.DocumentNumber);

        string normalizedUser;
        string temporaryPassword;
        string createAuditDetail;

        if (isAdmin)
        {
            // Alta gerencia: login propio, sin exigir cédula ni salario.
            var requestedUser = (request.Username ?? string.Empty).Trim();
            if (requestedUser.Length < 3)
                return BadRequest("El usuario de inicio de sesión es obligatorio (mínimo 3 caracteres) para Administrador.");
            if (!IsValidAdminUsername(requestedUser))
                return BadRequest("El usuario de inicio de sesión solo puede contener letras, números, punto, guion o guion bajo.");
            if (string.IsNullOrWhiteSpace(request.Password) || request.Password.Trim().Length < 6)
                return BadRequest("Indique una contraseña temporal (mínimo 6 caracteres). El administrador deberá cambiarla en el primer ingreso.");

            normalizedUser = requestedUser;
            temporaryPassword = request.Password.Trim();
            createAuditDetail = $"login propio '{normalizedUser}', sin cédula obligatoria";
        }
        else
        {
            if (string.IsNullOrWhiteSpace(documentNumber))
                return BadRequest("La cédula de ciudadanía es obligatoria.");

            // Login y contraseña inicial = cédula (el usuario debe cambiarla al primer ingreso).
            normalizedUser = documentNumber;
            temporaryPassword = documentNumber;
            createAuditDetail = "login/clave inicial = cédula";
        }

        if (await _context.Users.AnyAsync(u => u.Username == normalizedUser, cancellationToken))
            return Conflict(isAdmin
                ? "Ya existe un usuario con ese nombre de inicio de sesión."
                : "Ya existe un usuario con esa cédula (login).");

        if (!string.IsNullOrWhiteSpace(documentNumber)
            && await _context.Users.AnyAsync(u => u.DocumentNumber == documentNumber, cancellationToken))
            return Conflict("Ya existe un usuario con esa cédula.");

        var email = string.IsNullOrWhiteSpace(request.Email)
            ? $"{SanitizeLocalEmailPart(normalizedUser)}@perlax.local"
            : request.Email.Trim();
        if (await _context.Users.AnyAsync(u => u.Email == email, cancellationToken))
            return Conflict("Ya existe un usuario con ese correo.");

        var entity = new User
        {
            Id = Guid.NewGuid(),
            Username = normalizedUser,
            Email = email,
            FirstName = ToUpperPersonName(request.FirstName),
            LastName = ToUpperPersonName(request.LastName),
            Role = role,
            Area = isAdmin ? null : (NormalizeArea(request.Area) ?? UserRoles.DefaultArea(role)),
            DocumentNumber = documentNumber,
            Salary = isAdmin ? request.Salary : request.Salary,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(temporaryPassword),
            MustChangePassword = true,
            IsSystemUser = false,
            CreatedAt = DateTime.UtcNow,
            AllowedRoutesJson = AllowedRoutesPolicy.SerializeForUserRole(
                role,
                UserRoles.ForcesEmptyRoutes(role) ? [] : request.AllowedRoutes)
        };

        var areaValidation = ValidateAreaForRole(entity.Role, entity.Area);
        if (areaValidation is not null) return BadRequest(areaValidation);

        _context.Users.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        await LogUserAuditAsync(
            "USER_CREATE",
            $"Se creó el usuario '{entity.Username}' ({entity.Email}) con {createAuditDetail}. {DescribeUserPermissions(entity)}");

        return CreatedAtAction(nameof(GetById), new { id = entity.Id }, MapToDto(entity));
    }

    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<ActionResult<UserResponseDto>> Update(Guid id, [FromBody] UpdateUserRequest request, CancellationToken cancellationToken)
    {
        if (!IsValidRole(request.Role)) return BadRequest("Rol inválido.");

        var entity = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (entity == null) return NotFound();

        var email = string.IsNullOrWhiteSpace(request.Email)
            ? entity.Email
            : request.Email.Trim();
        if (await _context.Users.AnyAsync(u => u.Email == email && u.Id != id, cancellationToken))
            return Conflict("Ya existe otro usuario con ese correo.");

        var documentNumber = NormalizeDocument(request.DocumentNumber);
        var newRole = NormalizeRole(request.Role);
        var willBeAdmin = UserRoles.IsAdmin(newRole) || entity.IsSystemUser;

        if (string.IsNullOrWhiteSpace(documentNumber) && !willBeAdmin)
            return BadRequest("La cédula de ciudadanía es obligatoria.");

        if (!string.IsNullOrWhiteSpace(documentNumber)
            && await _context.Users.AnyAsync(u => u.DocumentNumber == documentNumber && u.Id != id, cancellationToken))
            return Conflict("Ya existe otro usuario con esa cédula.");

        var oldFirstName = entity.FirstName;
        var oldLastName = entity.LastName;
        var oldEmail = entity.Email;
        var oldRole = entity.Role;
        var oldArea = entity.Area;
        var oldRoutesJson = entity.AllowedRoutesJson;
        var passwordWillChange = !string.IsNullOrWhiteSpace(request.Password);

        entity.FirstName = ToUpperPersonName(request.FirstName);
        entity.LastName = ToUpperPersonName(request.LastName);
        entity.Email = email;
        entity.Role = newRole;
        entity.Area = willBeAdmin ? null : (NormalizeArea(request.Area) ?? UserRoles.DefaultArea(entity.Role));
        if (!string.IsNullOrWhiteSpace(documentNumber))
        {
            entity.DocumentNumber = documentNumber;
            // Personal operativo/administativo: login = cédula. Alta gerencia conserva su usuario.
            if (!entity.IsSystemUser && !UserRoles.IsAdmin(entity.Role))
            {
                if (await _context.Users.AnyAsync(u => u.Username == documentNumber && u.Id != id, cancellationToken))
                    return Conflict("Ya existe otro usuario con esa cédula como login.");
                entity.Username = documentNumber;
            }
        }
        else if (willBeAdmin)
        {
            entity.DocumentNumber = null;
        }
        entity.Salary = request.Salary;
        var newRoutesJson = AllowedRoutesPolicy.SerializeForUserRole(
            entity.Role,
            UserRoles.ForcesEmptyRoutes(entity.Role) ? [] : request.AllowedRoutes);
        entity.AllowedRoutesJson = newRoutesJson;

        var areaValidation = ValidateAreaForRole(entity.Role, entity.Area);
        if (areaValidation is not null) return BadRequest(areaValidation);

        if (passwordWillChange)
        {
            entity.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password!);
            entity.MustChangePassword = true; // el admin reseteó: el usuario debe cambiarla
        }

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

    [HttpPost("{id:guid}/set-active")]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<ActionResult<UserResponseDto>> SetActive(Guid id, [FromBody] SetUserActiveRequest request, CancellationToken cancellationToken)
    {
        var entity = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (entity == null) return NotFound();
        if (entity.IsSystemUser && !request.IsActive)
            return BadRequest("No se puede desactivar un usuario del sistema.");

        if (entity.IsActive == request.IsActive)
            return Ok(MapToDto(entity));

        entity.IsActive = request.IsActive;
        await _context.SaveChangesAsync(cancellationToken);

        await LogUserAuditAsync(
            request.IsActive ? "USER_ACTIVATE" : "USER_DEACTIVATE",
            request.IsActive
                ? $"Se reactivó el usuario '{entity.Username}'."
                : $"Se desactivó el usuario '{entity.Username}' (ya no trabaja; el historial se conserva).");

        return Ok(MapToDto(entity));
    }

    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin,Administrador")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken cancellationToken)
    {
        var entity = await _context.Users.FirstOrDefaultAsync(u => u.Id == id, cancellationToken);
        if (entity == null) return NotFound();
        if (entity.IsSystemUser) return BadRequest("No se puede eliminar un usuario del sistema.");

        // Preferir desactivar en lugar de borrar (conserva historial y permite reactivar).
        entity.IsActive = false;
        await _context.SaveChangesAsync(cancellationToken);

        await LogUserAuditAsync(
            "USER_DEACTIVATE",
            $"Se desactivó (en lugar de eliminar) el usuario '{entity.Username}' (id {entity.Id}).");

        return NoContent();
    }

    private static UserResponseDto MapToDto(User u) => new(
        u.Id,
        u.Username,
        u.Email,
        u.FirstName,
        u.LastName,
        u.Area,
        u.DocumentNumber,
        u.Salary,
        u.Role,
        u.IsSystemUser,
        u.IsActive,
        u.MustChangePassword,
        AllowedRoutesPolicy.DeserializeForResponse(u.Role, u.AllowedRoutesJson));

    private static string? ToUpperPersonName(string? value) =>
        Perlax.Modules.Users.Domain.Entities.User.ToUpperName(value);

    private static string? NormalizeDocument(string? document)
    {
        if (string.IsNullOrWhiteSpace(document)) return null;
        var digits = new string(document.Where(char.IsDigit).ToArray());
        return string.IsNullOrWhiteSpace(digits) ? null : digits;
    }

    private static bool IsValidAdminUsername(string username)
    {
        // Letras, números, punto, guion y guion bajo.
        return username.All(c => char.IsLetterOrDigit(c) || c is '.' or '-' or '_');
    }

    private static string SanitizeLocalEmailPart(string value)
    {
        var cleaned = new string(value
            .Select(c => char.IsLetterOrDigit(c) ? c : '.')
            .ToArray())
            .Trim('.');
        return string.IsNullOrWhiteSpace(cleaned) ? "admin" : cleaned;
    }

    private static bool IsAdminRole(string role) => UserRoles.IsAdmin(role);

    private static bool IsAdministrativeRole(string role) => UserRoles.IsAdministrative(role);

    private static bool IsOperatorRole(string role) => UserRoles.IsOperario(role);

    private static bool IsValidRole(string role) => UserRoles.IsValid(role);

    private static string NormalizeRole(string role) => UserRoles.Normalize(role);

    private static string? NormalizeArea(string? area)
    {
        if (string.IsNullOrWhiteSpace(area)) return null;
        return area.Trim();
    }

    private static string? ValidateAreaForRole(string role, string? area)
    {
        if (IsAdminRole(role))
            return null;

        if (UserRoles.IsShopFloor(role))
        {
            if (string.IsNullOrWhiteSpace(area)) return null;
            return AllowedAreas.Contains(area) ? null : "El área seleccionada no es válida.";
        }

        if (string.IsNullOrWhiteSpace(area))
            return "El área es obligatoria para rol Administrativo.";

        if (!AllowedAreas.Contains(area))
            return "El área seleccionada no es válida.";

        return null;
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
    string? DocumentNumber,
    decimal? Salary,
    string Role,
    bool IsSystemUser,
    bool IsActive,
    bool MustChangePassword,
    string[]? AllowedRoutes);

public record CreateUserRequest(
    string? FirstName,
    string? LastName,
    string? Area,
    string? DocumentNumber,
    decimal? Salary,
    string? Username,
    string? Email,
    string? Password,
    string Role,
    string[]? AllowedRoutes);

public record UpdateUserRequest(
    string? FirstName,
    string? LastName,
    string? Area,
    string? DocumentNumber,
    decimal? Salary,
    string? Email,
    string? Password,
    string Role,
    string[]? AllowedRoutes);

public record SetUserActiveRequest(bool IsActive);
