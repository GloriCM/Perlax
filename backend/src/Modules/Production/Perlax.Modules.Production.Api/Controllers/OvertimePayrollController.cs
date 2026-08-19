using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Production.Application.Overtime;
using Perlax.Modules.Production.Domain.Overtime;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/overtime")]
public sealed class OvertimePayrollController : ControllerBase
{
    private readonly IOvertimePayrollService _overtime;

    public OvertimePayrollController(IOvertimePayrollService overtime)
    {
        _overtime = overtime;
    }

    [HttpGet("hour-types")]
    public ActionResult<object> GetHourTypes() => Ok(OvertimeCalculator.DefaultHourTypes.Select(t => new
    {
        code = t.Code,
        name = t.Name,
        factor = t.Factor
    }));

    [HttpPost("calculate")]
    public async Task<ActionResult<OvertimeCalculateResponse>> Calculate(
        [FromBody] OvertimeCalculateRequest request,
        CancellationToken ct)
    {
        try
        {
            var result = await _overtime.CalculateAsync(request, ct);
            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
