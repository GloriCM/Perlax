using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Audit.Domain.Entities;
using Perlax.Modules.Audit.Infrastructure.Persistence;

namespace Perlax.Modules.Audit.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/audit/logs")]
public class AuditLogsController : ControllerBase
{
    private readonly AuditDbContext _context;

    public AuditLogsController(AuditDbContext context)
    {
        _context = context;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AuditLog>>> GetLogs()
    {
        return await _context.AuditLogs
            .OrderByDescending(l => l.Timestamp)
            .Take(100)
            .ToListAsync();
    }
}
