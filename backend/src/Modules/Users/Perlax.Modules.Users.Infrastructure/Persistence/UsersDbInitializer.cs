using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Perlax.Modules.Users.Domain.Entities;

namespace Perlax.Modules.Users.Infrastructure.Persistence;

public static class UsersDbInitializer
{
    public static async Task SeedAsync(UsersDbContext context, IConfiguration configuration, bool isDevelopment)
    {
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
                        FirstName = "ADMINISTRADOR",
                        LastName = "SISTEMA",
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
                admin.FirstName = "ADMINISTRADOR";
                admin.LastName = "SISTEMA";
            }
            if (string.IsNullOrWhiteSpace(admin.Area))
                admin.Area = "TI";
            if (string.Equals(admin.Role, "Admin", StringComparison.OrdinalIgnoreCase))
                admin.Role = "Administrador";
            await context.SaveChangesAsync();
        }

        var users = await context.Users.ToListAsync();
        var namesChanged = false;
        foreach (var user in users)
        {
            var first = Perlax.Modules.Users.Domain.Entities.User.ToUpperName(user.FirstName);
            var last = Perlax.Modules.Users.Domain.Entities.User.ToUpperName(user.LastName);
            if (first != user.FirstName || last != user.LastName)
            {
                user.FirstName = first;
                user.LastName = last;
                namesChanged = true;
            }
        }

        if (namesChanged)
            await context.SaveChangesAsync();
    }
}