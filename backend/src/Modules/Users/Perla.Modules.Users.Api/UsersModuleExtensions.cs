using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Perla.Modules.Users.Application.Abstractions;
using Perla.Modules.Users.Domain.Entities;
using Perla.Modules.Users.Infrastructure.Authentication;
using Perla.Modules.Users.Infrastructure.Persistence;
using System.Text;

namespace Perla.Modules.Users.Api;

public static class UsersModuleExtensions
{
    public static IServiceCollection AddUsersModule(this IServiceCollection services, IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("ProductionConnection");

        services.AddDbContext<UsersDbContext>(options =>
            options.UseNpgsql(connectionString, b => b.MigrationsAssembly(typeof(UsersDbContext).Assembly.FullName)));

        services.AddIdentityCore<ApplicationUser>()
            .AddRoles<IdentityRole>()
            .AddEntityFrameworkStores<UsersDbContext>()
            .AddDefaultTokenProviders();

        services.AddScoped<IJwtProvider, JwtProvider>();

        var jwtKey = configuration["Jwt:Key"] ?? "super_secret_key_that_should_be_long_enough";
        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer = true,
                    ValidateAudience = true,
                    ValidateLifetime = true,
                    ValidateIssuerSigningKey = true,
                    ValidIssuer = configuration["Jwt:Issuer"],
                    ValidAudience = configuration["Jwt:Audience"],
                    IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
                };
            });

        return services;
    }
}
