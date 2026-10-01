using Microsoft.AspNetCore.Http.Features;
using Microsoft.Extensions.FileProviders;
using Perlax.Modules.Production.Api;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json.Serialization;
using Perlax.Modules.Users.Api;
using Perlax.Modules.Audit.Api;
using Perlax.Modules.Budgets.Api;
using Perlax.Modules.Almacen.Api;
using Perlax.Modules.Almacen.Infrastructure.Persistence;
using Perlax.Modules.Users.Infrastructure.Persistence;
using Perlax.Modules.Audit.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.HttpOverrides;
using Microsoft.AspNetCore.Mvc.Authorization;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.Text;
using Perlax.Modules.Production.Api.Hubs;
using Perlax.Modules.Production.Infrastructure.Persistence;

// Esa variable crea Kestrel:Endpoints:Https sin Url y el host falla al llamar UseHttps.
var kestrelPfxPassword =
    Environment.GetEnvironmentVariable("KESTREL_PFX_PASSWORD")
    ?? Environment.GetEnvironmentVariable("Kestrel__Certificate__Password")
    ?? Environment.GetEnvironmentVariable("Kestrel__Endpoints__Https__Certificate__Password");
Environment.SetEnvironmentVariable("Kestrel__Endpoints__Https__Certificate__Password", null);

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

    // El loader JSON de PFX persiste la clave en el perfil de Windows.
    // EphemeralKeySet evita el disco, pero Schannel cierra el TLS (ERR_CONNECTION_CLOSED).
    if (builder.Environment.IsDevelopment())
        ListenHttpsWithEphemeralCertificate(options, builder, kestrelPfxPassword);
});

// Add services to the container.
builder.Services.AddProductionModule(builder.Configuration);
builder.Services.AddUsersModule(builder.Configuration);
// Los usuarios con rol "Operario" se exponen como operarios de planta
builder.Services.AddScoped<Perlax.Modules.Production.Application.DailyProduction.IOperatorUserDirectory, Perlax.Web.Services.UsersOperatorDirectory>();
builder.Services.AddScoped<Perlax.Modules.Production.Application.Chat.IChatUserDirectory, Perlax.Web.Services.UsersChatDirectory>();
builder.Services.AddAuditModule(builder.Configuration);
builder.Services.AddBudgetsModule(builder.Configuration);
builder.Services.AddAlmacenModule(builder.Configuration);
// OT/OP abiertas de Production para Almacén (sin acoplar DbContexts entre módulos)
builder.Services.AddScoped<Perlax.Modules.Almacen.Application.Abstractions.IProductionOrderLookup, Perlax.Web.Services.ProductionOrderLookup>();

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
            // Token en query: hubs, uploads y documentos abiertos en pestaña nueva
            // (cotizador PDF, remisiones/facturas print) donde no hay header Authorization.
            var accessToken = context.Request.Query["access_token"];
            if (string.IsNullOrEmpty(accessToken))
                return Task.CompletedTask;

            var path = context.HttpContext.Request.Path;
            var p = path.Value ?? string.Empty;
            var allowQueryToken =
                path.StartsWithSegments("/hubs/internal-chat")
                || path.StartsWithSegments("/uploads")
                || p.Contains("/pdf/", StringComparison.OrdinalIgnoreCase)
                || p.Contains("/print", StringComparison.OrdinalIgnoreCase);

            if (allowQueryToken)
                context.Token = accessToken;

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
        RoleClaimType = ClaimTypes.Role,
        NameClaimType = ClaimTypes.Name,
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
    .AddApplicationPart(typeof(Perlax.Modules.Almacen.Api.Controllers.AlmacenController).Assembly)
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
        await usersContext.Database.MigrateAsync();
        await UsersDbInitializer.SeedAsync(usersContext, builder.Configuration, app.Environment.IsDevelopment());
        
        var auditContext = scope.ServiceProvider.GetRequiredService<AuditDbContext>();
        await auditContext.Database.MigrateAsync();
        
        // Use MigrateAsync for Production to handle existing migrations
        var productionContext = scope.ServiceProvider.GetRequiredService<Perlax.Modules.Production.Infrastructure.Persistence.ProductionDbContext>();
        try
        {
            await productionContext.Database.MigrateAsync();
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Production MigrateAsync failed: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
        }
        try
        {
            await DesignPlannerSchemaFixes.ApplyAsync(productionContext);
            Console.WriteLine("DesignPlannerSchemaFixes applied (Accion, ProcesoJson, CreatedBy).");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"DesignPlannerSchemaFixes failed: {ex.Message}");
        }
        try
        {
            await InternalChatSchemaFixes.ApplyAsync(productionContext);
            Console.WriteLine("InternalChatSchemaFixes applied.");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"InternalChatSchemaFixes failed: {ex.Message}");
        }
        try
        {
            await CommercialChainSchemaFixes.ApplyAsync(productionContext);
            Console.WriteLine("CommercialChainSchemaFixes applied (ClosedAt, remisiones, facturas, PT, OP detail, devoluciones).");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"CRITICAL CommercialChainSchemaFixes failed: {ex.Message}");
            Console.Error.WriteLine(ex.StackTrace);
            try
            {
                await CommercialChainSchemaFixes.EnsureManufacturingOrderColumnsAsync(productionContext);
                Console.WriteLine("Fallback EnsureManufacturingOrderColumnsAsync applied.");
            }
            catch (Exception ensureEx)
            {
                Console.Error.WriteLine($"EnsureManufacturingOrderColumnsAsync also failed: {ensureEx.Message}");
            }
        }
        // Siempre asegurar devoluciones PT aunque ApplyAsync haya fallado a mitad.
        try
        {
            await CommercialChainSchemaFixes.EnsureFinishedGoodsReturnsAsync(productionContext);
            Console.WriteLine("FinishedGoodsReturns ensured.");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"CRITICAL EnsureFinishedGoodsReturnsAsync failed: {ex.Message}");
            Console.Error.WriteLine(ex.StackTrace);
        }
        try
        {
            await CommercialChainSchemaFixes.EnsureCustomerLinkColumnsAsync(productionContext);
            var customers = scope.ServiceProvider.GetRequiredService<Perlax.Modules.Production.Application.Customers.ICustomerService>();
            var sync = await customers.SyncFromDocumentsAsync("startup");
            Console.WriteLine($"Customer master sync: created={sync.Created}, linked={sync.Linked}, total={sync.TotalInMaster}");
        }
        catch (Exception ex)
        {
            Console.Error.WriteLine($"Customer master sync failed: {ex.Message}");
        }
        try
        {
            await ProductionDbInitializer.InitializeAsync(productionContext);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ProductionDbInitializer failed: {ex.Message}");
        }
        try
        {
            await Perlax.Modules.Production.Infrastructure.Persistence.CotizadorDbSeeder.SeedAsync(productionContext);
            await Perlax.Modules.Production.Infrastructure.Persistence.DesignPlannerDbSeeder.SeedAsync(productionContext);
            await Perlax.Modules.Production.Infrastructure.Persistence.DailyProductionDbSeeder.SeedAsync(productionContext);
            await Perlax.Modules.Production.Infrastructure.Persistence.OpSchedulingSeeder.SeedAsync(productionContext);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Production seeders failed: {ex.Message}");
        }

        try
        {
            var budgetsContext = scope.ServiceProvider.GetRequiredService<Perlax.Modules.Budgets.Infrastructure.Persistence.BudgetsDbContext>();
            // Primero schema + historial + tablas (idempotente). MigrateAsync después, sin tumbar el arranque.
            await Perlax.Modules.Budgets.Infrastructure.Persistence.BudgetsElliotSchemaFixes.ApplyAsync(budgetsContext);
            try
            {
                await budgetsContext.Database.MigrateAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Budgets MigrateAsync failed: {ex.Message}");
            }
            await Perlax.Modules.Budgets.Infrastructure.Persistence.BudgetsDbSeeder.SeedAsync(budgetsContext);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Budget seed failed: {ex.Message}");
            Console.WriteLine(ex.StackTrace);
        }

        var almacenContext = scope.ServiceProvider.GetRequiredService<AlmacenDbContext>();
        await almacenContext.Database.MigrateAsync();
        await AlmacenDbInitializer.InitializeAsync(almacenContext);
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

static void ListenHttpsWithEphemeralCertificate(
    KestrelServerOptions options,
    WebApplicationBuilder builder,
    string? pfxPassword)
{
    var configuredPath = builder.Configuration["Kestrel:Certificate:Path"];
    var certPath = string.IsNullOrWhiteSpace(configuredPath)
        ? Path.Combine(builder.Environment.ContentRootPath, "..", "..", "..", "..", "certs", "perla.pfx")
        : configuredPath;
    if (!Path.IsPathRooted(certPath))
        certPath = Path.GetFullPath(Path.Combine(builder.Environment.ContentRootPath, certPath));

    var password = pfxPassword
        ?? builder.Configuration["Kestrel:Certificate:Password"]
        ?? Environment.GetEnvironmentVariable("KESTREL_PFX_PASSWORD");

    if (!File.Exists(certPath) || string.IsNullOrWhiteSpace(password))
        return;

    // EphemeralKeySet no escribe en disco, pero Schannel (Windows) cierra el TLS:
    // net::ERR_CONNECTION_CLOSED en :5263. MachineKeySet guarda la clave en
    // ProgramData, no en el perfil con cuota llena.
    X509Certificate2 cert;
    try
    {
        cert = X509CertificateLoader.LoadPkcs12FromFile(
            certPath,
            password,
            X509KeyStorageFlags.MachineKeySet | X509KeyStorageFlags.Exportable);
    }
    catch (Exception ex)
    {
        Console.Error.WriteLine($"HTTPS :5263 no se pudo cargar ({ex.Message}). Sigue HTTP :5262.");
        return;
    }

    options.ListenAnyIP(5263, listen => listen.UseHttps(cert));
}

