namespace Perlax.Modules.Production.Domain.Entities;

public class InternalChatParticipant
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public string Username { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; }
    public DateTime? LastReadAt { get; set; }

    public InternalChatConversation Conversation { get; set; } = null!;
}
