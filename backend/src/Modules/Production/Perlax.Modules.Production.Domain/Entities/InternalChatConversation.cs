namespace Perlax.Modules.Production.Domain.Entities;

public class InternalChatConversation
{
    public Guid Id { get; set; }
    public InternalChatConversationType ConversationType { get; set; } = InternalChatConversationType.OpThread;
    public string? AreaKey { get; set; }
    /// <summary>Clave estable para 1:1: usernames normalizados ordenados unidos por '|'</summary>
    public string? DirectPairKey { get; set; }
    public Guid? ProductionOrderId { get; set; }
    public string OTNumber { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string CreatedByUsername { get; set; } = string.Empty;
    public string CreatedByDisplayName { get; set; } = string.Empty;
    public string? DeletedForUsersJson { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<InternalChatMessage> Messages { get; set; } = new List<InternalChatMessage>();
    public ICollection<InternalChatParticipant> Participants { get; set; } = new List<InternalChatParticipant>();
}
