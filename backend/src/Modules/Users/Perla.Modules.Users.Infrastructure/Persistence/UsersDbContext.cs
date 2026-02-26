using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Perla.Modules.Users.Domain.Entities;

namespace Perla.Modules.Users.Infrastructure.Persistence;

public class UsersDbContext : IdentityDbContext<ApplicationUser>
{
    public UsersDbContext(DbContextOptions<UsersDbContext> options) : base(options)
    {
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.HasDefaultSchema("users");
    }
}
