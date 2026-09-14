using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using Perlax.Modules.Production.Application.Chat;

namespace Perlax.Modules.Production.Api.Hubs;

[Authorize]
public class InternalChatHub : Hub
{
    private readonly IInternalChatService _chat;
    private readonly IChatUserDirectory _users;

    public InternalChatHub(IInternalChatService chat, IChatUserDirectory users)
    {
        _chat = chat;
        _users = users;
    }

    public override async Task OnConnectedAsync()
    {
        var caller = GetCaller();
        var info = await _users.FindByUsernameAsync(caller.Username);
        if (info == null || !ChatAccess.IsEligible(info.Role, info.AssignedViewsCount))
        {
            Context.Abort();
            return;
        }

        var userKey = (caller.Username ?? string.Empty).Trim().ToLowerInvariant();
        if (!string.IsNullOrWhiteSpace(userKey))
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user:{userKey}");

        await base.OnConnectedAsync();
    }

    public async Task JoinConversation(string conversationId)
    {
        if (string.IsNullOrWhiteSpace(conversationId) || !Guid.TryParse(conversationId.Trim(), out var id))
            return;

        var caller = GetCaller();
        if (!await _chat.CanJoinConversationAsync(id, caller))
            return;

        await Groups.AddToGroupAsync(Context.ConnectionId, $"conversation:{id}");
    }

    public Task LeaveConversation(string conversationId)
    {
        if (string.IsNullOrWhiteSpace(conversationId))
            return Task.CompletedTask;

        return Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conversation:{conversationId.Trim()}");
    }

    private ChatCallerContext GetCaller()
    {
        var username = Context.User?.Identity?.Name
            ?? Context.User?.FindFirstValue(ClaimTypes.Name)
            ?? Context.User?.FindFirstValue("unique_name")
            ?? string.Empty;
        var full = string.Join(' ', new[]
        {
            Context.User?.FindFirstValue(ClaimTypes.GivenName) ?? Context.User?.FindFirstValue("given_name"),
            Context.User?.FindFirstValue(ClaimTypes.Surname) ?? Context.User?.FindFirstValue("family_name")
        }.Where(s => !string.IsNullOrWhiteSpace(s))).Trim();
        var role = Context.User?.FindFirstValue(ClaimTypes.Role) ?? Context.User?.FindFirstValue("role") ?? string.Empty;
        var area = Context.User?.FindFirstValue("area");
        return new ChatCallerContext(username, string.IsNullOrWhiteSpace(full) ? username : full, role, area);
    }
}
