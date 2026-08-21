using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Users.Infrastructure.Persistence;
using System.Globalization;
using System.Text;

namespace Perlax.Modules.Users.Api.Controllers;

/// <summary>
/// Consultas minimas de usuarios para formularios operativos (sin datos sensibles ni permisos).
/// </summary>
[ApiController]
[Authorize]
[Route("api/users")]
public class UserLookupsController : ControllerBase
{
    private readonly UsersDbContext _context;

    public UserLookupsController(UsersDbContext context)
    {
        _context = context;
    }

    /// <summary>Usuarios del area Diseno para asignacion en OT (solo id, usuario y nombre visible).</summary>
    [HttpGet("designers")]
    public async Task<ActionResult<IEnumerable<DesignerLookupDto>>> GetDesigners(CancellationToken cancellationToken)
    {
        var users = await _context.Users
            .AsNoTracking()
            .Where(u => u.Area != null && u.Area != "")
            .OrderBy(u => u.FirstName)
            .ThenBy(u => u.LastName)
            .ThenBy(u => u.Username)
            .Select(u => new
            {
                u.Id,
                u.Username,
                u.FirstName,
                u.LastName,
                u.Area
            })
            .ToListAsync(cancellationToken);

        var designers = users
            .Where(u => NormalizeAreaKey(u.Area) == "diseno")
            .Select(u => new DesignerLookupDto(
                u.Id,
                u.Username,
                BuildDisplayName(u.FirstName, u.LastName, u.Username)))
            .ToList();

        return Ok(designers);
    }

    private static string NormalizeAreaKey(string? area)
    {
        if (string.IsNullOrWhiteSpace(area)) return string.Empty;
        var normalized = area.Trim().Normalize(NormalizationForm.FormD);
        var chars = normalized.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark);
        return new string(chars.ToArray()).ToLowerInvariant();
    }

    private static string BuildDisplayName(string? firstName, string? lastName, string username)
    {
        var full = string.Join(' ', new[] { firstName, lastName }.Where(s => !string.IsNullOrWhiteSpace(s))).Trim();
        return string.IsNullOrWhiteSpace(full) ? username : full;
    }
}

public record DesignerLookupDto(Guid Id, string Username, string DisplayName);