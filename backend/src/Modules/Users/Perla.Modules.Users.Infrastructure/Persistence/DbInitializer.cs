using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.DependencyInjection;
using Perla.Modules.Users.Domain.Entities;
using Perla.Modules.Users.Infrastructure.Persistence;
using System;
using System.Threading.Tasks;

namespace Perla.Modules.Users.Infrastructure.Persistence;

public static class DbInitializer
{
    public static async Task SeedAdminUserAsync(IServiceProvider serviceProvider)
    {
        using var scope = serviceProvider.CreateScope();
        var userManager = scope.ServiceProvider.GetRequiredService<UserManager<ApplicationUser>>();
        var context = scope.ServiceProvider.GetRequiredService<UsersDbContext>();

        await context.Database.EnsureCreatedAsync();

        if (await userManager.FindByNameAsync("admin") == null)
        {
            var adminUser = new ApplicationUser
            {
                UserName = "admin",
                Email = "admin@perla.com",
                FullName = "Admin Master",
                EmailConfirmed = true
            };

            var result = await userManager.CreateAsync(adminUser, "@L3ph2026@D");
            if (result.Succeeded)
            {
                // Aquí podrías añadir roles si los tuvieras implementados
                Console.WriteLine("Admin user created successfully.");
            }
            else
            {
                foreach (var error in result.Errors)
                {
                    Console.WriteLine($"Error creating admin: {error.Description}");
                }
            }
        }
    }
}
