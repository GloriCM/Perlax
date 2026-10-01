using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Perlax.Modules.Budgets.Application.Elliot;
using Perlax.Modules.Budgets.Infrastructure.Persistence;
using Perlax.Modules.Budgets.Infrastructure.Services;

namespace Perlax.Modules.Budgets.Api;

public static class BudgetsModuleExtensions
{
    public static IServiceCollection AddBudgetsModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("BudgetsConnection");

        services.AddDbContext<BudgetsDbContext>(options =>
            options.UseNpgsql(connectionString, b => b.MigrationsAssembly(typeof(BudgetsDbContext).Assembly.FullName)));

        services.AddScoped<IElliotBudgetService, ElliotBudgetService>();

        return services;
    }
}
