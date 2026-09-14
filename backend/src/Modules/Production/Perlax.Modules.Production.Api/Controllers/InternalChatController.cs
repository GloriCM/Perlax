using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Application.Chat;
using Perlax.Modules.Production.Api.Hubs;

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
        try
        {
            var rows = await _chat.GetConversationsAsync(GetCaller(), ct);
            return Ok(rows.Select(MapConversation));
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Sin acceso al chat interno." });
        }
    }

    [HttpGet("users/search")]
    public async Task<ActionResult<IEnumerable<object>>> SearchUsers([FromQuery] string? q, CancellationToken ct)
    {
        try
        {
            var rows = await _chat.SearchUsersAsync(GetCaller(), q ?? string.Empty, ct);
            return Ok(rows.Select(u => new
            {
                u.Username,
                u.DisplayName,
                u.Role,
                u.Area,
                areaLabel = ChatAccess.AreaDisplayName(u.Area)
            }));
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Sin acceso al chat interno." });
        }
    }

    [HttpGet("areas")]
    public async Task<ActionResult<IEnumerable<object>>> GetAreas(CancellationToken ct)
    {
        try
        {
            await _chat.EnsureAccessAsync(GetCaller(), ct);
            var caller = GetCaller();
            var isAdmin = ChatAccess.IsAdmin(caller.Role);
            var userArea = ChatAccess.NormalizeArea(caller.Area);
            var areas = ChatAccess.AreaKeys
                .Where(a => isAdmin || string.Equals(a, userArea, StringComparison.OrdinalIgnoreCase))
                .Select(a => new { key = a, label = ChatAccess.AreaDisplayName(a) });
            return Ok(areas);
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Sin acceso al chat interno." });
        }
    }

    [HttpPost("from-ot")]
    public async Task<ActionResult<object>> CreateOrGetConversationFromOt(
        [FromBody] CreateConversationFromOtRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _chat.CreateOrGetFromOtAsync(
                new CreateChatFromOtCommand(request.OTNumber, request.CreatedByDisplayName), GetCaller(), ct);

            if (result.WasCreated)
            {
                await BroadcastUpsertAsync(result.Id, result.Title, result.CreatedByDisplayName, "Conversación creada.", DateTime.UtcNow, ct);
                await _auditService.LogAsync(
                    User.Identity?.Name, User.Identity?.Name, "CHAT_CREATE_CONVERSATION",
                    $"Se creó chat interno para OP {result.OTNumber}",
                    HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            }

            return Ok(MapSummary(result));
        }
        catch (UnauthorizedAccessException) { return StatusCode(StatusCodes.Status403Forbidden, new { message = "Sin acceso al chat interno." }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("conversations/direct")]
    public async Task<ActionResult<object>> CreateOrGetDirect(
        [FromBody] CreateDirectConversationRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _chat.CreateOrGetDirectAsync(
                new CreateDirectChatCommand(request.PeerUsername, request.CreatedByDisplayName), GetCaller(), ct);

            if (result.WasCreated)
            {
                await BroadcastUpsertAsync(result.Id, result.Title, result.CreatedByDisplayName, "Conversación directa creada.", DateTime.UtcNow, ct);
            }

            return Ok(MapSummary(result));
        }
        catch (UnauthorizedAccessException) { return StatusCode(StatusCodes.Status403Forbidden, new { message = "Sin acceso al chat interno." }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpPost("conversations/area/{areaKey}")]
    public async Task<ActionResult<object>> CreateOrGetArea(string areaKey, CancellationToken ct)
    {
        try
        {
            var result = await _chat.CreateOrGetAreaAsync(
                new CreateAreaChatCommand(areaKey, GetCaller().DisplayName), GetCaller(), ct);
            return Ok(MapSummary(result));
        }
        catch (UnauthorizedAccessException) { return StatusCode(StatusCodes.Status403Forbidden, new { message = "Sin acceso al chat interno." }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpGet("conversations/{conversationId:guid}/messages")]
    public async Task<ActionResult<IEnumerable<object>>> GetMessages(Guid conversationId, CancellationToken ct)
    {
        try
        {
            var rows = await _chat.GetMessagesAsync(conversationId, GetCaller(), GetUploadsRoot(), ct);
            return Ok(rows.Select(MapMessage));
        }
        catch (UnauthorizedAccessException) { return StatusCode(StatusCodes.Status403Forbidden, new { message = "Sin acceso al chat interno." }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
    }

    [HttpPost("conversations/{conversationId:guid}/messages")]
    public async Task<ActionResult<object>> SendMessage(
        Guid conversationId, [FromBody] SendMessageRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _chat.SendMessageAsync(
                conversationId,
                new SendChatMessageCommand(request.Message, request.SenderDisplayName),
                GetCaller(), ct);

            var outbound = MapMessage(result.Message);
            await _chatHub.Clients.Group($"conversation:{conversationId}").SendAsync("MessageReceived", outbound, ct);
            await BroadcastUpsertAsync(
                conversationId, result.Title, result.CreatedByDisplayName, result.LastMessagePreview, result.Message.SentAt, ct,
                result.ConversationType, result.AreaKey, result.OTNumber);

            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name, "CHAT_SEND_MESSAGE",
                $"Mensaje enviado en chat {result.Title}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

            return Ok(outbound);
        }
        catch (UnauthorizedAccessException) { return StatusCode(StatusCodes.Status403Forbidden, new { message = "Sin acceso al chat interno." }); }
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

            var result = await _chat.SendAttachmentsAsync(
                conversationId, message, senderDisplayName, GetCaller(), GetUploadsRoot(), uploadFiles, cancellationToken);

            foreach (var msg in result.Messages)
            {
                await _chatHub.Clients.Group($"conversation:{conversationId}")
                    .SendAsync("MessageReceived", MapMessage(msg), cancellationToken);
            }

            var last = result.Messages.OrderByDescending(x => x.SentAt).First();
            await BroadcastUpsertAsync(
                result.ConversationId, result.Title, result.CreatedByDisplayName, BuildLastMessagePreview(last),
                result.UpdatedAt, cancellationToken, result.ConversationType, result.AreaKey, result.OTNumber);

            await _auditService.LogAsync(
                User.Identity?.Name, User.Identity?.Name, "CHAT_SEND_ATTACHMENT",
                $"Adjuntos enviados en chat {result.Title}: {result.Messages.Count}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

            return Ok(result.Messages.Select(MapMessage));
        }
        catch (UnauthorizedAccessException) { return StatusCode(StatusCodes.Status403Forbidden, new { message = "Sin acceso al chat interno." }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    [HttpDelete("conversations/{conversationId:guid}/my-view")]
    public async Task<ActionResult<object>> DeleteConversationForCurrentUser(
        Guid conversationId, CancellationToken cancellationToken)
    {
        try
        {
            var result = await _chat.DeleteForCurrentUserAsync(
                conversationId, GetCaller(), GetUploadsRoot(), cancellationToken);

            if (result.DeletedForAll)
            {
                await _chatHub.Clients.All.SendAsync("ConversationDeleted", new { id = conversationId }, cancellationToken);
                await _auditService.LogAsync(
                    User.Identity?.Name, User.Identity?.Name, "CHAT_DELETE_CONVERSATION_ALL",
                    $"Conversación eliminada para todos: {result.Title}",
                    HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            }
            else
            {
                await _auditService.LogAsync(
                    User.Identity?.Name, User.Identity?.Name, "CHAT_DELETE_CONVERSATION_SELF",
                    $"Conversación eliminada para usuario {User.Identity?.Name}: {result.Title}",
                    HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");
            }

            return Ok(new { deletedForAll = result.DeletedForAll, id = result.Id });
        }
        catch (UnauthorizedAccessException) { return StatusCode(StatusCodes.Status403Forbidden, new { message = "Sin acceso al chat interno." }); }
        catch (KeyNotFoundException ex) { return NotFound(new { message = ex.Message }); }
        catch (InvalidOperationException ex) { return BadRequest(new { message = ex.Message }); }
    }

    private ChatCallerContext GetCaller()
    {
        var username = User.Identity?.Name
            ?? User.FindFirstValue(ClaimTypes.Name)
            ?? User.FindFirstValue("unique_name")
            ?? "Sistema";
        var full = string.Join(' ', new[]
        {
            User.FindFirstValue(ClaimTypes.GivenName) ?? User.FindFirstValue("given_name"),
            User.FindFirstValue(ClaimTypes.Surname) ?? User.FindFirstValue("family_name")
        }.Where(s => !string.IsNullOrWhiteSpace(s))).Trim();
        var role = User.FindFirstValue(ClaimTypes.Role) ?? User.FindFirstValue("role") ?? string.Empty;
        var area = User.FindFirstValue("area");
        return new ChatCallerContext(username, string.IsNullOrWhiteSpace(full) ? username : full, role, area);
    }

    private string GetUploadsRoot()
    {
        var webRoot = string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;
        return Path.Combine(webRoot, "uploads");
    }

    private async Task BroadcastUpsertAsync(
        Guid id,
        string title,
        string createdBy,
        string lastMessage,
        DateTime updatedAt,
        CancellationToken ct,
        string? conversationType = null,
        string? areaKey = null,
        string? otNumber = null)
    {
        await _chatHub.Clients.All.SendAsync("ConversationUpserted", new
        {
            id,
            title,
            createdBy,
            lastMessage,
            updatedAt,
            conversationType,
            areaKey,
            otNumber
        }, ct);
    }

    private static object MapConversation(ChatConversationListItemDto c) => new
    {
        c.Id,
        c.ConversationType,
        c.AreaKey,
        areaLabel = ChatAccess.AreaDisplayName(c.AreaKey),
        c.OTNumber,
        c.Title,
        c.CreatedByDisplayName,
        c.CreatedByUsername,
        c.CreatedAt,
        c.UpdatedAt,
        c.LastMessage,
        c.LastMessageAt,
        c.PeerUsername,
        c.PeerDisplayName
    };

    private static object MapSummary(ChatConversationSummaryDto result) => new
    {
        result.Id,
        result.ConversationType,
        result.AreaKey,
        result.OTNumber,
        result.Title,
        result.CreatedByDisplayName,
        result.CreatedByUsername
    };

    private static object MapMessage(ChatMessageDto m) => new
    {
        id = m.Id,
        conversationId = m.ConversationId,
        senderUsername = m.SenderUsername,
        senderDisplayName = m.SenderDisplayName,
        message = m.Message,
        attachmentUrl = m.AttachmentUrl,
        attachmentName = m.AttachmentName,
        attachmentContentType = m.AttachmentContentType,
        sentAt = m.SentAt
    };

    public sealed class CreateConversationFromOtRequest
    {
        public string OTNumber { get; set; } = string.Empty;
        public string? CreatedByDisplayName { get; set; }
    }

    public sealed class CreateDirectConversationRequest
    {
        public string PeerUsername { get; set; } = string.Empty;
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
