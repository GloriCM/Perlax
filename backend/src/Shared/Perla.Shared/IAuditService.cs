using System.Threading.Tasks;

namespace Perla.Shared;

public interface IAuditService
{
    Task LogAsync(string userId, string type, string tableName, string primaryKey, string? oldValues, string? newValues, string? affectedColumns);
}
