using System;

namespace Perla.Modules.Production.Application.DTOs;

public record ProductionOrderDto(
    Guid Id,
    string ProductCode,
    string ProductName,
    int PlannedQuantity,
    int ProducedQuantity,
    DateTime ScheduledStart,
    string Status,
    DateTime CreatedAt
);

public record CreateProductionOrderRequest(
    string ProductCode,
    string ProductName,
    int PlannedQuantity,
    DateTime ScheduledStart
);

public record UpdateProductionOrderRequest(
    string ProductName,
    int PlannedQuantity,
    int ProducedQuantity,
    DateTime ScheduledStart,
    string Status
);
