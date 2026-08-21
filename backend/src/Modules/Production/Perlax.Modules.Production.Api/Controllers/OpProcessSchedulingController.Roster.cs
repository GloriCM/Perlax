using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Production.Application.Scheduling;

namespace Perlax.Modules.Production.Api.Controllers;

public partial class OpProcessSchedulingController
{
    [HttpGet("roster")]
    public async Task<ActionResult<object>> GetRoster([FromQuery] DateTime weekStart, [FromQuery] string? q, CancellationToken ct)
    {
        var data = await _scheduling.GetRosterAsync(weekStart, q, ct);
        return Ok(new
        {
            weekStart = data.WeekStart,
            weekEnd = data.WeekEnd,
            rows = data.Rows.Select(r => new
            {
                id = r.Id,
                rowKind = r.RowKind,
                processCode = r.ProcessCode,
                processLabel = r.ProcessLabel,
                machineId = r.MachineId,
                machineName = r.MachineName,
                displayLabel = r.DisplayLabel,
                operatorId = r.OperatorId,
                operatorName = r.OperatorName,
                roleTag = r.RoleTag,
                sortOrder = r.SortOrder,
                days = r.Days.Select(d => new
                {
                    id = d.Id,
                    dayOfWeek = d.DayOfWeek,
                    date = d.Date,
                    shiftId = d.ShiftId,
                    shiftLabel = d.ShiftLabel,
                    isOff = d.IsOff,
                    hours = d.Hours
                }),
                totalHours = r.TotalHours,
                overtimeHours = r.OvertimeHours
            })
        });
    }

    [HttpPost("roster/rows")]
    public async Task<ActionResult<object>> CreateRosterRow([FromBody] UpsertRosterRowRequest request, CancellationToken ct)
    {
        try
        {
            var id = await _scheduling.CreateRosterRowAsync(ToRosterCommand(request), GetCurrentUserName(), ct);
            return Ok(new { id });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("roster/rows/{id:guid}")]
    public async Task<ActionResult> UpdateRosterRow(Guid id, [FromBody] UpsertRosterRowRequest request, CancellationToken ct)
    {
        try
        {
            await _scheduling.UpdateRosterRowAsync(id, ToRosterCommand(request), GetCurrentUserName(), ct);
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

    [HttpDelete("roster/rows/{id:guid}")]
    public async Task<ActionResult> DeleteRosterRow(Guid id, CancellationToken ct)
    {
        try
        {
            await _scheduling.DeleteRosterRowAsync(id, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPost("roster/copy-previous")]
    public async Task<ActionResult<object>> CopyPreviousRoster([FromBody] CopyRosterRequest request, CancellationToken ct)
    {
        try
        {
            var copied = await _scheduling.CopyPreviousRosterAsync(request.WeekStart, GetCurrentUserName(), ct);
            return Ok(new { copied });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("roster/available-operators")]
    public async Task<ActionResult<object>> GetAvailableOperators(
        [FromQuery] DateTime weekStart,
        [FromQuery] string processCode,
        [FromQuery] DateTime? date,
        CancellationToken ct)
    {
        try
        {
            var data = await _scheduling.GetAvailableOperatorsAsync(weekStart, processCode, date, ct);
            return Ok(new
            {
                processCode = data.ProcessCode,
                processLabel = data.ProcessLabel,
                date = data.Date,
                machines = data.Machines.Select(m => new { id = m.Id, code = m.Code, name = m.Name }),
                operators = data.Operators.Select(o => new
                {
                    operatorId = o.OperatorId,
                    operatorName = o.OperatorName,
                    roleTag = o.RoleTag,
                    shiftId = o.ShiftId,
                    shiftName = o.ShiftName,
                    shiftLabel = o.ShiftLabel,
                    hours = o.Hours
                })
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    private static UpsertRosterRowCommand ToRosterCommand(UpsertRosterRowRequest request) =>
        new(
            request.WeekStart,
            request.ProcessCode,
            request.MachineId,
            request.OperatorId,
            request.RoleTag,
            request.Days?.Select(d => new RosterDayCommand(d.DayOfWeek, d.ShiftId, d.IsOff)).ToList());

    public record UpsertRosterRowRequest(
        DateTime WeekStart,
        string ProcessCode,
        Guid? MachineId,
        Guid? OperatorId,
        string? RoleTag,
        List<RosterDayRequest>? Days);

    public record RosterDayRequest(int DayOfWeek, Guid? ShiftId, bool IsOff);
    public record CopyRosterRequest(DateTime WeekStart);
}