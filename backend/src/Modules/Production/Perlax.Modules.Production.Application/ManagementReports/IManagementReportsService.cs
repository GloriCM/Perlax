namespace Perlax.Modules.Production.Application.ManagementReports;

public record ManagementReportColumnDto(string Field, string Label);

public record ManagementReportResultDto(
    string ReportKey,
    string Title,
    string? Description,
    IReadOnlyList<ManagementReportColumnDto> Columns,
    IReadOnlyList<IReadOnlyDictionary<string, object?>> Rows,
    string? ExternalLink = null,
    string? ExternalLinkLabel = null);

public interface IManagementReportsService
{
    IReadOnlyList<(string Key, string Title, string Description)> ListAvailable();
    Task<ManagementReportResultDto> GetReportAsync(
        string reportKey,
        DateTime? from = null,
        DateTime? to = null,
        string? client = null,
        string? q = null,
        CancellationToken ct = default);
}
