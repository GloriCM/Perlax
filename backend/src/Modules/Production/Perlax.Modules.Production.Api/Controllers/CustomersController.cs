using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.Customers;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/customers")]
public class CustomersController : ControllerBase
{
    private readonly ICustomerService _service;
    private readonly IAuditService _audit;

    public CustomersController(ICustomerService service, IAuditService audit)
    {
        _service = service;
        _audit = audit;
    }

    [HttpGet]
    public async Task<ActionResult> List([FromQuery] string? q, [FromQuery] bool onlyActive = true, [FromQuery] bool syncIfEmpty = true, CancellationToken ct = default)
    {
        var rows = await _service.ListAsync(q, onlyActive, ct);
        // Si el maestro está vacío pero hay OT/OP, importar nombres al abrir Clientes.
        if (syncIfEmpty && rows.Count == 0 && string.IsNullOrWhiteSpace(q))
        {
            await _service.SyncFromDocumentsAsync(User.Identity?.Name ?? "system", ct);
            rows = await _service.ListAsync(q, onlyActive, ct);
        }
        return Ok(rows);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult> Get(Guid id, CancellationToken ct)
    {
        try { return Ok(await _service.GetByIdAsync(id, ct)); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] SaveCustomerCommand body, CancellationToken ct)
    {
        try
        {
            var result = await _service.CreateAsync(body, User.Identity?.Name ?? "system", ct);
            await _audit.LogAsync(User.Identity?.Name, User.Identity?.Name, "CREATE_CUSTOMER",
                $"Cliente {result.Name}", HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] SaveCustomerCommand body, CancellationToken ct)
    {
        try
        {
            await _service.UpdateAsync(id, body, User.Identity?.Name ?? "system", ct);
            return NoContent();
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpDelete("{id:guid}")]
    public async Task<ActionResult> Deactivate(Guid id, CancellationToken ct)
    {
        try
        {
            await _service.DeactivateAsync(id, User.Identity?.Name ?? "system", ct);
            return NoContent();
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    /// <summary>
    /// Importa clientes desde OT / pedidos / OP / remisiones / facturas y enlaza CustomerId.
    /// </summary>
    [HttpPost("sync-from-documents")]
    public async Task<ActionResult> SyncFromDocuments(CancellationToken ct)
    {
        try
        {
            var result = await _service.SyncFromDocumentsAsync(User.Identity?.Name ?? "system", ct);
            await _audit.LogAsync(User.Identity?.Name, User.Identity?.Name, "SYNC_CUSTOMERS",
                $"Clientes sync: created={result.Created}, linked={result.Linked}, total={result.TotalInMaster}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return Ok(result);
        }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }
}
