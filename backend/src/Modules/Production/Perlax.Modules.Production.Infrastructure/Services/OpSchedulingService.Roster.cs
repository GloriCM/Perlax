using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Scheduling;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed partial class OpSchedulingService
{
    public async Task<RosterWeekDto> GetRosterAsync(DateTime weekStart, string? q = null, CancellationToken ct = default)
    {
        var monday = NormalizeWeekStart(weekStart);
        var sunday = monday.AddDays(6);

        var rowsQuery = _db.OpRosterRows
            .AsNoTracking()
            .Include(r => r.Days)
            .Where(r => r.WeekStart == monday);

        var term = NormalizeTerm(q);
        if (term != null)
        {
            rowsQuery = rowsQuery.Where(r =>
                r.ProcessCode.ToLower().Contains(term) ||
                (r.MachineId != null && _db.ProductionMachines.Any(m => m.Id == r.MachineId && m.Name.ToLower().Contains(term))) ||
                (r.OperatorId != null && _db.ProductionOperators.Any(o => o.Id == r.OperatorId && o.DisplayName.ToLower().Contains(term))));
        }

        var processLabels = await _db.OpProcessCatalogItems.AsNoTracking().ToDictionaryAsync(p => p.Code, p => p.Label, ct);
        var operators = await _db.ProductionOperators.AsNoTracking().ToDictionaryAsync(o => o.Id, o => o.DisplayName, ct);
        var machines = await _db.ProductionMachines.AsNoTracking().ToDictionaryAsync(m => m.Id, m => m, ct);
        var shifts = await _db.ProductionShifts.AsNoTracking().ToDictionaryAsync(s => s.Id, s => s, ct);

        var rows = await rowsQuery.OrderBy(r => r.SortOrder).ToListAsync(ct);
        var mapped = rows.Select(r =>
        {
            var days = Enumerable.Range(1, 7).Select(dow =>
            {
                var day = r.Days.FirstOrDefault(d => d.DayOfWeek == dow);
                ProductionShift? shift = day?.ShiftId != null && shifts.TryGetValue(day.ShiftId.Value, out var sh) ? sh : null;
                var hours = day == null || day.IsOff || shift == null
                    ? 0m
                    : ShiftHours(shift.StartTime, shift.EndTime, shift.CrossesMidnight);
                return new RosterDayDto(
                    day?.Id,
                    dow,
                    monday.AddDays(dow - 1),
                    day?.ShiftId,
                    shift != null ? FormatShiftLabel(shift.StartTime, shift.EndTime) : null,
                    day?.IsOff ?? true,
                    hours);
            }).ToList();

            var totalHours = days.Sum(d => d.Hours);
            var overtime = Math.Max(0m, totalHours - 48m);
            var machine = r.MachineId.HasValue && machines.TryGetValue(r.MachineId.Value, out var m) ? m : null;
            var processLabel = processLabels.GetValueOrDefault(r.ProcessCode, r.ProcessCode);
            var isMachineRow = r.MachineId.HasValue;
            return new RosterRowDto(
                r.Id,
                isMachineRow ? "machine" : "process",
                r.ProcessCode,
                processLabel,
                r.MachineId,
                machine?.Name,
                isMachineRow ? machine?.Name ?? processLabel : processLabel,
                r.OperatorId,
                r.OperatorId.HasValue ? operators.GetValueOrDefault(r.OperatorId.Value) : null,
                r.RoleTag,
                r.SortOrder,
                days,
                totalHours,
                overtime);
        }).ToList();

        return new RosterWeekDto(monday, sunday, mapped);
    }

    public async Task<Guid> CreateRosterRowAsync(UpsertRosterRowCommand command, string userName, CancellationToken ct = default)
    {
        var monday = NormalizeWeekStart(command.WeekStart);
        var processCode = command.ProcessCode?.Trim() ?? string.Empty;
        Guid? machineId = command.MachineId;

        if (machineId.HasValue)
        {
            var machine = await _db.ProductionMachines.AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == machineId.Value && m.IsActive, ct)
                ?? throw new InvalidOperationException("Maquina no valida.");
            processCode = machine.ProcessCode ?? processCode;
            if (string.IsNullOrWhiteSpace(processCode))
                throw new InvalidOperationException("La maquina no tiene categoria de proceso asignada.");

            if (await _db.OpRosterRows.AnyAsync(r => r.WeekStart == monday && r.MachineId == machineId, ct))
                throw new InvalidOperationException("Esta maquina ya tiene fila en el roster esta semana.");
        }
        else
        {
            if (string.IsNullOrWhiteSpace(processCode))
                throw new InvalidOperationException("Proceso obligatorio para filas por categoria.");

            if (await _db.OpRosterRows.AnyAsync(r =>
                    r.WeekStart == monday && r.MachineId == null && r.ProcessCode == processCode, ct))
                throw new InvalidOperationException("Este proceso ya tiene fila de categoria esta semana.");

            if (command.OperatorId.HasValue)
            {
                var dupOp = await _db.OpRosterRows.AnyAsync(r =>
                    r.WeekStart == monday && r.MachineId == null
                    && r.ProcessCode == processCode && r.OperatorId == command.OperatorId, ct);
                if (dupOp)
                    throw new InvalidOperationException("Este operario ya tiene turno en ese proceso esta semana.");
            }
        }

        if (!await _db.OpProcessCatalogItems.AnyAsync(p => p.Code == processCode && p.IsActive, ct))
            throw new InvalidOperationException("Proceso no valido.");

        var maxSort = await _db.OpRosterRows.Where(r => r.WeekStart == monday).MaxAsync(r => (int?)r.SortOrder, ct) ?? 0;
        var row = new OpRosterRow
        {
            Id = Guid.NewGuid(),
            WeekStart = monday,
            ProcessCode = processCode,
            MachineId = machineId,
            OperatorId = command.OperatorId,
            RoleTag = string.IsNullOrWhiteSpace(command.RoleTag) ? "Op" : command.RoleTag.Trim(),
            SortOrder = maxSort + 1,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName
        };
        for (var dow = 1; dow <= 7; dow++)
        {
            row.Days.Add(new OpRosterDay
            {
                Id = Guid.NewGuid(),
                RosterRowId = row.Id,
                DayOfWeek = dow,
                IsOff = true
            });
        }
        _db.OpRosterRows.Add(row);
        await _db.SaveChangesAsync(ct);
        return row.Id;
    }

    public async Task UpdateRosterRowAsync(Guid id, UpsertRosterRowCommand command, string userName, CancellationToken ct = default)
    {
        var row = await _db.OpRosterRows.Include(r => r.Days).FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new KeyNotFoundException("Fila de roster no encontrada.");

        var processCode = row.ProcessCode;
        Guid? machineId = row.MachineId;

        if (command.MachineId.HasValue && command.MachineId != row.MachineId)
        {
            var machine = await _db.ProductionMachines.AsNoTracking()
                .FirstOrDefaultAsync(m => m.Id == command.MachineId.Value && m.IsActive, ct)
                ?? throw new InvalidOperationException("Maquina no valida.");
            machineId = machine.Id;
            processCode = machine.ProcessCode ?? processCode;
            if (await _db.OpRosterRows.AnyAsync(r =>
                    r.Id != id && r.WeekStart == row.WeekStart && r.MachineId == machineId, ct))
                throw new InvalidOperationException("Esta maquina ya tiene fila en el roster esta semana.");
        }
        else if (command.MachineId == null && !string.IsNullOrWhiteSpace(command.ProcessCode))
        {
            machineId = null;
            processCode = command.ProcessCode.Trim();
            if (await _db.OpRosterRows.AnyAsync(r =>
                    r.Id != id && r.WeekStart == row.WeekStart && r.MachineId == null && r.ProcessCode == processCode, ct))
                throw new InvalidOperationException("Este proceso ya tiene fila de categoria esta semana.");
        }

        if (!string.IsNullOrWhiteSpace(processCode))
        {
            if (!await _db.OpProcessCatalogItems.AnyAsync(p => p.Code == processCode && p.IsActive, ct))
                throw new InvalidOperationException("Proceso no valido.");
            row.ProcessCode = processCode;
        }
        row.MachineId = machineId;

        if (command.OperatorId.HasValue && machineId == null)
        {
            var dupOp = await _db.OpRosterRows.AnyAsync(r =>
                r.Id != id && r.WeekStart == row.WeekStart && r.MachineId == null
                && r.ProcessCode == row.ProcessCode && r.OperatorId == command.OperatorId, ct);
            if (dupOp)
                throw new InvalidOperationException("Este operario ya tiene turno en ese proceso esta semana.");
        }

        row.OperatorId = command.OperatorId;
        if (!string.IsNullOrWhiteSpace(command.RoleTag)) row.RoleTag = command.RoleTag.Trim();
        row.UpdatedAt = DateTime.UtcNow;
        row.UpdatedBy = userName;

        if (command.Days != null)
        {
            foreach (var dayReq in command.Days)
            {
                var day = row.Days.FirstOrDefault(d => d.DayOfWeek == dayReq.DayOfWeek);
                if (day == null)
                {
                    day = new OpRosterDay { Id = Guid.NewGuid(), RosterRowId = row.Id, DayOfWeek = dayReq.DayOfWeek };
                    row.Days.Add(day);
                }
                day.ShiftId = dayReq.IsOff ? null : dayReq.ShiftId;
                day.IsOff = dayReq.IsOff;
            }
        }

        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteRosterRowAsync(Guid id, CancellationToken ct = default)
    {
        var row = await _db.OpRosterRows.FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new KeyNotFoundException("Fila de roster no encontrada.");
        _db.OpRosterRows.Remove(row);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<int> CopyPreviousRosterAsync(DateTime weekStart, string userName, CancellationToken ct = default)
    {
        var monday = NormalizeWeekStart(weekStart);
        var prevMonday = monday.AddDays(-7);
        if (await _db.OpRosterRows.AnyAsync(r => r.WeekStart == monday, ct))
            throw new InvalidOperationException("La semana destino ya tiene roster.");

        var sourceRows = await _db.OpRosterRows.AsNoTracking().Include(r => r.Days)
            .Where(r => r.WeekStart == prevMonday).OrderBy(r => r.SortOrder).ToListAsync(ct);
        if (sourceRows.Count == 0)
            throw new InvalidOperationException("No hay roster en la semana anterior.");

        foreach (var src in sourceRows)
        {
            var row = new OpRosterRow
            {
                Id = Guid.NewGuid(),
                WeekStart = monday,
                ProcessCode = src.ProcessCode,
                MachineId = src.MachineId,
                OperatorId = src.OperatorId,
                RoleTag = src.RoleTag,
                SortOrder = src.SortOrder,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userName
            };
            foreach (var sd in src.Days.OrderBy(d => d.DayOfWeek))
            {
                row.Days.Add(new OpRosterDay
                {
                    Id = Guid.NewGuid(),
                    RosterRowId = row.Id,
                    DayOfWeek = sd.DayOfWeek,
                    ShiftId = sd.ShiftId,
                    IsOff = sd.IsOff
                });
            }
            _db.OpRosterRows.Add(row);
        }
        await _db.SaveChangesAsync(ct);
        return sourceRows.Count;
    }

    public async Task<AvailableOperatorsDto> GetAvailableOperatorsAsync(
        DateTime weekStart,
        string processCode,
        DateTime? date = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(processCode))
            throw new InvalidOperationException("Proceso obligatorio.");

        var monday = NormalizeWeekStart(weekStart);
        var target = date?.Date ?? DateTime.UtcNow.Date;
        var targetUtc = DateTime.SpecifyKind(target, DateTimeKind.Utc);
        var dow = DayOfWeekToRosterIndex(targetUtc);

        var processLabels = await _db.OpProcessCatalogItems.AsNoTracking().ToDictionaryAsync(p => p.Code, p => p.Label, ct);
        var operators = await _db.ProductionOperators.AsNoTracking().ToDictionaryAsync(o => o.Id, o => o.DisplayName, ct);
        var shifts = await _db.ProductionShifts.AsNoTracking().ToDictionaryAsync(s => s.Id, s => s, ct);
        var machines = await _db.ProductionMachines.AsNoTracking()
            .Where(m => m.IsActive && m.ProcessCode == processCode)
            .Select(m => new AvailableMachineBriefDto(m.Id, m.Code, m.Name))
            .ToListAsync(ct);

        var rows = await _db.OpRosterRows.AsNoTracking()
            .Include(r => r.Days)
            .Where(r => r.WeekStart == monday && r.ProcessCode == processCode && r.OperatorId != null)
            .ToListAsync(ct);

        var available = rows
            .Select(r =>
            {
                var day = r.Days.FirstOrDefault(d => d.DayOfWeek == dow);
                if (day == null || day.IsOff || day.ShiftId == null) return null;
                if (!shifts.TryGetValue(day.ShiftId.Value, out var shift)) return null;
                var operatorName = r.OperatorId.HasValue ? operators.GetValueOrDefault(r.OperatorId.Value) : null;
                return new AvailableOperatorDto(
                    r.OperatorId,
                    operatorName,
                    r.RoleTag,
                    shift.Id,
                    shift.Name,
                    FormatShiftLabel(shift.StartTime, shift.EndTime),
                    ShiftHours(shift.StartTime, shift.EndTime, shift.CrossesMidnight));
            })
            .Where(x => x != null)
            .Cast<AvailableOperatorDto>()
            .ToList();

        return new AvailableOperatorsDto(
            processCode,
            processLabels.GetValueOrDefault(processCode, processCode),
            targetUtc,
            machines,
            available);
    }
}