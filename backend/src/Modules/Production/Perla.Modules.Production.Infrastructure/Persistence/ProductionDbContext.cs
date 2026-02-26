using Microsoft.EntityFrameworkCore;
using Perla.Modules.Production.Domain.Entities;
using Perla.Shared;
using System.Text.Json;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Perla.Modules.Production.Infrastructure.Persistence;

public class ProductionDbContext : DbContext
{
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuditService _auditService;

    public ProductionDbContext(
        DbContextOptions<ProductionDbContext> options,
        ICurrentUserService currentUserService,
        IAuditService auditService) : base(options)
    {
        _currentUserService = currentUserService;
        _auditService = auditService;
    }

    public DbSet<ProductionOrder> ProductionOrders => Set<ProductionOrder>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.HasDefaultSchema("production");
        
        modelBuilder.Entity<ProductionOrder>(builder =>
        {
            builder.ToTable("ProductionOrders");
            builder.HasKey(x => x.Id);
            builder.Property(x => x.ProductCode).IsRequired().HasMaxLength(50);
            builder.Property(x => x.ProductName).IsRequired().HasMaxLength(200);
            builder.Property(x => x.Status).HasMaxLength(20);
        });
    }

    public override async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var auditEntries = OnBeforeSaveChanges();
        var result = await base.SaveChangesAsync(cancellationToken);
        await OnAfterSaveChanges(auditEntries);
        return result;
    }

    private List<AuditEntry> OnBeforeSaveChanges()
    {
        ChangeTracker.DetectChanges();
        var auditEntries = new List<AuditEntry>();

        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            if (entry.State == EntityState.Detached || entry.State == EntityState.Unchanged)
                continue;

            var auditEntry = new AuditEntry(entry);
            auditEntry.TableName = entry.Metadata.GetDefaultSchema() + "." + entry.Metadata.GetTableName();
            auditEntry.UserId = _currentUserService.UserId;
            auditEntries.Add(auditEntry);

            foreach (var property in entry.Properties)
            {
                if (property.IsTemporary)
                {
                    auditEntry.TemporaryProperties.Add(property);
                    continue;
                }

                string propertyName = property.Metadata.Name;
                if (property.Metadata.IsPrimaryKey())
                {
                    auditEntry.KeyValues[propertyName] = property.CurrentValue;
                    continue;
                }

                switch (entry.State)
                {
                    case EntityState.Added:
                        auditEntry.AuditType = "Insert";
                        auditEntry.NewValues[propertyName] = property.CurrentValue;
                        entry.Entity.CreatedAt = DateTime.UtcNow;
                        entry.Entity.CreatedBy = _currentUserService.UserId;
                        break;

                    case EntityState.Deleted:
                        auditEntry.AuditType = "Delete";
                        auditEntry.OldValues[propertyName] = property.OriginalValue;
                        break;

                    case EntityState.Modified:
                        if (property.IsModified)
                        {
                            auditEntry.AffectedColumns.Add(propertyName);
                            auditEntry.AuditType = "Update";
                            auditEntry.OldValues[propertyName] = property.OriginalValue;
                            auditEntry.NewValues[propertyName] = property.CurrentValue;
                            entry.Entity.LastModifiedAt = DateTime.UtcNow;
                            entry.Entity.LastModifiedBy = _currentUserService.UserId;
                        }
                        break;
                }
            }
        }

        return auditEntries;
    }

    private Task OnAfterSaveChanges(List<AuditEntry> auditEntries)
    {
        if (auditEntries == null || auditEntries.Count == 0)
            return Task.CompletedTask;

        foreach (var auditEntry in auditEntries)
        {
            foreach (var prop in auditEntry.TemporaryProperties)
            {
                if (prop.Metadata.IsPrimaryKey())
                {
                    auditEntry.KeyValues[prop.Metadata.Name] = prop.CurrentValue;
                }
                else
                {
                    auditEntry.NewValues[prop.Metadata.Name] = prop.CurrentValue;
                }
            }

            _auditService.LogAsync(
                auditEntry.UserId ?? "Unknown",
                auditEntry.AuditType,
                auditEntry.TableName,
                JsonSerializer.Serialize(auditEntry.KeyValues),
                auditEntry.OldValues.Count == 0 ? null : JsonSerializer.Serialize(auditEntry.OldValues),
                auditEntry.NewValues.Count == 0 ? null : JsonSerializer.Serialize(auditEntry.NewValues),
                auditEntry.AffectedColumns.Count == 0 ? null : JsonSerializer.Serialize(auditEntry.AffectedColumns)
            );
        }

        return Task.CompletedTask;
    }
}

internal class AuditEntry
{
    public AuditEntry(Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry entry)
    {
        Entry = entry;
    }

    public Microsoft.EntityFrameworkCore.ChangeTracking.EntityEntry Entry { get; }
    public string? UserId { get; set; }
    public string TableName { get; set; } = string.Empty;
    public Dictionary<string, object?> KeyValues { get; } = new();
    public Dictionary<string, object?> OldValues { get; } = new();
    public Dictionary<string, object?> NewValues { get; } = new();
    public List<string> AffectedColumns { get; } = new();
    public string AuditType { get; set; } = string.Empty;
    public List<Microsoft.EntityFrameworkCore.ChangeTracking.PropertyEntry> TemporaryProperties { get; } = new();
}
