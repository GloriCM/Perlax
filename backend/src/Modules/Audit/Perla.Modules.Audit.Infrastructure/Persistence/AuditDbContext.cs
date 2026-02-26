using Microsoft.EntityFrameworkCore;
using Perla.Modules.Audit.Domain.Entities;

namespace Perla.Modules.Audit.Infrastructure.Persistence;

public class AuditDbContext : DbContext
{
    public AuditDbContext(DbContextOptions<AuditDbContext> options) : base(options)
    {
    }

    public DbSet<AuditLog> AuditLogs => Set<AuditLog>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("audit");
        
        modelBuilder.Entity<AuditLog>(builder =>
        {
            builder.ToTable("AuditLogs");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.UserId).HasMaxLength(100);
            builder.Property(x => x.Type).IsRequired().HasMaxLength(20);
            builder.Property(x => x.TableName).IsRequired().HasMaxLength(100);
            builder.Property(x => x.PrimaryKey).IsRequired().HasMaxLength(100);
        });
    }
}
