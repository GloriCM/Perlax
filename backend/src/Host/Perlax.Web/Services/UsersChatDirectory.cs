using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Chat;
using Perlax.Modules.Users.Domain.Entities;
using Perlax.Modules.Users.Infrastructure.Persistence;

namespace Perlax.Web.Services;

/// <summary>Usuarios Admin/Administrativo/Taller(con vistas) disponibles para el chat interno.</summary>
public sealed class UsersChatDirectory : IChatUserDirectory
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private readonly UsersDbContext _db;

    public UsersChatDirectory(UsersDbContext db)
    {
        _db = db;
    }

    public async Task<ChatUserInfo?> FindByUsernameAsync(string username, CancellationToken ct = default)
    {
        var key = (username ?? string.Empty).Trim().ToLowerInvariant();
        if (key.Length == 0) return null;

        var user = await _db.Users.AsNoTracking()
            .FirstOrDefaultAsync(u => u.IsActive && u.Username.ToLower() == key, ct);
        return user == null ? null : Map(user);
    }

    public async Task<IReadOnlyList<ChatUserInfo>> SearchEligibleAsync(
        string query, string? excludeUsername, int take, CancellationToken ct = default)
    {
        var term = (query ?? string.Empty).Trim().ToLowerInvariant();
        if (term.Length < 1) return Array.Empty<ChatUserInfo>();

        var exclude = (excludeUsername ?? string.Empty).Trim().ToLowerInvariant();
        var candidateRoles = new[] { "Administrador", "Admin", "Administrativo", "User", "Taller" };

        var rows = await _db.Users.AsNoTracking()
            .Where(u => u.IsActive && candidateRoles.Contains(u.Role))
            .Where(u => exclude == "" || u.Username.ToLower() != exclude)
            .Where(u =>
                u.Username.ToLower().Contains(term) ||
                (u.FirstName != null && u.FirstName.ToLower().Contains(term)) ||
                (u.LastName != null && u.LastName.ToLower().Contains(term)) ||
                (u.Email != null && u.Email.ToLower().Contains(term)) ||
                (u.Area != null && u.Area.ToLower().Contains(term)))
            .OrderBy(u => u.FirstName).ThenBy(u => u.LastName).ThenBy(u => u.Username)
            .Take(Math.Clamp(take * 3, 1, 100))
            .ToListAsync(ct);

        return rows
            .Select(Map)
            .Where(u => ChatAccess.IsEligible(u.Role, u.AssignedViewsCount))
            .Take(Math.Clamp(take, 1, 50))
            .ToList();
    }

    public async Task<IReadOnlyList<ChatUserInfo>> GetEligibleByAreaAsync(string areaKey, CancellationToken ct = default)
    {
        var key = ChatAccess.NormalizeArea(areaKey);
        var rows = await _db.Users.AsNoTracking()
            .Where(u => u.IsActive)
            .ToListAsync(ct);

        return rows
            .Select(Map)
            .Where(u => ChatAccess.IsEligible(u.Role, u.AssignedViewsCount))
            .Where(u =>
                ChatAccess.IsAdmin(u.Role) ||
                string.Equals(ChatAccess.NormalizeArea(u.Area), key, StringComparison.OrdinalIgnoreCase))
            .ToList();
    }

    private static ChatUserInfo Map(User u)
    {
        var fullName = $"{u.FirstName} {u.LastName}".Trim();
        if (string.IsNullOrWhiteSpace(fullName)) fullName = u.Username;
        return new ChatUserInfo(u.Id, u.Username, fullName, u.Role, u.Area, CountAssignedViews(u.Role, u.AllowedRoutesJson));
    }

    private static int CountAssignedViews(string role, string? allowedRoutesJson)
    {
        if (ChatAccess.IsAdmin(role)) return int.MaxValue;
        if (string.IsNullOrWhiteSpace(allowedRoutesJson))
        {
            // null/vacío: Administrativo legacy = sin lista (completo). Taller sin JSON = 0 vistas.
            return ChatAccess.IsTaller(role) ? 0 : int.MaxValue;
        }

        try
        {
            var routes = JsonSerializer.Deserialize<string[]>(allowedRoutesJson, JsonOpts) ?? Array.Empty<string>();
            return routes.Count(r => !string.IsNullOrWhiteSpace(r));
        }
        catch
        {
            return 0;
        }
    }
}
