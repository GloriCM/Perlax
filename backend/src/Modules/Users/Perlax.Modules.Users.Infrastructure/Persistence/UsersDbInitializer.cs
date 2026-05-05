using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Users.Domain.Entities;

namespace Perlax.Modules.Users.Infrastructure.Persistence;

public static class UsersDbInitializer
{
    public static async Task SeedAsync(UsersDbContext context)
    {
        await context.Database.EnsureCreatedAsync();
        await EnsureUserColumnsAsync(context);

        if (!await context.Users.AnyAsync(u => u.Username == "admin"))
        {
            var adminUser = new User
            {
                Id = Guid.NewGuid(),
                Username = "admin",
                Email = "admin@perlax.com",
                FirstName = "Administrador",
                LastName = "Sistema",
                AllowedRoutesJson = null,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"), 
                Role = "Admin",
                IsSystemUser = true,
                CreatedAt = DateTime.UtcNow
            };

            context.Users.Add(adminUser);
            await context.SaveChangesAsync();
        }
        else
        {
            var admin = await context.Users.FirstAsync(u => u.Username == "admin");
            if (string.IsNullOrWhiteSpace(admin.FirstName))
            {
                admin.FirstName = "Administrador";
                admin.LastName = "Sistema";
                await context.SaveChangesAsync();
            }
        }
    }

    private static async Task EnsureUserColumnsAsync(UsersDbContext context)
    {
        await context.Database.ExecuteSqlRawAsync("""
            ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "FirstName" character varying(100);
            ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "LastName" character varying(100);
            ALTER TABLE users."Users" ADD COLUMN IF NOT EXISTS "AllowedRoutesJson" text;
            """);
    }
}
