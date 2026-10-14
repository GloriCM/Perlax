using System.Security.Claims;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Users.Infrastructure.Persistence;

namespace Perlax.Modules.Users.Api;

/// <summary>
/// Si la vista del usuario es solo ver, la API no acepta crear, modificar ni borrar.
/// Consultar (GET) sigue permitido. Operario, Auxiliar y Almacén no usan esta matriz.
/// </summary>
public sealed class ViewOnlyWriteFilter : IAsyncActionFilter
{
    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var http = context.HttpContext;
        if (ShouldSkip(http))
        {
            await next();
            return;
        }

        var role = http.User.FindFirstValue(ClaimTypes.Role);
        if (!AllowedRoutesPolicy.IsMatrixRole(role))
        {
            await next();
            return;
        }

        var userIdRaw = http.User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? http.User.FindFirstValue("sub");
        if (!Guid.TryParse(userIdRaw, out var userId))
        {
            await next();
            return;
        }

        var db = http.RequestServices.GetRequiredService<UsersDbContext>();
        var row = await db.Users.AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => new { u.Role, u.AllowedRoutesJson })
            .FirstOrDefaultAsync(http.RequestAborted);

        if (row == null)
        {
            await next();
            return;
        }

        var grants = AllowedRoutesPolicy.DeserializeForResponse(row.Role, row.AllowedRoutesJson);
        if (grants == null)
        {
            await next();
            return;
        }

        var view = http.Request.Headers["X-Perlax-View"].ToString();
        if (!AllowedRoutesPolicy.AllowsWrite(grants, http.Request.Path.Value ?? "", view))
        {
            context.Result = new ObjectResult("Esta vista es solo de consulta.")
            {
                StatusCode = StatusCodes.Status403Forbidden
            };
            return;
        }

        await next();
    }

    private static bool ShouldSkip(HttpContext http)
    {
        if (http.User?.Identity?.IsAuthenticated != true)
            return true;

        var method = http.Request.Method;
        if (HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method))
            return true;

        var path = http.Request.Path.Value ?? "";
        if (path.StartsWith("/api/users", StringComparison.OrdinalIgnoreCase))
            return true;

        if (path.Contains("/cotizador/calculate", StringComparison.OrdinalIgnoreCase)
            || path.Contains("/validate-costs", StringComparison.OrdinalIgnoreCase))
            return true;

        return false;
    }
}
