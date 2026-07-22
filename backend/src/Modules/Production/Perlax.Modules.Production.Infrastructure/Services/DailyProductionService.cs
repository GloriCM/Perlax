using ClosedXML.Excel;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.DailyProduction;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class DailyProductionService : IDailyProductionService
{
    private readonly ProductionDbContext _db;
    private readonly IOperatorUserDirectory? _operatorDirectory;

    public DailyProductionService(ProductionDbContext db, IOperatorUserDirectory? operatorDirectory = null)
    {
        _db = db;
        _operatorDirectory = operatorDirectory;
    }

    /// <summary>
    /// Upsert de operarios a partir de los usuarios con rol "Operario".
    /// Los operarios creados manualmente (sin UserId) no se tocan.
    /// </summary>
    private async Task SyncOperatorsFromUsersAsync(CancellationToken ct)
    {
        if (_operatorDirectory is null) return;

        IReadOnlyList<OperatorUserInfo> users;
        try
        {
            users = await _operatorDirectory.GetOperatorUsersAsync(ct);
        }
        catch
        {
            return; // el directorio es best-effort; los catálogos siguen funcionando
        }

        var linked = await _db.ProductionOperators
            .Where(o => o.UserId != null)
            .ToListAsync(ct);
        var byUserId = linked.ToDictionary(o => o.UserId!.Value, o => o);
        var userIds = users.Select(u => u.UserId).ToHashSet();
        var changed = false;

        foreach (var user in users)
        {
            if (byUserId.TryGetValue(user.UserId, out var existing))
            {
                if (existing.DisplayName != user.DisplayName
                    || existing.DocumentNumber != user.DocumentNumber
                    || !existing.IsActive)
                {
                    existing.DisplayName = user.DisplayName;
                    existing.DocumentNumber = user.DocumentNumber;
                    existing.IsActive = true;
                    existing.UpdatedAt = DateTime.UtcNow;
                    existing.UpdatedBy = "sync-users";
                    changed = true;
                }
                continue;
            }

            // Vincular por nombre normalizado si ya existe un operario manual equivalente
            var manualOperators = await _db.ProductionOperators
                .Where(o => o.UserId == null)
                .ToListAsync(ct);
            var byName = manualOperators.FirstOrDefault(o =>
                NormalizePersonName(o.DisplayName) == NormalizePersonName(user.DisplayName));
            if (byName is not null)
            {
                byName.UserId = user.UserId;
                byName.DocumentNumber = user.DocumentNumber ?? byName.DocumentNumber;
                byName.IsActive = true;
                byName.UpdatedAt = DateTime.UtcNow;
                byName.UpdatedBy = "sync-users";
                changed = true;
                continue;
            }

            var code = $"op-{user.Username}".ToLowerInvariant();
            var codeTaken = await _db.ProductionOperators.AnyAsync(o => o.Code == code, ct);
            if (codeTaken) code = $"op-{user.UserId.ToString("N")[..8]}";

            _db.ProductionOperators.Add(new ProductionOperator
            {
                Id = Guid.NewGuid(),
                Code = code,
                DisplayName = user.DisplayName,
                DocumentNumber = user.DocumentNumber,
                UserId = user.UserId,
                IsActive = true,
                CreatedBy = "sync-users",
            });
            changed = true;
        }

        // Desactivar operarios cuyo usuario ya no tiene rol Operario
        foreach (var op in linked.Where(o => o.IsActive && !userIds.Contains(o.UserId!.Value)))
        {
            op.IsActive = false;
            op.UpdatedAt = DateTime.UtcNow;
            op.UpdatedBy = "sync-users";
            changed = true;
        }

        if (changed) await _db.SaveChangesAsync(ct);
        await DeactivateManualOperatorDuplicatesAsync(ct);
    }

    /// <summary>
    /// Desactiva operarios manuales/demo duplicados respecto a los vinculados a Usuarios.
    /// </summary>
    private async Task DeactivateManualOperatorDuplicatesAsync(CancellationToken ct)
    {
        var linked = await _db.ProductionOperators
            .Where(o => o.UserId != null && o.IsActive)
            .ToListAsync(ct);
        var linkedNames = linked
            .Select(o => NormalizePersonName(o.DisplayName))
            .Where(n => n.Length > 0)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        var manual = await _db.ProductionOperators
            .Where(o => o.UserId == null && o.IsActive)
            .ToListAsync(ct);

        var changed = false;
        foreach (var op in manual)
        {
            var normalized = NormalizePersonName(op.DisplayName);
            if (IsLegacyDemoOperator(op)
                || (normalized.Length > 0 && linkedNames.Contains(normalized)))
            {
                op.IsActive = false;
                op.UpdatedAt = DateTime.UtcNow;
                op.UpdatedBy = "sync-dedupe";
                changed = true;
            }
        }

        if (changed) await _db.SaveChangesAsync(ct);
    }

    private static bool IsLegacyDemoOperator(ProductionOperator op)
    {
        ReadOnlySpan<string> demoCodes = ["op-bedoya", "op-enrique", "op-obando", "op-josue"];
        foreach (var code in demoCodes)
        {
            if (string.Equals(op.Code, code, StringComparison.OrdinalIgnoreCase))
                return true;
        }
        return false;
    }

    private static string NormalizePersonName(string? name)
    {
        var parts = (name ?? "")
            .Trim()
            .ToLowerInvariant()
            .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (parts.Length == 0) return string.Empty;
        Array.Sort(parts, StringComparer.Ordinal);
        return string.Join(' ', parts);
    }

    public async Task<DailyReportCatalogsDto> GetCatalogsAsync(CancellationToken ct = default)
    {
        var machines = await ListMachinesAsync(false, ct);
        var operators = await ListOperatorsAsync(false, ct);
        var codes = await ListActivityCodesAsync(false, ct);
        var shifts = await _db.ProductionShifts.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .Select(x => new ShiftDto(x.Id, x.Code, x.Name, x.StartTime.ToString("HH\\:mm"), x.EndTime.ToString("HH\\:mm"), x.CrossesMidnight))
            .ToListAsync(ct);
        var waste = await _db.ProductionWasteReasons.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .Select(x => new WasteReasonDto(x.Id, x.Code, x.Name, x.RequiresObservation, x.IsActive))
            .ToListAsync(ct);
        var orders = await _db.ProductionOrders.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => x.OTNumber)
            .Where(x => x != null && x != "")
            .Take(200)
            .ToListAsync(ct);

        return new DailyReportCatalogsDto(machines, operators, codes, shifts, waste, orders);
    }

    public async Task<DailyReportCatalogsDto> GetPlantaCatalogsAsync(CancellationToken ct = default)
    {
        await SyncOperatorsFromUsersAsync(ct);

        var machines = await ListMachinesAsync(false, ct);
        var operators = await _db.ProductionOperators.AsNoTracking()
            .Where(x => x.IsActive && x.UserId != null)
            .OrderBy(x => x.DisplayName)
            .Select(x => new OperatorDto(x.Id, x.Code, x.DisplayName, x.DocumentNumber, x.UserId, x.IsActive))
            .ToListAsync(ct);
        var codes = await ListActivityCodesAsync(false, ct);
        var shifts = await _db.ProductionShifts.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .Select(x => new ShiftDto(x.Id, x.Code, x.Name, x.StartTime.ToString("HH\\:mm"), x.EndTime.ToString("HH\\:mm"), x.CrossesMidnight))
            .ToListAsync(ct);
        var waste = await _db.ProductionWasteReasons.AsNoTracking()
            .Where(x => x.IsActive)
            .OrderBy(x => x.SortOrder)
            .Select(x => new WasteReasonDto(x.Id, x.Code, x.Name, x.RequiresObservation, x.IsActive))
            .ToListAsync(ct);
        var orders = await _db.ProductionOrders.AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => x.OTNumber)
            .Where(x => x != null && x != "")
            .Take(200)
            .ToListAsync(ct);

        return new DailyReportCatalogsDto(machines, operators, codes, shifts, waste, orders);
    }

    public async Task<IReadOnlyList<MachineDto>> ListMachinesAsync(bool includeInactive = false, CancellationToken ct = default)
    {
        var q = _db.ProductionMachines.AsNoTracking().AsQueryable();
        if (!includeInactive) q = q.Where(x => x.IsActive);
        return await q.OrderBy(x => x.Name)
            .Select(x => new MachineDto(x.Id, x.Code, x.Name, x.IsActive))
            .ToListAsync(ct);
    }

    public async Task<MachineDto> UpsertMachineAsync(Guid? id, UpsertMachineRequest request, string actor, CancellationToken ct = default)
    {
        var code = request.Code.Trim();
        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Código y nombre de máquina son obligatorios.");

        ProductionMachine entity;
        if (id.HasValue)
        {
            entity = await _db.ProductionMachines.FirstOrDefaultAsync(x => x.Id == id.Value, ct)
                ?? throw new KeyNotFoundException("Máquina no encontrada.");
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = actor;
        }
        else
        {
            entity = new ProductionMachine { Id = Guid.NewGuid(), CreatedBy = actor };
            _db.ProductionMachines.Add(entity);
        }

        var dup = await _db.ProductionMachines.AnyAsync(x => x.Id != entity.Id && x.Code == code, ct);
        if (dup) throw new InvalidOperationException($"Ya existe una máquina con código '{code}'.");

        entity.Code = code;
        entity.Name = name;
        entity.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);
        return new MachineDto(entity.Id, entity.Code, entity.Name, entity.IsActive);
    }

    public async Task DeleteMachineAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.ProductionMachines.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Máquina no encontrada.");
        var inUse = await _db.ProductionSessions.AnyAsync(x => x.MachineId == id, ct);
        if (inUse)
        {
            entity.IsActive = false;
            entity.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _db.ProductionMachines.Remove(entity);
        }
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<OperatorDto>> ListOperatorsAsync(bool includeInactive = false, CancellationToken ct = default)
    {
        await SyncOperatorsFromUsersAsync(ct);
        var q = _db.ProductionOperators.AsNoTracking().AsQueryable();
        if (!includeInactive) q = q.Where(x => x.IsActive);
        return await q.OrderBy(x => x.DisplayName)
            .Select(x => new OperatorDto(x.Id, x.Code, x.DisplayName, x.DocumentNumber, x.UserId, x.IsActive))
            .ToListAsync(ct);
    }

    public async Task<OperatorDto> UpsertOperatorAsync(Guid? id, UpsertOperatorRequest request, string actor, CancellationToken ct = default)
    {
        var code = request.Code.Trim();
        var name = request.DisplayName.Trim();
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Código y nombre de operario son obligatorios.");

        ProductionOperator entity;
        if (id.HasValue)
        {
            entity = await _db.ProductionOperators.FirstOrDefaultAsync(x => x.Id == id.Value, ct)
                ?? throw new KeyNotFoundException("Operario no encontrado.");
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = actor;
        }
        else
        {
            entity = new ProductionOperator { Id = Guid.NewGuid(), CreatedBy = actor };
            _db.ProductionOperators.Add(entity);
        }

        var dup = await _db.ProductionOperators.AnyAsync(x => x.Id != entity.Id && x.Code == code, ct);
        if (dup) throw new InvalidOperationException($"Ya existe un operario con código '{code}'.");

        entity.Code = code;
        entity.DisplayName = name;
        entity.DocumentNumber = request.DocumentNumber?.Trim();
        entity.UserId = request.UserId;
        entity.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);
        return new OperatorDto(entity.Id, entity.Code, entity.DisplayName, entity.DocumentNumber, entity.UserId, entity.IsActive);
    }

    public async Task DeleteOperatorAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.ProductionOperators.FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Operario no encontrado.");
        var inUse = await _db.ProductionSessions.AnyAsync(x => x.OperatorId == id, ct);
        if (inUse)
        {
            entity.IsActive = false;
            entity.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _db.ProductionOperators.Remove(entity);
        }
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<ActivityCodeDto>> ListActivityCodesAsync(bool includeInactive = false, CancellationToken ct = default)
    {
        var q = _db.ProductionActivityCodes.AsNoTracking().Include(x => x.Subcodes).AsQueryable();
        if (!includeInactive) q = q.Where(x => x.IsActive);
        var list = await q.OrderBy(x => x.SortOrder).ThenBy(x => x.Code).ToListAsync(ct);
        return list.Select(MapCode).ToList();
    }

    public async Task<ActivityCodeDto> UpsertActivityCodeAsync(Guid? id, UpsertActivityCodeRequest request, string actor, CancellationToken ct = default)
    {
        var code = request.Code.Trim();
        var name = request.Name.Trim();
        if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(name))
            throw new InvalidOperationException("Código y nombre son obligatorios.");

        ProductionActivityCode entity;
        if (id.HasValue)
        {
            entity = await _db.ProductionActivityCodes.Include(x => x.Subcodes).FirstOrDefaultAsync(x => x.Id == id.Value, ct)
                ?? throw new KeyNotFoundException("Código no encontrado.");
            entity.UpdatedAt = DateTime.UtcNow;
            entity.UpdatedBy = actor;
            _db.ProductionActivitySubcodes.RemoveRange(entity.Subcodes);
            entity.Subcodes.Clear();
        }
        else
        {
            entity = new ProductionActivityCode { Id = Guid.NewGuid(), CreatedBy = actor, SortOrder = 99 };
            _db.ProductionActivityCodes.Add(entity);
        }

        var dup = await _db.ProductionActivityCodes.AnyAsync(x => x.Id != entity.Id && x.Code == code, ct);
        if (dup) throw new InvalidOperationException($"Ya existe el código '{code}'.");

        entity.Code = code;
        entity.Name = name;
        entity.RequiresOrder = request.RequiresOrder;
        entity.AllowsProductionQty = request.AllowsProductionQty;
        entity.IsActive = request.IsActive;

        var sort = 0;
        foreach (var sub in request.Subcodes ?? Array.Empty<UpsertActivitySubcodeRequest>())
        {
            sort++;
            entity.Subcodes.Add(new ProductionActivitySubcode
            {
                Id = Guid.NewGuid(),
                ActivityCodeId = entity.Id,
                Code = sub.Code.Trim(),
                Name = sub.Name.Trim(),
                RequiresObservation = sub.RequiresObservation,
                IsActive = sub.IsActive,
                SortOrder = sort,
            });
        }

        await _db.SaveChangesAsync(ct);
        return MapCode(entity);
    }

    public async Task DeleteActivityCodeAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.ProductionActivityCodes.Include(x => x.Subcodes).FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Código no encontrado.");
        var inUse = await _db.ProductionActivities.AnyAsync(x => x.ActivityCodeId == id, ct);
        if (inUse)
        {
            entity.IsActive = false;
            entity.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            _db.ProductionActivityCodes.Remove(entity);
        }
        await _db.SaveChangesAsync(ct);
    }

    public async Task<IReadOnlyList<OrderLookupDto>> LookupOrdersAsync(string? query, int take = 50, CancellationToken ct = default)
    {
        take = Math.Clamp(take, 1, 200);
        var q = _db.ProductionOrders.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(query))
        {
            var term = query.Trim();
            q = q.Where(x => x.OTNumber.Contains(term) || x.Cliente.Contains(term) || x.ProductName.Contains(term));
        }

        return await q.OrderByDescending(x => x.CreatedAt)
            .Take(take)
            .Select(x => new OrderLookupDto(x.Id, x.OTNumber, x.Cliente, x.ProductName))
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<SessionDto>> ListSessionsAsync(DateOnly? date, string? status, Guid? machineId, Guid? operatorId, CancellationToken ct = default)
    {
        var q = _db.ProductionSessions.AsNoTracking().Include(x => x.Activities).ThenInclude(a => a.WasteEntries).AsQueryable();
        if (date.HasValue) q = q.Where(x => x.OperationalDate == date.Value);
        if (!string.IsNullOrWhiteSpace(status)) q = q.Where(x => x.Status == status);
        if (machineId.HasValue) q = q.Where(x => x.MachineId == machineId.Value);
        if (operatorId.HasValue) q = q.Where(x => x.OperatorId == operatorId.Value);

        var list = await q.OrderByDescending(x => x.StartedAt).ToListAsync(ct);
        return list.Select(MapSession).ToList();
    }

    public async Task<IReadOnlyList<ActivityDto>> ListActivitiesAsync(DateOnly? date, Guid? machineId, Guid? operatorId, string? source, bool finishedOnly, CancellationToken ct = default)
    {
        var q = _db.ProductionActivities.AsNoTracking()
            .Include(x => x.Session)
            .Include(x => x.WasteEntries)
            .AsQueryable();

        if (date.HasValue) q = q.Where(x => x.OperationalDate == date.Value);
        if (machineId.HasValue) q = q.Where(x => x.Session!.MachineId == machineId.Value);
        if (operatorId.HasValue) q = q.Where(x => x.Session!.OperatorId == operatorId.Value);
        if (!string.IsNullOrWhiteSpace(source)) q = q.Where(x => x.Session!.Source == source);
        if (finishedOnly) q = q.Where(x => x.Status == ProductionActivityStatuses.Done);

        var list = await q.OrderBy(x => x.StartAt).ToListAsync(ct);
        return list.Select(MapActivity).ToList();
    }

    public async Task<SessionDto> StartSessionAsync(StartSessionRequest request, string actor, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            var existing = await _db.ProductionSessions
                .Include(x => x.Activities).ThenInclude(a => a.WasteEntries)
                .FirstOrDefaultAsync(x => x.IdempotencyKey == request.IdempotencyKey, ct);
            if (existing is not null) return MapSession(existing);
        }

        var machine = await _db.ProductionMachines.FirstOrDefaultAsync(x => x.Id == request.MachineId && x.IsActive, ct)
            ?? throw new InvalidOperationException("Máquina no encontrada o inactiva.");
        var op = await _db.ProductionOperators.FirstOrDefaultAsync(x => x.Id == request.OperatorId && x.IsActive, ct)
            ?? throw new InvalidOperationException("Operario no encontrado o inactivo.");
        var shift = await _db.ProductionShifts.FirstOrDefaultAsync(x => x.Code == request.ShiftCode && x.IsActive, ct)
            ?? throw new InvalidOperationException($"Turno '{request.ShiftCode}' no válido.");

        var today = DateOnly.FromDateTime(DateTime.Now);

        // Reutilizar sesión activa del mismo operario + máquina (p. ej. tras recargar /planta).
        var existingActive = await _db.ProductionSessions
            .Include(x => x.Activities).ThenInclude(a => a.WasteEntries)
            .Where(x =>
                x.MachineId == machine.Id &&
                x.OperatorId == op.Id &&
                x.OperationalDate == today &&
                (x.Status == ProductionSessionStatuses.Live || x.Status == ProductionSessionStatuses.Paused))
            .OrderByDescending(x => x.StartedAt)
            .FirstOrDefaultAsync(ct);
        if (existingActive is not null) return MapSession(existingActive);

        // Si el operario tiene sesión abierta en otra máquina sin actividad en curso, cerrarla (p. ej. recarga).
        var otherOperatorSession = await _db.ProductionSessions
            .Include(x => x.Activities)
            .Where(x =>
                x.OperatorId == op.Id
                && x.OperationalDate == today
                && x.MachineId != machine.Id
                && (x.Status == ProductionSessionStatuses.Live || x.Status == ProductionSessionStatuses.Paused))
            .OrderByDescending(x => x.StartedAt)
            .FirstOrDefaultAsync(ct);

        if (otherOperatorSession is not null)
        {
            var runningOnOther = otherOperatorSession.Activities
                .Any(a => a.Status == ProductionActivityStatuses.Running);
            if (runningOnOther)
            {
                throw new InvalidOperationException(
                    $"El operario '{op.DisplayName}' ya está trabajando en '{otherOperatorSession.MachineNameSnapshot}'. Detenga esa actividad antes de cambiar de máquina.");
            }
            await CloseStaleSessionAsync(otherOperatorSession, actor, ct);
        }

        var busyMachine = await _db.ProductionSessions.AnyAsync(x =>
            x.MachineId == machine.Id &&
            x.OperationalDate == today &&
            (x.Status == ProductionSessionStatuses.Live || x.Status == ProductionSessionStatuses.Paused), ct);
        if (busyMachine) throw new InvalidOperationException($"La máquina '{machine.Name}' ya tiene una sesión activa con otro operario.");

        var busyOp = await _db.ProductionSessions.AnyAsync(x =>
            x.OperatorId == op.Id &&
            x.OperationalDate == today &&
            x.MachineId != machine.Id &&
            (x.Status == ProductionSessionStatuses.Live || x.Status == ProductionSessionStatuses.Paused), ct);
        if (busyOp) throw new InvalidOperationException($"El operario '{op.DisplayName}' ya tiene una sesión activa en otra máquina.");

        var session = new ProductionSession
        {
            Id = Guid.NewGuid(),
            OperationalDate = today,
            MachineId = machine.Id,
            MachineCodeSnapshot = machine.Code,
            MachineNameSnapshot = machine.Name,
            OperatorId = op.Id,
            OperatorCodeSnapshot = op.Code,
            OperatorNameSnapshot = op.DisplayName,
            ShiftId = shift.Id,
            ShiftCodeSnapshot = shift.Code,
            Status = ProductionSessionStatuses.Live,
            Source = ProductionSessionSources.Planta,
            MetaTiros = request.MetaTiros,
            StartedAt = DateTime.UtcNow,
            IdempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey.Trim(),
            CreatedBy = actor,
        };
        _db.ProductionSessions.Add(session);
        await _db.SaveChangesAsync(ct);
        return MapSession(session);
    }

    public async Task<SessionDto> PauseSessionAsync(Guid sessionId, string actor, CancellationToken ct = default)
    {
        var session = await LoadSessionTracked(sessionId, ct);
        if (session.Status != ProductionSessionStatuses.Live)
            throw new InvalidOperationException("Solo se pueden pausar sesiones en vivo.");
        session.Status = ProductionSessionStatuses.Paused;
        session.PausedAt = DateTime.UtcNow;
        session.UpdatedAt = DateTime.UtcNow;
        session.UpdatedBy = actor;
        session.ConcurrencyStamp++;
        await _db.SaveChangesAsync(ct);
        return MapSession(session);
    }

    public async Task<SessionDto> ResumeSessionAsync(Guid sessionId, string actor, CancellationToken ct = default)
    {
        var session = await LoadSessionTracked(sessionId, ct);
        if (session.Status != ProductionSessionStatuses.Paused)
            throw new InvalidOperationException("Solo se pueden reanudar sesiones pausadas.");
        if (session.PausedAt.HasValue)
        {
            session.PausedSecondsAccumulated += (int)Math.Max(0, (DateTime.UtcNow - session.PausedAt.Value).TotalSeconds);
        }
        session.PausedAt = null;
        session.Status = ProductionSessionStatuses.Live;
        session.UpdatedAt = DateTime.UtcNow;
        session.UpdatedBy = actor;
        session.ConcurrencyStamp++;
        await _db.SaveChangesAsync(ct);
        return MapSession(session);
    }

    public async Task<SessionDto> FinishSessionAsync(Guid sessionId, string actor, CancellationToken ct = default)
    {
        var session = await LoadSessionTracked(sessionId, ct);
        var running = session.Activities.Where(a => a.Status == ProductionActivityStatuses.Running).ToList();
        foreach (var act in running)
        {
            act.EndAt = DateTime.UtcNow;
            act.DurationSeconds = ComputeDuration(act.StartAt, act.EndAt.Value, session.PausedSecondsAccumulated);
            act.Status = ProductionActivityStatuses.Done;
            act.UpdatedAt = DateTime.UtcNow;
            act.UpdatedBy = actor;
        }

        session.Status = ProductionSessionStatuses.Finished;
        session.EndedAt = DateTime.UtcNow;
        session.CurrentActivityId = null;
        session.CurrentActivityCode = null;
        session.CurrentActivityName = null;
        session.CurrentOp = null;
        session.UpdatedAt = DateTime.UtcNow;
        session.UpdatedBy = actor;
        session.ConcurrencyStamp++;
        await _db.SaveChangesAsync(ct);
        return MapSession(session);
    }

    public async Task<ActivityDto> StartActivityAsync(Guid sessionId, StartActivityRequest request, string actor, CancellationToken ct = default)
    {
        if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            var existing = await _db.ProductionActivities
                .Include(x => x.Session)
                .Include(x => x.WasteEntries)
                .FirstOrDefaultAsync(x => x.IdempotencyKey == request.IdempotencyKey, ct);
            if (existing is not null) return MapActivity(existing);
        }

        var session = await LoadSessionTracked(sessionId, ct);
        if (session.Status == ProductionSessionStatuses.Finished)
            throw new InvalidOperationException("La sesión ya está finalizada.");

        // Entre actividades la sesión puede quedar en pausa; reanudar automáticamente.
        if (session.Status == ProductionSessionStatuses.Paused)
        {
            if (session.PausedAt.HasValue)
            {
                session.PausedSecondsAccumulated += (int)Math.Max(0, (DateTime.UtcNow - session.PausedAt.Value).TotalSeconds);
            }
            session.PausedAt = null;
            session.Status = ProductionSessionStatuses.Live;
            session.UpdatedAt = DateTime.UtcNow;
            session.UpdatedBy = actor;
        }

        var code = await _db.ProductionActivityCodes.Include(x => x.Subcodes)
            .FirstOrDefaultAsync(x => x.Id == request.ActivityCodeId && x.IsActive, ct)
            ?? throw new InvalidOperationException("Código de actividad no válido.");

        ProductionActivitySubcode? sub = null;
        if (request.SubcodeId.HasValue)
        {
            sub = code.Subcodes.FirstOrDefault(x => x.Id == request.SubcodeId.Value && x.IsActive)
                ?? throw new InvalidOperationException("Subcódigo no válido.");
        }

        if (sub?.RequiresObservation == true && string.IsNullOrWhiteSpace(request.Observations))
            throw new InvalidOperationException("Este subcódigo requiere observaciones.");

        string? otNumber = request.ProductionOrderNumber?.Trim();
        Guid? otId = null;
        if (!string.IsNullOrWhiteSpace(otNumber))
        {
            var order = await _db.ProductionOrders.AsNoTracking().FirstOrDefaultAsync(x => x.OTNumber == otNumber, ct);
            otId = order?.Id;
        }
        else if (code.RequiresOrder)
        {
            throw new InvalidOperationException($"El código {code.Code} requiere orden de producción.");
        }
        else
        {
            otNumber = "460";
        }

        var runningActivities = session.Activities
            .Where(a => a.Status == ProductionActivityStatuses.Running)
            .ToList();
        if (runningActivities.Count > 0)
        {
            var current = runningActivities[0];
            throw new InvalidOperationException(
                $"Hay una actividad en curso ({current.ActivityCodeSnapshot} {current.ActivityNameSnapshot}). "
                + "Deténgala con el botón Detener antes de iniciar otra.");
        }

        var startAt = request.StartAt ?? DateTime.UtcNow;
        var activity = new ProductionActivity
        {
            Id = Guid.NewGuid(),
            SessionId = session.Id,
            Sequence = session.Activities.Count + 1,
            OperationalDate = session.OperationalDate,
            ActivityCodeId = code.Id,
            ActivityCodeSnapshot = code.Code,
            ActivityNameSnapshot = code.Name,
            SubcodeId = sub?.Id,
            SubcodeSnapshot = sub?.Code,
            SubcodeDetailSnapshot = sub?.Name,
            ProductionOrderId = otId,
            ProductionOrderNumber = otNumber,
            StartAt = startAt,
            Observations = request.Observations,
            Status = ProductionActivityStatuses.Running,
            IdempotencyKey = string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey.Trim(),
            CreatedBy = actor,
        };
        // Explicit Add: con Guid no generado por BD, session.Activities.Add a veces
        // marca la entidad como Modified y el UPDATE falla (0 filas).
        _db.ProductionActivities.Add(activity);
        session.CurrentActivityId = activity.Id;
        session.CurrentActivityCode = code.Code;
        session.CurrentActivityName = code.Name;
        session.CurrentOp = otNumber;
        session.Status = ProductionSessionStatuses.Live;
        session.UpdatedAt = DateTime.UtcNow;
        session.UpdatedBy = actor;
        session.ConcurrencyStamp++;

        await _db.SaveChangesAsync(ct);
        activity.Session = session;
        return MapActivity(activity);
    }

    public async Task<ActivityDto> FinishActivityAsync(Guid activityId, FinishActivityRequest request, string actor, CancellationToken ct = default)
    {
        DbUpdateConcurrencyException? lastConflict = null;
        for (var attempt = 1; attempt <= 5; attempt++)
        {
            try
            {
                return await FinishActivityCoreAsync(activityId, request, actor, ct);
            }
            catch (DbUpdateConcurrencyException ex)
            {
                lastConflict = ex;
                _db.ChangeTracker.Clear();
                if (attempt < 5)
                    await Task.Delay(50 * attempt, ct);
            }
        }

        throw lastConflict ?? new DbUpdateConcurrencyException("No se pudo finalizar la actividad.");
    }

    private async Task<ActivityDto> FinishActivityCoreAsync(
        Guid activityId,
        FinishActivityRequest request,
        string actor,
        CancellationToken ct)
    {
        var activity = await _db.ProductionActivities
            .Include(x => x.WasteEntries)
            .Include(x => x.ActivityCode)
            .FirstOrDefaultAsync(x => x.Id == activityId, ct)
            ?? throw new KeyNotFoundException("Actividad no encontrada.");

        if (activity.Status == ProductionActivityStatuses.Done)
        {
            activity.Session = await _db.ProductionSessions.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == activity.SessionId, ct);
            return MapActivity(activity);
        }

        if (activity.Status != ProductionActivityStatuses.Running)
            throw new InvalidOperationException("La actividad no se puede finalizar.");

        var session = await _db.ProductionSessions.FirstOrDefaultAsync(x => x.Id == activity.SessionId, ct)
            ?? throw new InvalidOperationException("Sesión no encontrada.");

        var code = activity.ActivityCode
            ?? await _db.ProductionActivityCodes.FirstAsync(x => x.Id == activity.ActivityCodeId, ct);

        if (!code.AllowsProductionQty && (request.QuantityProcessed > 0 || request.Waste > 0))
            throw new InvalidOperationException($"El código {code.Code} no admite tiros ni desperdicio.");

        if (code.AllowsProductionQty && request.QuantityProcessed <= 0)
            throw new InvalidOperationException("Las actividades de producción requieren registrar tiros.");

        if (request.Waste > request.QuantityProcessed && request.QuantityProcessed > 0)
            throw new InvalidOperationException("El desperdicio no puede superar los tiros.");

        if (activity.SubcodeId.HasValue)
        {
            var activitySub = await _db.ProductionActivitySubcodes.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == activity.SubcodeId.Value, ct);
            if (activitySub?.RequiresObservation == true && string.IsNullOrWhiteSpace(request.Observations))
                throw new InvalidOperationException("Este subcódigo requiere observaciones.");
        }

        var endAt = request.EndAt ?? DateTime.UtcNow;
        if (endAt <= activity.StartAt)
            throw new InvalidOperationException("La hora fin debe ser posterior a la hora inicio.");

        var pausedAccum = session.PausedSecondsAccumulated;
        if (session.Status == ProductionSessionStatuses.Paused && session.PausedAt.HasValue)
            pausedAccum += (int)Math.Max(0, (DateTime.UtcNow - session.PausedAt.Value).TotalSeconds);

        activity.EndAt = endAt;
        activity.DurationSeconds = ComputeDuration(activity.StartAt, endAt, pausedAccum);
        activity.QuantityProcessed = Math.Max(0, request.QuantityProcessed);
        activity.Waste = Math.Max(0, request.Waste);
        activity.Observations = request.Observations;
        activity.Status = ProductionActivityStatuses.Done;
        activity.UpdatedAt = DateTime.UtcNow;
        activity.UpdatedBy = actor;

        _db.ProductionWasteEntries.RemoveRange(activity.WasteEntries);
        activity.WasteEntries.Clear();
        await AttachWasteEntries(activity, request.WasteEntries, ct);

        if (session.Status == ProductionSessionStatuses.Paused && session.PausedAt.HasValue)
        {
            session.PausedSecondsAccumulated += (int)Math.Max(0, (DateTime.UtcNow - session.PausedAt.Value).TotalSeconds);
            session.PausedAt = null;
        }

        session.Status = ProductionSessionStatuses.Live;
        session.CurrentActivityId = null;
        session.CurrentActivityCode = null;
        session.CurrentActivityName = null;
        session.CurrentOp = null;
        session.UpdatedAt = DateTime.UtcNow;
        session.UpdatedBy = actor;
        session.ConcurrencyStamp++;

        await _db.SaveChangesAsync(ct);
        activity.Session = session;
        return MapActivity(activity);
    }

    public async Task<IReadOnlyList<DailyReportListItemDto>> ListDailyReportsAsync(DateOnly? from, DateOnly? to, string? operatorName, CancellationToken ct = default)
    {
        var q = _db.ProductionSessions.AsNoTracking()
            .Where(x => x.Source == ProductionSessionSources.ReporteDiario)
            .AsQueryable();
        if (from.HasValue) q = q.Where(x => x.OperationalDate >= from.Value);
        if (to.HasValue) q = q.Where(x => x.OperationalDate <= to.Value);
        if (!string.IsNullOrWhiteSpace(operatorName))
        {
            var term = operatorName.Trim();
            q = q.Where(x => x.OperatorNameSnapshot.Contains(term));
        }

        var sessions = await q.Include(x => x.Activities).OrderByDescending(x => x.OperationalDate).ThenBy(x => x.OperatorNameSnapshot).ToListAsync(ct);
        return sessions.Select(s =>
        {
            var done = s.Activities.Where(a => a.Status == ProductionActivityStatuses.Done).ToList();
            var hours = done.Sum(a => (decimal)(a.DurationSeconds ?? 0) / 3600m);
            return new DailyReportListItemDto(
                s.Id,
                s.OperationalDate,
                s.OperatorId,
                s.OperatorNameSnapshot,
                s.ShiftCodeSnapshot,
                done.Count,
                Math.Round(hours, 2),
                done.Sum(a => a.QuantityProcessed),
                done.Sum(a => a.Waste),
                s.CreatedAt,
                s.UpdatedAt);
        }).ToList();
    }

    public async Task<DailyReportDetailDto?> GetDailyReportAsync(Guid operatorId, DateOnly processDate, string shiftCode, CancellationToken ct = default)
    {
        var session = await _db.ProductionSessions.AsNoTracking()
            .Include(x => x.Activities).ThenInclude(a => a.WasteEntries)
            .FirstOrDefaultAsync(x =>
                x.OperatorId == operatorId &&
                x.OperationalDate == processDate &&
                x.ShiftCodeSnapshot == shiftCode &&
                x.Source == ProductionSessionSources.ReporteDiario, ct);
        if (session is null) return null;
        return new DailyReportDetailDto(
            session.Id,
            session.OperationalDate,
            session.OperatorId,
            session.OperatorNameSnapshot,
            session.ShiftCodeSnapshot,
            session.CreatedAt,
            session.UpdatedAt,
            session.Activities.OrderBy(a => a.Sequence).Select(MapActivity).ToList());
    }

    public async Task<IReadOnlyList<DailyReportDetailDto>> SaveManualBatchAsync(SaveManualBatchRequest request, string actor, CancellationToken ct = default)
    {
        if (request.Reports is null || request.Reports.Count == 0)
            throw new InvalidOperationException("Debe enviar al menos un reporte.");

        if (!string.IsNullOrWhiteSpace(request.IdempotencyKey))
        {
            var existingKey = await _db.ProductionSessions.AnyAsync(x => x.IdempotencyKey == request.IdempotencyKey, ct);
            if (existingKey)
            {
                var existing = await ListDailyReportsAsync(request.ProcessDate, request.ProcessDate, null, ct);
                var details = new List<DailyReportDetailDto>();
                foreach (var item in existing)
                {
                    var d = await GetDailyReportAsync(item.OperatorId, item.ProcessDate, item.ShiftCode, ct);
                    if (d is not null) details.Add(d);
                }
                return details;
            }
        }

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        var results = new List<DailyReportDetailDto>();

        try
        {
            var shift = await _db.ProductionShifts.FirstOrDefaultAsync(x => x.Code == request.ShiftCode && x.IsActive, ct)
                ?? throw new InvalidOperationException($"Turno '{request.ShiftCode}' no válido.");

            var reportIndex = 0;
            foreach (var report in request.Reports)
            {
                reportIndex++;
                if (report.Processes is null || report.Processes.Count == 0)
                    throw new InvalidOperationException($"El reporte #{reportIndex} no tiene procesos.");

                var op = await ResolveOperatorAsync(report.OperatorId, report.OperatorName, actor, ct);
                var processDate = report.ProcessDate == default ? request.ProcessDate : report.ProcessDate;

                var oldSessions = await _db.ProductionSessions
                    .Include(x => x.Activities).ThenInclude(a => a.WasteEntries)
                    .Where(x =>
                        x.OperatorId == op.Id &&
                        x.OperationalDate == processDate &&
                        x.ShiftCodeSnapshot == (string.IsNullOrWhiteSpace(report.ShiftCode) ? request.ShiftCode : report.ShiftCode) &&
                        x.Source == ProductionSessionSources.ReporteDiario)
                    .ToListAsync(ct);
                _db.ProductionSessions.RemoveRange(oldSessions);

                // Agrupar por máquina: una sesión por par operario-máquina
                var byMachine = new Dictionary<Guid, List<(SaveManualProcessRequest Proc, ProductionMachine Machine, ProductionActivityCode Code, ProductionActivitySubcode? Sub, Guid? OtId, string? OtNumber)>>();

                var seq = 0;
                foreach (var proc in report.Processes)
                {
                    seq++;
                    ValidateInterval(proc.StartAt, proc.EndAt);
                    var machine = await ResolveMachineAsync(proc.MachineId, proc.MachineName, actor, ct);
                    var code = await ResolveActivityCodeAsync(proc.ActivityCodeId, proc.ActivityCode, ct);
                    var sub = await ResolveSubcodeAsync(code, proc.SubcodeId, proc.Subcode, ct);

                    if (sub?.RequiresObservation == true && string.IsNullOrWhiteSpace(proc.Observations))
                        throw new InvalidOperationException($"El subcódigo {sub.Code} requiere observaciones.");

                    if (!code.AllowsProductionQty && (proc.QuantityProcessed > 0 || proc.Waste > 0))
                        throw new InvalidOperationException($"El código {code.Code} no admite tiros/desperdicio.");

                    string? otNumber = proc.ProductionOrderNumber?.Trim();
                    Guid? otId = null;
                    if (!string.IsNullOrWhiteSpace(otNumber))
                    {
                        var order = await _db.ProductionOrders.AsNoTracking().FirstOrDefaultAsync(x => x.OTNumber == otNumber, ct);
                        otId = order?.Id;
                    }
                    else if (code.RequiresOrder)
                    {
                        throw new InvalidOperationException($"El código {code.Code} requiere OP.");
                    }

                    if (!byMachine.TryGetValue(machine.Id, out var list))
                    {
                        list = new List<(SaveManualProcessRequest, ProductionMachine, ProductionActivityCode, ProductionActivitySubcode?, Guid?, string?)>();
                        byMachine[machine.Id] = list;
                    }
                    list.Add((proc, machine, code, sub, otId, otNumber));
                }

                // Validar solapes por máquina dentro del reporte
                foreach (var group in byMachine.Values)
                {
                    var ordered = group.OrderBy(x => x.Proc.StartAt).ToList();
                    for (var i = 1; i < ordered.Count; i++)
                    {
                        if (ordered[i].Proc.StartAt < ordered[i - 1].Proc.EndAt)
                            throw new InvalidOperationException($"Hay solapamiento de horarios en la máquina {ordered[i].Machine.Name}.");
                    }
                }

                var allActivities = new List<ActivityDto>();
                Guid? primarySessionId = null;

                foreach (var (machineId, items) in byMachine)
                {
                    var machine = items[0].Machine;
                    var started = items.Min(x => x.Proc.StartAt);
                    var ended = items.Max(x => x.Proc.EndAt);
                    var session = new ProductionSession
                    {
                        Id = Guid.NewGuid(),
                        OperationalDate = processDate,
                        MachineId = machine.Id,
                        MachineCodeSnapshot = machine.Code,
                        MachineNameSnapshot = machine.Name,
                        OperatorId = op.Id,
                        OperatorCodeSnapshot = op.Code,
                        OperatorNameSnapshot = op.DisplayName,
                        ShiftId = shift.Id,
                        ShiftCodeSnapshot = shift.Code,
                        Status = ProductionSessionStatuses.Finished,
                        Source = ProductionSessionSources.ReporteDiario,
                        StartedAt = started.ToUniversalTime(),
                        EndedAt = ended.ToUniversalTime(),
                        IdempotencyKey = reportIndex == 1 && machineId == byMachine.Keys.First()
                            ? (string.IsNullOrWhiteSpace(request.IdempotencyKey) ? null : request.IdempotencyKey.Trim())
                            : null,
                        CreatedBy = actor,
                    };
                    primarySessionId ??= session.Id;

                    var sequence = 0;
                    foreach (var item in items.OrderBy(x => x.Proc.StartAt))
                    {
                        sequence++;
                        var activity = new ProductionActivity
                        {
                            Id = Guid.NewGuid(),
                            SessionId = session.Id,
                            Sequence = sequence,
                            OperationalDate = processDate,
                            ActivityCodeId = item.Code.Id,
                            ActivityCodeSnapshot = item.Code.Code,
                            ActivityNameSnapshot = item.Code.Name,
                            SubcodeId = item.Sub?.Id,
                            SubcodeSnapshot = item.Sub?.Code,
                            SubcodeDetailSnapshot = item.Sub?.Name,
                            ProductionOrderId = item.OtId,
                            ProductionOrderNumber = item.OtNumber,
                            StartAt = item.Proc.StartAt.ToUniversalTime(),
                            EndAt = item.Proc.EndAt.ToUniversalTime(),
                            DurationSeconds = ComputeDuration(item.Proc.StartAt, item.Proc.EndAt, 0),
                            QuantityProcessed = Math.Max(0, item.Proc.QuantityProcessed),
                            Waste = Math.Max(0, item.Proc.Waste),
                            Observations = item.Proc.Observations,
                            Status = ProductionActivityStatuses.Done,
                            CreatedBy = actor,
                        };
                        await AttachWasteEntries(activity, item.Proc.WasteEntries, ct);
                        _db.ProductionActivities.Add(activity);
                    }

                    _db.ProductionSessions.Add(session);
                    await _db.SaveChangesAsync(ct);

                    var mapped = session.Activities.OrderBy(a => a.Sequence).Select(a =>
                    {
                        a.Session = session;
                        return MapActivity(a);
                    }).ToList();
                    allActivities.AddRange(mapped);
                }

                results.Add(new DailyReportDetailDto(
                    primarySessionId ?? Guid.NewGuid(),
                    processDate,
                    op.Id,
                    op.DisplayName,
                    shift.Code,
                    DateTime.UtcNow,
                    null,
                    allActivities.OrderBy(a => a.StartAt).ToList()));
            }

            await tx.CommitAsync(ct);
            return results;
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    public async Task<byte[]> ExportExcelAsync(DateOnly date, string groupBy, Guid? operatorId, Guid? machineId, CancellationToken ct = default)
    {
        var activities = await ListActivitiesAsync(date, machineId, operatorId, null, true, ct);
        using var workbook = new XLWorkbook();

        if (IsMachineSheetsExport(groupBy))
        {
            ExportMachineSheets(workbook, activities);
        }
        else if (string.Equals(groupBy, "operator", StringComparison.OrdinalIgnoreCase))
        {
            var ws = workbook.Worksheets.Add("Reporte");
            WriteOperatorStyleHeaders(ws);
            WriteOperatorStyleActivityRows(ws, activities.OrderBy(x => x.OperatorName).ThenBy(x => x.StartAt));
            ws.Columns().AdjustToContents();
        }
        else
        {
            var ws = workbook.Worksheets.Add("Reporte");
            var headers = new[] { "Maquina", "Fecha", "Orden", "Inicio", "Final", "Horas", "Actividad", "Tiros", "Observaciones" };
            for (var i = 0; i < headers.Length; i++) ws.Cell(1, i + 1).Value = headers[i];

            var row = 2;
            foreach (var a in activities.OrderBy(x => x.MachineName).ThenBy(x => x.StartAt))
            {
                ws.Cell(row, 1).Value = a.MachineName;
                ws.Cell(row, 2).Value = a.OperationalDate.ToDateTime(TimeOnly.MinValue);
                ws.Cell(row, 2).Style.DateFormat.Format = "d/m/yyyy";
                ws.Cell(row, 3).Value = a.ProductionOrderNumber ?? "";
                ws.Cell(row, 4).Value = a.StartAt.ToLocalTime();
                ws.Cell(row, 4).Style.DateFormat.Format = "HH:mm:ss";
                ws.Cell(row, 5).Value = a.EndAt?.ToLocalTime();
                ws.Cell(row, 5).Style.DateFormat.Format = "HH:mm:ss";
                ws.Cell(row, 6).Value = Math.Round((a.DurationSeconds ?? 0) / 3600.0, 2);
                ws.Cell(row, 7).Value = $"{a.ActivityCode} {a.ActivityName}";
                ws.Cell(row, 8).Value = a.QuantityProcessed;
                ws.Cell(row, 9).Value = string.IsNullOrWhiteSpace(a.Observations) ? "*" : a.Observations;
                row++;
            }
            ws.Columns().AdjustToContents();
        }

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    private static bool IsMachineSheetsExport(string groupBy) =>
        string.Equals(groupBy, "machine-sheets", StringComparison.OrdinalIgnoreCase)
        || string.Equals(groupBy, "sheets-by-machine", StringComparison.OrdinalIgnoreCase);

    private static void ExportMachineSheets(XLWorkbook workbook, IReadOnlyList<ActivityDto> activities)
    {
        var groups = activities
            .GroupBy(a => string.IsNullOrWhiteSpace(a.MachineName) ? "Sin maquina" : a.MachineName.Trim())
            .OrderBy(g => g.Key, StringComparer.OrdinalIgnoreCase);

        var usedSheetNames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        if (!groups.Any())
        {
            var empty = workbook.Worksheets.Add("Sin datos");
            empty.Cell(1, 1).Value = "No hay actividades para esta fecha.";
            return;
        }

        foreach (var group in groups)
        {
            var sheetName = UniqueExcelSheetName(group.Key, usedSheetNames);
            usedSheetNames.Add(sheetName);
            var ws = workbook.Worksheets.Add(sheetName);
            WriteOperatorStyleHeaders(ws);
            WriteOperatorStyleActivityRows(ws, group.OrderBy(x => x.OperatorName).ThenBy(x => x.StartAt));
            ws.Columns().AdjustToContents();
        }
    }

    private static readonly string[] OperatorStyleExcelHeaders =
    {
        "Operario", "Operario Aux", "Operario Aux", "Operario Aux",
        "Fecha", "Orden", "Inicio", "Final", "Horas", "Actividad", "Tiros", "Observaciones",
    };

    private static void WriteOperatorStyleHeaders(IXLWorksheet ws)
    {
        for (var i = 0; i < OperatorStyleExcelHeaders.Length; i++)
            ws.Cell(1, i + 1).Value = OperatorStyleExcelHeaders[i];
    }

    private static void WriteOperatorStyleActivityRows(IXLWorksheet ws, IEnumerable<ActivityDto> activities, int startRow = 2)
    {
        var row = startRow;
        foreach (var a in activities)
        {
            ws.Cell(row, 1).Value = a.OperatorName;
            ws.Cell(row, 5).Value = a.OperationalDate.ToDateTime(TimeOnly.MinValue);
            ws.Cell(row, 5).Style.DateFormat.Format = "d/m/yyyy";
            ws.Cell(row, 6).Value = a.ProductionOrderNumber ?? "";
            ws.Cell(row, 7).Value = a.StartAt.ToLocalTime();
            ws.Cell(row, 7).Style.DateFormat.Format = "HH:mm:ss";
            ws.Cell(row, 8).Value = a.EndAt?.ToLocalTime();
            ws.Cell(row, 8).Style.DateFormat.Format = "HH:mm:ss";
            ws.Cell(row, 9).Value = Math.Round((a.DurationSeconds ?? 0) / 3600.0, 2);
            ws.Cell(row, 10).Value = $"{a.ActivityCode} {a.ActivityName}";
            ws.Cell(row, 11).Value = a.QuantityProcessed;
            ws.Cell(row, 12).Value = string.IsNullOrWhiteSpace(a.Observations) ? "*" : a.Observations;
            row++;
        }
    }

    private static string SanitizeExcelSheetName(string name)
    {
        var s = string.IsNullOrWhiteSpace(name) ? "Sin maquina" : name.Trim();
        foreach (var c in new[] { '\\', '/', '*', '?', ':', '[', ']' })
            s = s.Replace(c, '-');
        s = s.Trim('\'');
        if (s.Length > 31) s = s[..31].TrimEnd();
        return string.IsNullOrWhiteSpace(s) ? "Hoja" : s;
    }

    private static string UniqueExcelSheetName(string machineName, HashSet<string> usedNames)
    {
        var baseName = SanitizeExcelSheetName(machineName);
        if (!usedNames.Contains(baseName)) return baseName;

        for (var i = 2; i < 100; i++)
        {
            var suffix = $" ({i})";
            var maxBase = Math.Max(1, 31 - suffix.Length);
            var candidate = (baseName.Length > maxBase ? baseName[..maxBase] : baseName) + suffix;
            if (!usedNames.Contains(candidate)) return candidate;
        }

        return SanitizeExcelSheetName($"{machineName[..Math.Min(20, machineName.Length)]} {Guid.NewGuid():N}"[..31]);
    }

    public async Task<ImportLocalResult> ImportLocalAsync(ImportLocalPayload payload, string actor, CancellationToken ct = default)
    {
        var warnings = new List<string>();
        var machinesCreated = 0;
        var operatorsCreated = 0;
        var sessionsCreated = 0;
        var activitiesCreated = 0;

        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        try
        {
            var machineMap = new Dictionary<string, ProductionMachine>(StringComparer.OrdinalIgnoreCase);
            foreach (var m in await _db.ProductionMachines.ToListAsync(ct))
                machineMap[m.Code] = m;

            foreach (var m in payload.Machines ?? Array.Empty<ImportLocalMachine>())
            {
                var code = string.IsNullOrWhiteSpace(m.Code) ? Slug(m.Name) : m.Code.Trim();
                if (machineMap.ContainsKey(code)) continue;
                var entity = new ProductionMachine
                {
                    Id = Guid.NewGuid(),
                    Code = code,
                    Name = m.Name.Trim(),
                    CreatedBy = actor,
                };
                _db.ProductionMachines.Add(entity);
                machineMap[code] = entity;
                machinesCreated++;
            }

            var opMap = new Dictionary<string, ProductionOperator>(StringComparer.OrdinalIgnoreCase);
            foreach (var o in await _db.ProductionOperators.ToListAsync(ct))
                opMap[o.Code] = o;

            foreach (var o in payload.Operators ?? Array.Empty<ImportLocalOperator>())
            {
                var code = string.IsNullOrWhiteSpace(o.Code) ? Slug(o.DisplayName) : o.Code.Trim();
                if (opMap.ContainsKey(code)) continue;
                var entity = new ProductionOperator
                {
                    Id = Guid.NewGuid(),
                    Code = code,
                    DisplayName = o.DisplayName.Trim(),
                    CreatedBy = actor,
                };
                _db.ProductionOperators.Add(entity);
                opMap[code] = entity;
                operatorsCreated++;
            }

            await _db.SaveChangesAsync(ct);

            var shiftMap = await _db.ProductionShifts.ToDictionaryAsync(x => x.Code, x => x, StringComparer.OrdinalIgnoreCase, ct);
            var codeMap = await _db.ProductionActivityCodes.Include(x => x.Subcodes)
                .ToDictionaryAsync(x => x.Code, x => x, StringComparer.OrdinalIgnoreCase, ct);

            var sessionIdMap = new Dictionary<string, Guid>(StringComparer.OrdinalIgnoreCase);

            foreach (var s in payload.Sessions ?? Array.Empty<ImportLocalSession>())
            {
                if (string.IsNullOrWhiteSpace(s.LocalId)) continue;
                if (sessionIdMap.ContainsKey(s.LocalId)) continue;

                var machineCode = string.IsNullOrWhiteSpace(s.MachineCode) ? Slug(s.MachineName) : s.MachineCode;
                var opCode = string.IsNullOrWhiteSpace(s.OperatorCode) ? Slug(s.OperatorName) : s.OperatorCode;

                if (!machineMap.TryGetValue(machineCode, out var machine))
                {
                    machine = new ProductionMachine { Id = Guid.NewGuid(), Code = machineCode, Name = s.MachineName, CreatedBy = actor };
                    _db.ProductionMachines.Add(machine);
                    machineMap[machineCode] = machine;
                    machinesCreated++;
                }
                if (!opMap.TryGetValue(opCode, out var op))
                {
                    op = new ProductionOperator { Id = Guid.NewGuid(), Code = opCode, DisplayName = s.OperatorName, CreatedBy = actor };
                    _db.ProductionOperators.Add(op);
                    opMap[opCode] = op;
                    operatorsCreated++;
                }
                if (!shiftMap.TryGetValue(s.ShiftCode, out var shift))
                {
                    warnings.Add($"Turno '{s.ShiftCode}' no existe; se usó T1 para sesión {s.LocalId}.");
                    shift = shiftMap["T1"];
                }

                var session = new ProductionSession
                {
                    Id = Guid.NewGuid(),
                    OperationalDate = s.OperationalDate,
                    MachineId = machine.Id,
                    MachineCodeSnapshot = machine.Code,
                    MachineNameSnapshot = machine.Name,
                    OperatorId = op.Id,
                    OperatorCodeSnapshot = op.Code,
                    OperatorNameSnapshot = op.DisplayName,
                    ShiftId = shift.Id,
                    ShiftCodeSnapshot = shift.Code,
                    Status = NormalizeSessionStatus(s.Status),
                    Source = string.IsNullOrWhiteSpace(s.Source) ? ProductionSessionSources.ReporteDiario : s.Source,
                    StartedAt = s.StartedAt.ToUniversalTime(),
                    EndedAt = s.EndedAt?.ToUniversalTime(),
                    CurrentActivityCode = s.CurrentActivityCode,
                    CurrentOp = s.CurrentOp,
                    CreatedBy = actor,
                };
                _db.ProductionSessions.Add(session);
                sessionIdMap[s.LocalId] = session.Id;
                sessionsCreated++;
            }

            await _db.SaveChangesAsync(ct);

            foreach (var a in payload.Activities ?? Array.Empty<ImportLocalActivity>())
            {
                if (!sessionIdMap.TryGetValue(a.SessionLocalId, out var sessionId))
                {
                    warnings.Add($"Actividad {a.LocalId}: sesión local {a.SessionLocalId} no encontrada.");
                    continue;
                }
                if (!codeMap.TryGetValue(a.ActivityCode, out var code))
                {
                    warnings.Add($"Actividad {a.LocalId}: código {a.ActivityCode} no encontrado.");
                    continue;
                }

                ProductionActivitySubcode? sub = null;
                if (!string.IsNullOrWhiteSpace(a.Subcode))
                    sub = code.Subcodes.FirstOrDefault(x => x.Code.Equals(a.Subcode, StringComparison.OrdinalIgnoreCase));

                var activity = new ProductionActivity
                {
                    Id = Guid.NewGuid(),
                    SessionId = sessionId,
                    Sequence = activitiesCreated + 1,
                    OperationalDate = a.OperationalDate,
                    ActivityCodeId = code.Id,
                    ActivityCodeSnapshot = code.Code,
                    ActivityNameSnapshot = code.Name,
                    SubcodeId = sub?.Id,
                    SubcodeSnapshot = sub?.Code ?? a.Subcode,
                    SubcodeDetailSnapshot = sub?.Name ?? a.SubcodeDetail,
                    ProductionOrderNumber = a.ProductionOrderNumber,
                    StartAt = a.StartAt.ToUniversalTime(),
                    EndAt = a.EndAt?.ToUniversalTime(),
                    DurationSeconds = a.EndAt.HasValue ? ComputeDuration(a.StartAt, a.EndAt.Value, 0) : null,
                    QuantityProcessed = a.QuantityProcessed,
                    Waste = a.Waste,
                    Observations = a.Observations,
                    Status = string.Equals(a.Status, ProductionActivityStatuses.Running, StringComparison.OrdinalIgnoreCase)
                        ? ProductionActivityStatuses.Running
                        : ProductionActivityStatuses.Done,
                    CreatedBy = actor,
                };
                _db.ProductionActivities.Add(activity);
                activitiesCreated++;
            }

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
            return new ImportLocalResult(machinesCreated, operatorsCreated, sessionsCreated, activitiesCreated, warnings);
        }
        catch
        {
            await tx.RollbackAsync(ct);
            throw;
        }
    }

    private async Task CloseStaleSessionAsync(ProductionSession session, string actor, CancellationToken ct)
    {
        session.Status = ProductionSessionStatuses.Finished;
        session.EndedAt = DateTime.UtcNow;
        session.PausedAt = null;
        session.CurrentActivityId = null;
        session.CurrentActivityCode = null;
        session.CurrentActivityName = null;
        session.CurrentOp = null;
        session.UpdatedAt = DateTime.UtcNow;
        session.UpdatedBy = actor;
        session.ConcurrencyStamp++;
        await _db.SaveChangesAsync(ct);
    }

    private async Task<ProductionSession> LoadSessionTracked(Guid sessionId, CancellationToken ct)
    {
        return await _db.ProductionSessions
            .Include(x => x.Activities).ThenInclude(a => a.WasteEntries)
            .FirstOrDefaultAsync(x => x.Id == sessionId, ct)
            ?? throw new KeyNotFoundException("Sesión no encontrada.");
    }

    private async Task AttachWasteEntries(ProductionActivity activity, IReadOnlyList<WasteEntryDto>? entries, CancellationToken ct)
    {
        if (entries is null || entries.Count == 0) return;
        foreach (var e in entries)
        {
            ProductionWasteReason? reason = null;
            if (e.WasteReasonId.HasValue)
                reason = await _db.ProductionWasteReasons.FirstOrDefaultAsync(x => x.Id == e.WasteReasonId.Value, ct);
            else if (!string.IsNullOrWhiteSpace(e.ReasonCode))
                reason = await _db.ProductionWasteReasons.FirstOrDefaultAsync(x => x.Code == e.ReasonCode, ct);

            if (reason?.RequiresObservation == true && string.IsNullOrWhiteSpace(e.Observations))
                throw new InvalidOperationException($"El motivo de desperdicio {reason.Code} requiere observaciones.");

            activity.WasteEntries.Add(new ProductionWasteEntry
            {
                Id = Guid.NewGuid(),
                ActivityId = activity.Id,
                WasteReasonId = reason?.Id,
                ReasonCodeSnapshot = reason?.Code ?? e.ReasonCode ?? "",
                ReasonNameSnapshot = reason?.Name ?? e.ReasonName ?? "",
                Quantity = Math.Max(0, e.Quantity),
                Observations = e.Observations,
            });
        }
    }

    private async Task<ProductionOperator> ResolveOperatorAsync(Guid? id, string? name, string actor, CancellationToken ct)
    {
        if (id.HasValue)
        {
            return await _db.ProductionOperators.FirstOrDefaultAsync(x => x.Id == id.Value, ct)
                ?? throw new InvalidOperationException("Operario no encontrado.");
        }

        var display = (name ?? "").Trim();
        if (string.IsNullOrWhiteSpace(display))
            throw new InvalidOperationException("Operario obligatorio.");

        var existing = await _db.ProductionOperators.FirstOrDefaultAsync(x => x.DisplayName == display, ct);
        if (existing is not null) return existing;

        var created = new ProductionOperator
        {
            Id = Guid.NewGuid(),
            Code = Slug(display),
            DisplayName = display,
            CreatedBy = actor,
        };
        _db.ProductionOperators.Add(created);
        await _db.SaveChangesAsync(ct);
        return created;
    }

    private async Task<ProductionMachine> ResolveMachineAsync(Guid? id, string? name, string actor, CancellationToken ct)
    {
        if (id.HasValue)
        {
            return await _db.ProductionMachines.FirstOrDefaultAsync(x => x.Id == id.Value, ct)
                ?? throw new InvalidOperationException("Máquina no encontrada.");
        }

        var display = (name ?? "").Trim();
        if (string.IsNullOrWhiteSpace(display))
            throw new InvalidOperationException("Máquina obligatoria.");

        var existing = await _db.ProductionMachines.FirstOrDefaultAsync(x => x.Name == display, ct);
        if (existing is not null) return existing;

        var created = new ProductionMachine
        {
            Id = Guid.NewGuid(),
            Code = Slug(display),
            Name = display,
            CreatedBy = actor,
        };
        _db.ProductionMachines.Add(created);
        await _db.SaveChangesAsync(ct);
        return created;
    }

    private async Task<ProductionActivityCode> ResolveActivityCodeAsync(Guid? id, string? codeOrLabel, CancellationToken ct)
    {
        if (id.HasValue)
        {
            return await _db.ProductionActivityCodes.Include(x => x.Subcodes).FirstOrDefaultAsync(x => x.Id == id.Value, ct)
                ?? throw new InvalidOperationException("Código de actividad no encontrado.");
        }

        var raw = (codeOrLabel ?? "").Trim();
        if (string.IsNullOrWhiteSpace(raw))
            throw new InvalidOperationException("Código de actividad obligatorio.");

        // Soporta "13 Falta de Trabajo" o "13 Falta de Trabajo — 1301 ..."
        var parent = raw.Split('\u2014', 2)[0].Trim();
        var codeToken = parent.Split(' ', 2, StringSplitOptions.RemoveEmptyEntries)[0];

        var entity = await _db.ProductionActivityCodes.Include(x => x.Subcodes)
            .FirstOrDefaultAsync(x => x.Code == codeToken || x.Code + " " + x.Name == parent, ct);
        return entity ?? throw new InvalidOperationException($"Código '{raw}' no encontrado.");
    }

    private static Task<ProductionActivitySubcode?> ResolveSubcodeAsync(ProductionActivityCode code, Guid? subId, string? subCode, CancellationToken ct)
    {
        if (subId.HasValue)
            return Task.FromResult(code.Subcodes.FirstOrDefault(x => x.Id == subId.Value));

        if (string.IsNullOrWhiteSpace(subCode))
        {
            // Extraer de etiqueta compuesta si viene en ActivityCode
            return Task.FromResult<ProductionActivitySubcode?>(null);
        }

        var token = subCode.Trim().Split(' ', 2)[0];
        return Task.FromResult(code.Subcodes.FirstOrDefault(x => x.Code.Equals(token, StringComparison.OrdinalIgnoreCase)));
    }

    private static void ValidateInterval(DateTime start, DateTime end)
    {
        if (end <= start)
            throw new InvalidOperationException("La hora fin debe ser posterior a la hora inicio.");
    }

    private static int ComputeDuration(DateTime start, DateTime end, int pausedSeconds)
    {
        var seconds = (int)Math.Max(0, (end - start).TotalSeconds) - Math.Max(0, pausedSeconds);
        return Math.Max(0, seconds);
    }

    private static string NormalizeSessionStatus(string status) =>
        status?.ToLowerInvariant() switch
        {
            ProductionSessionStatuses.Paused => ProductionSessionStatuses.Paused,
            ProductionSessionStatuses.Finished => ProductionSessionStatuses.Finished,
            _ => ProductionSessionStatuses.Live,
        };

    private static string Slug(string value)
    {
        var normalized = (value ?? "").Trim().ToLowerInvariant()
            .Normalize(System.Text.NormalizationForm.FormD);
        var chars = normalized.Where(c => char.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.NonSpacingMark
                                          && (char.IsLetterOrDigit(c) || c is '-' or '_')).ToArray();
        var slug = new string(chars);
        if (string.IsNullOrWhiteSpace(slug)) slug = Guid.NewGuid().ToString("N")[..8];
        return slug.Length > 40 ? slug[..40] : slug;
    }

    private static ActivityCodeDto MapCode(ProductionActivityCode x) =>
        new(x.Id, x.Code, x.Name, x.RequiresOrder, x.AllowsProductionQty, x.IsActive,
            x.Subcodes.OrderBy(s => s.SortOrder).Select(s => new ActivitySubcodeDto(s.Id, s.Code, s.Name, s.RequiresObservation, s.IsActive)).ToList());

    private static SessionDto MapSession(ProductionSession s) =>
        new(s.Id, s.OperationalDate, s.MachineId, s.MachineCodeSnapshot, s.MachineNameSnapshot,
            s.OperatorId, s.OperatorCodeSnapshot, s.OperatorNameSnapshot, s.ShiftId, s.ShiftCodeSnapshot,
            s.Status, s.Source, s.MetaTiros, s.StartedAt, s.EndedAt, s.PausedAt, s.PausedSecondsAccumulated,
            s.CurrentActivityId, s.CurrentActivityCode, s.CurrentActivityName, s.CurrentOp, s.ConcurrencyStamp,
            s.Activities.OrderBy(a => a.Sequence).Select(a =>
            {
                a.Session ??= s;
                return MapActivity(a);
            }).ToList());

    private static ActivityDto MapActivity(ProductionActivity a)
    {
        var s = a.Session;
        return new ActivityDto(
            a.Id, a.SessionId, a.Sequence, a.OperationalDate, a.ActivityCodeId,
            a.ActivityCodeSnapshot, a.ActivityNameSnapshot, a.SubcodeId, a.SubcodeSnapshot, a.SubcodeDetailSnapshot,
            a.ProductionOrderId, a.ProductionOrderNumber, a.StartAt, a.EndAt, a.DurationSeconds,
            a.QuantityProcessed, a.Waste, a.Observations, a.Status,
            s?.Source ?? "",
            s?.MachineId ?? Guid.Empty,
            s?.MachineNameSnapshot ?? "",
            s?.OperatorId ?? Guid.Empty,
            s?.OperatorNameSnapshot ?? "",
            s?.ShiftCodeSnapshot ?? "",
            a.WasteEntries.Select(w => new WasteEntryDto(w.WasteReasonId, w.ReasonCodeSnapshot, w.ReasonNameSnapshot, w.Quantity, w.Observations)).ToList());
    }
}
