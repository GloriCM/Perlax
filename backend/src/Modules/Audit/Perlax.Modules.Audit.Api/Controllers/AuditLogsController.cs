using System.Globalization;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Audit.Domain.Entities;
using Perlax.Modules.Audit.Infrastructure.Persistence;

namespace Perlax.Modules.Audit.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/audit/logs")]
public class AuditLogsController : ControllerBase
{
    private const int MaxTake = 3000;
    private const int DefaultTake = 1500;
    /// <summary>Misma ventana que el listado por defecto: solo valores que aparecen en esos eventos.</summary>
    private const int MetadataSampleSize = 1500;

    private readonly AuditDbContext _context;

    public AuditLogsController(AuditDbContext context)
    {
        _context = context;
    }

    /// <summary>Valores distintos solo entre los últimos eventos (misma muestra que el listado por defecto).</summary>
    [HttpGet("metadata")]
    public async Task<ActionResult<AuditLogsMetadataResponse>> GetMetadata(CancellationToken cancellationToken)
    {
        var slice = await _context.AuditLogs.AsNoTracking()
            .OrderByDescending(l => l.Timestamp)
            .Take(MetadataSampleSize)
            .ToListAsync(cancellationToken);

        var actions = slice
            .Select(l => l.Action)
            .Distinct(StringComparer.Ordinal)
            .OrderBy(a => a, StringComparer.Ordinal)
            .ToList();

        var ips = slice
            .Where(l => !string.IsNullOrWhiteSpace(l.IpAddress))
            .Select(l => l.IpAddress)
            .Distinct(StringComparer.Ordinal)
            .OrderBy(ip => ip, StringComparer.Ordinal)
            .ToList();

        return Ok(new AuditLogsMetadataResponse(actions, ips));
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AuditLog>>> GetLogs(
        [FromQuery] string? from,
        [FromQuery] string? to,
        [FromQuery] string? usernames,
        [FromQuery] string? actions,
        [FromQuery] string? ip,
        [FromQuery] string? details,
        [FromQuery] int? take,
        CancellationToken cancellationToken)
    {
        var limit = take ?? DefaultTake;
        if (limit < 1) limit = 1;
        if (limit > MaxTake) limit = MaxTake;

        var query = _context.AuditLogs.AsNoTracking().AsQueryable();

        if (TryParseDateOnly(from, out var fromDay))
            query = query.Where(l => l.Timestamp >= fromDay);

        if (TryParseDateOnly(to, out var toDay))
        {
            var endExclusive = toDay.AddDays(1);
            query = query.Where(l => l.Timestamp < endExclusive);
        }

        var userList = SplitCsv(usernames);
        if (userList.Count > 0)
            query = query.Where(l => l.Username != null && userList.Contains(l.Username));

        var actionList = SplitCsv(actions);
        if (actionList.Count > 0)
            query = query.Where(l => actionList.Contains(l.Action));

        if (!string.IsNullOrWhiteSpace(ip))
        {
            var ipTrim = ip.Trim();
            query = query.Where(l => l.IpAddress != null && l.IpAddress.Contains(ipTrim));
        }

        if (!string.IsNullOrWhiteSpace(details))
        {
            var d = details.Trim();
            query = query.Where(l => l.Details.Contains(d));
        }

        var list = await query
            .OrderByDescending(l => l.Timestamp)
            .Take(limit)
            .ToListAsync(cancellationToken);

        return Ok(list);
    }

    private static List<string> SplitCsv(string? csv)
    {
        if (string.IsNullOrWhiteSpace(csv)) return [];
        return csv.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Where(s => s.Length > 0)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static bool TryParseDateOnly(string? value, out DateTime utcDayStart)
    {
        utcDayStart = default;
        if (string.IsNullOrWhiteSpace(value)) return false;
        if (!DateTime.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed))
            return false;
        utcDayStart = new DateTime(parsed.Year, parsed.Month, parsed.Day, 0, 0, 0, DateTimeKind.Utc);
        return true;
    }
}

public record AuditLogsMetadataResponse(
    IReadOnlyList<string> Actions,
    IReadOnlyList<string> IpAddresses);
