using System;

namespace Perla.Modules.Audit.Domain.Entities;

public class AuditLog
{
    public Guid Id { get; set; }
    public string? UserId { get; set; }
    public string Type { get; set; } = string.Empty; // Insert, Update, Delete
    public string TableName { get; set; } = string.Empty;
    public DateTime DateTime { get; set; }
    public string? OldValues { get; set; } // JSON
    public string? NewValues { get; set; } // JSON
    public string? AffectedColumns { get; set; } // JSON
    public string PrimaryKey { get; set; } = string.Empty;
}
