using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Production.Application.ManagementReports;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/management-reports")]
public class ManagementReportsController : ControllerBase
{
    private readonly IManagementReportsService _service;

    public ManagementReportsController(IManagementReportsService service) => _service = service;

    [HttpGet]
    public ActionResult List()
    {
        var items = _service.ListAvailable()
            .Select(x => new { key = x.Key, title = x.Title, description = x.Description });
        return Ok(items);
    }

    [HttpGet("{reportKey}")]
    public async Task<ActionResult> Get(
        string reportKey,
        [FromQuery] DateTime? from,
        [FromQuery] DateTime? to,
        [FromQuery] string? client,
        [FromQuery] string? q,
        CancellationToken ct)
    {
        try
        {
            var result = await _service.GetReportAsync(reportKey, from, to, client, q, ct);
            return Ok(new
            {
                reportKey = result.ReportKey,
                title = result.Title,
                description = result.Description,
                columns = result.Columns.Select(c => new { key = c.Field, label = c.Label }),
                rows = result.Rows,
                externalLink = result.ExternalLink,
                externalLinkLabel = result.ExternalLinkLabel,
            });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { message = "Informe no encontrado." });
        }
    }
}
