using Perlax.Modules.Production.Api;
using Microsoft.AspNetCore.Server.Kestrel.Core;
using System.Text.Json.Serialization;
using Perlax.Modules.Users.Api;
using Perlax.Modules.Audit.Api;
using Perlax.Modules.Users.Infrastructure.Persistence;
using Perlax.Modules.Audit.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    options.ConfigureEndpointDefaults(lo =>
    {
        lo.Protocols = HttpProtocols.Http1;
    });
    options.Limits.KeepAliveTimeout = TimeSpan.FromMinutes(120);
    options.Limits.RequestHeadersTimeout = TimeSpan.FromMinutes(2);
});

// Add services to the container.
builder.Services.AddProductionModule(builder.Configuration);
builder.Services.AddUsersModule(builder.Configuration);
builder.Services.AddAuditModule(builder.Configuration);

// --- JWT AUTHENTICATION ---
var jwtSettings = builder.Configuration.GetSection("JwtSettings");
var secretKey = jwtSettings["Secret"] ?? throw new InvalidOperationException("JWT Secret not found.");

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings["Issuer"],
        ValidAudience = jwtSettings["Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secretKey))
    };
});

builder.Services.AddAuthorization();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy => policy.AllowAnyOrigin()
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

builder.Services.AddControllers()
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

app.UseCors("AllowReactApp");

app.UseHttpsRedirection();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
