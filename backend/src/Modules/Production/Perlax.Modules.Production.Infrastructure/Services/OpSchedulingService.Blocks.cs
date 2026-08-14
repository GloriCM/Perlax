using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Scheduling;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed partial class OpSchedulingService
{
    public async Task<ScheduleBlockDto> CreateBlockAsync(UpsertScheduleBlockCommand command, string userName, CancellationToken ct = default)
    {
        await ValidateBlockAsync(command, null, ct);
        var entity = BuildEntity(Guid.NewGuid(), command, userName, isCreate: true);
        _db.OpProcessSchedules.Add(entity);
        await _db.SaveChangesAsync(ct);
        return await MapBlockByIdAsync(entity.Id, ct);
    }

    public async Task<ScheduleBlockDto> UpdateBlockAsync(Guid id, UpsertScheduleBlockCommand command, string userName, CancellationToken ct = default)
    {
        var block = await _db.OpProcessSchedules.FirstOrDefaultAsync(b => b.Id == id, ct)
            ?? throw new KeyNotFoundException("Bloque no encontrado.");
        await ValidateBlockAsync(command, id, ct);
        ApplyCommand(block, command, userName, isCreate: false);
        await _db.SaveChangesAsync(ct);
        return await MapBlockByIdAsync(block.Id, ct);
    }

    public async Task DeleteBlockAsync(Guid id, CancellationToken ct = default)
    {
        var block = await _db.OpProcessSchedules.FirstOrDefaultAsync(b => b.Id == id, ct)
            ?? throw new KeyNotFoundException("Bloque no encontrado.");
        _db.OpProcessSchedules.Remove(block);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<ProgramOrderResultDto> ProgramOrderAsync(ProgramOrderCommand command, string userName, CancellationToken ct = default)
    {
        if (command.ManufacturingOrderId == Guid.Empty)
            throw new InvalidOperationException("La OP es obligatoria.");
        if (command.Processes == null || command.Processes.Count == 0)
            throw new InvalidOperationException("Debe programar al menos un proceso.");

        var mo = await _db.ManufacturingOrders.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Id == command.ManufacturingOrderId && m.OpeningDate != null, ct)
            ?? throw new InvalidOperationException("La orden de produccion no existe o no esta abierta.");

        var existingBlocks = await _db.OpProcessSchedules
            .Where(b => b.ManufacturingOrderId == command.ManufacturingOrderId && b.BlockType == OpScheduleBlockTypes.Op)
            .ToListAsync(ct);
        if (existingBlocks.Count > 0 && !command.IsUrgency)
            throw new InvalidOperationException("Esta OP ya tiene programacion. Marque urgencia para reprogramar o edite los bloques existentes.");

        // Al reprogramar con urgencia se reemplazan los bloques de esta OP: excluirlos del chequeo de cruce.
        var excludeIds = existingBlocks.Select(b => b.Id).ToHashSet();

        foreach (var proc in command.Processes)
        {
            var validProcess = await _db.OpProcessCatalogItems.AnyAsync(p => p.Code == proc.ProcessCode && p.IsActive, ct);
            if (!validProcess)
                throw new InvalidOperationException($"Proceso no valido: {proc.ProcessCode}");
            if (proc.PlannedEnd < proc.PlannedStart)
                throw new InvalidOperationException($"Fechas invalidas en proceso {proc.ProcessCode}.");

            var overlap = await FindOverlapAsync(
                proc.ProcessCode, proc.MachineId, proc.PlannedStart, proc.PlannedEnd, null, ct, excludeIds);
            if (overlap != null)
                throw new InvalidOperationException(overlap);
        }

        if (existingBlocks.Count > 0)
            _db.OpProcessSchedules.RemoveRange(existingBlocks);

        var createdIds = new List<Guid>();
        var sort = 0;
        foreach (var proc in command.Processes.OrderBy(p => p.SortOrder).ThenBy(p => p.PlannedStart))
        {
            var entity = BuildEntity(Guid.NewGuid(), new UpsertScheduleBlockCommand(
                command.ManufacturingOrderId,
                proc.ProcessCode,
                proc.MachineId,
                OpScheduleBlockTypes.Op,
                proc.PlannedStart,
                proc.PlannedEnd,
                OpScheduleStatuses.Scheduled,
                proc.SortOrder > 0 ? proc.SortOrder : sort,
                proc.Notes,
                command.IsUrgency,
                proc.EstimatedHours), userName, isCreate: true);
            sort++;
            createdIds.Add(entity.Id);
            _db.OpProcessSchedules.Add(entity);
        }

        await _db.SaveChangesAsync(ct);

        var mapped = new List<ScheduleBlockDto>();
        foreach (var id in createdIds)
            mapped.Add(await MapBlockByIdAsync(id, ct));

        return new ProgramOrderResultDto(command.ManufacturingOrderId, mo.OpNumber, command.IsUrgency, mapped);
    }

    public async Task DeleteProgramAsync(Guid manufacturingOrderId, CancellationToken ct = default)
    {
        var blocks = await _db.OpProcessSchedules
            .Where(b => b.ManufacturingOrderId == manufacturingOrderId && b.BlockType == OpScheduleBlockTypes.Op)
            .ToListAsync(ct);
        if (blocks.Count == 0)
            throw new KeyNotFoundException("Programacion no encontrada.");

        _db.OpProcessSchedules.RemoveRange(blocks);
        await _db.SaveChangesAsync(ct);
    }

    private async Task ValidateBlockAsync(UpsertScheduleBlockCommand request, Guid? currentId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request.ProcessCode))
            throw new InvalidOperationException("El proceso es obligatorio.");

        var processCode = request.ProcessCode.Trim();
        var validProcess = await _db.OpProcessCatalogItems.AnyAsync(p => p.Code == processCode && p.IsActive, ct);
        if (!validProcess)
            throw new InvalidOperationException("Proceso no valido.");

        if (request.PlannedEnd < request.PlannedStart)
            throw new InvalidOperationException("La fecha fin debe ser posterior o igual a la fecha inicio.");

        var blockType = string.IsNullOrWhiteSpace(request.BlockType) ? OpScheduleBlockTypes.Op : request.BlockType.Trim();
        if (blockType == OpScheduleBlockTypes.Op)
        {
            if (request.ManufacturingOrderId == null || request.ManufacturingOrderId == Guid.Empty)
                throw new InvalidOperationException("La OP es obligatoria para bloques de produccion.");

            var moExists = await _db.ManufacturingOrders.AnyAsync(m => m.Id == request.ManufacturingOrderId && m.OpeningDate != null, ct);
            if (!moExists)
                throw new InvalidOperationException("La orden de produccion no existe o no esta abierta.");

            if (!request.IsUrgency)
            {
                var duplicate = await _db.OpProcessSchedules.AnyAsync(
                    b => b.Id != currentId &&
                         b.ManufacturingOrderId == request.ManufacturingOrderId &&
                         b.BlockType == OpScheduleBlockTypes.Op &&
                         b.ProcessCode == processCode, ct);
                if (duplicate)
                    throw new InvalidOperationException("Ya existe un bloque para este proceso en la OP.");
            }
        }

        if (request.MachineId.HasValue)
        {
            var machineExists = await _db.ProductionMachines.AnyAsync(m => m.Id == request.MachineId && m.IsActive, ct);
            if (!machineExists)
                throw new InvalidOperationException("La maquina seleccionada no existe o esta inactiva.");
        }

        var overlap = await FindOverlapAsync(processCode, request.MachineId, request.PlannedStart, request.PlannedEnd, currentId, ct);
        if (overlap != null)
            throw new InvalidOperationException(overlap);
    }

    private async Task<string?> FindOverlapAsync(
        string processCode,
        Guid? machineId,
        DateTime plannedStart,
        DateTime plannedEnd,
        Guid? excludeId,
        CancellationToken ct,
        IReadOnlySet<Guid>? excludeIds = null)
    {
        var start = NormalizeUtc(plannedStart);
        var end = NormalizeUtcEndOfDay(plannedEnd);

        var query = _db.OpProcessSchedules.AsNoTracking()
            .Where(b => b.PlannedStart <= end && b.PlannedEnd >= start);

        if (excludeId.HasValue)
            query = query.Where(b => b.Id != excludeId.Value);
        if (excludeIds is { Count: > 0 })
            query = query.Where(b => !excludeIds.Contains(b.Id));

        if (machineId.HasValue)
        {
            query = query.Where(b => b.MachineId == machineId);
            var conflict = await query.Select(b => new { b.ProcessCode, b.PlannedStart }).FirstOrDefaultAsync(ct);
            if (conflict != null)
                return $"Cruce de horario en la maquina seleccionada ({conflict.ProcessCode}, {conflict.PlannedStart:yyyy-MM-dd}).";
        }
        else
        {
            query = query.Where(b => b.ProcessCode == processCode && b.MachineId == null);
            var conflict = await query.Select(b => new { b.PlannedStart }).FirstOrDefaultAsync(ct);
            if (conflict != null)
                return $"Cruce de horario en el proceso {processCode} ({conflict.PlannedStart:yyyy-MM-dd}).";
        }

        return null;
    }

    private static OpProcessSchedule BuildEntity(Guid id, UpsertScheduleBlockCommand request, string user, bool isCreate)
    {
        var block = new OpProcessSchedule { Id = id };
        ApplyCommand(block, request, user, isCreate);
        return block;
    }

    private static void ApplyCommand(OpProcessSchedule block, UpsertScheduleBlockCommand request, string user, bool isCreate)
    {
        block.ManufacturingOrderId = request.ManufacturingOrderId;
        block.ProcessCode = request.ProcessCode.Trim();
        block.MachineId = request.MachineId;
        block.BlockType = string.IsNullOrWhiteSpace(request.BlockType) ? OpScheduleBlockTypes.Op : request.BlockType.Trim();
        block.PlannedStart = NormalizeUtc(request.PlannedStart);
        block.PlannedEnd = NormalizeUtcEndOfDay(request.PlannedEnd);
        block.Status = string.IsNullOrWhiteSpace(request.Status) ? OpScheduleStatuses.Scheduled : request.Status.Trim();
        block.SortOrder = request.SortOrder;
        block.IsUrgency = request.IsUrgency;
        block.EstimatedHours = request.EstimatedHours;
        block.Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim();
        if (isCreate)
        {
            block.CreatedAt = DateTime.UtcNow;
            block.CreatedBy = user;
        }
        else
        {
            block.UpdatedAt = DateTime.UtcNow;
            block.UpdatedBy = user;
        }
    }
}