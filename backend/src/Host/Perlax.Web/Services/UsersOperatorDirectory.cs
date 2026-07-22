using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.DailyProduction;
using Perlax.Modules.Users.Infrastructure.Persistence;

namespace Perlax.Web.Services;

/// <summary>Expone los usuarios con rol "Operario" al módulo Production.</summary>
public sealed class UsersOperatorDirectory : IOperatorUserDirectory
{
    private readonly UsersDbContext _db;

    public UsersOperatorDirectory(UsersDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<OperatorUserInfo>> GetOperatorUsersAsync(CancellationToken ct = default)
    {
        var users = await _db.Users.AsNoTracking()
            .Where(u => u.Role == "Operario" && u.IsActive)
            .OrderBy(u => u.FirstName)
            .ToListAsync(ct);

        return users.Select(u =>
        {
            var fullName = $"{u.FirstName} {u.LastName}".Trim();
            if (string.IsNullOrWhiteSpace(fullName)) fullName = u.Username;
            return new OperatorUserInfo(u.Id, u.Username, fullName, u.DocumentNumber);
        }).ToList();
    }
}
