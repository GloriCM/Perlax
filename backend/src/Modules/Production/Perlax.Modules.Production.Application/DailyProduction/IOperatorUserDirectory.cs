namespace Perlax.Modules.Production.Application.DailyProduction;

public record OperatorUserInfo(Guid UserId, string Username, string DisplayName, string? DocumentNumber = null);

/// <summary>
/// Directorio de usuarios con rol Operario (implementado en el Host,
/// donde conviven los contextos de Users y Production).
/// </summary>
public interface IOperatorUserDirectory
{
    Task<IReadOnlyList<OperatorUserInfo>> GetOperatorUsersAsync(CancellationToken ct = default);
}
