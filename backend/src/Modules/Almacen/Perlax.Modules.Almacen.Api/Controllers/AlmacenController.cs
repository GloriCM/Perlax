using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Almacen.Application.Abstractions;
using Perlax.Modules.Almacen.Application.DTOs;

namespace Perlax.Modules.Almacen.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/almacen")]
public class AlmacenController : ControllerBase
{
    private readonly IAlmacenService _service;

    public AlmacenController(IAlmacenService service)
    {
        _service = service;
    }

    [HttpGet("catalogos")]
    public Task<CatalogosResponse> GetCatalogos(CancellationToken ct) =>
        _service.GetCatalogosAsync(ct);

    [HttpGet("productos")]
    public Task<IReadOnlyList<ProductoDto>> ListProductos(
        [FromQuery] string? tipo, [FromQuery] string? q, [FromQuery] string? unidad, CancellationToken ct) =>
        _service.ListProductosAsync(tipo, q, unidad, ct);

    [HttpPost("productos")]
    public async Task<ActionResult<ProductoDto>> CreateProducto([FromBody] ProductoUpsertRequest request, CancellationToken ct)
    {
        try
        {
            var created = await _service.CreateProductoAsync(request, ct);
            return CreatedAtAction(nameof(ListProductos), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("productos/{id:guid}")]
    public async Task<ActionResult<ProductoDto>> UpdateProducto(Guid id, [FromBody] ProductoUpsertRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.UpdateProductoAsync(id, request, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("productos/{id:guid}")]
    public async Task<IActionResult> DeleteProducto(Guid id, CancellationToken ct)
    {
        try
        {
            await _service.DeleteProductoAsync(id, ct);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("productos/importar-excel")]
    public async Task<ActionResult<ImportResultDto>> ImportProductosExcel(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Debe adjuntar un archivo Excel.");
        try
        {
            return Ok(await _service.ImportProductosExcelAsync(file, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("proveedores")]
    public Task<IReadOnlyList<ProveedorDto>> ListProveedores(
        [FromQuery] string? q, [FromQuery] int limit = 50, CancellationToken ct = default) =>
        _service.ListProveedoresAsync(q, limit, ct);

    [HttpPost("proveedores")]
    public async Task<ActionResult<ProveedorDto>> CreateProveedor([FromBody] ProveedorUpsertRequest request, CancellationToken ct)
    {
        try
        {
            var created = await _service.CreateProveedorAsync(request, ct);
            return CreatedAtAction(nameof(ListProveedores), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("proveedores/{id:guid}")]
    public async Task<ActionResult<ProveedorDto>> UpdateProveedor(Guid id, [FromBody] ProveedorUpsertRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.UpdateProveedorAsync(id, request, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("proveedores/{id:guid}")]
    public async Task<IActionResult> DeleteProveedor(Guid id, CancellationToken ct)
    {
        try
        {
            await _service.DeleteProveedorAsync(id, ct);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("proveedores/todos")]
    public async Task<IActionResult> DeleteAllProveedores(CancellationToken ct)
    {
        try
        {
            await _service.DeleteAllProveedoresAsync(ct);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("proveedores/importar-excel")]
    public async Task<ActionResult<ImportResultDto>> ImportProveedoresExcel(IFormFile file, CancellationToken ct)
    {
        if (file == null || file.Length == 0)
            return BadRequest("Debe adjuntar un archivo Excel.");
        try
        {
            return Ok(await _service.ImportProveedoresExcelAsync(file, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("ordenes-produccion")]
    public Task<IReadOnlyList<OrdenProduccionLookupDto>> SearchOrdenesProduccion(
        [FromQuery] string? q, [FromQuery] int limit = 30, CancellationToken ct = default) =>
        _service.SearchOrdenesProduccionAsync(q, limit, ct);

    [HttpGet("requisiciones")]
    public Task<IReadOnlyList<RequisicionListDto>> ListRequisiciones(
        [FromQuery] string? tipo, [FromQuery] string? estado, [FromQuery] string? q, CancellationToken ct) =>
        _service.ListRequisicionesAsync(tipo, estado, q, ct);

    [HttpGet("requisiciones/{id:guid}")]
    public async Task<ActionResult<RequisicionDetailDto>> GetRequisicion(Guid id, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.GetRequisicionAsync(id, ct));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpPost("requisiciones")]
    public async Task<ActionResult<RequisicionDetailDto>> CreateRequisicion([FromBody] RequisicionUpsertRequest request, CancellationToken ct)
    {
        try
        {
            var created = await _service.CreateRequisicionAsync(request, CurrentUser(), ct);
            return CreatedAtAction(nameof(GetRequisicion), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("requisiciones/{id:guid}")]
    public async Task<ActionResult<RequisicionDetailDto>> UpdateRequisicion(Guid id, [FromBody] RequisicionUpsertRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.UpdateRequisicionAsync(id, request, ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("requisiciones/{id:guid}")]
    public async Task<IActionResult> DeleteRequisicion(Guid id, CancellationToken ct)
    {
        try
        {
            await _service.DeleteRequisicionAsync(id, ct);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPut("requisiciones/{id:guid}/pedido")]
    public async Task<ActionResult<RequisicionDetailDto>> GuardarPedido(Guid id, [FromBody] GuardarPedidoRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.GuardarPedidoAsync(id, request, CurrentUser(), ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPatch("requisiciones/{id:guid}/pedido/proveedores/{proveedorId:guid}/pagado")]
    public async Task<IActionResult> PatchPagadoProveedor(Guid id, Guid proveedorId, [FromBody] PagadoProveedorRequest request, CancellationToken ct)
    {
        try
        {
            await _service.PatchPagadoProveedorAsync(id, proveedorId, request, ct);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("requisiciones/{id:guid}/recepciones")]
    public async Task<ActionResult<RequisicionDetailDto>> RegistrarRecepcion(Guid id, [FromBody] RecepcionCreateRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.RegistrarRecepcionAsync(id, request, CurrentUser(), ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpDelete("requisiciones/{id:guid}/pedido")]
    public async Task<IActionResult> DeletePedido(Guid id, CancellationToken ct)
    {
        try
        {
            await _service.DeletePedidoAsync(id, ct);
            return NoContent();
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpGet("ordenes-compra")]
    public Task<IReadOnlyList<OrdenCompraListDto>> ListOrdenesCompra(
        [FromQuery] string? estado,
        [FromQuery] Guid? proveedorCatalogoId,
        [FromQuery] string? nombreProveedor,
        [FromQuery] string? nit,
        CancellationToken ct) =>
        _service.ListOrdenesCompraAsync(estado, proveedorCatalogoId, nombreProveedor, nit, ct);

    [HttpGet("ordenes-compra/{id:guid}")]
    public async Task<ActionResult<OrdenCompraDetailDto>> GetOrdenCompra(Guid id, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.GetOrdenCompraAsync(id, ct));
        }
        catch (InvalidOperationException ex)
        {
            return NotFound(ex.Message);
        }
    }

    [HttpPost("ordenes-compra/consolidar")]
    public async Task<ActionResult<OrdenCompraDetailDto>> ConsolidarOrdenCompra([FromBody] ConsolidarOrdenCompraRequest request, CancellationToken ct)
    {
        try
        {
            return Ok(await _service.ConsolidarOrdenCompraAsync(request, CurrentUser(), ct));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
    }

    [HttpPost("ordenes-compra/reparar-asignaciones")]
    public async Task<ActionResult<object>> RepararAsignaciones(CancellationToken ct)
    {
        var count = await _service.RepararAsignacionesAsync(ct);
        return Ok(new { reparadas = count });
    }

    [HttpDelete("pruebas/reset")]
    public async Task<IActionResult> ResetPruebas(CancellationToken ct)
    {
        await _service.ResetPruebasAsync(ct);
        return NoContent();
    }

    private AlmacenUserContext CurrentUser()
    {
        var userIdRaw = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        Guid? userId = Guid.TryParse(userIdRaw, out var parsed) ? parsed : null;
        var userName = User.FindFirstValue(ClaimTypes.Name)
            ?? User.FindFirstValue("unique_name")
            ?? User.Identity?.Name
            ?? "system";
        return new AlmacenUserContext(userId, userName);
    }
}
