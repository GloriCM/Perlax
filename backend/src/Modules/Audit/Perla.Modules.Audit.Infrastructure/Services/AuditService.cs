using System;
using System.Threading.Tasks;
using Perla.Modules.Audit.Domain.Entities;
using Perla.Modules.Audit.Infrastructure.Persistence;
using Perla.Shared;

namespace Perla.Modules.Audit.Infrastructure.Services;

public class AuditService : IAuditService
{
    private readonly AuditDbContext _context;

    public AuditService(AuditDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(string userId, string type, string tableName, string primaryKey, string? oldValues, string? newValues, string? affectedColumns)
    {
        var auditLog = new AuditLog
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Type = type,
            TableName = tableName,
            PrimaryKey = primaryKey,
            OldValues = oldValues,
            NewValues = newValues,
            AffectedColumns = affectedColumns,
            DateTime = DateTime.UtcNow
        };

        _context.AuditLogs.Add(auditLog);
        await _context.SaveChangesAsync();
    }
}
