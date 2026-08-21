namespace Perlax.Modules.Production.Application.AreaExpense;

public record AreaExpenseRubroDto(Guid Id, string Name, int SortOrder);

public record AreaExpenseProveedorDto(
    Guid Id,
    string Name,
    string? Nit,
    string? Cedula,
    string? Telefono,
    string? Asesor,
    IReadOnlyList<string> Rubros,
    string Rubro);

public record AreaExpenseNameRequest(string? Name);

public record AreaExpenseProveedorRequest(
    string? Name,
    string? Nit,
    string? Cedula,
    string? Telefono,
    string? Asesor,
    List<string>? Rubros);

public interface IAreaExpenseCatalogService
{
    Task<IReadOnlyList<AreaExpenseRubroDto>> ListRubrosAsync(string area, CancellationToken ct = default);
    Task<AreaExpenseRubroDto> CreateRubroAsync(string area, AreaExpenseNameRequest request, CancellationToken ct = default);
    Task<AreaExpenseRubroDto> UpdateRubroAsync(string area, Guid id, AreaExpenseNameRequest request, CancellationToken ct = default);
    Task DeleteRubroAsync(string area, Guid id, CancellationToken ct = default);

    Task<IReadOnlyList<AreaExpenseProveedorDto>> ListProveedoresAsync(string area, CancellationToken ct = default);
    Task<AreaExpenseProveedorDto> CreateProveedorAsync(string area, AreaExpenseProveedorRequest request, CancellationToken ct = default);
    Task<AreaExpenseProveedorDto> UpdateProveedorAsync(string area, Guid id, AreaExpenseProveedorRequest request, CancellationToken ct = default);
    Task DeleteProveedorAsync(string area, Guid id, CancellationToken ct = default);
}