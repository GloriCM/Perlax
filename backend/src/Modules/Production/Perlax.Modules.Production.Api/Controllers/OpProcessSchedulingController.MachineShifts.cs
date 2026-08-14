using Microsoft.AspNetCore.Mvc;

namespace Perlax.Modules.Production.Api.Controllers;

public partial class OpProcessSchedulingController
{
    [HttpGet("machines/{machineId:guid}/shifts")]
    public async Task<ActionResult<object>> GetMachineShifts(Guid machineId, CancellationToken ct)
    {
        try
        {
            var data = await _scheduling.GetMachineShiftsAsync(machineId, ct);
            return Ok(new
            {
                machine = new
                {
                    id = data.Machine.Id,
                    code = data.Machine.Code,
                    name = data.Machine.Name,
                    processCode = data.Machine.ProcessCode
                },
                shifts = data.Shifts.Select(s => new
                {
                    shiftId = s.ShiftId,
                    code = s.Code,
                    name = s.Name,
                    startTime = s.StartTime,
                    endTime = s.EndTime,
                    isEnabled = s.IsEnabled,
                    sortOrder = s.SortOrder
                })
            });
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    [HttpPut("machines/{machineId:guid}/shifts")]
    public async Task<ActionResult> SetMachineShifts(Guid machineId, [FromBody] SetMachineShiftsRequest request, CancellationToken ct)
    {
        try
        {
            await _scheduling.SetMachineShiftsAsync(machineId, request.EnabledShiftIds ?? new List<Guid>(), ct);
            return NoContent();
        }
        catch (KeyNotFoundException)
        {
            return NotFound();
        }
    }

    public record SetMachineShiftsRequest(List<Guid> EnabledShiftIds);
}