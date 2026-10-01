using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Perlax.Modules.Production.Application.Chat;
using Perlax.Modules.Production.Application.CustomerOrders;
using Perlax.Modules.Production.Application.Customers;
using Perlax.Modules.Production.Application.Overtime;
using Perlax.Modules.Production.Application.AreaExpense;
using Perlax.Modules.Production.Application.Quotations;
using Perlax.Modules.Production.Application.TechnicalSheets;
using Perlax.Modules.Production.Application.Cotizador;
using Perlax.Modules.Production.Application.Design;
using Perlax.Modules.Production.Application.DailyProduction;
using Perlax.Modules.Production.Application.Facturacion;
using Perlax.Modules.Production.Application.Inventory;
using Perlax.Modules.Production.Application.InventarioPt;
using Perlax.Modules.Production.Application.ManagementReports;
using Perlax.Modules.Production.Application.Manufacturing;
using Perlax.Modules.Production.Application.OpDetail;
using Perlax.Modules.Production.Application.Orders;
using Perlax.Modules.Production.Application.Remisiones;
using Perlax.Modules.Production.Application.Scheduling;
using Perlax.Modules.Production.Infrastructure.Cotizador;
using Perlax.Modules.Production.Infrastructure.Persistence;
using Perlax.Modules.Production.Infrastructure.Services;

namespace Perlax.Modules.Production.Api;

public static class ProductionModuleExtensions
{
    public static IServiceCollection AddProductionModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("ProductionConnection");

        services.AddDbContext<ProductionDbContext>(options =>
            options.ConfigureWarnings(w => w.Ignore(RelationalEventId.PendingModelChangesWarning))
                .UseNpgsql(connectionString, b => b.MigrationsAssembly(typeof(ProductionDbContext).Assembly.FullName)));

        services.AddScoped<CotizadorCalculator>();
        services.AddScoped<ICotizadorService, CotizadorService>();
        services.AddScoped<IDailyProductionService, DailyProductionService>();
        services.AddScoped<IOpSchedulingService, OpSchedulingService>();
        services.AddScoped<IManufacturingOrderSyncService, ManufacturingOrderSyncService>();
        services.AddScoped<IManufacturingOrderService, ManufacturingOrderService>();
        services.AddScoped<IProductionOrderService, ProductionOrderService>();
        services.AddScoped<IDesignPlannerService, DesignPlannerService>();
        services.AddScoped<IInternalChatService, InternalChatService>();
        services.AddScoped<ITechnicalSheetService, TechnicalSheetService>();
        services.AddScoped<ICustomerOrderService, CustomerOrderService>();
        services.AddScoped<IOvertimePayrollService, OvertimePayrollService>();
        services.AddScoped<IAreaExpenseCatalogService, AreaExpenseCatalogService>();
        services.AddScoped<IAreaExpenseCaptureService, AreaExpenseCaptureService>();
        services.AddScoped<IQuotationsService, QuotationsService>();
        services.AddScoped<IRemisionService, RemisionService>();
        services.AddScoped<ISalesInvoiceService, SalesInvoiceService>();
        services.AddScoped<IFinishedGoodsService, FinishedGoodsService>();
        services.AddScoped<IOpDetailService, OpDetailService>();
        services.AddScoped<IInventoryConsumptionService, InventoryConsumptionService>();
        services.AddScoped<ICustomerService, CustomerService>();
        services.AddScoped<IManagementReportsService, ManagementReportsService>();

        return services;
    }
}
