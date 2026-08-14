using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.Chat;
using Perlax.Modules.Production.Api.Hubs;
using Perlax.Modules.Production.Infrastructure.Services;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/internal-chat")]
public class InternalChatController : ControllerBase
{
    private readonly IInternalChatService _chat;
    private readonly IAuditService _auditService;
    private readonly IHubContext<InternalChatHub> _chatHub;
    private readonly IWebHostEnvironment _environment;

    public InternalChatController(
        IInternalChatService chat,
        IAuditService auditService,
        IHubContext<InternalChatHub> chatHub,
        IWebHostEnvironment environment)
    {
        _chat = chat;
        _auditService = auditService;
        _chatHub = chatHub;
        _environment = environment;
    }

    [HttpGet("conversations")]
    public async Task<ActionResult<IEnumerable<object>>> GetConversations(CancellationToken ct)
    {
        var rows = await _chat.GetConversationsAsync(User.Identity?.Name ?? string.Empty, ct);
        return Ok(rows.Select(c => new
        {
            c.Id,
            c.OTNumber,
            c.Title,
            c.CreatedByDisplayName,
            c.CreatedByUsername,
            c.CreatedAt,
            c.UpdatedAt,
            c.LastMessage,
            c.LastMessageAt
        }));
    }

    [HttpPost("from-ot")]
    public async Task<ActionResult<object>> CreateOrGetConversationFromOt([FromBody] CreateConversationFromOtRequest request, CancellationToken ct)
    {
        try
        {
            var username = User.Identity?.Name ?? "Sistema";
            var result = await _chat.CreateOrGetFromOtAsync(
                new CreateChatFromOtCommand(request.OTNumber, request.CreatedByDisplayName), username, ct);

            if (result.WasCreated)
            {
                await _chatHub.Clients.All.SendAsync("ConversationUpserted", new
                {
                    id = result.Id,
                    title = result.Title,
                    createdBy = result.CreatedByDisplayName,
                    lastMessage = "Conversación creada.",
                    updatedAt = DateTime.UtcNow
                }, ct);

                await _auditService.LogAsync(
                    User.Identity?.Name, User.Identity?.Name, "CHAT_CREATE_CONVERSATION",
                    $"Se creó chat interno para OT {result.OTNumber}",
                    HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            }

            return Ok(new
            {
                result.Id,
                result.OTNumber,
                result.Title,
                result.CreatedByDisplayName,
                result.CreatedByUsername
            });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpGet("conversations/{conversationId:guid}/messages")]
    public async Task<ActionResult<IEnumerable<object>>> GetMessages(Guid conversationId, CancellationToken ct)
    {
        try
        {
            var rows = await _chat.GetMessagesAsync(
                conversationId, User.Identity?.Name ?? string.Empty, GetUploadsRoot(), ct);
            return Ok(rows.Select(m => new
            {
                m.Id,
                m.ConversationId,
                m.SenderUsername,
                m.SenderDisplayName,
                m.Message,
                m.AttachmentUrl,
                m.AttachmentName,
                m.AttachmentContentType,
                m.SentAt
            }));
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
    }

    [HttpPost("conversations/{conversationId:guid}/messages")]
    public async Task<ActionResult<object>> SendMessage(Guid conversationId, [FromBody] SendMessageRequest request, CancellationToken ct)
    {
        try
        {
            var username = User.Identity?.Name ?? "Sistema";
            var (msg, otNumber, createdBy, lastPreview) = await _chat.SendMessageAsync(
                conversationId,
                new SendChatMessageCommand(request.Message, request.SenderDisplayName),
                username, ct);

            var outbound = new
            {
                id = msg.Id,
                conversationId = msg.ConversationId,
                senderUsername = msg.SenderUsername,
                senderDisplayName = msg.SenderDisplayName,
                message = msg.Message,
                attachmentUrl = msg.AttachmentUrl,
                attachmentName = msg.AttachmentName,
                attachmentContentType = msg.AttachmentContentType,
                sentAt = msg.SentAt
            };

            await _chatHub.Clients.Group($"conversation:{conversationId}").SendAsync("MessageReceived", outbound, ct);
            await _chatHub.Clients.All.SendAsync("ConversationUpserted", new
            {
                id = conversationId,
                title = $"OT {otNumber}",
                createdBy,
                lastMessage = lastPreview,
                updatedAt = msg.SentAt
            }, ct);

            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name, "CHAT_SEND_MESSAGE",
                $"Mensaje enviado en chat OT {otNumber}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

            return Ok(outbound);
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("conversations/{conversationId:guid}/messages/attachment")]
    [RequestSizeLimit(52_428_800)]
    [RequestFormLimits(MultipartBodyLengthLimit = 52_428_800)]
    public async Task<ActionResult<object>> SendMessageWithAttachment(
        Guid conversationId,
        [FromForm] string? message,
        [FromForm] string? senderDisplayName,
        [FromForm] List<IFormFile>? files,
        [FromForm] IFormFile? file,
        CancellationToken cancellationToken)
    {
        try
        {
            var attachments = new List<IFormFile>();
            if (files is { Count: > 0 }) attachments.AddRange(files.Where(f => f is not null));
            if (file is not null) attachments.Add(file);
            attachments = attachments.Where(f => f.Length > 0).ToList();

            var uploadFiles = attachments
                .Select(f => new ChatUploadFileDto(f.FileName, f.ContentType, f.Length, f.OpenReadStream()))
                .ToList();

            var username = User.Identity?.Name ?? "Sistema";
            var result = await _chat.SendAttachmentsAsync(
                conversationId, message, senderDisplayName, username, GetUploadsRoot(), uploadFiles, cancellationToken);

            foreach (var msg in result.Messages)
            {
                await _chatHub.Clients.Group($"conversation:{conversationId}").SendAsync("MessageReceived", new
                {
                    id = msg.Id,
                    conversationId = msg.ConversationId,
                    senderUsername = msg.SenderUsername,
                    senderDisplayName = msg.SenderDisplayName,
                    message = msg.Message,
                    attachmentUrl = msg.AttachmentUrl,
                    attachmentName = msg.AttachmentName,
                    attachmentContentType = msg.AttachmentContentType,
                    sentAt = msg.SentAt
                }, cancellationToken);
            }

            var last = result.Messages.OrderByDescending(x => x.SentAt).First();
            await _chatHub.Clients.All.SendAsync("ConversationUpserted", new
            {
                id = result.ConversationId,
                title = $"OT {result.OTNumber}",
                createdBy = result.CreatedByDisplayName,
                lastMessage = BuildLastMessagePreview(last),
                updatedAt = result.UpdatedAt
            }, cancellationToken);

            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name, "CHAT_SEND_ATTACHMENT",
                $"Adjuntos enviados en chat OT {result.OTNumber}: {result.Messages.Count}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

            return Ok(result.Messages.Select(msg => new
            {
                id = msg.Id,
                conversationId = msg.ConversationId,
                senderUsername = msg.SenderUsername,
                senderDisplayName = msg.SenderDisplayName,
                message = msg.Message,
                attachmentUrl = msg.AttachmentUrl,
                attachmentName = msg.AttachmentName,
                attachmentContentType = msg.AttachmentContentType,
                sentAt = msg.SentAt
            }));
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("conversations/{conversationId:guid}/my-view")]
    public async Task<ActionResult<object>> DeleteConversationForCurrentUser(Guid conversationId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _chat.DeleteForCurrentUserAsync(
                conversationId, User.Identity?.Name ?? string.Empty, GetUploadsRoot(), cancellationToken);

            if (result.DeletedForAll)
            {
                await _chatHub.Clients.All.SendAsync("ConversationDeleted", new { id = conversationId }, cancellationToken);
                await _auditService.LogAsync(
                    User.Identity?.Name, User.Identity?.Name, "CHAT_DELETE_CONVERSATION_ALL",
                    $"Conversación eliminada para todos en OT {result.OTNumber}",
                    HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            }
            else
            {
                await _auditService.LogAsync(
                    User.Identity?.Name, User.Identity?.Name, "CHAT_DELETE_CONVERSATION_SELF",
                    $"Conversación eliminada para usuario {User.Identity?.Name} en OT {result.OTNumber}",
                    HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            }

            return Ok(new { deletedForAll = result.DeletedForAll, id = result.Id });
        }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    private string GetUploadsRoot()
    {
        var webRoot = string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;
        return Path.Combine(webRoot, "uploads");
    }

    public sealed class CreateConversationFromOtRequest
    {
        public string OTNumber { get; set; } = string.Empty;
        public string? CreatedByDisplayName { get; set; }
    }

    public sealed class SendMessageRequest
    {
        public string Message { get; set; } = string.Empty;
        public string? SenderDisplayName { get; set; }
    }

    private static string BuildLastMessagePreview(ChatMessageDto msg)
    {
        var text = (msg.Message ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(text)) return text;
        if (!string.IsNullOrWhiteSpace(msg.AttachmentName)) return $"[Archivo] {msg.AttachmentName}";
        return "Nuevo mensaje";
    }
}