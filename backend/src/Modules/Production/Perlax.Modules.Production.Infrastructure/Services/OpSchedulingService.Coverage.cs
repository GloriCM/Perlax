using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Scheduling;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed partial class OpSchedulingService
{
    public async Task<CoverageWeekDto> GetCoverageAsync(DateTime weekStart, string? q = null, CancellationToken ct = default)
    {
        var monday = NormalizeWeekStart(weekStart);
        var sunday = monday.AddDays(6);
        var term = NormalizeTerm(q);

        var machinesQuery = _db.ProductionMachines.AsNoTracking().Where(m => m.IsActive);
        if (term != null)
        {
            machinesQuery = machinesQuery.Where(m =>
                m.Name.ToLower().Contains(term) ||
                m.Code.ToLower().Contains(term) ||
                (m.ProcessCode != null && m.ProcessCode.ToLower().Contains(term)));
        }

        var machines = await machinesQuery.OrderBy(m => m.Code).ThenBy(m => m.Name).ToListAsync(ct);
        var machineIds = machines.Select(m => m.Id).ToList();

        var allShifts = await _db.ProductionShifts.AsNoTracking()
            .Where(s => s.IsActive)
            .OrderBy(s => s.SortOrder)
            .ToListAsync(ct);

        var machineShiftLinks = await _db.ProductionMachineShifts.AsNoTracking()
            .Where(x => machineIds.Contains(x.MachineId) && x.IsEnabled)
            .ToListAsync(ct);

        var assignments = await _db.OpCoverageAssignments.AsNoTracking()
            .Where(a => a.WeekStart == monday && machineIds.Contains(a.MachineId))
            .ToListAsync(ct);

        var operators = await _db.ProductionOperators.AsNoTracking()
            .ToDictionaryAsync(o => o.Id, o => o.DisplayName, ct);

        var mappedMachines = machines.Select(m =>
        {
            var enabledShiftIds = machineShiftLinks
                .Where(x => x.MachineId == m.Id)
                .OrderBy(x => x.SortOrder)
                .Select(x => x.ShiftId)
                .ToList();

            var enabledShifts = enabledShiftIds
                .Select(id => allShifts.FirstOrDefault(s => s.Id == id))
                .Where(s => s != null)
                .Select(s => new CoverageShiftInfoDto(
                    s!.Id,
                    s.Code,
                    s.Name,
                    s.StartTime,
                    s.EndTime,
                    FormatShiftLabel(s.StartTime, s.EndTime)))
                .ToList();

            var days = Enumerable.Range(1, 7).Select(dow =>
            {
                var dayAssignments = assignments.Where(a => a.MachineId == m.Id && a.DayOfWeek == dow).ToList();
                var shiftSlots = enabledShifts.Select(sh =>
                {
                    var slotAssignments = dayAssignments
                        .Where(a => a.ShiftId == sh.ShiftId)
                        .OrderBy(a => a.RoleTag == "Op" ? 0 : 1)
                        .ThenBy(a => a.CreatedAt)
                        .Select(a => new CoverageSlotAssignmentDto(
                            a.Id,
                            a.OperatorId,
                            operators.GetValueOrDefault(a.OperatorId),
                            a.RoleTag))
                        .ToList();

                    var hasOp = slotAssignments.Any(x => x.RoleTag == "Op");
                    return new CoverageShiftSlotDto(
                        sh.ShiftId,
                        sh.Code,
                        sh.Name,
                        sh.Label,
                        slotAssignments,
                        hasOp,
                        hasOp);
                }).ToList();

                return new CoverageDayDto(
                    dow,
                    monday.AddDays(dow - 1),
                    shiftSlots,
                    enabledShifts.Count > 0,
                    shiftSlots.Count > 0 && shiftSlots.All(s => s.IsCovered));
            }).ToList();

            return new CoverageMachineDto(
                m.Id,
                m.Code,
                m.Name,
                m.ProcessCode,
                enabledShifts.Count,
                enabledShifts,
                days,
                enabledShifts.Count == 0
                    ? "sin_config"
                    : days.Any(d => d.IsConfigured && !d.IsCovered)
                        ? "sin_op"
                        : "cubierta");
        }).ToList();

        return new CoverageWeekDto(monday, sunday, mappedMachines);
    }

    public async Task<CoverageAssignmentDto> CreateCoverageAssignmentAsync(
        UpsertCoverageAssignmentCommand command,
        string userName,
        CancellationToken ct = default)
    {
        var monday = NormalizeWeekStart(command.WeekStart);
        if (command.MachineId == Guid.Empty || command.ShiftId == Guid.Empty || command.OperatorId == Guid.Empty)
            throw new InvalidOperationException("Maquina, turno y operario son obligatorios.");

        if (command.DayOfWeek < 1 || command.DayOfWeek > 7)
            throw new InvalidOperationException("Dia de semana invalido.");

        var roleTag = string.IsNullOrWhiteSpace(command.RoleTag) ? "Op" : command.RoleTag.Trim();
        if (roleTag != "Op" && roleTag != "Ax")
            throw new InvalidOperationException("Rol invalido (Op o Ax).");

        if (!await _db.ProductionMachines.AsNoTracking().AnyAsync(m => m.Id == command.MachineId && m.IsActive, ct))
            throw new InvalidOperationException("Maquina no valida.");

        if (!await _db.ProductionMachineShifts.AsNoTracking()
                .AnyAsync(x => x.MachineId == command.MachineId && x.ShiftId == command.ShiftId && x.IsEnabled, ct))
            throw new InvalidOperationException("El turno no esta habilitado en esta maquina.");

        if (!await _db.ProductionOperators.AsNoTracking().AnyAsync(o => o.Id == command.OperatorId, ct))
            throw new InvalidOperationException("Operario no valido.");

        if (await _db.OpCoverageAssignments.AnyAsync(a =>
                a.WeekStart == monday && a.MachineId == command.MachineId && a.DayOfWeek == command.DayOfWeek
                && a.ShiftId == command.ShiftId && a.RoleTag == roleTag && a.OperatorId == command.OperatorId, ct))
            throw new InvalidOperationException("Esta asignacion ya existe.");

        if (roleTag == "Op")
        {
            if (await _db.OpCoverageAssignments.AnyAsync(a =>
                    a.WeekStart == monday && a.MachineId == command.MachineId && a.DayOfWeek == command.DayOfWeek
                    && a.ShiftId == command.ShiftId && a.RoleTag == "Op", ct))
                throw new InvalidOperationException("Ya hay un operario asignado a este turno.");
        }

        var assignment = new OpCoverageAssignment
        {
            Id = Guid.NewGuid(),
            WeekStart = monday,
            MachineId = command.MachineId,
            DayOfWeek = command.DayOfWeek,
            ShiftId = command.ShiftId,
            OperatorId = command.OperatorId,
            RoleTag = roleTag,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName
        };

        _db.OpCoverageAssignments.Add(assignment);
        await _db.SaveChangesAsync(ct);

        var operatorName = await _db.ProductionOperators.AsNoTracking()
            .Where(o => o.Id == command.OperatorId)
            .Select(o => o.DisplayName)
            .FirstOrDefaultAsync(ct);

        return new CoverageAssignmentDto(assignment.Id, assignment.OperatorId, operatorName, assignment.RoleTag);
    }

    public async Task DeleteCoverageAssignmentAsync(Guid id, CancellationToken ct = default)
    {
        var row = await _db.OpCoverageAssignments.FirstOrDefaultAsync(a => a.Id == id, ct)
            ?? throw new KeyNotFoundException("Asignacion no encontrada.");
        _db.OpCoverageAssignments.Remove(row);
        await _db.SaveChangesAsync(ct);
    }
}