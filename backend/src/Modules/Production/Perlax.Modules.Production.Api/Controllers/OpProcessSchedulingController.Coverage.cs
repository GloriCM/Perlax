using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Production.Application.Scheduling;

namespace Perlax.Modules.Production.Api.Controllers;

public partial class OpProcessSchedulingController
{
    [HttpGet("roster/coverage")]
    public async Task<ActionResult<object>> GetCoverage([FromQuery] DateTime weekStart, [FromQuery] string? q, CancellationToken ct)
    {
        var data = await _scheduling.GetCoverageAsync(weekStart, q, ct);
        return Ok(new
        {
            weekStart = data.WeekStart,
            weekEnd = data.WeekEnd,
            machines = data.Machines.Select(m => new
            {
                id = m.Id,
                code = m.Code,
                name = m.Name,
                processCode = m.ProcessCode,
                enabledShiftCount = m.EnabledShiftCount,
                enabledShifts = m.EnabledShifts.Select(s => new
                {
                    shiftId = s.ShiftId,
                    code = s.Code,
                    name = s.Name,
                    startTime = s.StartTime,
                    endTime = s.EndTime,
                    label = s.Label
                }),
                days = m.Days.Select(d => new
                {
                    dayOfWeek = d.DayOfWeek,
                    date = d.Date,
                    shifts = d.Shifts.Select(s => new
                    {
                        shiftId = s.ShiftId,
                        code = s.Code,
                        name = s.Name,
                        label = s.Label,
                        assignments = s.Assignments.Select(a => new
                        {
                            id = a.Id,
                            operatorId = a.OperatorId,
                            operatorName = a.OperatorName,
                            roleTag = a.RoleTag
                        }),
                        hasOperator = s.HasOperator,
                        isCovered = s.IsCovered
                    }),
                    isConfigured = d.IsConfigured,
                    isCovered = d.IsCovered
                }),
                status = m.Status
            })
        });
    }

    [HttpPost("roster/coverage/assignments")]
    public async Task<ActionResult<object>> CreateCoverageAssignment([FromBody] UpsertCoverageAssignmentRequest request, CancellationToken ct)
    {
        try
        {
            var a = await _scheduling.CreateCoverageAssignmentAsync(
                new UpsertCoverageAssignmentCommand(
                    request.WeekStart,
                    request.MachineId,
                    request.DayOfWeek,
                    request.ShiftId,
                    request.OperatorId,
                    request.RoleTag),
                GetCurrentUserName(), ct);
            return Ok(new
            {
                id = a.Id,
                operatorId = a.OperatorId,
                operatorName = a.OperatorName,
                roleTag = a.RoleTag
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("roster/coverage/assignments/{id:guid}")]
    public async Task<ActionResult> DeleteCoverageAssignment(Guid id, CancellationToken ct)
    {
        try
        {
            await _scheduling.DeleteCoverageAssignmentAsync(id, ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    public record UpsertCoverageAssignmentRequest(
        DateTime WeekStart,
        Guid MachineId,
        int DayOfWeek,
        Guid ShiftId,
        Guid OperatorId,
        string? RoleTag);
}