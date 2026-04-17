using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Domain.Entities;

namespace Perlax.Modules.Production.Infrastructure.Persistence;

public class ProductionDbContext : DbContext
{
    public ProductionDbContext(DbContextOptions<ProductionDbContext> options) : base(options)
    {
    }

    public DbSet<ProductionOrder> ProductionOrders => Set<ProductionOrder>();
    public DbSet<OrderPart> OrderParts => Set<OrderPart>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("production");
        
        modelBuilder.Entity<ProductionOrder>(builder =>
        {
            builder.ToTable("ProductionOrders");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.OTNumber).HasMaxLength(20);
            builder.Property(x => x.Cliente).HasMaxLength(255);
            builder.Property(x => x.EjecutivoCuenta).HasMaxLength(255);
            builder.Property(x => x.ProductName).IsRequired().HasMaxLength(500);
            builder.Property(x => x.Status).HasMaxLength(50);
            
            builder.HasMany(x => x.Parts)
                   .WithOne(x => x.Order)
                   .HasForeignKey(x => x.ProductionOrderId)
                   .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OrderPart>(builder =>
        {
            builder.ToTable("OrderParts");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.PartName).HasMaxLength(200);
            builder.Property(x => x.SustratoSup).HasMaxLength(200);
            builder.Property(x => x.Cabida).HasMaxLength(100);
            builder.Property(x => x.Alto).HasPrecision(18, 2);
            builder.Property(x => x.Largo).HasPrecision(18, 2);
            builder.Property(x => x.Ancho).HasPrecision(18, 2);
            builder.Property(x => x.AltoPliego).HasPrecision(18, 2);
            builder.Property(x => x.AnchoPliego).HasPrecision(18, 2);
            builder.Property(x => x.ManijaTipo).HasMaxLength(100);
            builder.Property(x => x.ManijaRef).HasMaxLength(100);
            builder.Property(x => x.ManijaLargo).HasPrecision(18, 2);
        });
    }
}
