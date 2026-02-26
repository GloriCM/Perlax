namespace Perlax.Modules.Audit.Application.Abstractions;

public interface IAuditService
{
    Task LogAsync(string? userId, string? username, string action, string details, string ipAddress);
}
