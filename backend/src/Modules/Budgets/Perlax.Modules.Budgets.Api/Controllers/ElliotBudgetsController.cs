using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Budgets.Application.Elliot;

namespace Perlax.Modules.Budgets.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/budgets/{budgetId:guid}/elliot")]
public class ElliotBudgetsController : ControllerBase
{
    private readonly IElliotBudgetService _service;
    private readonly IAuditService _audit;

    public ElliotBudgetsController(IElliotBudgetService service, IAuditService audit)
    {
        _service = service;
        _audit = audit;
    }

    [HttpGet]
    public async Task<ActionResult> GetWorkbook(Guid budgetId, CancellationToken ct)
    {
        try
        {
            var wb = await _service.GetWorkbookAsync(budgetId, ct);
            return Ok(wb);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpPut]
    public async Task<ActionResult> SaveWorkbook(Guid budgetId, [FromBody] ElliotWorkbookSaveRequest request, CancellationToken ct)
    {
        try
        {
            var wb = await _service.SaveWorkbookAsync(budgetId, request, CurrentUser(), ct);
            // Autoguardado frecuente: no auditar cada keystroke para no saturar el log.
            return Ok(wb);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("no encontrado", StringComparison.OrdinalIgnoreCase))
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("summary")]
    public async Task<ActionResult> GetSummary(Guid budgetId, CancellationToken ct)
    {
        try
        {
            var summary = await _service.GetSummaryAsync(budgetId, ct);
            await Audit("VIEW_BUDGET_ELLIOT_SUMMARY", $"Resumen Elliot presupuesto {budgetId}");
            return Ok(summary);
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpPut("fixed-costs")]
    public async Task<ActionResult> SaveFixedCosts(Guid budgetId, [FromBody] ElliotFixedCostsSaveRequest request, CancellationToken ct)
    {
        try
        {
            var wb = await _service.SaveFixedCostsAsync(budgetId, request, CurrentUser(), ct);
            await Audit("UPDATE_BUDGET_FIXED_COSTS", $"Costos fijos actualizados en {wb.Code}");
            return Ok(wb);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("no encontrado", StringComparison.OrdinalIgnoreCase))
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("variable-costs")]
    public async Task<ActionResult> SaveVariableCosts(Guid budgetId, [FromBody] ElliotVariableCostsSaveRequest request, CancellationToken ct)
    {
        try
        {
            var wb = await _service.SaveVariableCostsAsync(budgetId, request, CurrentUser(), ct);
            await Audit("UPDATE_BUDGET_VARIABLE_COSTS", $"Costos variables actualizados en {wb.Code}");
            return Ok(wb);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("no encontrado", StringComparison.OrdinalIgnoreCase))
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("cost-map")]
    public async Task<ActionResult> SaveMapParams(Guid budgetId, [FromBody] ElliotMapParamsSaveRequest request, CancellationToken ct)
    {
        try
        {
            var wb = await _service.SaveMapParamsAsync(budgetId, request, CurrentUser(), ct);
            await Audit("UPDATE_BUDGET_COST_MAP", $"Mapa de costos actualizado en {wb.Code}");
            return Ok(wb);
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("no encontrado", StringComparison.OrdinalIgnoreCase))
        {
            return NotFound(ex.Message);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    private string CurrentUser() =>
        User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("unique_name") ?? User.Identity?.Name ?? "system";

    private Task Audit(string action, string details) =>
        _audit.LogAsync(CurrentUser(), CurrentUser(), action, details,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
}
