using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace Perlax.Modules.Production.Api.Hubs;

[AllowAnonymous]
public sealed class ProductionFloorHub : Hub
{
    public const string HubPath = "/hubs/production-floor";

    public Task JoinDate(string dateKey) =>
        Groups.AddToGroupAsync(Context.ConnectionId, DateGroup(dateKey));

    public Task LeaveDate(string dateKey) =>
        Groups.RemoveFromGroupAsync(Context.ConnectionId, DateGroup(dateKey));

    public static string DateGroup(string dateKey) => $"floor-date:{dateKey}";
}
