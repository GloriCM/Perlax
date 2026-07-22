using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Perlax.Modules.Users.Domain.Entities;

namespace Perlax.Modules.Users.Infrastructure.Persistence;

public static class UsersDbInitializer
{
    public static async Task SeedAsync(UsersDbContext context, IConfiguration configuration, bool isDevelopment)
    {
        await context.Database.EnsureCreatedAsync();
        await EnsureUserColumnsAsync(context);

        if (!await context.Users.AnyAsync(u => u.Username == "admin"))
        {
            if (isDevelopment)
            {
                var devAdminPassword = configuration["DevSeed:AdminPassword"]?.Trim();
                if (string.IsNullOrWhiteSpace(devAdminPassword))
                {
                    Console.WriteLine(
                        "UsersDbInitializer: no se creó el usuario admin. Configure DevSeed:AdminPassword en appsettings.Development.local.json.");
                }
                else
                {
                    var adminUser = new User
                    {
                        Id = Guid.NewGuid(),
                        Username = "admin",
                        Email = "admin@perlax.com",
                        FirstName = "Administrador",
                        LastName = "Sistema",
                        Area = "TI",
                        AllowedRoutesJson = null,
                        PasswordHash = BCrypt.Net.BCrypt.HashPassword(devAdminPassword),
                        Role = "Administrador",
                        IsSystemUser = true,
                        CreatedAt = DateTime.UtcNow
                    };

                    context.Users.Add(adminUser);
                    await context.SaveChangesAsync();
                }
            }
        }
        else
        {
            var admin = await context.Users.FirstAsync(u => u.Username == "admin");
            if (string.IsNullOrWhiteSpace(admin.FirstName))
            {
                admin.FirstName = "Administrador";
                admin.LastName = "Sistema";
            }
            if (string.IsNullOrWhiteSpace(admin.Area))
                admin.Area = "TI";
            if (string.Equals(admin.Role, "Admin", StringComparison.OrdinalIgnoreCase))
                admin.Role = "Administrador";
            await context.SaveChangesAsync();
        }
    }

    private static async Task EnsureUserColumnsAsync(UsersDbContext context)
    {
        await context.Database.ExecuteSqlRawAsync("""
            ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "FirstName" character varying(100);
            ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "LastName" character varying(100);
            ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "Area" character varying(100);
            ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "AllowedRoutesJson" text;
            ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "DocumentNumber" character varying(30);
            ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "Salary" numeric(18,2);
            ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "MustChangePassword" boolean NOT NULL DEFAULT false;
            ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "IsActive" boolean NOT NULL DEFAULT true;
            """);
    }
}
