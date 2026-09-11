using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Production.Application.AreaExpense;
using Perlax.Modules.Production.Application.Common;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/gastos/{area}")]
public sealed class AreaExpenseCaptureController : ControllerBase
{
    private readonly IAreaExpenseCaptureService _capture;

    public AreaExpenseCaptureController(IAreaExpenseCaptureService capture)
    {
        _capture = capture;
    }

    [HttpGet("capturas")]
    public async Task<ActionResult<IReadOnlyList<AreaExpenseCapturaDto>>> List(
        string area,
        [FromQuery] int? year,
        [FromQuery] int? month,
        [FromQuery] string? rubro,
        [FromQuery] string? status,
        CancellationToken ct) =>
        await Execute(() => _capture.ListAsync(area, year, month, rubro, status, ct));

    [HttpGet("capturas/{id:guid}")]
    public async Task<ActionResult<AreaExpenseCapturaDto>> Get(string area, Guid id, CancellationToken ct) =>
        await Execute(() => _capture.GetAsync(area, id, ct));

    [HttpPost("capturas")]
    public async Task<ActionResult<AreaExpenseCapturaDto>> Create(
        string area, [FromBody] AreaExpenseCapturaRequest request, CancellationToken ct) =>
        await Execute(() => _capture.CreateAsync(area, request, ct));

    [HttpPut("capturas/{id:guid}")]
    [HttpPost("capturas/{id:guid}")]
    public async Task<ActionResult<AreaExpenseCapturaDto>> Update(
        string area, Guid id, [FromBody] AreaExpenseCapturaRequest request, CancellationToken ct) =>
        await Execute(() => _capture.UpdateAsync(area, id, request, ct));

    [HttpDelete("capturas/{id:guid}")]
    public async Task<IActionResult> Delete(string area, Guid id, CancellationToken ct) =>
        await ExecuteStatus(() => _capture.DeleteAsync(area, id, ct));

    [HttpPost("capturas/overtime-batch")]
    public async Task<ActionResult<IReadOnlyList<AreaExpenseCapturaDto>>> CreateOvertimeBatch(
        string area, [FromBody] AreaExpenseOvertimeBatchRequest request, CancellationToken ct) =>
        await Execute(() => _capture.CreateOvertimeBatchAsync(area, request, ct));

    [HttpDelete("capturas/overtime-group/{groupId:guid}")]
    public async Task<IActionResult> DeleteOvertimeGroup(string area, Guid groupId, CancellationToken ct) =>
        await ExecuteStatus(() => _capture.DeleteOvertimeGroupAsync(area, groupId, ct));

    private async Task<ActionResult<T>> Execute<T>(Func<Task<T>> action)
    {
        try
        {
            return Ok(await action());
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ResourceConflictException ex)
        {
            return Conflict(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    private async Task<IActionResult> ExecuteStatus(Func<Task> action)
    {
        try
        {
            await action();
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (ResourceConflictException ex)
        {
            return Conflict(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }
}
