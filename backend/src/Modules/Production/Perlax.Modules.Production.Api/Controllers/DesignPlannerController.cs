using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.Design;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/design/planner/jobs")]
public class DesignPlannerController : ControllerBase
{
    private readonly IDesignPlannerService _planner;
    private readonly IAuditService _auditService;

    public DesignPlannerController(IDesignPlannerService planner, IAuditService auditService)
    {
        _planner = planner;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetJobs(CancellationToken ct)
    {
        var jobs = await _planner.ListJobsAsync(ct);
        return Ok(jobs.Select(MapJob));
    }

    [HttpGet("{jobNumber}")]
    public async Task<ActionResult<object>> GetJob(string jobNumber, CancellationToken ct)
    {
        try { return Ok(MapJob(await _planner.GetJobAsync(jobNumber, ct))); }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost]
    public async Task<ActionResult<object>> CreateJob([FromBody] CreateDesignJobRequest request, CancellationToken ct)
    {
        try
        {
            var user = GetCurrentUserName();
            var job = await _planner.CreateJobAsync(
                new CreateDesignJobCommand(request.Cliente, request.Vendedor, request.Trabajo, request.Responsable, request.FechaEntrega),
                user, ct);
            await _auditService.LogAsync(user, user, "CREATE_DESIGN_JOB",
                $"Trabajo {job.Id} creado para {job.Cliente}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return CreatedAtAction(nameof(GetJob), new { jobNumber = job.Id }, MapJob(job));
        }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpPut("{jobNumber}/technical-prep")]
    public async Task<ActionResult<object>> SaveTechnicalPrep(string jobNumber, [FromBody] TechnicalPrepRequest request, CancellationToken ct)
    {
        try
        {
            var user = GetCurrentUserName();
            var job = await _planner.SaveTechnicalPrepAsync(
                jobNumber, new TechnicalPrepCommand(request.FechaRecepcion, request.Requerimientos), user, ct);
            await _auditService.LogAsync(user, user, "DESIGN_TECHNICAL_PREP",
                $"Preparación técnica actualizada en {job.Id}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return Ok(MapJob(job));
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost("{jobNumber}/activities")]
    public async Task<ActionResult<object>> AddActivity(string jobNumber, [FromBody] AddActivityRequest request, CancellationToken ct)
    {
        try
        {
            var job = await _planner.AddActivityAsync(
                jobNumber,
                new AddDesignActivityCommand(request.Nombre, request.FechaEnvio, request.FechaRecepcion, request.Repeticiones, request.Observaciones),
                GetCurrentUserName(), ct);
            return Ok(MapJob(job));
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpPut("{jobNumber}/activities/{activityId:guid}")]
    public async Task<ActionResult<object>> UpdateActivity(string jobNumber, Guid activityId, [FromBody] UpdateActivityRequest request, CancellationToken ct)
    {
        try
        {
            var job = await _planner.UpdateActivityAsync(
                jobNumber, activityId, new UpdateDesignActivityCommand(request.Completada), GetCurrentUserName(), ct);
            return Ok(MapJob(job));
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPut("{jobNumber}/approve")]
    public async Task<ActionResult<object>> ApproveJob(string jobNumber, [FromBody] ApproveJobRequest request, CancellationToken ct)
    {
        try
        {
            var user = GetCurrentUserName();
            var job = await _planner.ApproveJobAsync(
                jobNumber, new ApproveDesignJobCommand(request.FechaAprobacion, request.ComentariosAprobacion), user, ct);
            await _auditService.LogAsync(user, user, "DESIGN_JOB_APPROVE",
                $"Ficha aprobada en {job.Id}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return Ok(MapJob(job));
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpPut("{jobNumber}/finish")]
    public async Task<ActionResult<object>> FinishJob(string jobNumber, CancellationToken ct)
    {
        try
        {
            var user = GetCurrentUserName();
            var job = await _planner.FinishJobAsync(jobNumber, user, ct);
            await _auditService.LogAsync(user, user, "DESIGN_JOB_FINISH",
                $"Trabajo finalizado {job.Id}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return Ok(MapJob(job));
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    private static object MapJob(DesignJobDto job) => new
    {
        id = job.Id,
        cliente = job.Cliente,
        vendedor = job.Vendedor,
        trabajo = job.Trabajo,
        responsable = job.Responsable,
        estado = job.Estado,
        createdAt = job.CreatedAt,
        fechaRecepcion = job.FechaRecepcion,
        fechaEntrega = job.FechaEntrega,
        requerimientos = job.Requerimientos,
        fichaAprobada = job.FichaAprobada,
        fechaAprobacion = job.FechaAprobacion,
        comentariosAprobacion = job.ComentariosAprobacion,
        historial = job.Historial,
        actividades = job.Actividades.Select(a => new
        {
            id = a.Id,
            nombre = a.Nombre,
            fechaEnvio = a.FechaEnvio,
            fechaRecepcion = a.FechaRecepcion,
            repeticiones = a.Repeticiones,
            observaciones = a.Observaciones,
            completada = a.Completada
        })
    };

    private string GetCurrentUserName()
    {
        var name = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("unique_name") ?? User.Identity?.Name;
        return string.IsNullOrWhiteSpace(name) ? "system" : name;
    }

    public record CreateDesignJobRequest(string Cliente, string Vendedor, string Trabajo, string Responsable, string? FechaEntrega);
    public record TechnicalPrepRequest(string? FechaRecepcion, string? Requerimientos);
    public record AddActivityRequest(string Nombre, string FechaEnvio, string? FechaRecepcion, int Repeticiones, string? Observaciones);
    public record UpdateActivityRequest(bool? Completada);
    public record ApproveJobRequest(string? FechaAprobacion, string? ComentariosAprobacion);
}