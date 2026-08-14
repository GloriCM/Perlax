using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Perlax.Modules.Users.Infrastructure.Persistence;

public sealed class UsersDbContextFactory : IDesignTimeDbContextFactory<UsersDbContext>
{
    public UsersDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<UsersDbContext>()
            .UseNpgsql(
                "Host=localhost;Database=perlax;Username=postgres;Password=postgres",
                b => b.MigrationsAssembly(typeof(UsersDbContext).Assembly.FullName))
            .Options;

        return new UsersDbContext(options);
    }
}