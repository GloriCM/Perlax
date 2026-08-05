using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Perlax.Modules.Almacen.Application.Abstractions;
using Perlax.Modules.Almacen.Infrastructure.Persistence;
using Perlax.Modules.Almacen.Infrastructure.Services;

namespace Perlax.Modules.Almacen.Api;

public static class AlmacenModuleExtensions
{
    private static readonly string[] ConnectionStringKeys =
    [
        "AlmacenConnection",
        "ProductionConnection",
        "UsersConnection",
        "AuditConnection",
        "BudgetsConnection",
    ];

    public static IServiceCollection AddAlmacenModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = ResolveConnectionString(configuration);

        services.AddDbContext<AlmacenDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<IAlmacenService, AlmacenService>();
        services.AddSingleton<AlmacenEmailService>();

        return services;
    }

    private static string ResolveConnectionString(IConfiguration configuration)
    {
        foreach (var key in ConnectionStringKeys)
        {
            var value = configuration.GetConnectionString(key);
            if (!string.IsNullOrWhiteSpace(value))
                return value;
        }

        throw new InvalidOperationException(
            "Configure una connection string para el modulo Almacen " +
            "(AlmacenConnection, ProductionConnection, UsersConnection, AuditConnection o BudgetsConnection).");
    }
}
