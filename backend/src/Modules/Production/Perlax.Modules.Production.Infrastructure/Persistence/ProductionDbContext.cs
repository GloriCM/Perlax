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
    public DbSet<ManufacturingOrder> ManufacturingOrders => Set<ManufacturingOrder>();
    public DbSet<OpProcessSchedule> OpProcessSchedules => Set<OpProcessSchedule>();
    public DbSet<OpProcessCatalogItem> OpProcessCatalogItems => Set<OpProcessCatalogItem>();
    public DbSet<OpRosterRow> OpRosterRows => Set<OpRosterRow>();
    public DbSet<OpRosterDay> OpRosterDays => Set<OpRosterDay>();
    public DbSet<OpCoverageAssignment> OpCoverageAssignments => Set<OpCoverageAssignment>();
    public DbSet<OpBillingMonthGoal> OpBillingMonthGoals => Set<OpBillingMonthGoal>();
    public DbSet<InternalChatConversation> InternalChatConversations => Set<InternalChatConversation>();
    public DbSet<InternalChatMessage> InternalChatMessages => Set<InternalChatMessage>();
    public DbSet<InternalChatParticipant> InternalChatParticipants => Set<InternalChatParticipant>();
    public DbSet<CotizadorMachine> CotizadorMachines => Set<CotizadorMachine>();
    public DbSet<CotizadorMaterial> CotizadorMaterials => Set<CotizadorMaterial>();
    public DbSet<CotizadorFactor> CotizadorFactors => Set<CotizadorFactor>();
    public DbSet<CotizadorMicroFlauta> CotizadorMicroFlautas => Set<CotizadorMicroFlauta>();
    public DbSet<CotizadorPlancha> CotizadorPlanchas => Set<CotizadorPlancha>();
    public DbSet<CotizadorBarniz> CotizadorBarnices => Set<CotizadorBarniz>();
    public DbSet<CotizadorTerminado> CotizadorTerminados => Set<CotizadorTerminado>();
    public DbSet<CotizadorCordon> CotizadorCordones => Set<CotizadorCordon>();
    public DbSet<DesignPlannerJob> DesignPlannerJobs => Set<DesignPlannerJob>();
    public DbSet<DesignPlannerActivity> DesignPlannerActivities => Set<DesignPlannerActivity>();

    public DbSet<ProductionMachine> ProductionMachines => Set<ProductionMachine>();
    public DbSet<ProductionOperator> ProductionOperators => Set<ProductionOperator>();
    public DbSet<ProductionActivityCode> ProductionActivityCodes => Set<ProductionActivityCode>();
    public DbSet<ProductionActivitySubcode> ProductionActivitySubcodes => Set<ProductionActivitySubcode>();
    public DbSet<ProductionShift> ProductionShifts => Set<ProductionShift>();
    public DbSet<ProductionMachineShift> ProductionMachineShifts => Set<ProductionMachineShift>();
    public DbSet<ProductionWasteReason> ProductionWasteReasons => Set<ProductionWasteReason>();
    public DbSet<ProductionSession> ProductionSessions => Set<ProductionSession>();
    public DbSet<ProductionActivity> ProductionActivities => Set<ProductionActivity>();
    public DbSet<ProductionWasteEntry> ProductionWasteEntries => Set<ProductionWasteEntry>();
    public DbSet<AreaExpenseRubro> AreaExpenseRubros => Set<AreaExpenseRubro>();
    public DbSet<AreaExpenseProveedor> AreaExpenseProveedores => Set<AreaExpenseProveedor>();
    public DbSet<AreaExpenseCaptura> AreaExpenseCapturas => Set<AreaExpenseCaptura>();

    public DbSet<Remision> Remisiones => Set<Remision>();
    public DbSet<RemisionItem> RemisionItems => Set<RemisionItem>();
    public DbSet<SalesInvoice> SalesInvoices => Set<SalesInvoice>();
    public DbSet<SalesInvoiceItem> SalesInvoiceItems => Set<SalesInvoiceItem>();
    public DbSet<FinishedGoodsEntry> FinishedGoodsEntries => Set<FinishedGoodsEntry>();
    public DbSet<FinishedGoodsReturn> FinishedGoodsReturns => Set<FinishedGoodsReturn>();
    public DbSet<OpMaterialLine> OpMaterialLines => Set<OpMaterialLine>();
    public DbSet<OpLaborProcess> OpLaborProcesses => Set<OpLaborProcess>();
    public DbSet<OpExternalWorkshop> OpExternalWorkshops => Set<OpExternalWorkshop>();
    public DbSet<InventoryConsumption> InventoryConsumptions => Set<InventoryConsumption>();
    public DbSet<WarehouseStockMovement> WarehouseStockMovements => Set<WarehouseStockMovement>();
    public DbSet<Customer> Customers => Set<Customer>();

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
            builder.HasIndex(x => x.CustomerId);

            builder.HasOne(x => x.Customer)
                .WithMany()
                .HasForeignKey(x => x.CustomerId)
                .OnDelete(DeleteBehavior.SetNull);

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
            builder.Property(x => x.Status).IsRequired().HasMaxLength(50);
            builder.Property(x => x.ApprovedBy).HasMaxLength(255);
            builder.Property(x => x.CreatedBy).HasMaxLength(255);
            builder.Property(x => x.UpdatedBy).HasMaxLength(255);
            builder.HasIndex(x => x.OrderNumber).IsUnique();
            builder.HasIndex(x => x.CustomerId);

            builder.HasOne(x => x.Customer)
                .WithMany()
                .HasForeignKey(x => x.CustomerId)
                .OnDelete(DeleteBehavior.SetNull);

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
            builder.HasIndex(x => x.ProductionOrderId);

            builder.HasOne<ProductionOrder>()
                .WithMany()
                .HasForeignKey(x => x.ProductionOrderId)
                .OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<ManufacturingOrder>(builder =>
        {
            builder.ToTable("ManufacturingOrders");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.OpNumber).IsRequired().HasMaxLength(20);
            builder.Property(x => x.OrderNumber).IsRequired().HasMaxLength(20);
            builder.Property(x => x.OtNumber).IsRequired().HasMaxLength(20);
            builder.Property(x => x.ClientName).IsRequired().HasMaxLength(255);
            builder.Property(x => x.ProductName).IsRequired().HasMaxLength(500);
            builder.Property(x => x.ReferenceName).IsRequired().HasMaxLength(200);
            builder.Property(x => x.PurchaseOrderNumber).HasMaxLength(100);
            builder.Property(x => x.QuantityOrdered).HasPrecision(18, 2);
            builder.Property(x => x.ReceiptPercentage).HasPrecision(5, 2);
            builder.Property(x => x.QuantityToProduce).HasPrecision(18, 2);
            builder.Property(x => x.ApprovedUnitPrice).HasPrecision(18, 2);
            builder.Property(x => x.Status).IsRequired().HasMaxLength(40);
            builder.Property(x => x.CreatedBy).HasMaxLength(255);
            builder.Property(x => x.UpdatedBy).HasMaxLength(255);
            builder.Property(x => x.OpenedBy).HasMaxLength(255);
            builder.Property(x => x.ClosedBy).HasMaxLength(255);
            builder.HasIndex(x => x.OpNumber).IsUnique();
            builder.HasIndex(x => x.CustomerOrderId);
            builder.HasIndex(x => x.CustomerId);
            builder.HasIndex(x => x.OrderPartId);
            builder.HasIndex(x => x.OpeningDate);
            builder.HasIndex(x => new { x.CustomerOrderId, x.OrderPartId }).IsUnique();

            builder.HasOne(x => x.CustomerOrder)
                .WithMany()
                .HasForeignKey(x => x.CustomerOrderId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasOne(x => x.Customer)
                .WithMany()
                .HasForeignKey(x => x.CustomerId)
                .OnDelete(DeleteBehavior.SetNull);

            builder.HasMany(x => x.Materials)
                .WithOne(x => x.ManufacturingOrder)
                .HasForeignKey(x => x.ManufacturingOrderId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.HasMany(x => x.LaborProcesses)
                .WithOne(x => x.ManufacturingOrder)
                .HasForeignKey(x => x.ManufacturingOrderId)
                .OnDelete(DeleteBehavior.Cascade);
            builder.HasMany(x => x.ExternalWorkshops)
                .WithOne(x => x.ManufacturingOrder)
                .HasForeignKey(x => x.ManufacturingOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OpProcessSchedule>(builder =>
        {
            builder.ToTable("OpProcessSchedules");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.ProcessCode).IsRequired().HasMaxLength(50);
            builder.Property(x => x.BlockType).IsRequired().HasMaxLength(30);
            builder.Property(x => x.Status).IsRequired().HasMaxLength(30);
            builder.Property(x => x.EstimatedHours).HasPrecision(18, 4);
            builder.Property(x => x.Notes).HasMaxLength(2000);
            builder.Property(x => x.CreatedBy).HasMaxLength(255);
            builder.Property(x => x.UpdatedBy).HasMaxLength(255);
            builder.HasIndex(x => x.ManufacturingOrderId);
            builder.HasIndex(x => x.ProcessCode);
            builder.HasIndex(x => x.PlannedStart);
            builder.HasIndex(x => x.PlannedEnd);

            builder.HasOne(x => x.ManufacturingOrder)
                .WithMany()
                .HasForeignKey(x => x.ManufacturingOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OpProcessCatalogItem>(builder =>
        {
            builder.ToTable("OpProcessCatalogItems");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Code).IsRequired().HasMaxLength(50);
            builder.Property(x => x.Label).IsRequired().HasMaxLength(100);
            builder.Property(x => x.CreatedBy).HasMaxLength(255);
            builder.Property(x => x.UpdatedBy).HasMaxLength(255);
            builder.HasIndex(x => x.Code).IsUnique();
            builder.HasIndex(x => x.SortOrder);
        });

        modelBuilder.Entity<OpRosterRow>(builder =>
        {
            builder.ToTable("OpRosterRows");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.ProcessCode).IsRequired().HasMaxLength(50);
            builder.Property(x => x.RoleTag).IsRequired().HasMaxLength(10);
            builder.Property(x => x.CreatedBy).HasMaxLength(255);
            builder.Property(x => x.UpdatedBy).HasMaxLength(255);
            builder.HasIndex(x => x.WeekStart);
            builder.HasIndex(x => new { x.WeekStart, x.SortOrder });

            builder.HasMany(x => x.Days)
                .WithOne(x => x.RosterRow)
                .HasForeignKey(x => x.RosterRowId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<OpRosterDay>(builder =>
        {
            builder.ToTable("OpRosterDays");
            builder.HasKey(x => x.Id);
            builder.HasIndex(x => x.RosterRowId);
            builder.HasIndex(x => new { x.RosterRowId, x.DayOfWeek }).IsUnique();
        });

        modelBuilder.Entity<OpCoverageAssignment>(builder =>
        {
            builder.ToTable("OpCoverageAssignments");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.RoleTag).IsRequired().HasMaxLength(10);
            builder.Property(x => x.CreatedBy).HasMaxLength(255);
            builder.HasIndex(x => new { x.WeekStart, x.MachineId });
            builder.HasIndex(x => new { x.WeekStart, x.MachineId, x.DayOfWeek, x.ShiftId });
            builder.HasIndex(x => new { x.WeekStart, x.MachineId, x.DayOfWeek, x.ShiftId, x.RoleTag, x.OperatorId }).IsUnique();
        });

        modelBuilder.Entity<OpBillingMonthGoal>(builder =>
        {
            builder.ToTable("OpBillingMonthGoals");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.MonthlyGoal).HasPrecision(18, 2);
            builder.Property(x => x.CreatedBy).HasMaxLength(255);
            builder.Property(x => x.UpdatedBy).HasMaxLength(255);
            builder.HasIndex(x => new { x.Year, x.Month }).IsUnique();
        });

        modelBuilder.Entity<InternalChatConversation>(builder =>
        {
            builder.ToTable("InternalChatConversations");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.ConversationType).HasConversion<int>().IsRequired();
            builder.Property(x => x.AreaKey).HasMaxLength(80);
            builder.Property(x => x.DirectPairKey).HasMaxLength(520);
            builder.Property(x => x.OTNumber).IsRequired().HasMaxLength(20);
            builder.Property(x => x.Title).IsRequired().HasMaxLength(100);
            builder.Property(x => x.CreatedByUsername).IsRequired().HasMaxLength(255);
            builder.Property(x => x.CreatedByDisplayName).IsRequired().HasMaxLength(255);
            builder.Property(x => x.DeletedForUsersJson).HasMaxLength(4000);
            builder.HasIndex(x => x.OTNumber);
            builder.HasIndex(x => x.UpdatedAt);
            builder.HasIndex(x => x.ProductionOrderId);
            builder.HasIndex(x => x.ConversationType);
            builder.HasIndex(x => new { x.ConversationType, x.AreaKey });
            builder.HasIndex(x => x.DirectPairKey);

            builder.HasMany(x => x.Messages)
                .WithOne(x => x.Conversation)
                .HasForeignKey(x => x.ConversationId)
                .OnDelete(DeleteBehavior.Cascade);

            builder.HasMany(x => x.Participants)
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

        modelBuilder.Entity<InternalChatParticipant>(builder =>
        {
            builder.ToTable("InternalChatParticipants");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.Username).IsRequired().HasMaxLength(255);
            builder.HasIndex(x => x.ConversationId);
            builder.HasIndex(x => x.Username);
            builder.HasIndex(x => new { x.ConversationId, x.Username }).IsUnique();
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

        modelBuilder.Entity<CotizadorBarniz>(b =>
        {
            b.ToTable("CotizadorBarnices");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.Property(x => x.Factor).HasPrecision(18, 6);
        });

        modelBuilder.Entity<CotizadorTerminado>(b =>
        {
            b.ToTable("CotizadorTerminados");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.Property(x => x.PricePerM2).HasPrecision(18, 2);
        });

        modelBuilder.Entity<CotizadorCordon>(b =>
        {
            b.ToTable("CotizadorCordones");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.Property(x => x.PricePerManija).HasPrecision(18, 2);
        });

        modelBuilder.Entity<DesignPlannerJob>(b =>
        {
            b.ToTable("DesignPlannerJobs");
            b.HasKey(x => x.Id);
            b.Property(x => x.JobNumber).IsRequired().HasMaxLength(20);
            b.Property(x => x.Cliente).IsRequired().HasMaxLength(255);
            b.Property(x => x.Vendedor).IsRequired().HasMaxLength(255);
            b.Property(x => x.Trabajo).IsRequired().HasMaxLength(500);
            b.Property(x => x.Accion).HasMaxLength(4000);
            b.Property(x => x.Responsable).IsRequired().HasMaxLength(255);
            b.Property(x => x.Estado).IsRequired().HasMaxLength(50);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.Property(x => x.Requerimientos).HasMaxLength(4000);
            b.Property(x => x.ComentariosAprobacion).HasMaxLength(4000);
            b.Property(x => x.ProcesoJson).IsRequired();
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

        ConfigureDailyProduction(modelBuilder);
        ConfigureCommercialAndInventory(modelBuilder);
    }

    private static void ConfigureCommercialAndInventory(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Remision>(b =>
        {
            b.ToTable("Remisiones");
            b.HasKey(x => x.Id);
            b.Property(x => x.RemisionNumber).IsRequired().HasMaxLength(30);
            b.Property(x => x.CustomerOrderNumber).IsRequired().HasMaxLength(20);
            b.Property(x => x.ClientName).IsRequired().HasMaxLength(255);
            b.Property(x => x.Status).IsRequired().HasMaxLength(40);
            b.Property(x => x.TransportCarrier).HasMaxLength(200);
            b.Property(x => x.TransportPlate).HasMaxLength(40);
            b.Property(x => x.TransportDriver).HasMaxLength(200);
            b.Property(x => x.TransportCost).HasPrecision(18, 2);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.Property(x => x.UpdatedBy).HasMaxLength(255);
            b.HasIndex(x => x.RemisionNumber).IsUnique();
            b.HasIndex(x => x.CustomerOrderId);
            b.HasIndex(x => x.ClientName);
            b.HasOne(x => x.CustomerOrder).WithMany().HasForeignKey(x => x.CustomerOrderId).OnDelete(DeleteBehavior.Restrict);
            b.HasMany(x => x.Items).WithOne(x => x.Remision).HasForeignKey(x => x.RemisionId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RemisionItem>(b =>
        {
            b.ToTable("RemisionItems");
            b.HasKey(x => x.Id);
            b.Property(x => x.ProductName).IsRequired().HasMaxLength(500);
            b.Property(x => x.ReferenceName).IsRequired().HasMaxLength(200);
            b.Property(x => x.Quantity).HasPrecision(18, 2);
            b.Property(x => x.UnitPrice).HasPrecision(18, 2);
            b.Property(x => x.FinalDispatchCode).HasMaxLength(20);
            b.HasIndex(x => x.RemisionId);
            b.HasIndex(x => x.CustomerOrderItemId);
            b.HasIndex(x => x.ManufacturingOrderId);
        });

        modelBuilder.Entity<SalesInvoice>(b =>
        {
            b.ToTable("SalesInvoices");
            b.HasKey(x => x.Id);
            b.Property(x => x.InvoiceNumber).IsRequired().HasMaxLength(30);
            b.Property(x => x.LegacyInvoiceNumber).HasMaxLength(30);
            b.Property(x => x.RemisionNumber).IsRequired().HasMaxLength(30);
            b.Property(x => x.ClientName).IsRequired().HasMaxLength(255);
            b.Property(x => x.Status).IsRequired().HasMaxLength(40);
            b.Property(x => x.Subtotal).HasPrecision(18, 2);
            b.Property(x => x.TaxAmount).HasPrecision(18, 2);
            b.Property(x => x.TotalAmount).HasPrecision(18, 2);
            b.Property(x => x.TaxRate).HasPrecision(5, 2);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.Property(x => x.UpdatedBy).HasMaxLength(255);
            b.Property(x => x.VoidedBy).HasMaxLength(255);
            b.HasIndex(x => x.InvoiceNumber).IsUnique();
            b.HasIndex(x => x.RemisionId).IsUnique();
            b.HasOne(x => x.Remision).WithMany().HasForeignKey(x => x.RemisionId).OnDelete(DeleteBehavior.Restrict);
            b.HasMany(x => x.Items).WithOne(x => x.SalesInvoice).HasForeignKey(x => x.SalesInvoiceId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<SalesInvoiceItem>(b =>
        {
            b.ToTable("SalesInvoiceItems");
            b.HasKey(x => x.Id);
            b.Property(x => x.ProductName).IsRequired().HasMaxLength(500);
            b.Property(x => x.ReferenceName).IsRequired().HasMaxLength(200);
            b.Property(x => x.Quantity).HasPrecision(18, 2);
            b.Property(x => x.UnitPrice).HasPrecision(18, 2);
            b.Property(x => x.LineTotal).HasPrecision(18, 2);
            b.HasIndex(x => x.SalesInvoiceId);
        });

        modelBuilder.Entity<FinishedGoodsEntry>(b =>
        {
            b.ToTable("FinishedGoodsEntries");
            b.HasKey(x => x.Id);
            b.Property(x => x.Quantity).HasPrecision(18, 2);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.HasIndex(x => x.ManufacturingOrderId);
            b.HasOne(x => x.ManufacturingOrder).WithMany().HasForeignKey(x => x.ManufacturingOrderId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<FinishedGoodsReturn>(b =>
        {
            b.ToTable("FinishedGoodsReturns");
            b.HasKey(x => x.Id);
            b.Property(x => x.ReturnNumber).IsRequired().HasMaxLength(30);
            b.Property(x => x.OpNumber).IsRequired().HasMaxLength(20);
            b.Property(x => x.ClientName).IsRequired().HasMaxLength(255);
            b.Property(x => x.ProductName).IsRequired().HasMaxLength(500);
            b.Property(x => x.ReferenceName).IsRequired().HasMaxLength(200);
            b.Property(x => x.Quantity).HasPrecision(18, 2);
            b.Property(x => x.Reason).HasMaxLength(255);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.HasIndex(x => x.ReturnNumber).IsUnique();
            b.HasIndex(x => x.ManufacturingOrderId);
            b.HasIndex(x => x.RemisionItemId);
            b.HasOne(x => x.ManufacturingOrder).WithMany().HasForeignKey(x => x.ManufacturingOrderId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.Remision).WithMany().HasForeignKey(x => x.RemisionId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<OpMaterialLine>(b =>
        {
            b.ToTable("OpMaterialLines");
            b.HasKey(x => x.Id);
            b.Property(x => x.PartName).IsRequired().HasMaxLength(200);
            b.Property(x => x.Category).IsRequired().HasMaxLength(80);
            b.Property(x => x.ProductName).IsRequired().HasMaxLength(500);
            b.Property(x => x.Unit).IsRequired().HasMaxLength(40);
            b.Property(x => x.Quantity).HasPrecision(18, 4);
            b.Property(x => x.UnitCost).HasPrecision(18, 2);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.HasIndex(x => x.ManufacturingOrderId);
        });

        modelBuilder.Entity<OpLaborProcess>(b =>
        {
            b.ToTable("OpLaborProcesses");
            b.HasKey(x => x.Id);
            b.Property(x => x.PartName).IsRequired().HasMaxLength(200);
            b.Property(x => x.WorkStation).IsRequired().HasMaxLength(200);
            b.Property(x => x.Quantity).HasPrecision(18, 4);
            b.Property(x => x.RollWidth).HasPrecision(18, 4);
            b.Property(x => x.CutLength).HasPrecision(18, 4);
            b.Property(x => x.SheetWidth).HasPrecision(18, 4);
            b.Property(x => x.SheetLength).HasPrecision(18, 4);
            b.Property(x => x.Cabida).HasPrecision(18, 4);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.HasIndex(x => x.ManufacturingOrderId);
        });

        modelBuilder.Entity<OpExternalWorkshop>(b =>
        {
            b.ToTable("OpExternalWorkshops");
            b.HasKey(x => x.Id);
            b.Property(x => x.WorkshopName).IsRequired().HasMaxLength(200);
            b.Property(x => x.WorkType).IsRequired().HasMaxLength(200);
            b.Property(x => x.QuantityDelivered).HasPrecision(18, 2);
            b.Property(x => x.Fajado).HasPrecision(18, 2);
            b.Property(x => x.Estresado).HasPrecision(18, 2);
            b.Property(x => x.Empacado).HasPrecision(18, 2);
            b.Property(x => x.UnitPrice).HasPrecision(18, 2);
            b.Property(x => x.ReturnQuantity).HasPrecision(18, 2);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.HasIndex(x => x.ManufacturingOrderId);
        });

        modelBuilder.Entity<InventoryConsumption>(b =>
        {
            b.ToTable("InventoryConsumptions");
            b.HasKey(x => x.Id);
            b.Property(x => x.ApplicationNumber).IsRequired().HasMaxLength(30);
            b.Property(x => x.OpNumber).IsRequired().HasMaxLength(20);
            b.Property(x => x.ProductName).IsRequired().HasMaxLength(500);
            b.Property(x => x.Unit).IsRequired().HasMaxLength(40);
            b.Property(x => x.DeliveredTo).IsRequired().HasMaxLength(255);
            b.Property(x => x.Quantity).HasPrecision(18, 4);
            b.Property(x => x.UnitCost).HasPrecision(18, 2);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.Property(x => x.UpdatedBy).HasMaxLength(255);
            b.HasIndex(x => x.ApplicationNumber).IsUnique();
            b.HasIndex(x => x.ManufacturingOrderId);
            b.HasOne(x => x.ManufacturingOrder).WithMany().HasForeignKey(x => x.ManufacturingOrderId).OnDelete(DeleteBehavior.Restrict);
        });

        modelBuilder.Entity<WarehouseStockMovement>(b =>
        {
            b.ToTable("WarehouseStockMovements");
            b.HasKey(x => x.Id);
            b.Property(x => x.ProductName).IsRequired().HasMaxLength(500);
            b.Property(x => x.MovementType).IsRequired().HasMaxLength(20);
            b.Property(x => x.Quantity).HasPrecision(18, 4);
            b.Property(x => x.UnitCost).HasPrecision(18, 2);
            b.Property(x => x.Reference).HasMaxLength(100);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.HasIndex(x => x.ProductName);
            b.HasIndex(x => x.MovementDate);
            b.HasIndex(x => x.ConsumptionId);
        });

        modelBuilder.Entity<Customer>(b =>
        {
            b.ToTable("Customers");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(255);
            b.Property(x => x.Nit).HasMaxLength(50);
            b.Property(x => x.ContactName).HasMaxLength(255);
            b.Property(x => x.Phone).HasMaxLength(60);
            b.Property(x => x.Email).HasMaxLength(255);
            b.Property(x => x.Address).HasMaxLength(500);
            b.Property(x => x.ReceiptPercentage).HasPrecision(5, 2);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.Property(x => x.UpdatedBy).HasMaxLength(255);
            b.HasIndex(x => x.Name).IsUnique();
        });
    }

    private static void ConfigureDailyProduction(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<ProductionMachine>(b =>
        {
            b.ToTable("ProductionMachines");
            b.HasKey(x => x.Id);
            b.Property(x => x.Code).IsRequired().HasMaxLength(50);
            b.Property(x => x.Name).IsRequired().HasMaxLength(255);
            b.Property(x => x.ProcessCode).HasMaxLength(50);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.Property(x => x.UpdatedBy).HasMaxLength(255);
            b.HasIndex(x => x.Code).IsUnique();
            b.HasIndex(x => x.Name);
        });

        modelBuilder.Entity<ProductionOperator>(b =>
        {
            b.ToTable("ProductionOperators");
            b.HasKey(x => x.Id);
            b.Property(x => x.Code).IsRequired().HasMaxLength(50);
            b.Property(x => x.DisplayName).IsRequired().HasMaxLength(255);
            b.Property(x => x.DocumentNumber).HasMaxLength(50);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.Property(x => x.UpdatedBy).HasMaxLength(255);
            b.HasIndex(x => x.Code).IsUnique();
            b.HasIndex(x => x.DisplayName);
            b.HasIndex(x => x.UserId);
        });

        modelBuilder.Entity<ProductionActivityCode>(b =>
        {
            b.ToTable("ProductionActivityCodes");
            b.HasKey(x => x.Id);
            b.Property(x => x.Code).IsRequired().HasMaxLength(20);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.Property(x => x.UpdatedBy).HasMaxLength(255);
            b.HasIndex(x => x.Code).IsUnique();

            b.HasMany(x => x.Subcodes)
                .WithOne(x => x.ActivityCode)
                .HasForeignKey(x => x.ActivityCodeId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProductionActivitySubcode>(b =>
        {
            b.ToTable("ProductionActivitySubcodes");
            b.HasKey(x => x.Id);
            b.Property(x => x.Code).IsRequired().HasMaxLength(20);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.HasIndex(x => new { x.ActivityCodeId, x.Code }).IsUnique();
        });

        modelBuilder.Entity<ProductionShift>(b =>
        {
            b.ToTable("ProductionShifts");
            b.HasKey(x => x.Id);
            b.Property(x => x.Code).IsRequired().HasMaxLength(10);
            b.Property(x => x.Name).IsRequired().HasMaxLength(100);
            b.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<ProductionMachineShift>(b =>
        {
            b.ToTable("ProductionMachineShifts");
            b.HasKey(x => x.Id);
            b.HasIndex(x => new { x.MachineId, x.ShiftId }).IsUnique();
            b.HasIndex(x => x.MachineId);
        });

        modelBuilder.Entity<ProductionWasteReason>(b =>
        {
            b.ToTable("ProductionWasteReasons");
            b.HasKey(x => x.Id);
            b.Property(x => x.Code).IsRequired().HasMaxLength(20);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<ProductionSession>(b =>
        {
            b.ToTable("ProductionSessions");
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).ValueGeneratedNever();
            b.Property(x => x.MachineCodeSnapshot).IsRequired().HasMaxLength(50);
            b.Property(x => x.MachineNameSnapshot).IsRequired().HasMaxLength(255);
            b.Property(x => x.OperatorCodeSnapshot).IsRequired().HasMaxLength(50);
            b.Property(x => x.OperatorNameSnapshot).IsRequired().HasMaxLength(255);
            b.Property(x => x.ShiftCodeSnapshot).IsRequired().HasMaxLength(10);
            b.Property(x => x.Status).IsRequired().HasMaxLength(20);
            b.Property(x => x.Source).IsRequired().HasMaxLength(40);
            b.Property(x => x.CurrentActivityCode).HasMaxLength(20);
            b.Property(x => x.CurrentActivityName).HasMaxLength(200);
            b.Property(x => x.CurrentOp).HasMaxLength(20);
            b.Property(x => x.IdempotencyKey).HasMaxLength(100);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.Property(x => x.UpdatedBy).HasMaxLength(255);
            b.Property(x => x.ConcurrencyStamp).IsConcurrencyToken();

            b.HasIndex(x => x.OperationalDate);
            b.HasIndex(x => new { x.MachineId, x.OperationalDate, x.Status });
            b.HasIndex(x => new { x.OperatorId, x.OperationalDate, x.Status });
            b.HasIndex(x => x.IdempotencyKey).IsUnique().HasFilter("\"IdempotencyKey\" IS NOT NULL");

            b.HasOne(x => x.Machine).WithMany().HasForeignKey(x => x.MachineId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.Operator).WithMany().HasForeignKey(x => x.OperatorId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.Shift).WithMany().HasForeignKey(x => x.ShiftId).OnDelete(DeleteBehavior.Restrict);

            b.HasMany(x => x.Activities)
                .WithOne(x => x.Session)
                .HasForeignKey(x => x.SessionId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProductionActivity>(b =>
        {
            b.ToTable("ProductionActivities", t =>
            {
                t.HasCheckConstraint("CK_ProductionActivities_EndAfterStart", "\"EndAt\" IS NULL OR \"EndAt\" > \"StartAt\"");
                t.HasCheckConstraint("CK_ProductionActivities_QtyNonNegative", "\"QuantityProcessed\" >= 0 AND \"Waste\" >= 0");
            });
            b.HasKey(x => x.Id);
            b.Property(x => x.Id).ValueGeneratedNever();
            b.Property(x => x.ActivityCodeSnapshot).IsRequired().HasMaxLength(20);
            b.Property(x => x.ActivityNameSnapshot).IsRequired().HasMaxLength(200);
            b.Property(x => x.SubcodeSnapshot).HasMaxLength(20);
            b.Property(x => x.SubcodeDetailSnapshot).HasMaxLength(200);
            b.Property(x => x.ProductionOrderNumber).HasMaxLength(20);
            b.Property(x => x.QuantityProcessed).HasPrecision(18, 2);
            b.Property(x => x.Waste).HasPrecision(18, 2);
            b.Property(x => x.Observations).HasMaxLength(2000);
            b.Property(x => x.Status).IsRequired().HasMaxLength(20);
            b.Property(x => x.IdempotencyKey).HasMaxLength(100);
            b.Property(x => x.CreatedBy).HasMaxLength(255);
            b.Property(x => x.UpdatedBy).HasMaxLength(255);

            b.HasIndex(x => x.SessionId);
            b.HasIndex(x => x.OperationalDate);
            b.HasIndex(x => x.ProductionOrderNumber);
            b.HasIndex(x => new { x.StartAt, x.EndAt });
            b.HasIndex(x => x.IdempotencyKey).IsUnique().HasFilter("\"IdempotencyKey\" IS NOT NULL");

            b.HasOne(x => x.ActivityCode).WithMany().HasForeignKey(x => x.ActivityCodeId).OnDelete(DeleteBehavior.Restrict);
            b.HasOne(x => x.Subcode).WithMany().HasForeignKey(x => x.SubcodeId).OnDelete(DeleteBehavior.SetNull);
            b.HasOne(x => x.ProductionOrder).WithMany().HasForeignKey(x => x.ProductionOrderId).OnDelete(DeleteBehavior.SetNull);

            b.HasMany(x => x.WasteEntries)
                .WithOne(x => x.Activity)
                .HasForeignKey(x => x.ActivityId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ProductionWasteEntry>(b =>
        {
            b.ToTable("ProductionWasteEntries");
            b.HasKey(x => x.Id);
            b.Property(x => x.ReasonCodeSnapshot).IsRequired().HasMaxLength(20);
            b.Property(x => x.ReasonNameSnapshot).IsRequired().HasMaxLength(200);
            b.Property(x => x.Quantity).HasPrecision(18, 2);
            b.Property(x => x.Observations).HasMaxLength(1000);
            b.HasIndex(x => x.ActivityId);
            b.HasOne(x => x.WasteReason).WithMany().HasForeignKey(x => x.WasteReasonId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<AreaExpenseRubro>(b =>
        {
            b.ToTable("AreaExpenseRubros");
            b.HasKey(x => x.Id);
            b.Property(x => x.Area).IsRequired().HasMaxLength(40);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.HasIndex(x => new { x.Area, x.Name }).IsUnique();
        });

        modelBuilder.Entity<AreaExpenseProveedor>(b =>
        {
            b.ToTable("AreaExpenseProveedores");
            b.HasKey(x => x.Id);
            b.Property(x => x.Area).IsRequired().HasMaxLength(40);
            b.Property(x => x.Name).IsRequired().HasMaxLength(200);
            b.Property(x => x.Nit).HasMaxLength(50);
            b.Property(x => x.Cedula).HasMaxLength(30);
            b.Property(x => x.Telefono).HasMaxLength(40);
            b.Property(x => x.Asesor).HasMaxLength(200);
            b.Property(x => x.RubrosJson).IsRequired();
            b.HasIndex(x => new { x.Area, x.Name });
        });

        modelBuilder.Entity<AreaExpenseCaptura>(b =>
        {
            b.ToTable("AreaExpenseCapturas");
            b.HasKey(x => x.Id);
            b.Property(x => x.Area).IsRequired().HasMaxLength(40);
            b.Property(x => x.RubroName).IsRequired().HasMaxLength(200);
            b.Property(x => x.ProveedorName).IsRequired().HasMaxLength(200);
            b.Property(x => x.Invoice).HasMaxLength(120);
            b.Property(x => x.OpNumber).HasMaxLength(120);
            b.Property(x => x.Status).IsRequired().HasMaxLength(40);
            b.Property(x => x.RegisteredBy).IsRequired().HasMaxLength(200);
            b.Property(x => x.BaseAmount).HasPrecision(18, 2);
            b.Property(x => x.IvaAmount).HasPrecision(18, 2);
            b.Property(x => x.TotalAmount).HasPrecision(18, 2);
            b.HasIndex(x => new { x.Area, x.ExpenseDate });
            b.HasIndex(x => new { x.Area, x.RubroName });
            b.HasIndex(x => x.OvertimeGroupId);
        });
    }
}
