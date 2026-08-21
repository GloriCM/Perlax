using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Perlax.Modules.Production.Api.Hubs;

[Authorize]
public class InternalChatHub : Hub
{
    public Task JoinConversation(string conversationId)
    {
        if (string.IsNullOrWhiteSpace(conversationId))
            return Task.CompletedTask;

        return Groups.AddToGroupAsync(Context.ConnectionId, $"conversation:{conversationId.Trim()}");
    }

    public Task LeaveConversation(string conversationId)
    {
        if (string.IsNullOrWhiteSpace(conversationId))
            return Task.CompletedTask;

        return Groups.RemoveFromGroupAsync(Context.ConnectionId, $"conversation:{conversationId.Trim()}");
    }
}
