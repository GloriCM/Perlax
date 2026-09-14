namespace Perlax.Modules.Production.Application.Chat;

public record ChatUserInfo(
    Guid UserId,
    string Username,
    string DisplayName,
    string Role,
    string? Area,
    int AssignedViewsCount);

/// <summary>
/// Directorio de usuarios elegibles para chat (implementado en el Host).
/// </summary>
public interface IChatUserDirectory
{
    Task<ChatUserInfo?> FindByUsernameAsync(string username, CancellationToken ct = default);
    Task<IReadOnlyList<ChatUserInfo>> SearchEligibleAsync(string query, string? excludeUsername, int take, CancellationToken ct = default);
    Task<IReadOnlyList<ChatUserInfo>> GetEligibleByAreaAsync(string areaKey, CancellationToken ct = default);
}
