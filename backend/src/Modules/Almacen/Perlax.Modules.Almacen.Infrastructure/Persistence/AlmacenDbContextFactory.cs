using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Perlax.Modules.Almacen.Infrastructure.Persistence;

public sealed class AlmacenDbContextFactory : IDesignTimeDbContextFactory<AlmacenDbContext>
{
    public AlmacenDbContext CreateDbContext(string[] args)
    {
        var options = new DbContextOptionsBuilder<AlmacenDbContext>()
            .UseNpgsql(
                "Host=localhost;Database=perlax;Username=postgres;Password=postgres",
                b => b.MigrationsAssembly(typeof(AlmacenDbContext).Assembly.FullName))
            .Options;

        return new AlmacenDbContext(options);
    }
}