namespace Perlax.Modules.Production.Domain.Entities;

public class InternalChatConversation
{
    public Guid Id { get; set; }
    public Guid? ProductionOrderId { get; set; }
    public string OTNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string CreatedByUsername { get; set; } = string.Empty;
    public string CreatedByDisplayName { get; set; } = string.Empty;
    public string? DeletedForUsersJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<InternalChatMessage> Messages { get; set; } = new List<InternalChatMessage>();
}
