using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Design;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class DesignPlannerService : IDesignPlannerService
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
    private static readonly HashSet<string> ValidActivities = ["Planchas", "Troquel", "Muestras", "Impresión digital", "Arte", "Expertis"];

    private readonly ProductionDbContext _db;

    public DesignPlannerService(ProductionDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<DesignJobDto>> ListJobsAsync(CancellationToken ct = default)
    {
        var jobs = await _db.DesignPlannerJobs.AsNoTracking()
            .Include(j => j.Actividades.OrderBy(a => a.SortOrder))
            .OrderByDescending(j => j.CreatedAt)
            .ToListAsync(ct);
        return jobs.Select(MapJob).ToList();
    }

    public async Task<DesignJobDto> GetJobAsync(string jobNumber, CancellationToken ct = default)
    {
        var job = await FindJobAsync(jobNumber, ct)
            ?? throw new KeyNotFoundException("Trabajo de diseno no encontrado.");
        return MapJob(job);
    }

    public async Task<DesignJobDto> CreateJobAsync(CreateDesignJobCommand command, string userName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(command.Cliente) || string.IsNullOrWhiteSpace(command.Vendedor)
            || string.IsNullOrWhiteSpace(command.Trabajo) || string.IsNullOrWhiteSpace(command.Responsable))
            throw new InvalidOperationException("Cliente, vendedor, trabajo y responsable son obligatorios.");

        var jobNumber = await GenerateNextJobNumberAsync(ct);
        var job = new DesignPlannerJob
        {
            Id = Guid.NewGuid(),
            JobNumber = jobNumber,
            Cliente = command.Cliente.Trim(),
            Vendedor = command.Vendedor.Trim(),
            Trabajo = command.Trabajo.Trim(),
            Responsable = command.Responsable.Trim(),
            Estado = "Nuevo Trabajo Pendiente",
            CreatedAt = DateTime.UtcNow,
            FechaEntrega = ParseDate(command.FechaEntrega),
            HistorialJson = AppendHistorial(null, "Trabajo creado con estado \"Nuevo Trabajo Pendiente\".", "Notificación enviada al area de diseño."),
            UpdatedAt = DateTime.UtcNow,
            UpdatedBy = userName
        };

        _db.DesignPlannerJobs.Add(job);
        await _db.SaveChangesAsync(ct);
        return MapJob((await FindJobAsync(job.JobNumber, ct))!);
    }

    public async Task<DesignJobDto> SaveTechnicalPrepAsync(string jobNumber, TechnicalPrepCommand command, string userName, CancellationToken ct = default)
    {
        var job = await _db.DesignPlannerJobs
            .Include(j => j.Actividades.OrderBy(a => a.SortOrder))
            .FirstOrDefaultAsync(j => j.JobNumber == jobNumber, ct)
            ?? throw new KeyNotFoundException("Trabajo de diseno no encontrado.");

        job.FechaRecepcion = ParseDate(command.FechaRecepcion);
        job.Requerimientos = command.Requerimientos?.Trim() ?? string.Empty;
        if (job.Estado == "Nuevo Trabajo Pendiente") job.Estado = "En Desarrollo";
        job.HistorialJson = AppendHistorial(job.HistorialJson, "Preparación técnica actualizada por area de diseño.");
        job.UpdatedAt = DateTime.UtcNow;
        job.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);
        return MapJob(job);
    }

    public async Task<DesignJobDto> AddActivityAsync(string jobNumber, AddDesignActivityCommand command, string userName, CancellationToken ct = default)
    {
        var job = await _db.DesignPlannerJobs.Include(j => j.Actividades)
            .FirstOrDefaultAsync(j => j.JobNumber == jobNumber, ct)
            ?? throw new KeyNotFoundException("Trabajo de diseno no encontrado.");

        if (string.IsNullOrWhiteSpace(command.Nombre) || !ValidActivities.Contains(command.Nombre))
            throw new InvalidOperationException("Actividad no válida.");

        var fechaEnvio = ParseDateOnly(command.FechaEnvio)
            ?? throw new InvalidOperationException("La fecha de envío es obligatoria.");
        var fechaRecepcion = ParseDateOnly(command.FechaRecepcion);
        if (fechaRecepcion.HasValue && fechaRecepcion.Value < fechaEnvio)
            throw new InvalidOperationException("La fecha de recepción no puede ser anterior a la fecha de envío.");

        job.Actividades.Add(new DesignPlannerActivity
        {
            Id = Guid.NewGuid(),
            DesignPlannerJobId = job.Id,
            Nombre = command.Nombre,
            FechaEnvio = fechaEnvio,
            FechaRecepcion = fechaRecepcion,
            Repeticiones = command.Repeticiones > 0 ? command.Repeticiones : 1,
            Observaciones = command.Observaciones?.Trim() ?? string.Empty,
            SortOrder = job.Actividades.Count
        });
        job.HistorialJson = AppendHistorial(job.HistorialJson, $"Actividad \"{command.Nombre}\" agregada al cronograma.");
        job.UpdatedAt = DateTime.UtcNow;
        job.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);
        return MapJob((await FindJobAsync(jobNumber, ct))!);
    }

    public async Task<DesignJobDto> UpdateActivityAsync(
        string jobNumber, Guid activityId, UpdateDesignActivityCommand command, string userName, CancellationToken ct = default)
    {
        var job = await _db.DesignPlannerJobs
            .Include(j => j.Actividades.OrderBy(a => a.SortOrder))
            .FirstOrDefaultAsync(j => j.JobNumber == jobNumber, ct)
            ?? throw new KeyNotFoundException("Trabajo de diseno no encontrado.");

        var activity = job.Actividades.FirstOrDefault(a => a.Id == activityId)
            ?? throw new KeyNotFoundException("Actividad no encontrada.");

        if (command.Completada.HasValue) activity.Completada = command.Completada.Value;
        if (job.FichaAprobada && GetProgress(job.Actividades) == 100) job.Estado = "Finalizado";
        job.UpdatedAt = DateTime.UtcNow;
        job.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);
        return MapJob(job);
    }

    public async Task<DesignJobDto> ApproveJobAsync(string jobNumber, ApproveDesignJobCommand command, string userName, CancellationToken ct = default)
    {
        var job = await _db.DesignPlannerJobs
            .Include(j => j.Actividades.OrderBy(a => a.SortOrder))
            .FirstOrDefaultAsync(j => j.JobNumber == jobNumber, ct)
            ?? throw new KeyNotFoundException("Trabajo de diseno no encontrado.");

        var fechaAprobacion = ParseDate(command.FechaAprobacion)
            ?? throw new InvalidOperationException("Debes registrar la fecha de aprobación final.");

        job.FechaAprobacion = fechaAprobacion;
        job.ComentariosAprobacion = command.ComentariosAprobacion?.Trim() ?? string.Empty;
        job.FichaAprobada = true;
        job.Estado = GetProgress(job.Actividades) == 100 ? "Finalizado" : "Aprobación";
        job.HistorialJson = AppendHistorial(job.HistorialJson, "Ficha técnica aprobada y notificacion enviada a involucrados.");
        job.UpdatedAt = DateTime.UtcNow;
        job.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);
        return MapJob(job);
    }

    public async Task<DesignJobDto> FinishJobAsync(string jobNumber, string userName, CancellationToken ct = default)
    {
        var job = await _db.DesignPlannerJobs
            .Include(j => j.Actividades.OrderBy(a => a.SortOrder))
            .FirstOrDefaultAsync(j => j.JobNumber == jobNumber, ct)
            ?? throw new KeyNotFoundException("Trabajo de diseno no encontrado.");

        if (!job.FichaAprobada)
            throw new InvalidOperationException("No se puede finalizar sin la aprobación de la ficha técnica.");

        job.Estado = "Finalizado";
        job.HistorialJson = AppendHistorial(job.HistorialJson, "Trabajo finalizado con aprobación previa.");
        job.UpdatedAt = DateTime.UtcNow;
        job.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);
        return MapJob(job);
    }

    private async Task<DesignPlannerJob?> FindJobAsync(string jobNumber, CancellationToken ct) =>
        await _db.DesignPlannerJobs.AsNoTracking()
            .Include(j => j.Actividades.OrderBy(a => a.SortOrder))
            .FirstOrDefaultAsync(j => j.JobNumber == jobNumber, ct);

    private async Task<string> GenerateNextJobNumberAsync(CancellationToken ct)
    {
        var year = DateTime.UtcNow.Year;
        var prefix = $"PJ-{year}-";
        var existing = await _db.DesignPlannerJobs.AsNoTracking()
            .Where(j => j.JobNumber.StartsWith(prefix))
            .Select(j => j.JobNumber)
            .ToListAsync(ct);
        var max = 0;
        foreach (var value in existing)
        {
            var suffix = value[prefix.Length..];
            if (int.TryParse(suffix, out var parsed) && parsed > max) max = parsed;
        }
        return $"{prefix}{(max + 1).ToString().PadLeft(3, '0')}";
    }

    private static DesignJobDto MapJob(DesignPlannerJob job) => new(
        job.JobNumber,
        job.Cliente,
        job.Vendedor,
        job.Trabajo,
        job.Responsable,
        job.Estado,
        job.CreatedAt,
        job.FechaRecepcion,
        job.FechaEntrega,
        job.Requerimientos,
        job.FichaAprobada,
        job.FechaAprobacion,
        job.ComentariosAprobacion,
        ParseHistorial(job.HistorialJson),
        job.Actividades.OrderBy(a => a.SortOrder).Select(a => new DesignActivityDto(
            a.Id,
            a.Nombre,
            a.FechaEnvio.ToString("yyyy-MM-dd"),
            a.FechaRecepcion?.ToString("yyyy-MM-dd") ?? string.Empty,
            a.Repeticiones,
            a.Observaciones,
            a.Completada)).ToList());

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
}