using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Budgets.Domain.Entities;
using Perlax.Modules.Budgets.Infrastructure.Persistence;

namespace Perlax.Modules.Budgets.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/budgets")]
public class BudgetsController : ControllerBase
{
    private static readonly HashSet<string> ValidStatuses = ["Pendiente", "Aprobado", "Cerrado", "Cancelado", "En Ajuste"];
    private static readonly HashSet<string> ValidFrequencies =
        ["Mensual", "Trimestral", "Semestral", "Anual", "Eventual"];
    private static readonly HashSet<string> ValidAdjustmentTypes =
        ["Incremento", "Disminucion", "Reclasificacion", "Traslado presupuestal"];

    private readonly BudgetsDbContext _context;
    private readonly IAuditService _audit;

    public BudgetsController(BudgetsDbContext context, IAuditService audit)
    {
        _context = context;
        _audit = audit;
    }

    [HttpGet("categories")]
    public async Task<ActionResult> GetCategories([FromQuery] string? lineType)
    {
        var q = _context.BudgetCategories.AsNoTracking().Where(c => c.IsActive);
        if (!string.IsNullOrWhiteSpace(lineType))
            q = q.Where(c => c.LineType == lineType);
        var rows = await q.OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .Select(c => new { c.Id, c.LineType, c.Name, c.SortOrder }).ToListAsync();
        return Ok(rows);
    }

    [HttpGet]
    public async Task<ActionResult> List([FromQuery] string? company, [FromQuery] int? fiscalYear, [FromQuery] string? status)
    {
        var q = _context.Budgets.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(company))
            q = q.Where(b => EF.Functions.ILike(b.Company, $"%{company.Trim()}%"));
        if (fiscalYear.HasValue)
            q = q.Where(b => b.FiscalYear == fiscalYear.Value);
        if (!string.IsNullOrWhiteSpace(status))
            q = q.Where(b => b.Status == status);

        var list = await q.OrderByDescending(b => b.FiscalYear).ThenByDescending(b => b.CreatedAt)
            .Select(b => new
            {
                b.Id, b.Code, b.Company, b.FiscalYear, b.StartDate, b.EndDate, b.Currency, b.Status,
                b.CostCenter, b.GeneralApprover, b.CreatedBy, b.CreatedAt, b.UpdatedBy, b.UpdatedAt,
                businessUnitCount = b.BusinessUnits.Count,
                totalIncome = b.Lines.Where(l => l.LineType == "Income").Sum(l => (decimal?)l.ProjectedValue) ?? 0m,
                totalLineCosts = b.Lines.Where(l => l.LineType != "Income").Sum(l => (decimal?)l.ProjectedValue) ?? 0m,
                totalPersonnel = b.Personnel.Sum(p => (decimal?)((p.Headcount * p.MonthlySalary + p.Benefits + p.Allowances + p.Bonuses + p.Overtime) * 12)) ?? 0m
            }).ToListAsync();

        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult> GetById(Guid id)
    {
        var budget = await LoadBudgetAsync(id);
        if (budget == null) return NotFound();
        return Ok(MapDetail(budget));
    }

    [HttpPost]
    public async Task<ActionResult> Create([FromBody] CreateBudgetRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Company) || request.FiscalYear < 2000)
            return BadRequest("Empresa y vigencia son obligatorios.");
        if (request.StartDate >= request.EndDate)
            return BadRequest("La fecha de inicio debe ser anterior a la de finalizacion.");

        var exists = await _context.Budgets.AnyAsync(b => b.Company == request.Company.Trim() && b.FiscalYear == request.FiscalYear);
        if (exists)
            return BadRequest("Ya existe un presupuesto para la misma empresa y vigencia.");

        var user = CurrentUser();
        var budget = new Budget
        {
            Id = Guid.NewGuid(),
            Code = await NextCodeAsync(request.FiscalYear),
            Company = request.Company.Trim(),
            FiscalYear = request.FiscalYear,
            StartDate = ToUtc(request.StartDate),
            EndDate = ToUtc(request.EndDate),
            CostCenter = request.CostCenter?.Trim(),
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "COP" : request.Currency.Trim().ToUpperInvariant(),
            Status = "Pendiente",
            Observations = request.Observations?.Trim() ?? string.Empty,
            CreatedBy = user,
            CreatedAt = DateTime.UtcNow
        };

        if (request.BusinessUnits != null)
        {
            var i = 0;
            foreach (var bu in request.BusinessUnits.Where(x => !string.IsNullOrWhiteSpace(x.Name)))
            {
                budget.BusinessUnits.Add(new BudgetBusinessUnit
                {
                    Id = Guid.NewGuid(),
                    Name = bu.Name.Trim(),
                    Responsible = (bu.Responsible ?? string.Empty).Trim(),
                    Approver = bu.Approver?.Trim(),
                    Status = "Pendiente",
                    IsActive = true,
                    SortOrder = i++
                });
            }
        }

        _context.Budgets.Add(budget);
        await _context.SaveChangesAsync();
        await Audit("CREATE_BUDGET", $"Presupuesto {budget.Code} creado para {budget.Company} vigencia {budget.FiscalYear}");
        var created = await LoadBudgetAsync(budget.Id);
        return CreatedAtAction(nameof(GetById), new { id = budget.Id }, MapDetail(created!));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult> Update(Guid id, [FromBody] UpdateBudgetRequest request)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id);
        if (budget == null) return NotFound();
        if (budget.Status is not ("Pendiente" or "En Ajuste"))
            return BadRequest("Solo se pueden editar presupuestos en estado Pendiente o En Ajuste.");

        budget.StartDate = ToUtc(request.StartDate);
        budget.EndDate = ToUtc(request.EndDate);
        budget.CostCenter = request.CostCenter?.Trim();
        budget.Currency = string.IsNullOrWhiteSpace(request.Currency) ? budget.Currency : request.Currency.Trim().ToUpperInvariant();
        budget.Observations = request.Observations?.Trim() ?? string.Empty;
        budget.UpdatedBy = CurrentUser();
        budget.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
        await Audit("UPDATE_BUDGET", $"Presupuesto {budget.Code} actualizado");
        return Ok(MapDetail((await LoadBudgetAsync(id))!));
    }

    [HttpPost("{id:guid}/duplicate")]
    public async Task<ActionResult> Duplicate(Guid id, [FromBody] DuplicateBudgetRequest request)
    {
        var source = await LoadBudgetTrackedAsync(id);
        if (source == null) return NotFound();
        if (request.FiscalYear < 2000)
            return BadRequest("Vigencia invalida.");
        if (await _context.Budgets.AnyAsync(b => b.Company == source.Company && b.FiscalYear == request.FiscalYear))
            return BadRequest("Ya existe un presupuesto para esa empresa y vigencia.");

        var user = CurrentUser();
        var clone = new Budget
        {
            Id = Guid.NewGuid(),
            Code = await NextCodeAsync(request.FiscalYear),
            Company = source.Company,
            FiscalYear = request.FiscalYear,
            StartDate = new DateTime(request.FiscalYear, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            EndDate = new DateTime(request.FiscalYear, 12, 31, 0, 0, 0, DateTimeKind.Utc),
            CostCenter = source.CostCenter,
            Currency = source.Currency,
            Status = "Pendiente",
            Observations = $"Duplicado desde {source.Code}",
            CreatedBy = user,
            CreatedAt = DateTime.UtcNow
        };

        var buMap = new Dictionary<Guid, Guid>();
        foreach (var bu in source.BusinessUnits)
        {
            var newId = Guid.NewGuid();
            buMap[bu.Id] = newId;
            clone.BusinessUnits.Add(new BudgetBusinessUnit
            {
                Id = newId,
                Name = bu.Name,
                Responsible = bu.Responsible,
                Approver = bu.Approver,
                Status = "Pendiente",
                IsActive = bu.IsActive,
                SortOrder = bu.SortOrder
            });
        }

        foreach (var line in source.Lines)
        {
            clone.Lines.Add(new BudgetLine
            {
                Id = Guid.NewGuid(),
                BusinessUnitId = line.BusinessUnitId.HasValue && buMap.ContainsKey(line.BusinessUnitId.Value)
                    ? buMap[line.BusinessUnitId.Value] : null,
                LineType = line.LineType,
                Category = line.Category,
                Concept = line.Concept,
                Description = line.Description,
                ProjectedValue = line.ProjectedValue,
                Frequency = line.Frequency,
                CostCenter = line.CostCenter,
                Code = line.Code,
                UnitOfMeasure = line.UnitOfMeasure,
                Provider = line.Provider,
                Quantity = line.Quantity,
                UnitCost = line.UnitCost,
                Currency = line.Currency,
                ExternalReference = line.ExternalReference,
                FinancialEntity = line.FinancialEntity,
                Observations = line.Observations,
                CreatedBy = user,
                CreatedAt = DateTime.UtcNow
            });
        }

        foreach (var pItem in source.Personnel)
        {
            clone.Personnel.Add(new BudgetPersonnelItem
            {
                Id = Guid.NewGuid(),
                BusinessUnitId = pItem.BusinessUnitId.HasValue && buMap.ContainsKey(pItem.BusinessUnitId.Value)
                    ? buMap[pItem.BusinessUnitId.Value] : null,
                Position = pItem.Position,
                Area = pItem.Area,
                Category = pItem.Category,
                CostCenter = pItem.CostCenter,
                ContractType = pItem.ContractType,
                Headcount = pItem.Headcount,
                MonthlySalary = pItem.MonthlySalary,
                Benefits = pItem.Benefits,
                Allowances = pItem.Allowances,
                Bonuses = pItem.Bonuses,
                Overtime = pItem.Overtime,
                Observations = pItem.Observations,
                CreatedBy = user,
                CreatedAt = DateTime.UtcNow
            });
        }

        _context.Budgets.Add(clone);
        await _context.SaveChangesAsync();
        await Audit("DUPLICATE_BUDGET", $"Presupuesto {clone.Code} duplicado desde {source.Code}");
        return Ok(MapDetail((await LoadBudgetAsync(clone.Id))!));
    }

    [HttpPost("{id:guid}/approve")]
    public async Task<ActionResult> Approve(Guid id, [FromBody] ApprovalRequest request)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id);
        if (budget == null) return NotFound();
        if (budget.Status is "Cerrado" or "Cancelado")
            return BadRequest("No se puede aprobar un presupuesto cerrado o cancelado.");

        budget.Status = "Aprobado";
        budget.GeneralApprover = CurrentUser();
        budget.GeneralApprovalDate = DateTime.UtcNow;
        budget.ApprovalObservations = request.Observations?.Trim();
        budget.RejectionReason = null;
        budget.UpdatedBy = CurrentUser();
        budget.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await Audit("APPROVE_BUDGET", $"Presupuesto {budget.Code} aprobado");
        return Ok(MapDetail((await LoadBudgetAsync(id))!));
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<ActionResult> Reject(Guid id, [FromBody] ApprovalRequest request)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id);
        if (budget == null) return NotFound();
        if (string.IsNullOrWhiteSpace(request.Observations))
            return BadRequest("El motivo de rechazo es obligatorio.");

        budget.Status = "Pendiente";
        budget.RejectionReason = request.Observations.Trim();
        budget.UpdatedBy = CurrentUser();
        budget.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await Audit("REJECT_BUDGET", $"Presupuesto {budget.Code} rechazado");
        return Ok(MapDetail((await LoadBudgetAsync(id))!));
    }

    [HttpPost("{id:guid}/close")]
    public async Task<ActionResult> Close(Guid id)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id);
        if (budget == null) return NotFound();
        budget.Status = "Cerrado";
        budget.UpdatedBy = CurrentUser();
        budget.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await Audit("CLOSE_BUDGET", $"Presupuesto {budget.Code} cerrado");
        return Ok(MapDetail((await LoadBudgetAsync(id))!));
    }

    [HttpPost("{id:guid}/reopen")]
    public async Task<ActionResult> Reopen(Guid id)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id);
        if (budget == null) return NotFound();
        budget.Status = "En Ajuste";
        budget.UpdatedBy = CurrentUser();
        budget.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await Audit("REOPEN_BUDGET", $"Presupuesto {budget.Code} reabierto");
        return Ok(MapDetail((await LoadBudgetAsync(id))!));
    }

    [HttpPost("{id:guid}/business-units")]
    public async Task<ActionResult> AddBusinessUnit(Guid id, [FromBody] BusinessUnitRequest request)
    {
        var budget = await _context.Budgets.Include(b => b.BusinessUnits).FirstOrDefaultAsync(b => b.Id == id);
        if (budget == null) return NotFound();
        if (!CanEdit(budget)) return BadRequest("El presupuesto no admite cambios.");
        if (string.IsNullOrWhiteSpace(request.Name)) return BadRequest("El nombre de la unidad es obligatorio.");

        var bu = new BudgetBusinessUnit
        {
            Id = Guid.NewGuid(),
            BudgetId = id,
            Name = request.Name.Trim(),
            Responsible = (request.Responsible ?? string.Empty).Trim(),
            Approver = request.Approver?.Trim(),
            Status = "Pendiente",
            IsActive = true,
            SortOrder = budget.BusinessUnits.Count
        };
        _context.BudgetBusinessUnits.Add(bu);
        Touch(budget);
        await _context.SaveChangesAsync();
        await Audit("ADD_BUDGET_BU", $"Unidad {bu.Name} agregada a {budget.Code}");
        return Ok(MapDetail((await LoadBudgetAsync(id))!));
    }

    [HttpPut("{id:guid}/business-units/{buId:guid}/approve")]
    public async Task<ActionResult> ApproveBusinessUnit(Guid id, Guid buId)
    {
        var bu = await _context.BudgetBusinessUnits.FirstOrDefaultAsync(x => x.Id == buId && x.BudgetId == id);
        if (bu == null) return NotFound();
        bu.Status = "Aprobado";
        bu.Approver = CurrentUser();
        bu.ApprovalDate = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        await Audit("APPROVE_BUDGET_BU", $"Unidad {bu.Name} aprobada");
        return Ok(MapDetail((await LoadBudgetAsync(id))!));
    }

    [HttpDelete("{id:guid}/business-units/{buId:guid}")]
    public async Task<ActionResult> DeleteBusinessUnit(Guid id, Guid buId)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id);
        if (budget == null) return NotFound();
        if (!CanEdit(budget)) return BadRequest("El presupuesto no admite cambios.");
        var bu = await _context.BudgetBusinessUnits.FirstOrDefaultAsync(x => x.Id == buId && x.BudgetId == id);
        if (bu == null) return NotFound();
        if (bu.Status == "Aprobado") return BadRequest("No se puede eliminar una unidad aprobada.");
        _context.BudgetBusinessUnits.Remove(bu);
        Touch(budget);
        await _context.SaveChangesAsync();
        await Audit("DELETE_BUDGET_BU", $"Unidad {bu.Name} eliminada de {budget.Code}");
        return Ok(MapDetail((await LoadBudgetAsync(id))!));
    }

    [HttpPost("{id:guid}/lines")]
    public async Task<ActionResult> AddLine(Guid id, [FromBody] BudgetLineRequest request)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id);
        if (budget == null) return NotFound();
        if (!CanEdit(budget)) return BadRequest("El presupuesto no admite cambios.");
        var validation = ValidateLine(request);
        if (validation != null) return BadRequest(validation);

        var line = MapLineEntity(id, request, CurrentUser());
        _context.BudgetLines.Add(line);
        Touch(budget);
        await _context.SaveChangesAsync();
        await Audit("ADD_BUDGET_LINE", $"Linea {line.LineType}/{line.Concept} en {budget.Code}");
        return Ok(MapDetail((await LoadBudgetAsync(id))!));
    }

    [HttpPut("{id:guid}/lines/{lineId:guid}")]
    public async Task<ActionResult> UpdateLine(Guid id, Guid lineId, [FromBody] BudgetLineRequest request)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id);
        if (budget == null) return NotFound();
        if (!CanEdit(budget)) return BadRequest("El presupuesto no admite cambios.");
        var line = await _context.BudgetLines.FirstOrDefaultAsync(l => l.Id == lineId && l.BudgetId == id);
        if (line == null) return NotFound();
        if (line.IsApproved) return BadRequest("No se puede editar una linea aprobada.");
        var validation = ValidateLine(request);
        if (validation != null) return BadRequest(validation);

        ApplyLine(line, request);
        line.UpdatedBy = CurrentUser();
        line.UpdatedAt = DateTime.UtcNow;
        Touch(budget);
        await _context.SaveChangesAsync();
        await Audit("UPDATE_BUDGET_LINE", $"Linea {line.Concept} actualizada en {budget.Code}");
        return Ok(MapDetail((await LoadBudgetAsync(id))!));
    }

    [HttpDelete("{id:guid}/lines/{lineId:guid}")]
    public async Task<ActionResult> DeleteLine(Guid id, Guid lineId)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id);
        if (budget == null) return NotFound();
        if (!CanEdit(budget)) return BadRequest("El presupuesto no admite cambios.");
        var line = await _context.BudgetLines.FirstOrDefaultAsync(l => l.Id == lineId && l.BudgetId == id);
        if (line == null) return NotFound();
        if (line.IsApproved) return BadRequest("No se puede eliminar una linea aprobada.");
        _context.BudgetLines.Remove(line);
        Touch(budget);
        await _context.SaveChangesAsync();
        await Audit("DELETE_BUDGET_LINE", $"Linea {line.Concept} eliminada de {budget.Code}");
        return Ok(MapDetail((await LoadBudgetAsync(id))!));
    }

    [HttpPost("{id:guid}/personnel")]
    public async Task<ActionResult> AddPersonnel(Guid id, [FromBody] PersonnelRequest request)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id);
        if (budget == null) return NotFound();
        if (!CanEdit(budget)) return BadRequest("El presupuesto no admite cambios.");
        if (string.IsNullOrWhiteSpace(request.Position) || request.Headcount <= 0 || request.MonthlySalary <= 0)
            return BadRequest("Cargo, cantidad y salario son obligatorios y deben ser mayores a cero.");

        var item = new BudgetPersonnelItem
        {
            Id = Guid.NewGuid(),
            BudgetId = id,
            BusinessUnitId = request.BusinessUnitId,
            Position = request.Position.Trim(),
            Area = (request.Area ?? string.Empty).Trim(),
            Category = (request.Category ?? "Otros").Trim(),
            CostCenter = request.CostCenter?.Trim(),
            ContractType = string.IsNullOrWhiteSpace(request.ContractType) ? "Indefinido" : request.ContractType.Trim(),
            Headcount = request.Headcount,
            MonthlySalary = request.MonthlySalary,
            Benefits = request.Benefits,
            Allowances = request.Allowances,
            Bonuses = request.Bonuses,
            Overtime = request.Overtime,
            Observations = request.Observations?.Trim() ?? string.Empty,
            CreatedBy = CurrentUser(),
            CreatedAt = DateTime.UtcNow
        };
        _context.BudgetPersonnelItems.Add(item);
        Touch(budget);
        await _context.SaveChangesAsync();
        await Audit("ADD_BUDGET_PERSONNEL", $"Cargo {item.Position} en {budget.Code}");
        return Ok(MapDetail((await LoadBudgetAsync(id))!));
    }

    [HttpDelete("{id:guid}/personnel/{itemId:guid}")]
    public async Task<ActionResult> DeletePersonnel(Guid id, Guid itemId)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id);
        if (budget == null) return NotFound();
        if (!CanEdit(budget)) return BadRequest("El presupuesto no admite cambios.");
        var item = await _context.BudgetPersonnelItems.FirstOrDefaultAsync(x => x.Id == itemId && x.BudgetId == id);
        if (item == null) return NotFound();
        if (item.IsApproved) return BadRequest("No se puede eliminar un cargo aprobado.");
        _context.BudgetPersonnelItems.Remove(item);
        Touch(budget);
        await _context.SaveChangesAsync();
        await Audit("DELETE_BUDGET_PERSONNEL", $"Cargo {item.Position} eliminado de {budget.Code}");
        return Ok(MapDetail((await LoadBudgetAsync(id))!));
    }

    [HttpPost("{id:guid}/adjustments")]
    public async Task<ActionResult> AddAdjustment(Guid id, [FromBody] AdjustmentRequest request)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id);
        if (budget == null) return NotFound();
        if (budget.Status is not ("Pendiente" or "En Ajuste" or "Aprobado"))
            return BadRequest("El presupuesto no admite ajustes en este estado.");
        if (string.IsNullOrWhiteSpace(request.Motive))
            return BadRequest("El motivo del ajuste es obligatorio.");
        if (!ValidAdjustmentTypes.Contains(request.AdjustmentType))
            return BadRequest("Tipo de ajuste invalido.");
        if (request.NewValue < 0)
            return BadRequest("El valor nuevo no puede ser negativo.");

        var adj = new BudgetAdjustment
        {
            Id = Guid.NewGuid(),
            BudgetId = id,
            BusinessUnitId = request.BusinessUnitId,
            BudgetLineId = request.BudgetLineId,
            PersonnelItemId = request.PersonnelItemId,
            AdjustmentType = request.AdjustmentType,
            Category = (request.Category ?? string.Empty).Trim(),
            Concept = (request.Concept ?? string.Empty).Trim(),
            PreviousValue = request.PreviousValue,
            AdjustmentValue = request.NewValue - request.PreviousValue,
            NewValue = request.NewValue,
            Motive = request.Motive.Trim(),
            Observations = request.Observations?.Trim() ?? string.Empty,
            Status = "Pendiente",
            CreatedBy = CurrentUser(),
            CreatedAt = DateTime.UtcNow
        };
        if (budget.Status == "Aprobado") budget.Status = "En Ajuste";
        Touch(budget);
        _context.BudgetAdjustments.Add(adj);
        await _context.SaveChangesAsync();
        await Audit("CREATE_BUDGET_ADJUSTMENT", $"Ajuste {adj.AdjustmentType} en {budget.Code}");
        return Ok(MapDetail((await LoadBudgetAsync(id))!));
    }

    [HttpPost("{id:guid}/adjustments/{adjId:guid}/approve")]
    public async Task<ActionResult> ApproveAdjustment(Guid id, Guid adjId, [FromBody] ApprovalRequest request)
    {
        var budget = await _context.Budgets.FirstOrDefaultAsync(b => b.Id == id);
        if (budget == null) return NotFound();
        var adj = await _context.BudgetAdjustments.FirstOrDefaultAsync(a => a.Id == adjId && a.BudgetId == id);
        if (adj == null) return NotFound();
        if (adj.Status != "Pendiente") return BadRequest("El ajuste no esta pendiente.");

        adj.Status = "Aprobado";
        adj.ApprovedBy = CurrentUser();
        adj.ApprovedAt = DateTime.UtcNow;
        adj.ApprovalObservations = request.Observations?.Trim();

        if (adj.BudgetLineId.HasValue)
        {
            var line = await _context.BudgetLines.FirstOrDefaultAsync(l => l.Id == adj.BudgetLineId.Value);
            if (line != null)
            {
                line.ProjectedValue = adj.NewValue;
                line.UpdatedBy = CurrentUser();
                line.UpdatedAt = DateTime.UtcNow;
            }
        }

        Touch(budget);
        await _context.SaveChangesAsync();
        await Audit("APPROVE_BUDGET_ADJUSTMENT", $"Ajuste aprobado en {budget.Code}");
        return Ok(MapDetail((await LoadBudgetAsync(id))!));
    }

    [HttpGet("{id:guid}/income-statement")]
    public async Task<ActionResult> IncomeStatement(Guid id, [FromQuery] Guid? businessUnitId)
    {
        var budget = await LoadBudgetAsync(id);
        if (budget == null) return NotFound();

        decimal Sum(string type, string? category = null)
        {
            var q = budget.Lines.Where(l => l.LineType == type);
            if (businessUnitId.HasValue) q = q.Where(l => l.BusinessUnitId == businessUnitId);
            if (!string.IsNullOrWhiteSpace(category)) q = q.Where(l => l.Category == category);
            return q.Sum(l => l.ProjectedValue);
        }

        var personnelQ = budget.Personnel.AsEnumerable();
        if (businessUnitId.HasValue) personnelQ = personnelQ.Where(p => p.BusinessUnitId == businessUnitId);
        var personnelTotal = personnelQ.Sum(p => p.AnnualTotal);

        var income = Sum("Income");
        var rawMaterial = Sum("RawMaterial");
        var production = Sum("ProductionCost");
        var costOfSales = rawMaterial + production;
        var gross = income - costOfSales;
        var admin = Sum("AdminExpense");
        var sales = Sum("SalesExpense");
        var operatingExpenses = admin + sales;
        var operating = gross - operatingExpenses;
        var financial = Sum("FinancialExpense");
        var beforeTax = operating - financial;
        var net = beforeTax;

        await Audit("VIEW_INCOME_STATEMENT", $"Estado de resultados {budget.Code}");

        return Ok(new
        {
            budgetId = budget.Id,
            budget.Code,
            budget.Company,
            budget.FiscalYear,
            businessUnitId,
            generatedAt = DateTime.UtcNow,
            generatedBy = CurrentUser(),
            incomeOperational = income,
            costOfSales = new { rawMaterial, production, total = costOfSales },
            grossProfit = gross,
            grossMargin = income == 0 ? 0 : Math.Round(gross / income * 100, 2),
            operatingExpenses = new { admin, sales, personnel = personnelTotal, total = operatingExpenses + personnelTotal },
            operatingProfit = operating - personnelTotal,
            operatingMargin = income == 0 ? 0 : Math.Round((operating - personnelTotal) / income * 100, 2),
            financialExpenses = financial,
            profitBeforeTax = beforeTax - personnelTotal,
            netProfit = net - personnelTotal,
            netMargin = income == 0 ? 0 : Math.Round((net - personnelTotal) / income * 100, 2)
        });
    }

    [HttpGet("{id:guid}/cost-map")]
    public async Task<ActionResult> CostMap(Guid id, [FromQuery] Guid? businessUnitId)
    {
        var budget = await LoadBudgetAsync(id);
        if (budget == null) return NotFound();

        var lines = budget.Lines.Where(l => l.LineType != "Income");
        if (businessUnitId.HasValue) lines = lines.Where(l => l.BusinessUnitId == businessUnitId);

        var byCategory = lines
            .GroupBy(l => new { l.LineType, l.Category })
            .Select(g => new { g.Key.LineType, g.Key.Category, total = g.Sum(x => x.ProjectedValue) })
            .OrderByDescending(x => x.total)
            .ToList();

        var personnelQ = budget.Personnel.AsEnumerable();
        if (businessUnitId.HasValue) personnelQ = personnelQ.Where(p => p.BusinessUnitId == businessUnitId);
        var personnelByCat = personnelQ
            .GroupBy(p => p.Category)
            .Select(g => new { LineType = "Personnel", Category = g.Key, total = g.Sum(x => x.AnnualTotal) })
            .ToList();

        var all = byCategory.Concat(personnelByCat).ToList();
        var grand = all.Sum(x => x.total);

        await Audit("VIEW_COST_MAP", $"Mapa de costos {budget.Code}");

        return Ok(new
        {
            budgetId = budget.Id,
            budget.Code,
            budget.Company,
            budget.FiscalYear,
            businessUnitId,
            generatedAt = DateTime.UtcNow,
            generatedBy = CurrentUser(),
            totalCosts = grand,
            categories = all.Select(x => new
            {
                x.LineType,
                x.Category,
                x.total,
                sharePercent = grand == 0 ? 0 : Math.Round(x.total / grand * 100, 2)
            }),
            byLineType = all.GroupBy(x => x.LineType).Select(g => new
            {
                lineType = g.Key,
                total = g.Sum(x => x.total),
                sharePercent = grand == 0 ? 0 : Math.Round(g.Sum(x => x.total) / grand * 100, 2)
            })
        });
    }

    private async Task<Budget?> LoadBudgetAsync(Guid id) =>
        await _context.Budgets.AsNoTracking()
            .Include(b => b.BusinessUnits.OrderBy(u => u.SortOrder))
            .Include(b => b.Lines)
            .Include(b => b.Personnel)
            .Include(b => b.Adjustments.OrderByDescending(a => a.CreatedAt))
            .FirstOrDefaultAsync(b => b.Id == id);

    private async Task<Budget?> LoadBudgetTrackedAsync(Guid id) =>
        await _context.Budgets
            .Include(b => b.BusinessUnits)
            .Include(b => b.Lines)
            .Include(b => b.Personnel)
            .FirstOrDefaultAsync(b => b.Id == id);

    private async Task<string> NextCodeAsync(int year)
    {
        var prefix = $"PRE-{year}-";
        var existing = await _context.Budgets.AsNoTracking()
            .Where(b => b.Code.StartsWith(prefix)).Select(b => b.Code).ToListAsync();
        var max = 0;
        foreach (var code in existing)
        {
            if (int.TryParse(code[prefix.Length..], out var n) && n > max) max = n;
        }
        return $"{prefix}{(max + 1).ToString().PadLeft(3, '0')}";
    }

    private static bool CanEdit(Budget budget) => budget.Status is "Pendiente" or "En Ajuste";

    private void Touch(Budget budget)
    {
        budget.UpdatedBy = CurrentUser();
        budget.UpdatedAt = DateTime.UtcNow;
    }

    private string? ValidateLine(BudgetLineRequest request)
    {
        var lineType = (request.LineType ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(lineType)) return "El tipo de linea es obligatorio.";
        if (lineType.Length > 40) return "El tipo de linea no puede superar 40 caracteres.";
        if (string.IsNullOrWhiteSpace(request.Category)) return "La categoria es obligatoria.";
        if (request.Category.Trim().Length > 150) return "La categoria no puede superar 150 caracteres.";
        if (string.IsNullOrWhiteSpace(request.Concept)) return "El concepto es obligatorio.";
        if (request.ProjectedValue <= 0 && lineType != "RawMaterial")
            return "El valor proyectado debe ser mayor a cero.";
        if (lineType == "RawMaterial")
        {
            if ((request.Quantity ?? 0) <= 0 || (request.UnitCost ?? 0) <= 0)
                return "Cantidad y costo unitario deben ser mayores a cero.";
        }
        if (!string.IsNullOrWhiteSpace(request.Frequency) && !ValidFrequencies.Contains(request.Frequency))
            return "Frecuencia invalida.";
        return null;
    }

    private static BudgetLine MapLineEntity(Guid budgetId, BudgetLineRequest request, string user)
    {
        var line = new BudgetLine
        {
            Id = Guid.NewGuid(),
            BudgetId = budgetId,
            CreatedBy = user,
            CreatedAt = DateTime.UtcNow
        };
        ApplyLine(line, request);
        if (line.LineType == "RawMaterial" && line.Quantity.HasValue && line.UnitCost.HasValue)
            line.ProjectedValue = Math.Round(line.Quantity.Value * line.UnitCost.Value, 2);
        return line;
    }

    private static void ApplyLine(BudgetLine line, BudgetLineRequest request)
    {
        line.BusinessUnitId = request.BusinessUnitId;
        line.LineType = request.LineType.Trim();
        line.Category = request.Category.Trim();
        line.Concept = request.Concept.Trim();
        line.Description = request.Description?.Trim() ?? string.Empty;
        line.ProjectedValue = request.ProjectedValue;
        line.Frequency = string.IsNullOrWhiteSpace(request.Frequency) ? "Anual" : request.Frequency;
        line.CostCenter = request.CostCenter?.Trim();
        line.Code = request.Code?.Trim();
        line.UnitOfMeasure = request.UnitOfMeasure?.Trim();
        line.Provider = request.Provider?.Trim();
        line.Quantity = request.Quantity;
        line.UnitCost = request.UnitCost;
        line.Currency = request.Currency?.Trim();
        line.ExternalReference = request.ExternalReference?.Trim();
        line.FinancialEntity = request.FinancialEntity?.Trim();
        line.Observations = request.Observations?.Trim() ?? string.Empty;
        if (line.LineType == "RawMaterial" && line.Quantity.HasValue && line.UnitCost.HasValue)
            line.ProjectedValue = Math.Round(line.Quantity.Value * line.UnitCost.Value, 2);
    }

    private static object MapDetail(Budget budget)
    {
        var income = budget.Lines.Where(l => l.LineType == "Income").Sum(l => l.ProjectedValue);
        var costs = budget.Lines.Where(l => l.LineType != "Income").Sum(l => l.ProjectedValue);
        var personnel = budget.Personnel.Sum(p => p.AnnualTotal);

        return new
        {
            budget.Id,
            budget.Code,
            budget.Company,
            budget.FiscalYear,
            budget.StartDate,
            budget.EndDate,
            budget.CostCenter,
            budget.Currency,
            budget.Status,
            budget.GeneralApprover,
            budget.GeneralApprovalDate,
            budget.ApprovalObservations,
            budget.RejectionReason,
            budget.Observations,
            budget.CreatedBy,
            budget.CreatedAt,
            budget.UpdatedBy,
            budget.UpdatedAt,
            totals = new
            {
                income,
                costs,
                personnel,
                totalExpenses = costs + personnel,
                projectedResult = income - costs - personnel
            },
            businessUnits = budget.BusinessUnits.OrderBy(u => u.SortOrder).Select(u => new
            {
                u.Id, u.Name, u.Responsible, u.Approver, u.ApprovalDate, u.Status, u.IsActive, u.SortOrder
            }),
            lines = budget.Lines.OrderBy(l => l.LineType).ThenBy(l => l.Category).Select(MapLine),
            personnel = budget.Personnel.OrderBy(p => p.Area).ThenBy(p => p.Position).Select(p => new
            {
                p.Id, p.BusinessUnitId, p.Position, p.Area, p.Category, p.CostCenter, p.ContractType,
                p.Headcount, p.MonthlySalary, p.Benefits, p.Allowances, p.Bonuses, p.Overtime,
                monthlyTotal = p.MonthlyTotal, annualTotal = p.AnnualTotal,
                p.Observations, p.IsApproved, p.CreatedBy, p.CreatedAt
            }),
            adjustments = budget.Adjustments.OrderByDescending(a => a.CreatedAt).Select(a => new
            {
                a.Id, a.BusinessUnitId, a.BudgetLineId, a.PersonnelItemId, a.AdjustmentType, a.Category, a.Concept,
                a.PreviousValue, a.AdjustmentValue, a.NewValue, a.Motive, a.Observations, a.Status,
                a.CreatedBy, a.CreatedAt, a.ApprovedBy, a.ApprovedAt, a.ApprovalObservations, a.RejectionReason
            })
        };
    }

    private static object MapLine(BudgetLine l) => new
    {
        l.Id, l.BusinessUnitId, l.LineType, l.Category, l.Concept, l.Description, l.ProjectedValue,
        l.Frequency, l.CostCenter, l.Code, l.UnitOfMeasure, l.Provider, l.Quantity, l.UnitCost,
        l.Currency, l.ExternalReference, l.FinancialEntity, l.Observations, l.IsApproved,
        l.CreatedBy, l.CreatedAt, l.UpdatedBy, l.UpdatedAt
    };

    private string CurrentUser() =>
        User.FindFirstValue(ClaimTypes.Name) ?? User.FindFirstValue("unique_name") ?? User.Identity?.Name ?? "system";

    private async Task Audit(string action, string details) =>
        await _audit.LogAsync(CurrentUser(), CurrentUser(), action, details,
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

    private static DateTime ToUtc(DateTime value) =>
        DateTime.SpecifyKind(value.Date, DateTimeKind.Utc);

    public record CreateBudgetRequest(
        string Company, int FiscalYear, DateTime StartDate, DateTime EndDate,
        string? CostCenter, string? Currency, string? Observations,
        List<BusinessUnitRequest>? BusinessUnits);

    public record UpdateBudgetRequest(
        DateTime StartDate, DateTime EndDate, string? CostCenter, string? Currency, string? Observations);

    public record DuplicateBudgetRequest(int FiscalYear);
    public record ApprovalRequest(string? Observations);
    public record BusinessUnitRequest(string Name, string? Responsible, string? Approver);

    public record BudgetLineRequest(
        Guid? BusinessUnitId, string LineType, string Category, string Concept, string? Description,
        decimal ProjectedValue, string? Frequency, string? CostCenter, string? Code, string? UnitOfMeasure,
        string? Provider, decimal? Quantity, decimal? UnitCost, string? Currency, string? ExternalReference,
        string? FinancialEntity, string? Observations);

    public record PersonnelRequest(
        Guid? BusinessUnitId, string Position, string? Area, string? Category, string? CostCenter,
        string? ContractType, int Headcount, decimal MonthlySalary, decimal Benefits, decimal Allowances,
        decimal Bonuses, decimal Overtime, string? Observations);

    public record AdjustmentRequest(
        Guid? BusinessUnitId, Guid? BudgetLineId, Guid? PersonnelItemId, string AdjustmentType,
        string? Category, string? Concept, decimal PreviousValue, decimal NewValue, string Motive, string? Observations);
}
