using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Production.Application.Scheduling;

namespace Perlax.Modules.Production.Api.Controllers;

public partial class OpProcessSchedulingController
{
    [HttpGet("processes/all")]
    public async Task<ActionResult<IEnumerable<object>>> GetAllProcesses(CancellationToken ct)
    {
        var rows = await _scheduling.GetAllProcessesAsync(ct);
        return Ok(rows.Select(p => new { id = p.Id, code = p.Code, label = p.Label, sortOrder = p.SortOrder, isActive = p.IsActive }));
    }

    [HttpPost("processes")]
    public async Task<ActionResult<object>> CreateProcess([FromBody] UpsertProcessRequest request, CancellationToken ct)
    {
        try
        {
            var item = await _scheduling.CreateProcessAsync(
                new UpsertProcessCommand(request.Label, request.Code, request.SortOrder, request.IsActive),
                GetCurrentUserName(), ct);
            return Ok(new { id = item.Id, code = item.Code, label = item.Label, sortOrder = item.SortOrder, isActive = item.IsActive });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("processes/{id:guid}")]
    public async Task<ActionResult<object>> UpdateProcess(Guid id, [FromBody] UpsertProcessRequest request, CancellationToken ct)
    {
        try
        {
            var item = await _scheduling.UpdateProcessAsync(
                id, new UpsertProcessCommand(request.Label, request.Code, request.SortOrder, request.IsActive),
                GetCurrentUserName(), ct);
            return Ok(new { id = item.Id, code = item.Code, label = item.Label, sortOrder = item.SortOrder, isActive = item.IsActive });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPut("processes/reorder")]
    public async Task<ActionResult> ReorderProcesses([FromBody] ReorderProcessesRequest request, CancellationToken ct)
    {
        try
        {
            await _scheduling.ReorderProcessesAsync(request.OrderedIds ?? new List<Guid>(), GetCurrentUserName(), ct);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("processes/{id:guid}")]
    public async Task<ActionResult> DeleteProcess(Guid id, CancellationToken ct)
    {
        try
        {
            await _scheduling.DeleteProcessAsync(id, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("machines")]
    public async Task<ActionResult<IEnumerable<object>>> GetSchedulingMachines([FromQuery] string? processCode, CancellationToken ct)
    {
        var rows = await _scheduling.GetSchedulingMachinesAsync(processCode, ct);
        return Ok(rows.Select(m => new { id = m.Id, code = m.Code, name = m.Name, processCode = m.ProcessCode }));
    }

    [HttpGet("shifts")]
    public async Task<ActionResult<IEnumerable<object>>> GetShifts(CancellationToken ct)
    {
        var rows = await _scheduling.GetShiftsAsync(ct);
        return Ok(rows.Select(s => new
        {
            id = s.Id,
            code = s.Code,
            name = s.Name,
            startTime = s.StartTime,
            endTime = s.EndTime,
            crossesMidnight = s.CrossesMidnight,
            hours = s.Hours
        }));
    }

    [HttpPost("shifts")]
    public async Task<ActionResult<object>> CreateShift([FromBody] UpsertShiftRequest request, CancellationToken ct)
    {
        try
        {
            var item = await _scheduling.CreateShiftAsync(new UpsertShiftCommand(
                request.Name, request.Code, request.StartTime, request.EndTime,
                request.CrossesMidnight, request.SortOrder, request.IsActive), ct);
            return Ok(new
            {
                id = item.Id,
                code = item.Code,
                name = item.Name,
                startTime = item.StartTime,
                endTime = item.EndTime,
                crossesMidnight = item.CrossesMidnight,
                hours = item.Hours
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("shifts/{id:guid}")]
    public async Task<ActionResult<object>> UpdateShift(Guid id, [FromBody] UpsertShiftRequest request, CancellationToken ct)
    {
        try
        {
            var item = await _scheduling.UpdateShiftAsync(id, new UpsertShiftCommand(
                request.Name, request.Code, request.StartTime, request.EndTime,
                request.CrossesMidnight, request.SortOrder, request.IsActive), ct);
            return Ok(new
            {
                id = item.Id,
                code = item.Code,
                name = item.Name,
                startTime = item.StartTime,
                endTime = item.EndTime,
                crossesMidnight = item.CrossesMidnight,
                hours = item.Hours
            });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpDelete("shifts/{id:guid}")]
    public async Task<ActionResult> DeleteShift(Guid id, CancellationToken ct)
    {
        try
        {
            await _scheduling.DeleteShiftAsync(id, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    public record UpsertProcessRequest(string Label, string? Code, int SortOrder, bool? IsActive);
    public record ReorderProcessesRequest(List<Guid> OrderedIds);
    public record UpsertShiftRequest(string Name, string? Code, TimeOnly StartTime, TimeOnly EndTime, bool CrossesMidnight, int SortOrder, bool? IsActive);
}