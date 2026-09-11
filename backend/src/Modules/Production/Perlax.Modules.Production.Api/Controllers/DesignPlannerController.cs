using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
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
        if (!CanSeeAllJobs())
            jobs = jobs.Where(IsAssignedToJob).ToList();
        return Ok(jobs.Select(MapJob));
    }

    [HttpGet("{jobNumber}")]
    public async Task<ActionResult<object>> GetJob(string jobNumber, CancellationToken ct)
    {
        try
        {
            var job = await _planner.GetJobAsync(jobNumber, ct);
            if (!IsAdminUser() && !CanViewJob(job)) return NotFound();
            return Ok(MapJob(job));
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    [HttpPost]
    public async Task<ActionResult<object>> CreateJob([FromBody] CreateDesignJobRequest request, CancellationToken ct)
    {
        if (!IsAdminUser() && HasDesignArea()) return Forbid();
        try
        {
            var user = GetCurrentUserDisplayName();
            var job = await _planner.CreateJobAsync(
                new CreateDesignJobCommand(request.Cliente, request.Vendedor, request.Trabajo, request.Accion, request.Responsable, request.FechaRecepcion),
                user, ct);
            await _auditService.LogAsync(user, user, "CREATE_DESIGN_JOB",
                $"Trabajo {job.Id} creado para {job.Cliente}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return CreatedAtAction(nameof(GetJob), new { jobNumber = job.Id }, MapJob(job));
        }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpPut("{jobNumber}/proceso")]
    public async Task<ActionResult<object>> SaveProceso(string jobNumber, [FromBody] SaveProcesoRequest request, CancellationToken ct)
    {
        try
        {
            var current = await _planner.GetJobAsync(jobNumber, ct);
            if (!CanEditAssignedProcess(current)) return Forbid();
            var user = GetCurrentUserName();
            var job = await _planner.SaveProcesoAsync(
                jobNumber, new SaveDesignProcesoCommand(request.ProcesoJson), user, ct);
            await _auditService.LogAsync(user, user, "DESIGN_PROCESO",
                $"Proceso de diseño actualizado en {job.Id}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return Ok(MapJob(job));
        }
        catch (KeyNotFoundException) { return NotFound(); }
        catch (InvalidOperationException ex) { return BadRequest(ex.Message); }
    }

    [HttpPut("{jobNumber}/technical-prep")]
    public async Task<ActionResult<object>> SaveTechnicalPrep(string jobNumber, [FromBody] TechnicalPrepRequest request, CancellationToken ct)
    {
        try
        {
            var current = await _planner.GetJobAsync(jobNumber, ct);
            if (!CanEditAssignedProcess(current)) return Forbid();
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
            var current = await _planner.GetJobAsync(jobNumber, ct);
            if (!CanEditAssignedProcess(current)) return Forbid();
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
            var current = await _planner.GetJobAsync(jobNumber, ct);
            if (!CanEditAssignedProcess(current)) return Forbid();
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
            var current = await _planner.GetJobAsync(jobNumber, ct);
            if (!CanEditAssignedProcess(current)) return Forbid();
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
            var current = await _planner.GetJobAsync(jobNumber, ct);
            if (!CanEditAssignedProcess(current)) return Forbid();
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

    [HttpDelete("{jobNumber}")]
    public async Task<IActionResult> DeleteJob(string jobNumber, CancellationToken ct)
    {
        if (!IsAdminUser()) return Forbid();
        try
        {
            var current = await _planner.GetJobAsync(jobNumber, ct);
            var user = GetCurrentUserName();
            await _planner.DeleteJobAsync(jobNumber, ct);
            await _auditService.LogAsync(user, user, "DELETE_DESIGN_JOB",
                $"Trabajo eliminado {current.Id} · {current.Trabajo} ({current.Cliente})",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            return NoContent();
        }
        catch (KeyNotFoundException) { return NotFound(); }
    }

    private static object MapJob(DesignJobDto job) => new
    {
        id = job.Id,
        cliente = job.Cliente,
        vendedor = job.Vendedor,
        trabajo = job.Trabajo,
        accion = job.Accion,
        responsable = job.Responsable,
        estado = job.Estado,
        createdAt = job.CreatedAt,
        createdBy = job.CreatedBy,
        fechaRecepcion = job.FechaRecepcion,
        fechaEntrega = job.FechaEntrega,
        requerimientos = job.Requerimientos,
        fichaAprobada = job.FichaAprobada,
        fechaAprobacion = job.FechaAprobacion,
        comentariosAprobacion = job.ComentariosAprobacion,
        proceso = ParseProceso(job.ProcesoJson),
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

    private string GetCurrentUserDisplayName()
    {
        var full = string.Join(' ', new[]
        {
            User.FindFirstValue(ClaimTypes.GivenName) ?? User.FindFirstValue("given_name"),
            User.FindFirstValue(ClaimTypes.Surname) ?? User.FindFirstValue("family_name")
        }.Where(s => !string.IsNullOrWhiteSpace(s))).Trim();
        if (!string.IsNullOrWhiteSpace(full)) return full;
        return GetCurrentUserName();
    }

    private bool IsAdminUser()
    {
        var role = (User.FindFirstValue(ClaimTypes.Role)
            ?? User.FindFirstValue("role")
            ?? string.Empty).Trim().ToLowerInvariant();
        return role is "admin" or "administrador";
    }

    private bool CanSeeAllJobs() => IsAdminUser();

    private bool HasDesignArea()
    {
        var area = User.FindFirstValue("area") ?? string.Empty;
        return NormalizePerson(area).Contains("dise");
    }

    private bool CanEditAssignedProcess(DesignJobDto job) => HasDesignArea() && IsAssignedToJob(job);

    private bool CanViewJob(DesignJobDto job) => CanSeeAllJobs() || IsAssignedToJob(job);

    private bool IsAssignedToJob(DesignJobDto job)
    {
        var responsable = NormalizePerson(job.Responsable);
        if (responsable.Length == 0) return false;

        foreach (var candidate in GetCurrentPersonKeys())
        {
            if (MatchesPerson(responsable, candidate)) return true;
        }
        return false;
    }

    private IEnumerable<string> GetCurrentPersonKeys()
    {
        var keys = new HashSet<string>();
        void add(string? value)
        {
            var normalized = NormalizePerson(value);
            if (normalized.Length >= 2) keys.Add(normalized);
        }

        // Identidades completas (no first/last sueltos: "diseño" matcheaba "diseño diseño").
        add(GetCurrentUserName());
        add(User.FindFirstValue("unique_name"));
        add(User.FindFirstValue("document_number"));
        add(User.FindFirstValue("DocumentNumber"));
        add(string.Join(' ', new[]
        {
            User.FindFirstValue(ClaimTypes.GivenName) ?? User.FindFirstValue("given_name"),
            User.FindFirstValue(ClaimTypes.Surname) ?? User.FindFirstValue("family_name")
        }.Where(s => !string.IsNullOrWhiteSpace(s))));

        return keys;
    }

    private static bool MatchesPerson(string responsable, string candidate)
    {
        if (candidate.Length < 2 || responsable.Length == 0) return false;
        if (responsable == candidate) return true;

        var responsableParts = responsable.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(p => p.Length >= 2)
            .Distinct()
            .ToArray();
        var candidateParts = candidate.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(p => p.Length >= 2)
            .Distinct()
            .ToArray();

        // Nombres compuestos: solo si coinciden exactamente como conjunto de palabras.
        if (responsableParts.Length >= 2 && candidateParts.Length >= 2
            && responsableParts.Length == candidateParts.Length
            && candidateParts.All(responsableParts.Contains))
        {
            return true;
        }

        return false;
    }

    private static string NormalizePerson(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return string.Empty;
        var normalized = value.Trim().Normalize(NormalizationForm.FormD);
        var chars = normalized.Where(c => CharUnicodeInfo.GetUnicodeCategory(c) != UnicodeCategory.NonSpacingMark);
        return new string(chars.ToArray()).ToLowerInvariant();
    }

    private static object ParseProceso(string? json)
    {
        try
        {
            return JsonSerializer.Deserialize<object>(string.IsNullOrWhiteSpace(json) ? "{}" : json)
                ?? new Dictionary<string, object>();
        }
        catch
        {
            return new Dictionary<string, object>();
        }
    }

    public record CreateDesignJobRequest(string Cliente, string Vendedor, string Trabajo, string Accion, string Responsable, string? FechaRecepcion);
    public record SaveProcesoRequest(string? ProcesoJson);
    public record TechnicalPrepRequest(string? FechaRecepcion, string? Requerimientos);
    public record AddActivityRequest(string Nombre, string FechaEnvio, string? FechaRecepcion, int Repeticiones, string? Observaciones);
    public record UpdateActivityRequest(bool? Completada);
    public record ApproveJobRequest(string? FechaAprobacion, string? ComentariosAprobacion);
}