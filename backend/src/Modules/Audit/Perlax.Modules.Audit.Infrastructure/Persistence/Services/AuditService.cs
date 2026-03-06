using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Audit.Domain.Entities;
using Perlax.Modules.Audit.Infrastructure.Persistence;

namespace Perlax.Modules.Audit.Infrastructure.Persistence.Services;

public class AuditService : IAuditService
{
    private readonly AuditDbContext _context;

    public AuditService(AuditDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(string? userId, string? username, string action, string details, string ipAddress)
    {
        var log = new AuditLog
        {
            UserId = userId,
            Username = username,
            Action = action,
            Details = details,
            IpAddress = ipAddress,
            Timestamp = DateTime.UtcNow
        };

        _context.AuditLogs.Add(log);
        await _context.SaveChangesAsync();
    }
}
