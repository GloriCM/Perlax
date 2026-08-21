namespace Perlax.Modules.Production.Application.Chat;

public record ChatConversationListItemDto(
    Guid Id,
    string OTNumber,
    string Title,
    string CreatedByDisplayName,
    string CreatedByUsername,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? LastMessage,
    DateTime? LastMessageAt);

public record ChatConversationSummaryDto(
    Guid Id,
    string OTNumber,
    string Title,
    string CreatedByDisplayName,
    string CreatedByUsername,
    bool WasCreated);

public record ChatMessageDto(
    Guid Id,
    Guid ConversationId,
    string SenderUsername,
    string SenderDisplayName,
    string? Message,
    string? AttachmentUrl,
    string? AttachmentName,
    string? AttachmentContentType,
    DateTime SentAt);

public record CreateChatFromOtCommand(string OTNumber, string? CreatedByDisplayName);
public record SendChatMessageCommand(string Message, string? SenderDisplayName);

public record ChatUploadFileDto(string FileName, string? ContentType, long Length, Stream Content);

public record SendChatAttachmentsResultDto(
    Guid ConversationId,
    string OTNumber,
    string CreatedByDisplayName,
    DateTime UpdatedAt,
    IReadOnlyList<ChatMessageDto> Messages);

public record DeleteChatForUserResultDto(bool DeletedForAll, Guid Id, string OTNumber);

public interface IInternalChatService
{
    Task<IReadOnlyList<ChatConversationListItemDto>> GetConversationsAsync(string currentUsername, CancellationToken ct = default);
    Task<ChatConversationSummaryDto> CreateOrGetFromOtAsync(CreateChatFromOtCommand command, string username, CancellationToken ct = default);
    Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(Guid conversationId, string currentUsername, string uploadsRoot, CancellationToken ct = default);
    Task<(ChatMessageDto Message, string OTNumber, string CreatedByDisplayName, string LastMessagePreview)> SendMessageAsync(
        Guid conversationId, SendChatMessageCommand command, string username, CancellationToken ct = default);
    Task<SendChatAttachmentsResultDto> SendAttachmentsAsync(
        Guid conversationId,
        string? message,
        string? senderDisplayName,
        string username,
        string uploadsRoot,
        IReadOnlyList<ChatUploadFileDto> files,
        CancellationToken ct = default);
    Task<DeleteChatForUserResultDto> DeleteForCurrentUserAsync(
        Guid conversationId, string currentUsername, string uploadsRoot, CancellationToken ct = default);
}