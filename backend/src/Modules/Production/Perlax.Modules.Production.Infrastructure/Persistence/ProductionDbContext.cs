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
    public DbSet<Quotation> Quotations => Set<Quotation>();

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
            builder.Property(x => x.TechnicalSheetApprovedBy).HasMaxLength(255);
        });

        modelBuilder.Entity<Quotation>(builder =>
        {
            builder.ToTable("Quotations");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.QuoteNumber).IsRequired().HasMaxLength(50);
            builder.Property(x => x.SourceType).IsRequired().HasMaxLength(20);
            builder.Property(x => x.ProductionOrderNumber).HasMaxLength(50);
            builder.Property(x => x.ClientName).IsRequired().HasMaxLength(255);
            builder.Property(x => x.ProspectClientName).HasMaxLength(255);
            builder.Property(x => x.ProductName).IsRequired().HasMaxLength(500);
            builder.Property(x => x.FreightType).IsRequired().HasMaxLength(30);
            builder.Property(x => x.QuantitiesJson).IsRequired();
            builder.Property(x => x.TabsDataJson).IsRequired();
            builder.Property(x => x.CostValidationJson);
            builder.Property(x => x.SelectedPriceTier).HasMaxLength(20);
            builder.Property(x => x.SelectedUnitPrice).HasPrecision(18, 2);
            builder.Property(x => x.DeliveryConditions).IsRequired();
            builder.Property(x => x.PriceConditions).IsRequired();
            builder.Property(x => x.Status).IsRequired().HasMaxLength(20);
            builder.Property(x => x.CreatedBy).HasMaxLength(255);
            builder.Property(x => x.UpdatedBy).HasMaxLength(255);
            builder.HasIndex(x => x.QuoteNumber).IsUnique();
            builder.HasIndex(x => x.ProductionOrderId);
        });
    }
}
