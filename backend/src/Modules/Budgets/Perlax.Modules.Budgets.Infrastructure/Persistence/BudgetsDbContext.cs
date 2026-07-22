using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Budgets.Domain.Entities;

namespace Perlax.Modules.Budgets.Infrastructure.Persistence;

public class BudgetsDbContext : DbContext
{
    public BudgetsDbContext(DbContextOptions<BudgetsDbContext> options) : base(options)
    {
    }

    public DbSet<Budget> Budgets => Set<Budget>();
    public DbSet<BudgetBusinessUnit> BudgetBusinessUnits => Set<BudgetBusinessUnit>();
    public DbSet<BudgetLine> BudgetLines => Set<BudgetLine>();
    public DbSet<BudgetPersonnelItem> BudgetPersonnelItems => Set<BudgetPersonnelItem>();
    public DbSet<BudgetAdjustment> BudgetAdjustments => Set<BudgetAdjustment>();
    public DbSet<BudgetCategory> BudgetCategories => Set<BudgetCategory>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("budgets");

        modelBuilder.Entity<Budget>(b =>
        {
            b.ToTable("Budgets");
            b.HasKey(x => x.Id);
            b.Property(x => x.Code).IsRequired().HasMaxLength(40);
            b.Property(x => x.Company).IsRequired().HasMaxLength(255);
            b.Property(x => x.Currency).IsRequired().HasMaxLength(10);
            b.Property(x => x.Status).IsRequired().HasMaxLength(40);
            b.Property(x => x.CostCenter).HasMaxLength(100);
            b.Property(x => x.GeneralApprover).HasMaxLength(255);
            b.Property(x => x.ApprovalObservations).HasMaxLength(4000);
            b.Property(x => x.RejectionReason).HasMaxLength(4000);
            b.Property(x => x.Observations).HasMaxLength(4000);
            b.Property(x => x.CreatedBy).IsRequired().HasMaxLength(255);
            b.Property(x => x.UpdatedBy).HasMaxLength(255);
            b.HasIndex(x => x.Code).IsUnique();
            b.HasIndex(x => new { x.Company, x.FiscalYear }).IsUnique();
            b.HasIndex(x => x.Status);
            b.HasMany(x => x.BusinessUnits).WithOne(x => x.Budget).HasForeignKey(x => x.BudgetId).OnDelete(DeleteBehavior.Cascade);
            b.HasMany(x => x.Lines).WithOne(x => x.Budget).HasForeignKey(x => x.BudgetId).OnDelete(DeleteBehavior.Cascade);
            b.HasMany(x => x.Personnel).WithOne(x => x.Budget).HasForeignKey(x => x.BudgetId).OnDelete(DeleteBehavior.Cascade);
            b.HasMany(x => x.Adjustments).WithOne(x => x.Budget).HasForeignKey(x => x.BudgetId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<BudgetBusinessUnit>(b =>
        {
            b.ToTable("BudgetBusinessUnits");
            b.HasKey(x => x.Id);
            b.Property(x => x.Name).IsRequired().HasMaxLength(255);
            b.Property(x => x.Responsible).IsRequired().HasMaxLength(255);
            b.Property(x => x.Approver).HasMaxLength(255);
            b.Property(x => x.Status).IsRequired().HasMaxLength(40);
            b.HasIndex(x => x.BudgetId);
        });

        modelBuilder.Entity<BudgetLine>(b =>
        {
            b.ToTable("BudgetLines");
            b.HasKey(x => x.Id);
            b.Property(x => x.LineType).IsRequired().HasMaxLength(40);
            b.Property(x => x.Category).IsRequired().HasMaxLength(150);
            b.Property(x => x.Concept).IsRequired().HasMaxLength(500);
            b.Property(x => x.Description).HasMaxLength(2000);
            b.Property(x => x.ProjectedValue).HasPrecision(18, 2);
            b.Property(x => x.Frequency).HasMaxLength(40);
            b.Property(x => x.CostCenter).HasMaxLength(100);
            b.Property(x => x.Code).HasMaxLength(80);
            b.Property(x => x.UnitOfMeasure).HasMaxLength(50);
            b.Property(x => x.Provider).HasMaxLength(255);
            b.Property(x => x.Quantity).HasPrecision(18, 4);
            b.Property(x => x.UnitCost).HasPrecision(18, 2);
            b.Property(x => x.Currency).HasMaxLength(10);
            b.Property(x => x.ExternalReference).HasMaxLength(255);
            b.Property(x => x.FinancialEntity).HasMaxLength(255);
            b.Property(x => x.Observations).HasMaxLength(4000);
            b.Property(x => x.CreatedBy).IsRequired().HasMaxLength(255);
            b.Property(x => x.UpdatedBy).HasMaxLength(255);
            b.HasIndex(x => new { x.BudgetId, x.LineType });
            b.HasIndex(x => x.BusinessUnitId);
            b.HasOne(x => x.BusinessUnit).WithMany(x => x.Lines).HasForeignKey(x => x.BusinessUnitId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<BudgetPersonnelItem>(b =>
        {
            b.ToTable("BudgetPersonnelItems");
            b.HasKey(x => x.Id);
            b.Property(x => x.Position).IsRequired().HasMaxLength(255);
            b.Property(x => x.Area).IsRequired().HasMaxLength(255);
            b.Property(x => x.Category).IsRequired().HasMaxLength(150);
            b.Property(x => x.CostCenter).HasMaxLength(100);
            b.Property(x => x.ContractType).IsRequired().HasMaxLength(80);
            b.Property(x => x.MonthlySalary).HasPrecision(18, 2);
            b.Property(x => x.Benefits).HasPrecision(18, 2);
            b.Property(x => x.Allowances).HasPrecision(18, 2);
            b.Property(x => x.Bonuses).HasPrecision(18, 2);
            b.Property(x => x.Overtime).HasPrecision(18, 2);
            b.Property(x => x.Observations).HasMaxLength(4000);
            b.Property(x => x.CreatedBy).IsRequired().HasMaxLength(255);
            b.Property(x => x.UpdatedBy).HasMaxLength(255);
            b.Ignore(x => x.MonthlyTotal);
            b.Ignore(x => x.AnnualTotal);
            b.HasIndex(x => x.BudgetId);
            b.HasOne(x => x.BusinessUnit).WithMany(x => x.Personnel).HasForeignKey(x => x.BusinessUnitId).OnDelete(DeleteBehavior.SetNull);
        });

        modelBuilder.Entity<BudgetAdjustment>(b =>
        {
            b.ToTable("BudgetAdjustments");
            b.HasKey(x => x.Id);
            b.Property(x => x.AdjustmentType).IsRequired().HasMaxLength(40);
            b.Property(x => x.Category).IsRequired().HasMaxLength(150);
            b.Property(x => x.Concept).IsRequired().HasMaxLength(500);
            b.Property(x => x.PreviousValue).HasPrecision(18, 2);
            b.Property(x => x.AdjustmentValue).HasPrecision(18, 2);
            b.Property(x => x.NewValue).HasPrecision(18, 2);
            b.Property(x => x.Motive).IsRequired().HasMaxLength(2000);
            b.Property(x => x.Observations).HasMaxLength(4000);
            b.Property(x => x.Status).IsRequired().HasMaxLength(40);
            b.Property(x => x.CreatedBy).IsRequired().HasMaxLength(255);
            b.Property(x => x.ApprovedBy).HasMaxLength(255);
            b.Property(x => x.ApprovalObservations).HasMaxLength(4000);
            b.Property(x => x.RejectionReason).HasMaxLength(4000);
            b.HasIndex(x => x.BudgetId);
            b.HasIndex(x => x.Status);
        });

        modelBuilder.Entity<BudgetCategory>(b =>
        {
            b.ToTable("BudgetCategories");
            b.HasKey(x => x.Id);
            b.Property(x => x.LineType).IsRequired().HasMaxLength(40);
            b.Property(x => x.Name).IsRequired().HasMaxLength(150);
            b.HasIndex(x => new { x.LineType, x.Name }).IsUnique();
        });
    }
}
