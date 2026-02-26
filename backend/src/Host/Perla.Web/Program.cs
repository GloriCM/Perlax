using Perla.Modules.Production.Api;
using Perla.Modules.Audit.Api;
using Perla.Modules.Users.Api;
using Perla.Shared;
using Perla.Web.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();
builder.Services.AddAuditModule(builder.Configuration);
builder.Services.AddUsersModule(builder.Configuration);
builder.Services.AddProductionModule(builder.Configuration);

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp",
        policy => policy.WithOrigins("http://localhost:5173")
                        .AllowAnyMethod()
                        .AllowAnyHeader());
});

builder.Services.AddControllers();
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

// Seed Admin User
using (var scope = app.Services.CreateScope())
{
    await Perla.Modules.Users.Infrastructure.Persistence.DbInitializer.SeedAdminUserAsync(scope.ServiceProvider);
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseHttpsRedirection();

app.UseCors("AllowReactApp");

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
