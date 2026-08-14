using Microsoft.AspNetCore.Mvc;

namespace Perlax.Modules.Production.Api.Controllers;

public partial class OpProcessSchedulingController
{
    [HttpGet("billing/summary")]
    public async Task<ActionResult<object>> GetBillingSummary([FromQuery] int? year, [FromQuery] int? month, CancellationToken ct)
    {
        try
        {
            var data = await _scheduling.GetBillingSummaryAsync(year, month, ct);
            return Ok(new
            {
                year = data.Year,
                month = data.Month,
                monthlyGoal = data.MonthlyGoal,
                weekCount = data.WeekCount,
                baseMetaPerWeek = data.BaseMetaPerWeek,
                weeks = data.Weeks.Select(w => new
                {
                    weekIndex = w.WeekIndex,
                    label = w.Label,
                    startDay = w.StartDay,
                    endDay = w.EndDay,
                    generated = w.Generated,
                    baseMeta = w.BaseMeta,
                    totalMeta = w.TotalMeta,
                    delta = w.Delta,
                    carryOut = w.CarryOut
                })
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("billing/meta")]
    public async Task<ActionResult<object>> GetBillingMeta([FromQuery] int? year, [FromQuery] int? month, CancellationToken ct)
    {
        try
        {
            var data = await _scheduling.GetBillingMetaAsync(year, month, ct);
            return Ok(new
            {
                year = data.Year,
                month = data.Month,
                monthlyGoal = data.MonthlyGoal,
                weekCount = data.WeekCount
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("billing/meta")]
    public async Task<ActionResult<object>> SetBillingMeta([FromBody] SetBillingMetaRequest request, CancellationToken ct)
    {
        try
        {
            var data = await _scheduling.SetBillingMetaAsync(
                request.Year, request.Month, request.MonthlyGoal, GetCurrentUserName(), ct);
            return Ok(new { year = data.Year, month = data.Month, monthlyGoal = data.MonthlyGoal });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    public record SetBillingMetaRequest(int Year, int Month, decimal MonthlyGoal);
}