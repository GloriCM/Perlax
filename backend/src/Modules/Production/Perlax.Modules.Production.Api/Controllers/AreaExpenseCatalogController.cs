using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Production.Application.AreaExpense;
using Perlax.Modules.Production.Application.Common;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/gastos/{area}")]
public sealed class AreaExpenseCatalogController : ControllerBase
{
    private readonly IAreaExpenseCatalogService _catalog;

    public AreaExpenseCatalogController(IAreaExpenseCatalogService catalog)
    {
        _catalog = catalog;
    }

    [HttpGet("rubros")]
    public async Task<ActionResult<IReadOnlyList<AreaExpenseRubroDto>>> GetRubros(string area, CancellationToken ct) =>
        await Execute(() => _catalog.ListRubrosAsync(area, ct));

    [HttpPost("rubros")]
    public async Task<ActionResult<AreaExpenseRubroDto>> CreateRubro(
        string area, [FromBody] AreaExpenseNameRequest request, CancellationToken ct) =>
        await Execute(() => _catalog.CreateRubroAsync(area, request, ct));

    [HttpPost("rubros/{id:guid}")]
    [HttpPut("rubros/{id:guid}")]
    public async Task<ActionResult<AreaExpenseRubroDto>> UpdateRubro(
        string area, Guid id, [FromBody] AreaExpenseNameRequest request, CancellationToken ct) =>
        await Execute(() => _catalog.UpdateRubroAsync(area, id, request, ct));

    [HttpDelete("rubros/{id:guid}")]
    public async Task<IActionResult> DeleteRubro(string area, Guid id, CancellationToken ct) =>
        await ExecuteStatus(() => _catalog.DeleteRubroAsync(area, id, ct));

    [HttpGet("proveedores")]
    public async Task<ActionResult<IReadOnlyList<AreaExpenseProveedorDto>>> GetProveedores(string area, CancellationToken ct) =>
        await Execute(() => _catalog.ListProveedoresAsync(area, ct));

    [HttpPost("proveedores")]
    public async Task<ActionResult<AreaExpenseProveedorDto>> CreateProveedor(
        string area, [FromBody] AreaExpenseProveedorRequest request, CancellationToken ct) =>
        await Execute(() => _catalog.CreateProveedorAsync(area, request, ct));

    [HttpPost("proveedores/{id:guid}")]
    [HttpPut("proveedores/{id:guid}")]
    public async Task<ActionResult<AreaExpenseProveedorDto>> UpdateProveedor(
        string area, Guid id, [FromBody] AreaExpenseProveedorRequest request, CancellationToken ct) =>
        await Execute(() => _catalog.UpdateProveedorAsync(area, id, request, ct));

    [HttpDelete("proveedores/{id:guid}")]
    public async Task<IActionResult> DeleteProveedor(string area, Guid id, CancellationToken ct) =>
        await ExecuteStatus(() => _catalog.DeleteProveedorAsync(area, id, ct));

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