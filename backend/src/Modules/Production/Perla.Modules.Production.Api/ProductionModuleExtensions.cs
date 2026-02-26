using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Perla.Modules.Production.Infrastructure.Persistence;

namespace Perla.Modules.Production.Api;

public static class ProductionModuleExtensions
{
    public static IServiceCollection AddProductionModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("ProductionConnection");

        services.AddDbContext<ProductionDbContext>(options =>
            options.UseNpgsql(connectionString, b => b.MigrationsAssembly(typeof(ProductionDbContext).Assembly.FullName)));

        return services;
    }
}
