using System.Security.Claims;
using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/design/planner/jobs")]
public class DesignPlannerController : ControllerBase
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private static readonly HashSet<string> ValidActivities = ["Planchas", "Troquel", "Muestras", "Impresión digital", "Arte", "Expertis"];
    private readonly ProductionDbContext _context;
    private readonly IAuditService _auditService;

    public DesignPlannerController(ProductionDbContext context, IAuditService auditService)
    {
        _context = context;
        _auditService = auditService;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetJobs()
    {
        var jobs = await _context.DesignPlannerJobs.AsNoTracking().Include(j => j.Actividades.OrderBy(a => a.SortOrder)).OrderByDescending(j => j.CreatedAt).ToListAsync();
        return Ok(jobs.Select(MapJob));
    }

    [HttpGet("{jobNumber}")]
    public async Task<ActionResult<object>> GetJob(string jobNumber)
    {
        var job = await FindJobAsync(jobNumber);
        if (job == null) return NotFound();
        return Ok(MapJob(job));
    }

    [HttpPost]
    public async Task<ActionResult<object>> CreateJob([FromBody] CreateDesignJobRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Cliente) || string.IsNullOrWhiteSpace(request.Vendedor) || string.IsNullOrWhiteSpace(request.Trabajo) || string.IsNullOrWhiteSpace(request.Responsable))
            return BadRequest("Cliente, vendedor, trabajo y responsable son obligatorios.");

        var jobNumber = await GenerateNextJobNumberAsync();
        var user = GetCurrentUserName();
        var job = new DesignPlannerJob
        {
            Id = Guid.NewGuid(),
            JobNumber = jobNumber,
            Cliente = request.Cliente.Trim(),
            Vendedor = request.Vendedor.Trim(),
            Trabajo = request.Trabajo.Trim(),
            Responsable = request.Responsable.Trim(),
            Estado = "Nuevo Trabajo Pendiente",
            CreatedAt = DateTime.UtcNow,
            FechaEntrega = ParseDate(request.FechaEntrega),
            HistorialJson = AppendHistorial(null, "Trabajo creado con estado \"Nuevo Trabajo Pendiente\".", "Notificación enviada al area de diseño."),
            UpdatedAt = DateTime.UtcNow,
            UpdatedBy = user
        };

        _context.DesignPlannerJobs.Add(job);
        await _context.SaveChangesAsync();
        await _auditService.LogAsync(user, user, "CREATE_DESIGN_JOB", $"Trabajo {job.JobNumber} creado para {job.Cliente}", HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
        var created = await FindJobAsync(job.JobNumber);
        return CreatedAtAction(nameof(GetJob), new { jobNumber = job.JobNumber }, MapJob(created!));
    }

    [HttpPut("{jobNumber}/technical-prep")]
    public async Task<ActionResult<object>> SaveTechnicalPrep(string jobNumber, [FromBody] TechnicalPrepRequest request)
    {
        var job = await _context.DesignPlannerJobs.Include(j => j.Actividades.OrderBy(a => a.SortOrder)).FirstOrDefaultAsync(j => j.JobNumber == jobNumber);
        if (job == null) return NotFound();
        job.FechaRecepcion = ParseDate(request.FechaRecepcion);
        job.Requerimientos = request.Requerimientos?.Trim() ?? string.Empty;
        if (job.Estado == "Nuevo Trabajo Pendiente") job.Estado = "En Desarrollo";
        job.HistorialJson = AppendHistorial(job.HistorialJson, "Preparación técnica actualizada por area de diseño.");
        job.UpdatedAt = DateTime.UtcNow;
        job.UpdatedBy = GetCurrentUserName();
        await _context.SaveChangesAsync();
        await _auditService.LogAsync(GetCurrentUserName(), GetCurrentUserName(), "DESIGN_TECHNICAL_PREP", $"Preparación técnica actualizada en {job.JobNumber}", HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
        return Ok(MapJob(job));
    }

    [HttpPost("{jobNumber}/activities")]
    public async Task<ActionResult<object>> AddActivity(string jobNumber, [FromBody] AddActivityRequest request)
    {
        var job = await _context.DesignPlannerJobs.Include(j => j.Actividades).FirstOrDefaultAsync(j => j.JobNumber == jobNumber);
        if (job == null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Nombre) || !ValidActivities.Contains(request.Nombre)) return BadRequest("Actividad no válida.");
        var fechaEnvio = ParseDateOnly(request.FechaEnvio);
        if (fechaEnvio == null) return BadRequest("La fecha de envío es obligatoria.");
        var fechaRecepcion = ParseDateOnly(request.FechaRecepcion);
        if (fechaRecepcion.HasValue && fechaRecepcion.Value < fechaEnvio.Value) return BadRequest("La fecha de recepción no puede ser anterior a la fecha de envío.");
        var activity = new DesignPlannerActivity
        {
            Id = Guid.NewGuid(),
            DesignPlannerJobId = job.Id,
            Nombre = request.Nombre,
            FechaEnvio = fechaEnvio.Value,
            FechaRecepcion = fechaRecepcion,
            Repeticiones = request.Repeticiones > 0 ? request.Repeticiones : 1,
            Observaciones = request.Observaciones?.Trim() ?? string.Empty,
            SortOrder = job.Actividades.Count
        };
        job.Actividades.Add(activity);
        job.HistorialJson = AppendHistorial(job.HistorialJson, $"Actividad \"{activity.Nombre}\" agregada al cronograma.");
        job.UpdatedAt = DateTime.UtcNow;
        job.UpdatedBy = GetCurrentUserName();
        await _context.SaveChangesAsync();
        var updated = await FindJobAsync(jobNumber);
        return Ok(MapJob(updated!));
    }

    [HttpPut("{jobNumber}/activities/{activityId:guid}")]
    public async Task<ActionResult<object>> UpdateActivity(string jobNumber, Guid activityId, [FromBody] UpdateActivityRequest request)
    {
        var job = await _context.DesignPlannerJobs.Include(j => j.Actividades.OrderBy(a => a.SortOrder)).FirstOrDefaultAsync(j => j.JobNumber == jobNumber);
        if (job == null) return NotFound();
        var activity = job.Actividades.FirstOrDefault(a => a.Id == activityId);
        if (activity == null) return NotFound();
        if (request.Completada.HasValue) activity.Completada = request.Completada.Value;
        if (job.FichaAprobada && GetProgress(job.Actividades) == 100) job.Estado = "Finalizado";
        job.UpdatedAt = DateTime.UtcNow;
        job.UpdatedBy = GetCurrentUserName();
        await _context.SaveChangesAsync();
        return Ok(MapJob(job));
    }

    [HttpPut("{jobNumber}/approve")]
    public async Task<ActionResult<object>> ApproveJob(string jobNumber, [FromBody] ApproveJobRequest request)
    {
        var job = await _context.DesignPlannerJobs.Include(j => j.Actividades.OrderBy(a => a.SortOrder)).FirstOrDefaultAsync(j => j.JobNumber == jobNumber);
        if (job == null) return NotFound();
        var fechaAprobacion = ParseDate(request.FechaAprobacion);
        if (fechaAprobacion == null) return BadRequest("Debes registrar la fecha de aprobación final.");
        job.FechaAprobacion = fechaAprobacion;
        job.ComentariosAprobacion = request.ComentariosAprobacion?.Trim() ?? string.Empty;
        job.FichaAprobada = true;
        job.Estado = GetProgress(job.Actividades) == 100 ? "Finalizado" : "Aprobación";
        job.HistorialJson = AppendHistorial(job.HistorialJson, "Ficha técnica aprobada y notificacion enviada a involucrados.");
        job.UpdatedAt = DateTime.UtcNow;
        job.UpdatedBy = GetCurrentUserName();
        await _context.SaveChangesAsync();
        await _auditService.LogAsync(GetCurrentUserName(), GetCurrentUserName(), "DESIGN_JOB_APPROVE", $"Ficha aprobada en {job.JobNumber}", HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
        return Ok(MapJob(job));
    }

    [HttpPut("{jobNumber}/finish")]
    public async Task<ActionResult<object>> FinishJob(string jobNumber)
    {
        var job = await _context.DesignPlannerJobs.Include(j => j.Actividades.OrderBy(a => a.SortOrder)).FirstOrDefaultAsync(j => j.JobNumber == jobNumber);
        if (job == null) return NotFound();
        if (!job.FichaAprobada) return BadRequest("No se puede finalizar sin la aprobación de la ficha técnica.");
        job.Estado = "Finalizado";
        job.HistorialJson = AppendHistorial(job.HistorialJson, "Trabajo finalizado con aprobación previa.");
        job.UpdatedAt = DateTime.UtcNow;
        job.UpdatedBy = GetCurrentUserName();
        await _context.SaveChangesAsync();
        await _auditService.LogAsync(GetCurrentUserName(), GetCurrentUserName(), "DESIGN_JOB_FINISH", $"Trabajo finalizado {job.JobNumber}", HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
        return Ok(MapJob(job));
    }

    private async Task<DesignPlannerJob?> FindJobAsync(string jobNumber) =>
        await _context.DesignPlannerJobs.AsNoTracking().Include(j => j.Actividades.OrderBy(a => a.SortOrder)).FirstOrDefaultAsync(j => j.JobNumber == jobNumber);

    private async Task<string> GenerateNextJobNumberAsync()
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"PJ-{year}-";
        var existing = await _context.DesignPlannerJobs.AsNoTracking().Where(j => j.JobNumber.StartsWith(prefix)).Select(j => j.JobNumber).ToListAsync();
        var max = 0;
        foreach (var value in existing)
        {
            var suffix = value[prefix.Length..];
            if (int.TryParse(suffix, out var parsed) && parsed > max) max = parsed;
        }
        return $"{prefix}{(max + 1).ToString().PadLeft(3, '0')}";
    }

    private string GetCurrentUserName()
    {
        var name = User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("unique_name") ?? User.Identity?.Name;
        return string.IsNullOrWhiteSpace(name) ? "system" : name;
    }

    private static object MapJob(DesignPlannerJob job) => new
    {
        id = job.JobNumber,
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
        historial = ParseHistorial(job.HistorialJson),
        actividades = job.Actividades.OrderBy(a => a.SortOrder).Select(a => new
        {
            id = a.Id,
            nombre = a.Nombre,
            fechaEnvio = a.FechaEnvio.ToString("yyyy-MM-dd"),
            fechaRecepcion = a.FechaRecepcion?.ToString("yyyy-MM-dd") ?? string.Empty,
            repeticiones = a.Repeticiones,
            observaciones = a.Observaciones,
            completada = a.Completada
        })
    };

    private static int GetProgress(IEnumerable<DesignPlannerActivity> actividades)
    {
        var list = actividades.ToList();
        if (list.Count == 0) return 0;
        return (int)Math.Round((double)list.Count(a => a.Completada) / list.Count * 100);
    }

    private static List<string> ParseHistorial(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try { return JsonSerializer.Deserialize<List<string>>(json, JsonOpts) ?? []; }
        catch { return []; }
    }

    private static string AppendHistorial(string? json, params string[] entries)
    {
        var list = ParseHistorial(json);
        list.AddRange(entries);
        return JsonSerializer.Serialize(list, JsonOpts);
    }

    private static DateTime? ParseDate(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return DateTime.TryParse(value, out var parsed) ? DateTime.SpecifyKind(parsed.Date, DateTimeKind.Utc) : null;
    }

    private static DateOnly? ParseDateOnly(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return DateOnly.TryParse(value, out var parsed) ? parsed : null;
    }

    public record CreateDesignJobRequest(string Cliente, string Vendedor, string Trabajo, string Responsable, string? FechaEntrega);
    public record TechnicalPrepRequest(string? FechaRecepcion, string? Requerimientos);
    public record AddActivityRequest(string Nombre, string FechaEnvio, string? FechaRecepcion, int Repeticiones, string? Observaciones);
    public record UpdateActivityRequest(bool? Completada);
    public record ApproveJobRequest(string? FechaAprobacion, string? ComentariosAprobacion);
}
