using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.DailyProduction;
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
            options.UseNpgsql(connectionString, b => b.MigrationsAssembly(typeof(ProductionDbContext).Assembly.FullName)));

        services.AddScoped<CotizadorCalculator>();
        services.AddScoped<IDailyProductionService, DailyProductionService>();

        return services;
    }
}
