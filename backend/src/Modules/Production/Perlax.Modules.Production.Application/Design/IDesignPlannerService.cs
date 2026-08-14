namespace Perlax.Modules.Production.Application.Design;

public record DesignActivityDto(
    Guid Id,
    string Nombre,
    string FechaEnvio,
    string FechaRecepcion,
    int Repeticiones,
    string Observaciones,
    bool Completada);

public record DesignJobDto(
    string Id,
    string Cliente,
    string Vendedor,
    string Trabajo,
    string Responsable,
    string Estado,
    DateTime CreatedAt,
    DateTime? FechaRecepcion,
    DateTime? FechaEntrega,
    string Requerimientos,
    bool FichaAprobada,
    DateTime? FechaAprobacion,
    string ComentariosAprobacion,
    IReadOnlyList<string> Historial,
    IReadOnlyList<DesignActivityDto> Actividades);

public record CreateDesignJobCommand(string Cliente, string Vendedor, string Trabajo, string Responsable, string? FechaEntrega);
public record TechnicalPrepCommand(string? FechaRecepcion, string? Requerimientos);
public record AddDesignActivityCommand(string Nombre, string FechaEnvio, string? FechaRecepcion, int Repeticiones, string? Observaciones);
public record UpdateDesignActivityCommand(bool? Completada);
public record ApproveDesignJobCommand(string? FechaAprobacion, string? ComentariosAprobacion);

public interface IDesignPlannerService
{
    Task<IReadOnlyList<DesignJobDto>> ListJobsAsync(CancellationToken ct = default);
    Task<DesignJobDto> GetJobAsync(string jobNumber, CancellationToken ct = default);
    Task<DesignJobDto> CreateJobAsync(CreateDesignJobCommand command, string userName, CancellationToken ct = default);
    Task<DesignJobDto> SaveTechnicalPrepAsync(string jobNumber, TechnicalPrepCommand command, string userName, CancellationToken ct = default);
    Task<DesignJobDto> AddActivityAsync(string jobNumber, AddDesignActivityCommand command, string userName, CancellationToken ct = default);
    Task<DesignJobDto> UpdateActivityAsync(string jobNumber, Guid activityId, UpdateDesignActivityCommand command, string userName, CancellationToken ct = default);
    Task<DesignJobDto> ApproveJobAsync(string jobNumber, ApproveDesignJobCommand command, string userName, CancellationToken ct = default);
    Task<DesignJobDto> FinishJobAsync(string jobNumber, string userName, CancellationToken ct = default);
}