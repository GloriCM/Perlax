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
    public DbSet<CustomerOrder> CustomerOrders => Set<CustomerOrder>();
    public DbSet<CustomerOrderItem> CustomerOrderItems => Set<CustomerOrderItem>();
    public DbSet<InternalChatConversation> InternalChatConversations => Set<InternalChatConversation>();
    public DbSet<InternalChatMessage> InternalChatMessages => Set<InternalChatMessage>();
    public DbSet<CotizadorMachine> CotizadorMachines => Set<CotizadorMachine>();
    public DbSet<CotizadorMaterial> CotizadorMaterials => Set<CotizadorMaterial>();
    public DbSet<CotizadorFactor> CotizadorFactors => Set<CotizadorFactor>();
    public DbSet<CotizadorMicroFlauta> CotizadorMicroFlautas => Set<CotizadorMicroFlauta>();
    public DbSet<CotizadorPlancha> CotizadorPlanchas => Set<CotizadorPlancha>();
    public DbSet<DesignPlannerJob> DesignPlannerJobs => Set<DesignPlannerJob>();
    public DbSet<DesignPlannerActivity> DesignPlannerActivities => Set<DesignPlannerActivity>();

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
            builder.Property(x => x.TechnicalSheetRejectionReason).HasMaxLength(2000);
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
            builder.Property(x => x.ProductType).IsRequired().HasMaxLength(20);
            builder.Property(x => x.SellerName).HasMaxLength(255);
            builder.Property(x => x.WorkName).HasMaxLength(500);
            builder.Property(x => x.PartName).HasMaxLength(200);
            builder.Property(x => x.ProductName).IsRequired().HasMaxLength(500);
            builder.Property(x => x.FormDataJson).IsRequired();
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

        modelBuilder.Entity<CustomerOrder>(builder =>
        {
            builder.ToTable("CustomerOrders");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.OrderNumber).IsRequired().HasMaxLength(20);
            builder.Property(x => x.ClientName).IsRequired().HasMaxLength(255);
            builder.Property(x => x.PurchaseOrderNumber).IsRequired().HasMaxLength(100);
            builder.Property(x => x.ApprovedBy).HasMaxLength(255);
            builder.Property(x => x.CreatedBy).HasMaxLength(255);
            builder.Property(x => x.UpdatedBy).HasMaxLength(255);
            builder.HasIndex(x => x.OrderNumber).IsUnique();

            builder.HasMany(x => x.Items)
                .WithOne(x => x.CustomerOrder)
                .HasForeignKey(x => x.CustomerOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CustomerOrderItem>(builder =>
        {
            builder.ToTable("CustomerOrderItems");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Quantity).HasPrecision(18, 2);
            builder.Property(x => x.ApprovedUnitPrice).HasPrecision(18, 2);
            builder.Property(x => x.ProductName).IsRequired().HasMaxLength(500);
            builder.Property(x => x.ReferenceName).IsRequired().HasMaxLength(200);
            builder.HasIndex(x => x.OrderPartId);
        });

        modelBuilder.Entity<InternalChatConversation>(builder =>
        {
            builder.ToTable("InternalChatConversations");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.OTNumber).IsRequired().HasMaxLength(20);
            builder.Property(x => x.Title).IsRequired().HasMaxLength(100);
            builder.Property(x => x.CreatedByUsername).IsRequired().HasMaxLength(255);
            builder.Property(x => x.CreatedByDisplayName).IsRequired().HasMaxLength(255);
            builder.Property(x => x.DeletedForUsersJson).HasMaxLength(4000);
            builder.HasIndex(x => x.OTNumber);
            builder.HasIndex(x => x.UpdatedAt);
            builder.HasIndex(x => x.ProductionOrderId);

            builder.HasMany(x => x.Messages)
                .WithOne(x => x.Conversation)
                .HasForeignKey(x => x.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<InternalChatMessage>(builder =>
        {
            builder.ToTable("InternalChatMessages");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.SenderUsername).IsRequired().HasMaxLength(255);
            builder.Property(x => x.SenderDisplayName).IsRequired().HasMaxLength(255);
            builder.Property(x => x.Message).IsRequired().HasMaxLength(4000);
            builder.Property(x => x.AttachmentUrl).HasMaxLength(2000);
            builder.Property(x => x.AttachmentName).HasMaxLength(255);
            builder.Property(x => x.AttachmentContentType).HasMaxLength(200);
            builder.HasIndex(x => x.ConversationId);
            builder.HasIndex(x => x.SentAt);
        });

        modelBuilder.Entity<CotizadorMachine>(b =>
        {
            b.ToTable("CotizadorMachines");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.Property(x => x.ServiceRole).IsRequired().HasMaxLength(50);
            b.Property(x => x.SetupTimeHours).HasPrecision(18, 4);
            b.Property(x => x.ShotsPerHour).HasPrecision(18, 4);
            b.Property(x => x.HourlyRate).HasPrecision(18, 2);
            b.HasIndex(x => x.ServiceRole);
        });

        modelBuilder.Entity<CotizadorMaterial>(b =>
        {
            b.ToTable("CotizadorMaterials");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.Property(x => x.PricePerM2).HasPrecision(18, 2);
        });

        modelBuilder.Entity<CotizadorFactor>(b =>
        {
            b.ToTable("CotizadorFactors");
            b.HasKey(x => x.Id);
            b.Property(x => x.Key).IsRequired().HasMaxLength(80);
            b.Property(x => x.Label).IsRequired().HasMaxLength(200);
            b.Property(x => x.Value).HasPrecision(18, 6);
            b.HasIndex(x => x.Key).IsUnique();
        });

        modelBuilder.Entity<CotizadorMicroFlauta>(b =>
        {
            b.ToTable("CotizadorMicroFlautas");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.Property(x => x.PricePerM2).HasPrecision(18, 2);
        });

        modelBuilder.Entity<CotizadorPlancha>(b =>
        {
            b.ToTable("CotizadorPlanchas");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.Property(x => x.Price).HasPrecision(18, 2);
        });

        modelBuilder.Entity<DesignPlannerJob>(b =>
        {
            b.ToTable("DesignPlannerJobs");
            b.HasKey(x => x.Id);
            b.Property(x => x.JobNumber).IsRequired().HasMaxLength(20);
            b.Property(x => x.Cliente).IsRequired().HasMaxLength(255);
            b.Property(x => x.Vendedor).IsRequired().HasMaxLength(255);
            b.Property(x => x.Trabajo).IsRequired().HasMaxLength(500);
            b.Property(x => x.Responsable).IsRequired().HasMaxLength(255);
            b.Property(x => x.Estado).IsRequired().HasMaxLength(50);
            b.Property(x => x.Requerimientos).HasMaxLength(4000);
            b.Property(x => x.ComentariosAprobacion).HasMaxLength(4000);
            b.Property(x => x.HistorialJson).IsRequired();
            b.Property(x => x.UpdatedBy).HasMaxLength(255);
            b.HasIndex(x => x.JobNumber).IsUnique();
            b.HasIndex(x => x.Estado);
            b.HasIndex(x => x.Responsable);
            b.HasIndex(x => x.FechaEntrega);

            b.HasMany(x => x.Actividades)
                .WithOne(x => x.Job)
                .HasForeignKey(x => x.DesignPlannerJobId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<DesignPlannerActivity>(b =>
        {
            b.ToTable("DesignPlannerActivities");
            b.HasKey(x => x.Id);
            b.Property(x => x.Nombre).IsRequired().HasMaxLength(100);
            b.Property(x => x.Observaciones).HasMaxLength(2000);
            b.HasIndex(x => x.DesignPlannerJobId);
        });
    }
}
