using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Users.Domain.Entities;

namespace Perlax.Modules.Users.Infrastructure.Persistence;

public static class UsersDbInitializer
{
    public static async Task SeedAsync(UsersDbContext context)
    {
        await context.Database.EnsureCreatedAsync();

        if (!await context.Users.AnyAsync(u => u.Username == "admin"))
        {
            var adminUser = new User
            {
                Id = Guid.NewGuid(),
                Username = "admin",
                Email = "admin@perlax.com",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("admin123"), 
                Role = "Admin",
                IsSystemUser = true,
                CreatedAt = DateTime.UtcNow
            };

            context.Users.Add(adminUser);
            await context.SaveChangesAsync();
        }
    }
}
