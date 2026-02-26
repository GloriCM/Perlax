using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Audit.Infrastructure.Persistence;
using Perlax.Modules.Audit.Infrastructure.Persistence.Services;
using Perlax.Modules.Audit.Application.Abstractions;

namespace Perlax.Modules.Audit.Api;

public static class AuditModuleExtensions
{
    public static IServiceCollection AddAuditModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("AuditConnection");

        services.AddDbContext<AuditDbContext>(options =>
            options.UseNpgsql(connectionString, b => b.MigrationsAssembly(typeof(AuditDbContext).Assembly.FullName)));

        services.AddScoped<IAuditService, AuditService>();

        return services;
    }
}
