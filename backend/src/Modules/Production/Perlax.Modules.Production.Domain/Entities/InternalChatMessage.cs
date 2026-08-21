namespace Perlax.Modules.Production.Domain.Entities;

public class InternalChatMessage
{
    public Guid Id { get; set; }
    public Guid ConversationId { get; set; }
    public string SenderUsername { get; set; } = string.Empty;
    public string SenderDisplayName { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? AttachmentUrl { get; set; }
    public string? AttachmentName { get; set; }
    public string? AttachmentContentType { get; set; }
    public DateTime SentAt { get; set; }

    public InternalChatConversation Conversation { get; set; } = null!;
}
