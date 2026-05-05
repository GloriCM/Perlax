using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;
using Perlax.Modules.Production.Api;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using System.Text.Json.Serialization;
using Perlax.Modules.Users.Api;
using Perlax.Modules.Audit.Api;
using Perlax.Modules.Users.Infrastructure.Persistence;
using Perlax.Modules.Audit.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

if (builder.Environment.IsDevelopment())
{
    builder.Configuration.AddJsonFile(
        "appsettings.Development.local.json",
        optional: true,
        reloadOnChange: true);
}

builder.WebHost.ConfigureKestrel(options =>
{
    options.ConfigureEndpointDefaults(lo =>
    {
        lo.Protocols = HttpProtocols.Http1;
    });
    options.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(120);
    options.Limits.RequestHeadersTimeout = TimeSpan.FromMinutes(2);
    options.Limits.MaxRequestBodySize = 104_857_600;
});

// Add services to the container.
builder.Services.AddProductionModule(builder.Configuration);
builder.Services.AddUsersModule(builder.Configuration);
builder.Services.AddAuditModule(builder.Configuration);

// --- JWT AUTHENTICATION ---
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["Secret"] ?? string.Empty;
if (string.IsNullOrWhiteSpace(secretKey))
{
    throw new InvalidOperationException(
        "JwtSettings:Secret no está configurado. Use variables de entorno, dotnet user-secrets o appsettings.Development.json (solo desarrollo).");
}

if (!builder.Environment.IsDevelopment() && secretKey.Length < 32)
{
    throw new InvalidOperationException(
        "JwtSettings:Secret debe tener al menos 32 caracteres en entornos que no son Development.");
}

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = !builder.Environment.IsDevelopment();
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey)),
        ClockSkew = TimeSpan.FromMinutes(2)
    };
});

builder.Services.AddAuthorization();

var corsOrigins = builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>()
    ?? Array.Empty<string>();
if (corsOrigins.Length == 0)
{
    throw new InvalidOperationException(
        "Configure al menos un origen en Cors:AllowedOrigins (p. ej. la URL del frontend con Vite).");
}

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy => policy.WithOrigins(corsOrigins)
                        .AllowAnyHeader()
                        .AllowAnyMethod());
});

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 104_857_600;
});

builder.Services.AddControllers(options =>
    {
        options.Filters.Add(new AuthorizeFilter(
            new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build()));
    })
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Initialize Databases
try 
{
    using (var scope = app.Services.CreateScope())
    {
        var usersContext = scope.ServiceProvider.GetRequiredService<UsersDbContext>();
        await UsersDbInitializer.SeedAsync(usersContext);
        
        var auditContext = scope.ServiceProvider.GetRequiredService<AuditDbContext>();
        await auditContext.Database.EnsureCreatedAsync();
        
        // Use MigrateAsync for Production to handle existing migrations
        var productionContext = scope.ServiceProvider.GetRequiredService<Perlax.Modules.Production.Infrastructure.Persistence.ProductionDbContext>();
        await productionContext.Database.MigrateAsync();
    }
}
catch (Exception ex)
{
    Console.WriteLine($"Critical error during DB initialization: {ex.Message}");
    Console.WriteLine(ex.StackTrace);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}
else
{
    app.UseHsts();
}

app.UseCors("AllowReactApp");

app.UseHttpsRedirection();

var uploadsRoot = Path.Combine(app.Environment.ContentRootPath, "uploads");
Directory.CreateDirectory(uploadsRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsRoot),
    RequestPath = "/uploads"
});

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
