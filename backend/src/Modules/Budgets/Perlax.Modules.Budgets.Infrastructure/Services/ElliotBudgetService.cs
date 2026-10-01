using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Budgets.Application.Elliot;
using Perlax.Modules.Budgets.Domain.Elliot;
using Perlax.Modules.Budgets.Domain.Entities;
using Perlax.Modules.Budgets.Infrastructure.Persistence;

namespace Perlax.Modules.Budgets.Infrastructure.Services;

public sealed class ElliotBudgetService : IElliotBudgetService
{
    private readonly BudgetsDbContext _db;

    public ElliotBudgetService(BudgetsDbContext db) => _db = db;

    public async Task EnsureTemplateAsync(Guid budgetId, string user, CancellationToken ct = default)
    {
        await ElliotBudgetSchemaFixes.ApplyAsync(_db, ct);

        var budget = await _db.Budgets.FirstOrDefaultAsync(b => b.Id == budgetId, ct)
            ?? throw new InvalidOperationException("Presupuesto no encontrado.");

        var initialized = await _db.BudgetMapSettings.AnyAsync(x => x.BudgetId == budgetId, ct);
        if (initialized) return;

        ElliotBudgetTemplate.ApplyEmptyTemplate(budgetId, _db);
        budget.UpdatedBy = user;
        budget.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task<ElliotWorkbookDto> GetWorkbookAsync(Guid budgetId, CancellationToken ct = default)
    {
        await EnsureTemplateAsync(budgetId, "system", ct);
        return await BuildWorkbookAsync(budgetId, ct);
    }

    public async Task<ElliotWorkbookDto> SaveFixedCostsAsync(
        Guid budgetId, ElliotFixedCostsSaveRequest request, string user, CancellationToken ct = default)
    {
        var budget = await RequireEditableAsync(budgetId, ct);
        await EnsureTemplateAsync(budgetId, user, ct);

        await ReplaceIncomesAsync(budgetId, request.Incomes, ct);
        await ReplacePeopleAsync(budgetId, request.People, ct);
        await ReplaceFixedItemsAsync(budgetId, request.FixedItems, ct);
        if (request.CostCenters.Count > 0)
            await ReplaceCostCentersAsync(budgetId, request.CostCenters, ct);

        budget.UpdatedBy = user;
        budget.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return await BuildWorkbookAsync(budgetId, ct);
    }

    public async Task<ElliotWorkbookDto> SaveVariableCostsAsync(
        Guid budgetId, ElliotVariableCostsSaveRequest request, string user, CancellationToken ct = default)
    {
        var budget = await RequireEditableAsync(budgetId, ct);
        await EnsureTemplateAsync(budgetId, user, ct);

        var existing = await _db.BudgetVariableCommissions.Where(x => x.BudgetId == budgetId).ToListAsync(ct);
        _db.BudgetVariableCommissions.RemoveRange(existing);
        var i = 0;
        foreach (var c in request.Commissions)
        {
            _db.BudgetVariableCommissions.Add(new BudgetVariableCommission
            {
                Id = Guid.NewGuid(),
                BudgetId = budgetId,
                Name = (c.Name ?? string.Empty).Trim(),
                Group = string.IsNullOrWhiteSpace(c.Group) ? "Comisiones" : c.Group.Trim(),
                Rate = c.Rate,
                BaseAmount = c.BaseAmount,
                SortOrder = c.SortOrder > 0 ? c.SortOrder : i++
            });
        }

        budget.UpdatedBy = user;
        budget.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return await BuildWorkbookAsync(budgetId, ct);
    }

    public async Task<ElliotWorkbookDto> SaveMapParamsAsync(
        Guid budgetId, ElliotMapParamsSaveRequest request, string user, CancellationToken ct = default)
    {
        var budget = await RequireEditableAsync(budgetId, ct);
        await EnsureTemplateAsync(budgetId, user, ct);

        var settings = await _db.BudgetMapSettings.FirstOrDefaultAsync(x => x.BudgetId == budgetId, ct);
        if (settings == null)
        {
            settings = new BudgetMapSettings { Id = Guid.NewGuid(), BudgetId = budgetId };
            _db.BudgetMapSettings.Add(settings);
        }

        var p = request.MapParams ?? new ElliotMapParamsDto();
        settings.GeneralMfgFactor = p.GeneralMfgFactor;
        settings.AdminFactor = p.AdminFactor;
        settings.FinancialFactor = p.FinancialFactor;
        settings.UtilizationPct = p.UtilizationPct;

        if (request.CostCenters is { Count: > 0 })
            await ReplaceCostCentersAsync(budgetId, request.CostCenters, ct);

        budget.UpdatedBy = user;
        budget.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return await BuildWorkbookAsync(budgetId, ct);
    }

    public async Task<ElliotWorkbookDto> SaveWorkbookAsync(
        Guid budgetId, ElliotWorkbookSaveRequest request, string user, CancellationToken ct = default)
    {
        var budget = await RequireEditableAsync(budgetId, ct);
        await EnsureTemplateAsync(budgetId, user, ct);

        await ReplaceIncomesAsync(budgetId, request.Incomes ?? new(), ct);
        await ReplacePeopleAsync(budgetId, request.People ?? new(), ct);
        await ReplaceFixedItemsAsync(budgetId, request.FixedItems ?? new(), ct);
        await ReplaceCostCentersAsync(budgetId, request.CostCenters ?? new(), ct);

        var existingCommissions = await _db.BudgetVariableCommissions.Where(x => x.BudgetId == budgetId).ToListAsync(ct);
        _db.BudgetVariableCommissions.RemoveRange(existingCommissions);
        var ci = 0;
        foreach (var c in request.Commissions ?? new())
        {
            _db.BudgetVariableCommissions.Add(new BudgetVariableCommission
            {
                Id = Guid.NewGuid(),
                BudgetId = budgetId,
                Name = (c.Name ?? string.Empty).Trim(),
                Group = string.IsNullOrWhiteSpace(c.Group) ? "Comisiones" : c.Group.Trim(),
                Rate = c.Rate,
                BaseAmount = c.BaseAmount,
                SortOrder = c.SortOrder > 0 ? c.SortOrder : ci++
            });
        }

        var settings = await _db.BudgetMapSettings.FirstOrDefaultAsync(x => x.BudgetId == budgetId, ct);
        if (settings == null)
        {
            settings = new BudgetMapSettings { Id = Guid.NewGuid(), BudgetId = budgetId };
            _db.BudgetMapSettings.Add(settings);
        }
        var p = request.MapParams ?? new ElliotMapParamsDto();
        settings.GeneralMfgFactor = p.GeneralMfgFactor;
        settings.AdminFactor = p.AdminFactor;
        settings.FinancialFactor = p.FinancialFactor;
        settings.UtilizationPct = p.UtilizationPct;
        if (request.Layout != null)
            settings.LayoutJson = ElliotLayoutSerializer.Serialize(request.Layout);

        budget.UpdatedBy = user;
        budget.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
        return await BuildWorkbookAsync(budgetId, ct);
    }

    public async Task<ElliotBudgetResult> GetSummaryAsync(Guid budgetId, CancellationToken ct = default)
    {
        await EnsureTemplateAsync(budgetId, "system", ct);
        var input = await LoadInputAsync(budgetId, ct);
        return ElliotBudgetCalculator.Calculate(input);
    }

    private async Task<Budget> RequireEditableAsync(Guid budgetId, CancellationToken ct)
    {
        var budget = await _db.Budgets.FirstOrDefaultAsync(b => b.Id == budgetId, ct)
            ?? throw new InvalidOperationException("Presupuesto no encontrado.");
        if (budget.Status is not ("Pendiente" or "En Ajuste"))
            throw new InvalidOperationException("El presupuesto no admite cambios en este estado.");
        return budget;
    }

    private async Task ReplaceIncomesAsync(Guid budgetId, List<ElliotIncomeDto> incomes, CancellationToken ct)
    {
        var existing = await _db.BudgetIncomeLines.Where(x => x.BudgetId == budgetId).ToListAsync(ct);
        _db.BudgetIncomeLines.RemoveRange(existing);
        var i = 0;
        foreach (var row in incomes)
        {
            _db.BudgetIncomeLines.Add(new BudgetIncomeLine
            {
                Id = Guid.NewGuid(),
                BudgetId = budgetId,
                Code = (row.Code ?? string.Empty).Trim(),
                Name = (row.Name ?? string.Empty).Trim(),
                Amount = row.Amount,
                MaterialPct = row.MaterialPct < 0 ? 0 : row.MaterialPct,
                SortOrder = row.SortOrder > 0 ? row.SortOrder : i++
            });
        }
    }

    private async Task ReplacePeopleAsync(Guid budgetId, List<ElliotPersonDto> people, CancellationToken ct)
    {
        var existing = await _db.BudgetPayrollPeople.Where(x => x.BudgetId == budgetId).ToListAsync(ct);
        _db.BudgetPayrollPeople.RemoveRange(existing);
        var i = 0;
        foreach (var row in people)
        {
            _db.BudgetPayrollPeople.Add(new BudgetPayrollPerson
            {
                Id = Guid.NewGuid(),
                BudgetId = budgetId,
                Section = (row.Section ?? ElliotPayrollSections.Admin).Trim(),
                Name = (row.Name ?? string.Empty).Trim(),
                Role = (row.Role ?? string.Empty).Trim(),
                Salary = row.Salary,
                TransportSubsidy = row.TransportSubsidy,
                CostCenterCode = string.IsNullOrWhiteSpace(row.CostCenterCode) ? null : row.CostCenterCode.Trim(),
                SortOrder = row.SortOrder > 0 ? row.SortOrder : i++
            });
        }
    }

    private async Task ReplaceFixedItemsAsync(Guid budgetId, List<ElliotFixedItemDto> items, CancellationToken ct)
    {
        var existing = await _db.BudgetFixedItems.Where(x => x.BudgetId == budgetId).ToListAsync(ct);
        _db.BudgetFixedItems.RemoveRange(existing);
        var i = 0;
        foreach (var row in items)
        {
            _db.BudgetFixedItems.Add(new BudgetFixedItem
            {
                Id = Guid.NewGuid(),
                BudgetId = budgetId,
                Group = (row.Group ?? string.Empty).Trim(),
                Concept = (row.Concept ?? string.Empty).Trim(),
                Amount = row.Amount,
                SortOrder = row.SortOrder > 0 ? row.SortOrder : i++
            });
        }
    }

    private async Task ReplaceCostCentersAsync(Guid budgetId, List<ElliotCostCenterDto> centers, CancellationToken ct)
    {
        var existing = await _db.BudgetCostCenters.Where(x => x.BudgetId == budgetId).ToListAsync(ct);
        _db.BudgetCostCenters.RemoveRange(existing);
        var i = 0;
        foreach (var row in centers)
        {
            _db.BudgetCostCenters.Add(new BudgetCostCenter
            {
                Id = Guid.NewGuid(),
                BudgetId = budgetId,
                Code = (row.Code ?? string.Empty).Trim(),
                Name = (row.Name ?? string.Empty).Trim(),
                ProductiveHours = row.ProductiveHours,
                PrestacionesFactor = row.PrestacionesFactor <= 0 ? 0.5m : row.PrestacionesFactor,
                ExtraPersonnel = row.ExtraPersonnel,
                SortOrder = row.SortOrder > 0 ? row.SortOrder : i++
            });
        }
    }

    private async Task<ElliotBudgetInput> LoadInputAsync(Guid budgetId, CancellationToken ct)
    {
        var incomes = await _db.BudgetIncomeLines.AsNoTracking()
            .Where(x => x.BudgetId == budgetId).OrderBy(x => x.SortOrder).ToListAsync(ct);
        var people = await _db.BudgetPayrollPeople.AsNoTracking()
            .Where(x => x.BudgetId == budgetId).OrderBy(x => x.SortOrder).ToListAsync(ct);
        var items = await _db.BudgetFixedItems.AsNoTracking()
            .Where(x => x.BudgetId == budgetId).OrderBy(x => x.SortOrder).ToListAsync(ct);
        var commissions = await _db.BudgetVariableCommissions.AsNoTracking()
            .Where(x => x.BudgetId == budgetId).OrderBy(x => x.SortOrder).ToListAsync(ct);
        var centers = await _db.BudgetCostCenters.AsNoTracking()
            .Where(x => x.BudgetId == budgetId).OrderBy(x => x.SortOrder).ToListAsync(ct);
        var map = await _db.BudgetMapSettings.AsNoTracking()
            .FirstOrDefaultAsync(x => x.BudgetId == budgetId, ct);

        var layout = ResolveLayout(map?.LayoutJson, incomes.Count > 0, people, items, commissions);
        var maps = layout.Fixed
            .Where(s => s.Kind == "payroll")
            .SelectMany(s => s.Subgroups)
            .Where(g => !string.IsNullOrWhiteSpace(g.Key))
            .GroupBy(g => g.Key, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(g => g.Key, g => ElliotLayoutSerializer.NormalizeMapsTo(g.First().MapsTo ?? g.First().Key), StringComparer.OrdinalIgnoreCase);

        var remappedPeople = people.Select(x =>
        {
            var section = maps.TryGetValue(x.Section, out var mapped)
                ? mapped
                : ElliotLayoutSerializer.NormalizeMapsTo(x.Section);
            return new ElliotPayrollPersonInput(
                section, x.Name, x.Role, x.Salary, x.TransportSubsidy, x.CostCenterCode, x.SortOrder);
        }).ToList();

        return new ElliotBudgetInput
        {
            Incomes = incomes.Select(x => new ElliotIncomeLineInput(x.Code, x.Name, x.Amount, x.MaterialPct)).ToList(),
            People = remappedPeople,
            FixedItems = items.Select(x => new ElliotFixedItemInput(x.Group, x.Concept, x.Amount, x.SortOrder)).ToList(),
            Commissions = commissions.Select(x => new ElliotCommissionInput(
                x.Name, x.Rate, x.BaseAmount, x.Group, x.SortOrder)).ToList(),
            CostCenters = centers.Select(x => new ElliotCostCenterInput(
                x.Code, x.Name, x.ProductiveHours, x.SortOrder, x.PrestacionesFactor, x.ExtraPersonnel)).ToList(),
            MapParams = map == null
                ? new ElliotMapParamsInput()
                : new ElliotMapParamsInput(map.GeneralMfgFactor, map.AdminFactor, map.FinancialFactor, map.UtilizationPct)
        };
    }

    private static ElliotLayoutDto ResolveLayout(
        string? layoutJson,
        bool hasIncomes,
        List<BudgetPayrollPerson> people,
        List<BudgetFixedItem> items,
        List<BudgetVariableCommission> commissions)
    {
        var parsed = ElliotLayoutSerializer.Parse(layoutJson);
        if (parsed.Fixed.Count > 0 || parsed.Variable.Count > 0)
            return parsed;

        return ElliotLayoutSerializer.InferFromData(
            people.Select(p => p.Section),
            items.Select(i => i.Group),
            commissions.Select(c => c.Group),
            hasIncomes);
    }

    private async Task<ElliotWorkbookDto> BuildWorkbookAsync(Guid budgetId, CancellationToken ct)
    {
        var budget = await _db.Budgets.AsNoTracking().FirstAsync(b => b.Id == budgetId, ct);
        var input = await LoadInputAsync(budgetId, ct);
        var summary = ElliotBudgetCalculator.Calculate(input);

        var incomes = await _db.BudgetIncomeLines.AsNoTracking()
            .Where(x => x.BudgetId == budgetId).OrderBy(x => x.SortOrder).ToListAsync(ct);
        var people = await _db.BudgetPayrollPeople.AsNoTracking()
            .Where(x => x.BudgetId == budgetId).OrderBy(x => x.SortOrder).ToListAsync(ct);
        var items = await _db.BudgetFixedItems.AsNoTracking()
            .Where(x => x.BudgetId == budgetId).OrderBy(x => x.SortOrder).ToListAsync(ct);
        var commissions = await _db.BudgetVariableCommissions.AsNoTracking()
            .Where(x => x.BudgetId == budgetId).OrderBy(x => x.SortOrder).ToListAsync(ct);
        var centers = await _db.BudgetCostCenters.AsNoTracking()
            .Where(x => x.BudgetId == budgetId).OrderBy(x => x.SortOrder).ToListAsync(ct);
        var map = await _db.BudgetMapSettings.AsNoTracking()
            .FirstOrDefaultAsync(x => x.BudgetId == budgetId, ct);

        var layout = ResolveLayout(map?.LayoutJson, incomes.Count > 0, people, items, commissions);

        return new ElliotWorkbookDto
        {
            BudgetId = budget.Id,
            Code = budget.Code,
            Company = budget.Company,
            FiscalYear = budget.FiscalYear,
            Status = budget.Status,
            CanEdit = budget.Status is "Pendiente" or "En Ajuste",
            Incomes = incomes.Select(x => new ElliotIncomeDto
            {
                Id = x.Id, Code = x.Code, Name = x.Name, Amount = x.Amount,
                MaterialPct = x.MaterialPct, SortOrder = x.SortOrder
            }).ToList(),
            People = people.Select(x => new ElliotPersonDto
            {
                Id = x.Id, Section = x.Section, Name = x.Name, Role = x.Role,
                Salary = x.Salary, TransportSubsidy = x.TransportSubsidy,
                CostCenterCode = x.CostCenterCode, SortOrder = x.SortOrder
            }).ToList(),
            FixedItems = items.Select(x => new ElliotFixedItemDto
            {
                Id = x.Id, Group = x.Group, Concept = x.Concept, Amount = x.Amount, SortOrder = x.SortOrder
            }).ToList(),
            Commissions = commissions.Select(x => new ElliotCommissionDto
            {
                Id = x.Id, Name = x.Name, Group = x.Group, Rate = x.Rate,
                BaseAmount = x.BaseAmount, SortOrder = x.SortOrder
            }).ToList(),
            CostCenters = centers.Select(x => new ElliotCostCenterDto
            {
                Id = x.Id, Code = x.Code, Name = x.Name,
                ProductiveHours = x.ProductiveHours,
                PrestacionesFactor = x.PrestacionesFactor,
                ExtraPersonnel = x.ExtraPersonnel,
                SortOrder = x.SortOrder
            }).ToList(),
            MapParams = map == null
                ? new ElliotMapParamsDto()
                : new ElliotMapParamsDto
                {
                    GeneralMfgFactor = map.GeneralMfgFactor,
                    AdminFactor = map.AdminFactor,
                    FinancialFactor = map.FinancialFactor,
                    UtilizationPct = map.UtilizationPct
                },
            Layout = layout,
            Summary = summary
        };
    }
}
