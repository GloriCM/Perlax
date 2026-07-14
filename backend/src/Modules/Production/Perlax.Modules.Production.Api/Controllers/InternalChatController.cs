using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using System.Text;
using System.Text.RegularExpressions;
using System.Text.Json;
using Perlax.Modules.Audit.Application.Abstractions;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;
using Perlax.Modules.Production.Api.Hubs;

namespace Perlax.Modules.Production.Api.Controllers;

[ApiController]
[Authorize]
[Route("api/production/internal-chat")]
public class InternalChatController : ControllerBase
{
    private static readonly HashSet<string> AllowedAttachmentExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"
    };

    private static readonly HashSet<string> AllowedAttachmentMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"
    };

    private readonly ProductionDbContext _context;
    private readonly IAuditService _auditService;
    private readonly IHubContext<InternalChatHub> _chatHub;
    private readonly IWebHostEnvironment _environment;

    public InternalChatController(
        ProductionDbContext context,
        IAuditService auditService,
        IHubContext<InternalChatHub> chatHub,
        IWebHostEnvironment environment)
    {
        _context = context;
        _auditService = auditService;
        _chatHub = chatHub;
        _environment = environment;
    }

    [HttpGet("conversations")]
    public async Task<ActionResult<IEnumerable<object>>> GetConversations()
    {
        var currentUsername = NormalizeUser(User.Identity?.Name);
        var conversations = await _context.InternalChatConversations
            .AsNoTracking()
            .OrderByDescending(c => c.UpdatedAt)
            .Select(c => new
            {
                c.Id,
                c.OTNumber,
                c.Title,
                c.CreatedByDisplayName,
                c.CreatedByUsername,
                c.DeletedForUsersJson,
                c.CreatedAt,
                c.UpdatedAt,
                LastMessage = c.Messages
                    .OrderByDescending(m => m.SentAt)
                    .Select(m =>
                        m.Message != null && m.Message != ""
                            ? m.Message
                            : (m.AttachmentName != null && m.AttachmentName != ""
                                ? "[Archivo] " + m.AttachmentName
                                : "Sin mensajes aún."))
                    .FirstOrDefault(),
                LastMessageAt = c.Messages
                    .OrderByDescending(m => m.SentAt)
                    .Select(m => m.SentAt)
                    .FirstOrDefault()
            })
            .ToListAsync();

        var visible = conversations
            .Where(c => !IsConversationDeletedForUser(c.DeletedForUsersJson, currentUsername))
            .ToList();

        return Ok(visible);
    }

    [HttpPost("from-ot")]
    public async Task<ActionResult<object>> CreateOrGetConversationFromOt([FromBody] CreateConversationFromOtRequest request)
    {
        var otNumber = (request.OTNumber ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(otNumber))
            return BadRequest(new { message = "OTNumber es obligatorio." });

        var normalizedOt = otNumber.ToUpperInvariant();
        var existing = await _context.InternalChatConversations
            .FirstOrDefaultAsync(c => c.OTNumber == normalizedOt);

        if (existing != null)
        {
            // Si el usuario ya lo había borrado en su vista, al reabrir se restaura para ese usuario.
            UnhideConversationForUser(existing, User.Identity?.Name);
            await _context.SaveChangesAsync();
            return Ok(new
            {
                existing.Id,
                existing.OTNumber,
                existing.Title,
                existing.CreatedByDisplayName,
                existing.CreatedByUsername
            });
        }

        var username = User.Identity?.Name ?? "Sistema";
        var displayName = string.IsNullOrWhiteSpace(request.CreatedByDisplayName)
            ? username
            : request.CreatedByDisplayName.Trim();

        var productionOrderId = await _context.ProductionOrders
            .AsNoTracking()
            .Where(o => o.OTNumber == normalizedOt || o.OTNumber == otNumber)
            .Select(o => (Guid?)o.Id)
            .FirstOrDefaultAsync();

        var conversation = new InternalChatConversation
        {
            Id = Guid.NewGuid(),
            OTNumber = normalizedOt,
            Title = $"OT {normalizedOt}",
            ProductionOrderId = productionOrderId,
            CreatedByUsername = username,
            CreatedByDisplayName = displayName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.InternalChatConversations.Add(conversation);
        await _context.SaveChangesAsync();

        await _chatHub.Clients.All.SendAsync("ConversationUpserted", new
        {
            id = conversation.Id,
            title = conversation.Title,
            createdBy = conversation.CreatedByDisplayName,
            lastMessage = "Conversación creada.",
            updatedAt = conversation.UpdatedAt
        });

        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            "CHAT_CREATE_CONVERSATION",
            $"Se creó chat interno para OT {normalizedOt}",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        return Ok(new
        {
            conversation.Id,
            conversation.OTNumber,
            conversation.Title,
            conversation.CreatedByDisplayName,
            conversation.CreatedByUsername
        });
    }

    [HttpGet("conversations/{conversationId:guid}/messages")]
    public async Task<ActionResult<IEnumerable<object>>> GetMessages(Guid conversationId)
    {
        var conversation = await _context.InternalChatConversations
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == conversationId);
        if (conversation == null)
            return NotFound(new { message = "Conversación no encontrada." });
        if (IsConversationDeletedForUser(conversation.DeletedForUsersJson, NormalizeUser(User.Identity?.Name)))
            return NotFound(new { message = "Conversación no disponible." });

        var rows = await _context.InternalChatMessages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.SentAt)
            .ToListAsync();

        var messages = rows.Select(m => new
        {
            m.Id,
            m.ConversationId,
            m.SenderUsername,
            m.SenderDisplayName,
            m.Message,
            AttachmentUrl = ResolveAttachmentUrl(m.AttachmentUrl, m.AttachmentName),
            m.AttachmentName,
            m.AttachmentContentType,
            m.SentAt
        }).ToList();

        return Ok(messages);
    }

    [HttpPost("conversations/{conversationId:guid}/messages")]
    public async Task<ActionResult<object>> SendMessage(Guid conversationId, [FromBody] SendMessageRequest request)
    {
        var messageText = (request.Message ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(messageText))
            return BadRequest(new { message = "El mensaje no puede estar vacío." });
        if (messageText.Length > 4000)
            return BadRequest(new { message = "El mensaje no puede superar 4000 caracteres." });

        var conversation = await _context.InternalChatConversations
            .FirstOrDefaultAsync(c => c.Id == conversationId);
        if (conversation == null)
            return NotFound(new { message = "Conversación no encontrada." });
        UnhideConversationForUser(conversation, User.Identity?.Name);

        var senderUsername = User.Identity?.Name ?? "Sistema";
        var senderDisplayName = string.IsNullOrWhiteSpace(request.SenderDisplayName)
            ? senderUsername
            : request.SenderDisplayName.Trim();

        var msg = new InternalChatMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            SenderUsername = senderUsername,
            SenderDisplayName = senderDisplayName,
            Message = messageText,
            SentAt = DateTime.UtcNow
        };

        conversation.UpdatedAt = msg.SentAt;
        _context.InternalChatMessages.Add(msg);
        await _context.SaveChangesAsync();

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

        await _chatHub.Clients.Group($"conversation:{conversationId}")
            .SendAsync("MessageReceived", outbound);

        await _chatHub.Clients.All.SendAsync("ConversationUpserted", new
        {
            id = conversation.Id,
            title = conversation.Title,
            createdBy = conversation.CreatedByDisplayName,
            lastMessage = BuildConversationLastMessage(msg),
            updatedAt = msg.SentAt
        });

        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            "CHAT_SEND_MESSAGE",
            $"Mensaje enviado en chat OT {conversation.OTNumber}",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        return Ok(new
        {
            msg.Id,
            msg.ConversationId,
            msg.SenderUsername,
            msg.SenderDisplayName,
            msg.Message,
            msg.AttachmentUrl,
            msg.AttachmentName,
            msg.AttachmentContentType,
            msg.SentAt
        });
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
        var attachments = new List<IFormFile>();
        if (files is { Count: > 0 })
            attachments.AddRange(files.Where(f => f is not null));
        if (file is not null)
            attachments.Add(file);
        attachments = attachments.Where(f => f.Length > 0).ToList();
        if (attachments.Count == 0)
            return BadRequest(new { message = "Debe enviar al menos un archivo válido." });
        if (attachments.Count > 10)
            return BadRequest(new { message = "Solo se permiten hasta 10 adjuntos por envío." });

        var conversation = await _context.InternalChatConversations.FirstOrDefaultAsync(c => c.Id == conversationId, cancellationToken);
        if (conversation == null)
            return NotFound(new { message = "Conversación no encontrada." });
        UnhideConversationForUser(conversation, User.Identity?.Name);

        var senderUsername = User.Identity?.Name ?? "Sistema";
        var senderName = string.IsNullOrWhiteSpace(senderDisplayName) ? senderUsername : senderDisplayName.Trim();

        var relativeDir = Path.Combine("chat", conversationId.ToString("N"));
        var webRoot = string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;
        var physicalDir = Path.Combine(webRoot, "uploads", relativeDir);
        Directory.CreateDirectory(physicalDir);
        var finalText = (message ?? string.Empty).Trim();
        var createdMessages = new List<InternalChatMessage>();

        for (var i = 0; i < attachments.Count; i++)
        {
            var currentFile = attachments[i];
            if (currentFile.Length > 26_214_400)
                return BadRequest(new { message = $"El archivo '{currentFile.FileName}' supera el máximo de 25 MB." });
            if (!TryValidateAttachment(currentFile, out var validationError))
                return BadRequest(new { message = $"{validationError} Archivo: {currentFile.FileName}" });

            var safeOriginal = SanitizeFileName(currentFile.FileName);
            var ext = Path.GetExtension(safeOriginal);
            var storedFileName = $"{conversationId:N}_{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid():N}{ext}";
            var physicalPath = Path.Combine(physicalDir, storedFileName);
            await using (var stream = System.IO.File.Create(physicalPath))
            {
                await currentFile.CopyToAsync(stream, cancellationToken);
            }

            var publicUrl = $"/uploads/{relativeDir.Replace('\\', '/')}/{storedFileName}";
            var msg = new InternalChatMessage
            {
                Id = Guid.NewGuid(),
                ConversationId = conversationId,
                SenderUsername = senderUsername,
                SenderDisplayName = senderName,
                Message = i == 0 ? finalText : string.Empty,
                AttachmentUrl = publicUrl,
                AttachmentName = safeOriginal,
                AttachmentContentType = currentFile.ContentType,
                SentAt = DateTime.UtcNow
            };
            _context.InternalChatMessages.Add(msg);
            createdMessages.Add(msg);
        }

        conversation.UpdatedAt = createdMessages.MaxBy(m => m.SentAt)?.SentAt ?? DateTime.UtcNow;
        await _context.SaveChangesAsync(cancellationToken);

        foreach (var msg in createdMessages)
        {
            var outboundMessage = new
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
            await _chatHub.Clients.Group($"conversation:{conversationId}")
                .SendAsync("MessageReceived", outboundMessage, cancellationToken);
        }

        var lastCreated = createdMessages.OrderByDescending(x => x.SentAt).First();

        await _chatHub.Clients.All.SendAsync("ConversationUpserted", new
        {
            id = conversation.Id,
            title = conversation.Title,
            createdBy = conversation.CreatedByDisplayName,
            lastMessage = BuildConversationLastMessage(lastCreated),
            updatedAt = conversation.UpdatedAt
        }, cancellationToken);

        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            "CHAT_SEND_ATTACHMENT",
            $"Adjuntos enviados en chat OT {conversation.OTNumber}: {createdMessages.Count}",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        return Ok(createdMessages.Select(msg => new
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

    [HttpDelete("conversations/{conversationId:guid}/my-view")]
    public async Task<ActionResult<object>> DeleteConversationForCurrentUser(Guid conversationId, CancellationToken cancellationToken)
    {
        var currentUsername = NormalizeUser(User.Identity?.Name);
        if (string.IsNullOrWhiteSpace(currentUsername))
            return BadRequest(new { message = "Usuario no válido." });

        var conversation = await _context.InternalChatConversations
            .FirstOrDefaultAsync(c => c.Id == conversationId, cancellationToken);
        if (conversation == null)
            return NotFound(new { message = "Conversación no encontrada." });

        var deletedUsers = ParseDeletedUsers(conversation.DeletedForUsersJson);
        deletedUsers.Add(currentUsername);

        var participants = await _context.InternalChatMessages
            .AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .Select(m => m.SenderUsername)
            .ToListAsync(cancellationToken);
        participants.Add(conversation.CreatedByUsername);
        var normalizedParticipants = participants
            .Select(NormalizeUser)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var everyoneDeleted = normalizedParticipants.Count > 0 &&
                              normalizedParticipants.All(x => deletedUsers.Contains(x));

        if (everyoneDeleted)
        {
            var relatedMessages = await _context.InternalChatMessages
                .Where(m => m.ConversationId == conversationId)
                .ToListAsync(cancellationToken);
            _context.InternalChatMessages.RemoveRange(relatedMessages);
            _context.InternalChatConversations.Remove(conversation);
            await _context.SaveChangesAsync(cancellationToken);

            TryDeleteConversationUploadDirectory(conversationId);

            await _chatHub.Clients.All.SendAsync("ConversationDeleted", new { id = conversationId }, cancellationToken);
            await _auditService.LogAsync(
                User.Identity?.Name,
                User.Identity?.Name,
                "CHAT_DELETE_CONVERSATION_ALL",
                $"Conversación eliminada para todos en OT {conversation.OTNumber}",
                HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

            return Ok(new { deletedForAll = true, id = conversationId });
        }

        conversation.DeletedForUsersJson = SerializeDeletedUsers(deletedUsers);
        await _context.SaveChangesAsync(cancellationToken);

        await _auditService.LogAsync(
            User.Identity?.Name,
            User.Identity?.Name,
            "CHAT_DELETE_CONVERSATION_SELF",
            $"Conversación eliminada para usuario {currentUsername} en OT {conversation.OTNumber}",
            HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown");

        return Ok(new { deletedForAll = false, id = conversationId });
    }

    private static string BuildConversationLastMessage(InternalChatMessage msg)
    {
        var text = (msg.Message ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(text)) return text;
        if (!string.IsNullOrWhiteSpace(msg.AttachmentName)) return $"[Archivo] {msg.AttachmentName}";
        return "Nuevo mensaje";
    }

    private static string SanitizeFileName(string fileName)
    {
        var name = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(name)) return "archivo";
        foreach (var c in Path.GetInvalidFileNameChars())
            name = name.Replace(c, '_');
        return name.Length > 240 ? name[..240] : name;
    }

    private static bool TryValidateAttachment(IFormFile file, out string error)
    {
        error = string.Empty;
        var extension = Path.GetExtension(file.FileName);
        if (!AllowedAttachmentExtensions.Contains(extension))
        {
            error = "Tipo de archivo no permitido. Solo PDF e imágenes (JPG, PNG, WEBP, GIF).";
            return false;
        }

        // Por solicitud operativa, los PDFs se aceptan sin validaciones profundas de firma/contenido.
        // Esto evita falsos positivos con PDFs generados por herramientas externas.
        if (extension.Equals(".pdf", StringComparison.OrdinalIgnoreCase))
            return true;

        var contentType = (file.ContentType ?? string.Empty).Trim().ToLowerInvariant();
        var isGenericContentType = contentType is "" or "application/octet-stream" or "binary/octet-stream";
        if (!isGenericContentType && !AllowedAttachmentMimeTypes.Contains(contentType))
        {
            error = "Content-Type no permitido para adjuntos.";
            return false;
        }

        if (!HasValidFileSignature(file, extension))
        {
            error = "El archivo no coincide con su tipo declarado o está corrupto.";
            return false;
        }

        return true;
    }

    private static bool HasValidFileSignature(IFormFile file, string extension)
    {
        Span<byte> header = stackalloc byte[1024];
        using var stream = file.OpenReadStream();
        var read = stream.Read(header);
        if (read < 4) return false;

        return extension.ToLowerInvariant() switch
        {
            // Hay PDFs válidos que incluyen bytes de relleno/BOM antes de "%PDF".
            // Aceptamos si la firma aparece dentro del primer KB.
            ".pdf" => HasPdfSignatureInFirstKb(header[..read]),
            ".jpg" or ".jpeg" => read >= 3 &&
                                 header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            ".png" => read >= 8 &&
                      header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                      header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A,
            ".gif" => read >= 6 &&
                      header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 &&
                      header[3] == 0x38 && (header[4] == 0x37 || header[4] == 0x39) && header[5] == 0x61,
            ".webp" => read >= 12 &&
                       header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 && // RIFF
                       header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50, // WEBP
            _ => false
        };
    }

    private static bool HasPdfSignatureInFirstKb(ReadOnlySpan<byte> data)
    {
        for (var i = 0; i <= data.Length - 4; i++)
        {
            if (data[i] == 0x25 && data[i + 1] == 0x50 && data[i + 2] == 0x44 && data[i + 3] == 0x46)
                return true; // %PDF
        }
        return false;
    }

    private static bool ContainsSuspiciousPdfPayload(IFormFile file)
    {
        try
        {
            using var stream = file.OpenReadStream();
            var maxBytesToInspect = (int)Math.Min(stream.Length, 1_048_576); // 1MB
            var buffer = new byte[maxBytesToInspect];
            var totalRead = 0;
            while (totalRead < maxBytesToInspect)
            {
                var read = stream.Read(buffer, totalRead, maxBytesToInspect - totalRead);
                if (read <= 0) break;
                totalRead += read;
            }

            var text = Encoding.ASCII.GetString(buffer, 0, totalRead).ToLowerInvariant();
            return text.Contains("/javascript") ||
                   text.Contains("/openaction") ||
                   text.Contains("<script");
        }
        catch
        {
            return true;
        }
    }

    private string? ResolveAttachmentUrl(string? attachmentUrl, string? attachmentName)
    {
        if (string.IsNullOrWhiteSpace(attachmentUrl))
            return attachmentUrl;

        var webRootPath = string.IsNullOrWhiteSpace(_environment.WebRootPath)
            ? Path.Combine(_environment.ContentRootPath, "wwwroot")
            : _environment.WebRootPath;
        var uploadsRoot = Path.Combine(webRootPath, "uploads");

        var normalized = attachmentUrl.Replace('\\', '/');
        var relative = normalized.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase)
            ? normalized["/uploads/".Length..]
            : normalized.TrimStart('/');
        var physicalCurrent = Path.Combine(uploadsRoot, relative.Replace('/', Path.DirectorySeparatorChar));
        if (System.IO.File.Exists(physicalCurrent))
            return normalized.StartsWith("/") ? normalized : "/" + normalized;

        if (string.IsNullOrWhiteSpace(attachmentName))
            return normalized.StartsWith("/") ? normalized : "/" + normalized;

        var match = Regex.Match(attachmentName, @"^([a-fA-F0-9]{32})_");
        if (!match.Success)
            return normalized.StartsWith("/") ? normalized : "/" + normalized;

        var inferredConversationFolder = match.Groups[1].Value.ToLowerInvariant();
        var inferredRelative = $"chat/{inferredConversationFolder}/{attachmentName}";
        var physicalInferred = Path.Combine(uploadsRoot, inferredRelative.Replace('/', Path.DirectorySeparatorChar));
        if (!System.IO.File.Exists(physicalInferred))
            return normalized.StartsWith("/") ? normalized : "/" + normalized;

        return $"/uploads/{inferredRelative}";
    }

    private static string NormalizeUser(string? username)
        => (username ?? string.Empty).Trim().ToLowerInvariant();

    private static HashSet<string> ParseDeletedUsers(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var rows = JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
            return rows.Select(NormalizeUser)
                .Where(x => !string.IsNullOrWhiteSpace(x))
                .ToHashSet(StringComparer.OrdinalIgnoreCase);
        }
        catch
        {
            return new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        }
    }

    private static string SerializeDeletedUsers(HashSet<string> users)
    {
        var clean = users.Select(NormalizeUser)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        return JsonSerializer.Serialize(clean);
    }

    private static bool IsConversationDeletedForUser(string? deletedForUsersJson, string currentUsername)
    {
        if (string.IsNullOrWhiteSpace(currentUsername)) return false;
        var deletedUsers = ParseDeletedUsers(deletedForUsersJson);
        return deletedUsers.Contains(currentUsername);
    }

    private static void UnhideConversationForUser(InternalChatConversation conversation, string? username)
    {
        var normalized = NormalizeUser(username);
        if (string.IsNullOrWhiteSpace(normalized)) return;
        var deletedUsers = ParseDeletedUsers(conversation.DeletedForUsersJson);
        if (!deletedUsers.Remove(normalized)) return;
        conversation.DeletedForUsersJson = SerializeDeletedUsers(deletedUsers);
    }

    private void TryDeleteConversationUploadDirectory(Guid conversationId)
    {
        try
        {
            var webRootPath = string.IsNullOrWhiteSpace(_environment.WebRootPath)
                ? Path.Combine(_environment.ContentRootPath, "wwwroot")
                : _environment.WebRootPath;
            var conversationUploads = Path.Combine(webRootPath, "uploads", "chat", conversationId.ToString("N"));
            if (Directory.Exists(conversationUploads))
                Directory.Delete(conversationUploads, true);
        }
        catch
        {
            // No bloqueamos la operación principal por fallo al borrar archivos.
        }
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
}
