using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Perla.Modules.Audit.Infrastructure.Persistence;
using Perla.Modules.Audit.Infrastructure.Services;
using Perla.Shared;

namespace Perla.Modules.Audit.Api;

public static class AuditModuleExtensions
{
    public static IServiceCollection AddAuditModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("ProductionConnection"); // Using same DB for now

        services.AddDbContext<AuditDbContext>(options =>
            options.UseNpgsql(connectionString, b => b.MigrationsAssembly(typeof(AuditDbContext).Assembly.FullName)));

        services.AddScoped<IAuditService, AuditService>();

        return services;
    }
}
