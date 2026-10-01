using Microsoft.EntityFrameworkCore;
using Npgsql;
using Perlax.Modules.Production.Application.CustomerOrders;
using Perlax.Modules.Production.Application.Customers;
using Perlax.Modules.Production.Application.Manufacturing;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class CustomerOrderService : ICustomerOrderService
{
    private readonly ProductionDbContext _db;
    private readonly IManufacturingOrderSyncService _manufacturingSync;
    private readonly ICustomerService _customers;

    public CustomerOrderService(
        ProductionDbContext db,
        IManufacturingOrderSyncService manufacturingSync,
        ICustomerService customers)
    {
        _db = db;
        _manufacturingSync = manufacturingSync;
        _customers = customers;
    }

    public async Task<IReadOnlyList<AvailableProductDto>> GetAvailableProductsAsync(CancellationToken ct = default) =>
        await _db.OrderParts.AsNoTracking()
            .Include(p => p.Order)
            .Where(p => p.IsTechnicalSheetApproved && p.Order != null)
            .OrderByDescending(p => p.Order!.CreatedAt)
            .Select(p => new AvailableProductDto(
                p.Id,
                p.Order!.OTNumber,
                p.Order.ProductName,
                p.PartName,
                p.Order.Cliente,
                0m))
            .ToListAsync(ct);

    public async Task<string> GetNextNumberAsync(CancellationToken ct = default) =>
        await GetNextNumberValueAsync(ct);

    public async Task<IReadOnlyList<CustomerOrderListItemDto>> ListAsync(CancellationToken ct = default) =>
        await _db.CustomerOrders.AsNoTracking()
            .Include(x => x.Items)
            .OrderByDescending(x => x.CreatedAt)
            .SelectMany(x => x.Items.Select(i => new CustomerOrderListItemDto(
                x.Id,
                x.OrderNumber,
                x.OrderDate,
                x.AgreedDeliveryDate,
                x.ClientName,
                x.PurchaseOrderNumber,
                i.ProductName,
                i.ReferenceName,
                i.Quantity,
                i.ApprovedUnitPrice,
                i.OrderPartId,
                x.IsApproved)))
            .ToListAsync(ct);

    public async Task<CustomerOrderDetailDto> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var order = await _db.CustomerOrders.AsNoTracking().Include(x => x.Items)
            .FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Pedido no encontrado.");

        return new CustomerOrderDetailDto(
            order.Id,
            order.OrderNumber,
            order.OrderDate,
            order.ClientName,
            order.PurchaseOrderNumber,
            order.AgreedDeliveryDate,
            order.IsApproved,
            order.Items.Select(i => new CustomerOrderItemDto(
                i.OrderPartId, i.Quantity, i.ApprovedUnitPrice, i.ProductName, i.ReferenceName)).ToList());
    }

    public async Task<CreateCustomerOrderResultDto> CreateAsync(
        SaveCustomerOrderCommand command, string userName, CancellationToken ct = default)
    {
        ValidateRequest(command);
        await EnsureApprovedPartsAsync(command, ct);

        var customer = await _customers.EnsureByNameAsync(command.ClientName, userName, ct);
        var partProductionOrders = await GetPartProductionOrderIdsAsync(command.Items.Select(x => x.OrderPartId), ct);

        for (var attempt = 0; attempt < 5; attempt++)
        {
            var orderId = Guid.NewGuid();
            var orderNumber = await GetNextNumberValueAsync(ct);

            var entity = new CustomerOrder
            {
                Id = orderId,
                OrderNumber = orderNumber,
                OrderDate = ToUtcDateTime(command.OrderDate),
                CustomerId = customer.Id,
                ClientName = customer.Name,
                PurchaseOrderNumber = command.PurchaseOrderNumber.Trim(),
                AgreedDeliveryDate = ToUtcDateTime(command.AgreedDeliveryDate!.Value),
                Status = CustomerOrderStatuses.Pending,
                IsApproved = false,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userName,
                Items = command.Items
                    .Select(item => MapItem(item, orderId, partProductionOrders[item.OrderPartId]))
                    .ToList()
            };

            _db.CustomerOrders.Add(entity);

            try
            {
                await _db.SaveChangesAsync(ct);
                return new CreateCustomerOrderResultDto(entity.Id, entity.OrderNumber);
            }
            catch (DbUpdateException ex) when (IsUniqueOrderNumberViolation(ex) && attempt < 4)
            {
                DetachTrackedOrder(entity);
                continue;
            }
            catch (DbUpdateException ex)
            {
                throw new InvalidOperationException(DescribeDbError(ex), ex);
            }
        }

        throw new InvalidOperationException("No se pudo asignar un numero de pedido unico. Intente de nuevo.");
    }

    public async Task UpdateAsync(Guid id, SaveCustomerOrderCommand command, string userName, CancellationToken ct = default)
    {
        ValidateRequest(command);
        await EnsureApprovedPartsAsync(command, ct);

        var entity = await _db.CustomerOrders.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Pedido no encontrado.");

        var customer = await _customers.EnsureByNameAsync(command.ClientName, userName, ct);
        var partProductionOrders = await GetPartProductionOrderIdsAsync(command.Items.Select(x => x.OrderPartId), ct);

        entity.OrderDate = ToUtcDateTime(command.OrderDate);
        entity.CustomerId = customer.Id;
        entity.ClientName = customer.Name;
        entity.PurchaseOrderNumber = command.PurchaseOrderNumber.Trim();
        entity.AgreedDeliveryDate = ToUtcDateTime(command.AgreedDeliveryDate);
        entity.Status = CustomerOrderStatuses.Pending;
        entity.IsApproved = false;
        entity.ApprovedAt = null;
        entity.ApprovedBy = null;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userName;

        _db.CustomerOrderItems.RemoveRange(entity.Items);
        entity.Items = command.Items
            .Select(item => MapItem(item, entity.Id, partProductionOrders[item.OrderPartId]))
            .ToList();

        await _db.SaveChangesAsync(ct);
    }

    public async Task ApproveAsync(
        Guid id, IReadOnlyList<ApproveCustomerOrderItemCommand> items, string userName, CancellationToken ct = default)
    {
        var entity = await _db.CustomerOrders.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id, ct)
            ?? throw new KeyNotFoundException("Pedido no encontrado.");

        if (items == null || items.Count == 0)
            throw new InvalidOperationException("Debe enviar items para aprobar.");

        foreach (var row in items)
        {
            var item = entity.Items.FirstOrDefault(x => x.OrderPartId == row.OrderPartId);
            if (item == null) continue;
            if (row.ApprovedUnitPrice < 0)
                throw new InvalidOperationException("El PV unitario no puede ser negativo.");
            item.ApprovedUnitPrice = row.ApprovedUnitPrice;
        }

        entity.Status = CustomerOrderStatuses.Approved;
        entity.IsApproved = true;
        entity.ApprovedAt = DateTime.UtcNow;
        entity.ApprovedBy = userName;
        entity.UpdatedAt = DateTime.UtcNow;
        entity.UpdatedBy = userName;

        await _db.SaveChangesAsync(ct);

        try
        {
            await _manufacturingSync.SyncForCustomerOrderAsync(entity.Id, entity.ApprovedBy, ct);
        }
        catch
        {
            // La aprobacion ya quedo guardada; Apertura reintenta sync al listar pendientes.
        }
    }

    private static void ValidateRequest(SaveCustomerOrderCommand request)
    {
        if (string.IsNullOrWhiteSpace(request.ClientName))
            throw new InvalidOperationException("CLIENTE es obligatorio.");
        if (string.IsNullOrWhiteSpace(request.PurchaseOrderNumber))
            throw new InvalidOperationException("ORDEN DE COMPRA es obligatoria.");
        if (request.AgreedDeliveryDate is null)
            throw new InvalidOperationException("FECHA PACTADA DE ENTREGA es obligatoria.");
        if (request.Items == null || request.Items.Count == 0)
            throw new InvalidOperationException("Debe agregar al menos un item.");
        if (request.Items.Any(x => x.Quantity <= 0))
            throw new InvalidOperationException("La cantidad debe ser mayor a cero.");
        if (request.Items.Any(x => x.ApprovedUnitPrice < 0))
            throw new InvalidOperationException("PV unitario no puede ser negativo.");
    }

    private async Task EnsureApprovedPartsAsync(SaveCustomerOrderCommand request, CancellationToken ct)
    {
        var partIds = request.Items.Select(x => x.OrderPartId).Distinct().ToList();
        var approvedCount = await _db.OrderParts.AsNoTracking()
            .CountAsync(x => partIds.Contains(x.Id) && x.IsTechnicalSheetApproved && x.Order != null, ct);

        if (approvedCount != partIds.Count)
            throw new InvalidOperationException("Todos los productos deben estar aprobados en ficha tecnica.");
    }

    private static CustomerOrderItem MapItem(SaveCustomerOrderItemCommand request, Guid customerOrderId, Guid productionOrderId) =>
        new()
        {
            Id = Guid.NewGuid(),
            CustomerOrderId = customerOrderId,
            ProductionOrderId = productionOrderId,
            OrderPartId = request.OrderPartId,
            Quantity = request.Quantity,
            ApprovedUnitPrice = request.ApprovedUnitPrice,
            ProductName = request.ProductName?.Trim() ?? string.Empty,
            ReferenceName = request.ReferenceName?.Trim() ?? string.Empty
        };

    private static bool IsUniqueOrderNumberViolation(DbUpdateException ex) =>
        ex.InnerException is PostgresException pg &&
        pg.SqlState == PostgresErrorCodes.UniqueViolation &&
        (pg.ConstraintName?.Contains("OrderNumber", StringComparison.OrdinalIgnoreCase) == true ||
         pg.MessageText.Contains("OrderNumber", StringComparison.OrdinalIgnoreCase));

    private void DetachTrackedOrder(CustomerOrder entity)
    {
        foreach (var item in entity.Items.ToList())
        {
            var itemEntry = _db.Entry(item);
            if (itemEntry.State != EntityState.Detached)
                itemEntry.State = EntityState.Detached;
        }

        var entry = _db.Entry(entity);
        if (entry.State != EntityState.Detached)
            entry.State = EntityState.Detached;
    }

    private static string DescribeDbError(DbUpdateException ex)
    {
        if (ex.InnerException is PostgresException pg)
        {
            if (pg.SqlState == PostgresErrorCodes.UniqueViolation)
                return "Ya existe un pedido con ese numero. Actualice la pagina e intente de nuevo.";
            if (!string.IsNullOrWhiteSpace(pg.MessageText))
                return pg.MessageText;
        }
        return "No se pudo guardar el pedido en base de datos.";
    }

    private static DateTime ToUtcDateTime(DateTime value) => value.Kind switch
    {
        DateTimeKind.Utc => value,
        DateTimeKind.Local => value.ToUniversalTime(),
        _ => DateTime.SpecifyKind(value, DateTimeKind.Local).ToUniversalTime()
    };

    private static DateTime? ToUtcDateTime(DateTime? value) =>
        value.HasValue ? ToUtcDateTime(value.Value) : null;

    private async Task<string> GetNextNumberValueAsync(CancellationToken ct)
    {
        var numbers = await _db.CustomerOrders.AsNoTracking().Select(x => x.OrderNumber).ToListAsync(ct);
        var maxNumber = 0;
        foreach (var value in numbers)
        {
            if (int.TryParse(value, out var parsed) && parsed > maxNumber)
                maxNumber = parsed;
        }
        return (maxNumber + 1).ToString();
    }

    private async Task<Dictionary<Guid, Guid>> GetPartProductionOrderIdsAsync(IEnumerable<Guid> partIds, CancellationToken ct)
    {
        var ids = partIds.Distinct().ToList();
        return await _db.OrderParts.AsNoTracking()
            .Where(x => ids.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, x => x.ProductionOrderId, ct);
    }
}
