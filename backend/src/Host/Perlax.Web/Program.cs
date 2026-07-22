using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;
using Perlax.Modules.Production.Api;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using System.Text.Json.Serialization;
using Perlax.Modules.Users.Api;
using Perlax.Modules.Audit.Api;
using Perlax.Modules.Budgets.Api;
using Perlax.Modules.Users.Infrastructure.Persistence;
using Perlax.Modules.Audit.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Perlax.Modules.Production.Api.Hubs;

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
// Los usuarios con rol "Operario" se exponen como operarios de planta
builder.Services.AddScoped<Perlax.Modules.Production.Application.DailyProduction.IOperatorUserDirectory, Perlax.Web.Services.UsersOperatorDirectory>();
builder.Services.AddAuditModule(builder.Configuration);
builder.Services.AddBudgetsModule(builder.Configuration);

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
    options.Events = new JwtBearerEvents
    {
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"];
            var path = context.HttpContext.Request.Path;
            if (!string.IsNullOrEmpty(accessToken)
                && (path.StartsWithSegments("/hubs/internal-chat") || path.StartsWithSegments("/uploads")))
            {
                context.Token = accessToken;
            }
            return Task.CompletedTask;
        }
    };
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

builder.Services.Configure<ForwardedHeadersOptions>(options =>
{
    options.ForwardedHeaders = ForwardedHeaders.XForwardedFor | ForwardedHeaders.XForwardedProto;
    options.KnownNetworks.Clear();
    options.KnownProxies.Clear();
});

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
                        .AllowAnyMethod()
                        .AllowCredentials());
});

builder.Services.Configure<FormOptions>(options =>
{
    options.MultipartBodyLengthLimit = 104_857_600;
});

builder.Services.Configure<Perlax.Modules.Production.Api.Controllers.PlantaOptions>(
    builder.Configuration.GetSection(Perlax.Modules.Production.Api.Controllers.PlantaOptions.SectionName));

builder.Services.AddControllers(options =>
    {
        options.Filters.Add(new AuthorizeFilter(
            new AuthorizationPolicyBuilder()
                .RequireAuthenticatedUser()
                .Build()));
    })
    .AddApplicationPart(typeof(Perlax.Modules.Production.Api.Controllers.PlantaController).Assembly)
    .AddApplicationPart(typeof(Perlax.Modules.Users.Api.Controllers.AuthController).Assembly)
    .AddApplicationPart(typeof(Perlax.Modules.Audit.Api.Controllers.AuditLogsController).Assembly)
    .AddApplicationPart(typeof(Perlax.Modules.Budgets.Api.Controllers.BudgetsController).Assembly)
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
        options.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });
builder.Services.AddSignalR();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Initialize Databases
try 
{
    using (var scope = app.Services.CreateScope())
    {
        var usersContext = scope.ServiceProvider.GetRequiredService<UsersDbContext>();
        await UsersDbInitializer.SeedAsync(usersContext, builder.Configuration, app.Environment.IsDevelopment());
        
        var auditContext = scope.ServiceProvider.GetRequiredService<AuditDbContext>();
        await auditContext.Database.EnsureCreatedAsync();
        
        // Use MigrateAsync for Production to handle existing migrations
        var productionContext = scope.ServiceProvider.GetRequiredService<Perlax.Modules.Production.Infrastructure.Persistence.ProductionDbContext>();
        await productionContext.Database.MigrateAsync();
        await Perlax.Modules.Production.Infrastructure.Persistence.CotizadorDbSeeder.SeedAsync(productionContext);
        await Perlax.Modules.Production.Infrastructure.Persistence.DesignPlannerDbSeeder.SeedAsync(productionContext);
        await Perlax.Modules.Production.Infrastructure.Persistence.DailyProductionDbSeeder.SeedAsync(productionContext);

        var budgetsContext = scope.ServiceProvider.GetRequiredService<Perlax.Modules.Budgets.Infrastructure.Persistence.BudgetsDbContext>();
        await budgetsContext.Database.MigrateAsync();
        await Perlax.Modules.Budgets.Infrastructure.Persistence.BudgetsDbSeeder.SeedAsync(budgetsContext);
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

app.UseForwardedHeaders();

app.UseCors("AllowReactApp");

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

app.Use(async (context, next) =>
{
    context.Response.Headers.TryAdd("X-Content-Type-Options", "nosniff");
    context.Response.Headers.TryAdd("X-Frame-Options", "SAMEORIGIN");
    context.Response.Headers.TryAdd("Referrer-Policy", "strict-origin-when-cross-origin");
    await next();
});

app.UseAuthentication();

app.Use(async (context, next) =>
{
    if (!context.Request.Path.StartsWithSegments("/uploads"))
    {
        await next();
        return;
    }

    if (context.User?.Identity?.IsAuthenticated != true)
    {
        var accessToken = context.Request.Query["access_token"].FirstOrDefault();
        if (!string.IsNullOrWhiteSpace(accessToken))
        {
            context.Request.Headers["Authorization"] = $"Bearer {accessToken}";
        }

        var authResult = await context.AuthenticateAsync(JwtBearerDefaults.AuthenticationScheme);
        if (!authResult.Succeeded)
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        context.User = authResult.Principal!;
    }

    await next();
});

var webRootPath = string.IsNullOrWhiteSpace(app.Environment.WebRootPath)
    ? Path.Combine(app.Environment.ContentRootPath, "wwwroot")
    : app.Environment.WebRootPath;
var uploadsRoot = Path.Combine(webRootPath, "uploads");
Directory.CreateDirectory(uploadsRoot);
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsRoot),
    RequestPath = "/uploads"
});

app.UseAuthorization();

app.MapControllers();
app.MapHub<InternalChatHub>("/hubs/internal-chat");
app.MapHub<ProductionFloorHub>(ProductionFloorHub.HubPath);

app.Run();
