namespace Perlax.Modules.Production.Application.Chat;

public record ChatConversationListItemDto(
    Guid Id,
    string ConversationType,
    string? AreaKey,
    string OTNumber,
    string Title,
    string CreatedByDisplayName,
    string CreatedByUsername,
    DateTime CreatedAt,
    DateTime UpdatedAt,
    string? LastMessage,
    DateTime? LastMessageAt,
    string? PeerUsername,
    string? PeerDisplayName);

public record ChatConversationSummaryDto(
    Guid Id,
    string ConversationType,
    string? AreaKey,
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
public record CreateDirectChatCommand(string PeerUsername, string? CreatedByDisplayName);
public record CreateAreaChatCommand(string AreaKey, string? CreatedByDisplayName);
public record SendChatMessageCommand(string Message, string? SenderDisplayName);

public record ChatUploadFileDto(string FileName, string? ContentType, long Length, Stream Content);

public record SendChatAttachmentsResultDto(
    Guid ConversationId,
    string ConversationType,
    string? AreaKey,
    string OTNumber,
    string Title,
    string CreatedByDisplayName,
    DateTime UpdatedAt,
    IReadOnlyList<ChatMessageDto> Messages);

public record SendChatMessageResultDto(
    ChatMessageDto Message,
    string ConversationType,
    string? AreaKey,
    string OTNumber,
    string Title,
    string CreatedByDisplayName,
    string LastMessagePreview);

public record DeleteChatForUserResultDto(bool DeletedForAll, Guid Id, string OTNumber, string Title);

public record ChatUserSearchItemDto(
    string Username,
    string DisplayName,
    string Role,
    string? Area);

public interface IInternalChatService
{
    Task EnsureAccessAsync(ChatCallerContext caller, CancellationToken ct = default);
    Task<IReadOnlyList<ChatConversationListItemDto>> GetConversationsAsync(ChatCallerContext caller, CancellationToken ct = default);
    Task<IReadOnlyList<ChatUserSearchItemDto>> SearchUsersAsync(ChatCallerContext caller, string query, CancellationToken ct = default);
    Task<ChatConversationSummaryDto> CreateOrGetFromOtAsync(CreateChatFromOtCommand command, ChatCallerContext caller, CancellationToken ct = default);
    Task<ChatConversationSummaryDto> CreateOrGetDirectAsync(CreateDirectChatCommand command, ChatCallerContext caller, CancellationToken ct = default);
    Task<ChatConversationSummaryDto> CreateOrGetAreaAsync(CreateAreaChatCommand command, ChatCallerContext caller, CancellationToken ct = default);
    Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(Guid conversationId, ChatCallerContext caller, string uploadsRoot, CancellationToken ct = default);
    Task<SendChatMessageResultDto> SendMessageAsync(
        Guid conversationId, SendChatMessageCommand command, ChatCallerContext caller, CancellationToken ct = default);
    Task<SendChatAttachmentsResultDto> SendAttachmentsAsync(
        Guid conversationId,
        string? message,
        string? senderDisplayName,
        ChatCallerContext caller,
        string uploadsRoot,
        IReadOnlyList<ChatUploadFileDto> files,
        CancellationToken ct = default);
    Task<DeleteChatForUserResultDto> DeleteForCurrentUserAsync(
        Guid conversationId, ChatCallerContext caller, string uploadsRoot, CancellationToken ct = default);
    Task<bool> CanJoinConversationAsync(Guid conversationId, ChatCallerContext caller, CancellationToken ct = default);
    Task<IReadOnlyList<string>> GetParticipantUsernamesAsync(Guid conversationId, CancellationToken ct = default);
}
