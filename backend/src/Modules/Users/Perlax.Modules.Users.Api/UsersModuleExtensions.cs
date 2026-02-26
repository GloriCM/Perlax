using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Users.Infrastructure.Persistence;

namespace Perlax.Modules.Users.Api;

public static class UsersModuleExtensions
{
    public static IServiceCollection AddUsersModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("UsersConnection");

        services.AddDbContext<UsersDbContext>(options =>
            options.UseNpgsql(connectionString, b => b.MigrationsAssembly(typeof(UsersDbContext).Assembly.FullName)));

        return services;
    }
}
