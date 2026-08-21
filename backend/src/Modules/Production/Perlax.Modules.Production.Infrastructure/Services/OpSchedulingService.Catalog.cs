using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Scheduling;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed partial class OpSchedulingService
{
    public async Task<IReadOnlyList<ScheduleProcessDto>> GetActiveProcessesAsync(CancellationToken ct = default)
    {
        return await _db.OpProcessCatalogItems.AsNoTracking()
            .Where(p => p.IsActive)
            .OrderBy(p => p.SortOrder)
            .Select(p => new ScheduleProcessDto(p.Id, p.Code, p.Label, p.SortOrder, p.IsActive))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ScheduleProcessDto>> GetAllProcessesAsync(CancellationToken ct = default)
    {
        return await _db.OpProcessCatalogItems.AsNoTracking()
            .OrderBy(p => p.SortOrder)
            .Select(p => new ScheduleProcessDto(p.Id, p.Code, p.Label, p.SortOrder, p.IsActive))
            .ToListAsync(ct);
    }

    public async Task<ScheduleProcessDto> CreateProcessAsync(UpsertProcessCommand command, string userName, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(command.Label))
            throw new InvalidOperationException("El nombre del proceso es obligatorio.");

        var label = command.Label.Trim();
        var code = string.IsNullOrWhiteSpace(command.Code) ? SlugProcessCode(label) : SlugProcessCode(command.Code);
        if (string.IsNullOrWhiteSpace(code))
            throw new InvalidOperationException("Codigo de proceso invalido.");
        if (await _db.OpProcessCatalogItems.AnyAsync(p => p.Code == code, ct))
            throw new InvalidOperationException("Ya existe un proceso con ese codigo.");

        var maxSort = await _db.OpProcessCatalogItems.MaxAsync(p => (int?)p.SortOrder, ct) ?? 0;
        var item = new OpProcessCatalogItem
        {
            Id = Guid.NewGuid(),
            Code = code,
            Label = label,
            SortOrder = command.SortOrder > 0 ? command.SortOrder : maxSort + 1,
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            CreatedBy = userName
        };
        _db.OpProcessCatalogItems.Add(item);
        await _db.SaveChangesAsync(ct);
        return new ScheduleProcessDto(item.Id, item.Code, item.Label, item.SortOrder, item.IsActive);
    }

    public async Task<ScheduleProcessDto> UpdateProcessAsync(Guid id, UpsertProcessCommand command, string userName, CancellationToken ct = default)
    {
        var item = await _db.OpProcessCatalogItems.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new KeyNotFoundException("Proceso no encontrado.");

        if (!string.IsNullOrWhiteSpace(command.Label))
            item.Label = command.Label.Trim();
        if (command.SortOrder > 0)
            item.SortOrder = command.SortOrder;
        if (command.IsActive.HasValue)
            item.IsActive = command.IsActive.Value;
        item.UpdatedAt = DateTime.UtcNow;
        item.UpdatedBy = userName;
        await _db.SaveChangesAsync(ct);
        return new ScheduleProcessDto(item.Id, item.Code, item.Label, item.SortOrder, item.IsActive);
    }

    public async Task ReorderProcessesAsync(IReadOnlyList<Guid> orderedIds, string userName, CancellationToken ct = default)
    {
        if (orderedIds == null || orderedIds.Count == 0)
            throw new InvalidOperationException("Lista de procesos vacia.");

        var items = await _db.OpProcessCatalogItems.Where(p => orderedIds.Contains(p.Id)).ToListAsync(ct);
        for (var i = 0; i < orderedIds.Count; i++)
        {
            var item = items.FirstOrDefault(p => p.Id == orderedIds[i]);
            if (item == null) continue;
            item.SortOrder = i + 1;
            item.UpdatedAt = DateTime.UtcNow;
            item.UpdatedBy = userName;
        }
        await _db.SaveChangesAsync(ct);
    }

    public async Task DeleteProcessAsync(Guid id, CancellationToken ct = default)
    {
        var item = await _db.OpProcessCatalogItems.FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new KeyNotFoundException("Proceso no encontrado.");

        var inUse = await _db.OpProcessSchedules.AnyAsync(b => b.ProcessCode == item.Code, ct)
            || await _db.OpRosterRows.AnyAsync(r => r.ProcessCode == item.Code, ct);
        if (inUse)
            throw new InvalidOperationException("No se puede eliminar: el proceso tiene programacion o roster asignado.");

        _db.OpProcessCatalogItems.Remove(item);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<SchedulingMachineDto>> GetSchedulingMachinesAsync(string? processCode = null, CancellationToken ct = default)
    {
        var q = _db.ProductionMachines.AsNoTracking().Where(m => m.IsActive);
        if (!string.IsNullOrWhiteSpace(processCode))
            q = q.Where(m => m.ProcessCode == processCode);
        return await q.OrderBy(m => m.Name)
            .Select(m => new SchedulingMachineDto(m.Id, m.Code, m.Name, m.ProcessCode))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<ProductionShiftDto>> GetShiftsAsync(CancellationToken ct = default)
    {
        var rows = await _db.ProductionShifts.AsNoTracking()
            .Where(s => s.IsActive)
            .OrderBy(s => s.SortOrder)
            .ToListAsync(ct);
        return rows.Select(s => new ProductionShiftDto(
            s.Id, s.Code, s.Name, s.StartTime, s.EndTime, s.CrossesMidnight,
            ShiftHours(s.StartTime, s.EndTime, s.CrossesMidnight), s.SortOrder, s.IsActive)).ToList();
    }

    public async Task<ProductionShiftDto> CreateShiftAsync(UpsertShiftCommand command, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(command.Name))
            throw new InvalidOperationException("El nombre del turno es obligatorio.");

        var name = command.Name.Trim();
        var code = string.IsNullOrWhiteSpace(command.Code)
            ? $"H{(await _db.ProductionShifts.CountAsync(ct)) + 1}"
            : command.Code.Trim();
        if (await _db.ProductionShifts.AnyAsync(s => s.Code == code, ct))
            throw new InvalidOperationException("Ya existe un turno con ese codigo.");

        var maxSort = await _db.ProductionShifts.MaxAsync(s => (int?)s.SortOrder, ct) ?? 0;
        var crosses = command.CrossesMidnight || command.EndTime <= command.StartTime;
        var item = new ProductionShift
        {
            Id = Guid.NewGuid(),
            Code = code,
            Name = name,
            StartTime = command.StartTime,
            EndTime = command.EndTime,
            CrossesMidnight = crosses,
            SortOrder = command.SortOrder > 0 ? command.SortOrder : maxSort + 1,
            IsActive = true
        };
        _db.ProductionShifts.Add(item);
        await _db.SaveChangesAsync(ct);
        return new ProductionShiftDto(item.Id, item.Code, item.Name, item.StartTime, item.EndTime, item.CrossesMidnight,
            ShiftHours(item.StartTime, item.EndTime, item.CrossesMidnight), item.SortOrder, item.IsActive);
    }

    public async Task<ProductionShiftDto> UpdateShiftAsync(Guid id, UpsertShiftCommand command, CancellationToken ct = default)
    {
        var item = await _db.ProductionShifts.FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new KeyNotFoundException("Turno no encontrado.");

        if (!string.IsNullOrWhiteSpace(command.Name)) item.Name = command.Name.Trim();
        if (command.StartTime != default) item.StartTime = command.StartTime;
        if (command.EndTime != default) item.EndTime = command.EndTime;
        if (command.SortOrder > 0) item.SortOrder = command.SortOrder;
        if (command.IsActive.HasValue) item.IsActive = command.IsActive.Value;
        item.CrossesMidnight = command.CrossesMidnight || item.EndTime <= item.StartTime;
        await _db.SaveChangesAsync(ct);
        return new ProductionShiftDto(item.Id, item.Code, item.Name, item.StartTime, item.EndTime, item.CrossesMidnight,
            ShiftHours(item.StartTime, item.EndTime, item.CrossesMidnight), item.SortOrder, item.IsActive);
    }

    public async Task DeleteShiftAsync(Guid id, CancellationToken ct = default)
    {
        var item = await _db.ProductionShifts.FirstOrDefaultAsync(s => s.Id == id, ct)
            ?? throw new KeyNotFoundException("Turno no encontrado.");

        var inUse = await _db.OpRosterDays.AnyAsync(d => d.ShiftId == id, ct);
        if (inUse)
            throw new InvalidOperationException("No se puede eliminar: el turno esta asignado en un roster.");

        _db.ProductionShifts.Remove(item);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<MachineShiftsDto> GetMachineShiftsAsync(Guid machineId, CancellationToken ct = default)
    {
        var machine = await _db.ProductionMachines.AsNoTracking().FirstOrDefaultAsync(m => m.Id == machineId, ct)
            ?? throw new KeyNotFoundException("Maquina no encontrada.");

        var allShifts = await _db.ProductionShifts.AsNoTracking()
            .Where(s => s.IsActive)
            .OrderBy(s => s.SortOrder)
            .ToListAsync(ct);
        var enabled = await _db.ProductionMachineShifts.AsNoTracking()
            .Where(x => x.MachineId == machineId)
            .ToDictionaryAsync(x => x.ShiftId, x => x, ct);

        var rows = allShifts.Select(s => new MachineShiftItemDto(
            s.Id, s.Code, s.Name, s.StartTime, s.EndTime,
            enabled.TryGetValue(s.Id, out var link) && link.IsEnabled,
            enabled.TryGetValue(s.Id, out var link2) ? link2.SortOrder : s.SortOrder)).ToList();

        return new MachineShiftsDto(
            new SchedulingMachineDto(machine.Id, machine.Code, machine.Name, machine.ProcessCode),
            rows);
    }

    public async Task SetMachineShiftsAsync(Guid machineId, IReadOnlyList<Guid> enabledShiftIds, CancellationToken ct = default)
    {
        var machine = await _db.ProductionMachines.FirstOrDefaultAsync(m => m.Id == machineId, ct)
            ?? throw new KeyNotFoundException("Maquina no encontrada.");

        var existing = await _db.ProductionMachineShifts.Where(x => x.MachineId == machineId).ToListAsync(ct);
        _db.ProductionMachineShifts.RemoveRange(existing);

        if (enabledShiftIds != null)
        {
            var sort = 0;
            foreach (var shiftId in enabledShiftIds.Distinct())
            {
                sort++;
                _db.ProductionMachineShifts.Add(new ProductionMachineShift
                {
                    Id = Guid.NewGuid(),
                    MachineId = machineId,
                    ShiftId = shiftId,
                    IsEnabled = true,
                    SortOrder = sort
                });
            }
        }

        await _db.SaveChangesAsync(ct);
    }
}