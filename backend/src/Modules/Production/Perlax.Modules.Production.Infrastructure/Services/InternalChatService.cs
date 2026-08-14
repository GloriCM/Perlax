using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Perlax.Modules.Production.Application.Chat;
using Perlax.Modules.Production.Domain.Entities;
using Perlax.Modules.Production.Infrastructure.Persistence;

namespace Perlax.Modules.Production.Infrastructure.Services;

public sealed class InternalChatService : IInternalChatService
{
    private static readonly HashSet<string> AllowedAttachmentExtensions = new(StringComparer.OrdinalIgnoreCase)
    {
        ".pdf", ".jpg", ".jpeg", ".png", ".webp", ".gif"
    };

    private static readonly HashSet<string> AllowedAttachmentMimeTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"
    };

    private readonly ProductionDbContext _db;

    public InternalChatService(ProductionDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<ChatConversationListItemDto>> GetConversationsAsync(string currentUsername, CancellationToken ct = default)
    {
        var normalizedUser = NormalizeUser(currentUsername);
        var conversations = await _db.InternalChatConversations
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
                    .Select(m => (DateTime?)m.SentAt)
                    .FirstOrDefault()
            })
            .ToListAsync(ct);

        return conversations
            .Where(c => !IsConversationDeletedForUser(c.DeletedForUsersJson, normalizedUser))
            .Select(c => new ChatConversationListItemDto(
                c.Id, c.OTNumber, c.Title, c.CreatedByDisplayName, c.CreatedByUsername,
                c.CreatedAt, c.UpdatedAt, c.LastMessage, c.LastMessageAt))
            .ToList();
    }

    public async Task<ChatConversationSummaryDto> CreateOrGetFromOtAsync(
        CreateChatFromOtCommand command, string username, CancellationToken ct = default)
    {
        var otNumber = (command.OTNumber ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(otNumber))
            throw new InvalidOperationException("OTNumber es obligatorio.");

        var normalizedOt = otNumber.ToUpperInvariant();
        var existing = await _db.InternalChatConversations.FirstOrDefaultAsync(c => c.OTNumber == normalizedOt, ct);
        if (existing != null)
        {
            UnhideConversationForUser(existing, username);
            await _db.SaveChangesAsync(ct);
            return new ChatConversationSummaryDto(
                existing.Id, existing.OTNumber, existing.Title,
                existing.CreatedByDisplayName, existing.CreatedByUsername, false);
        }

        var displayName = string.IsNullOrWhiteSpace(command.CreatedByDisplayName) ? username : command.CreatedByDisplayName.Trim();
        var productionOrderId = await _db.ProductionOrders.AsNoTracking()
            .Where(o => o.OTNumber == normalizedOt || o.OTNumber == otNumber)
            .Select(o => (Guid?)o.Id)
            .FirstOrDefaultAsync(ct);

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

        _db.InternalChatConversations.Add(conversation);
        await _db.SaveChangesAsync(ct);

        return new ChatConversationSummaryDto(
            conversation.Id, conversation.OTNumber, conversation.Title,
            conversation.CreatedByDisplayName, conversation.CreatedByUsername, true);
    }

    public async Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(
        Guid conversationId, string currentUsername, string uploadsRoot, CancellationToken ct = default)
    {
        var conversation = await _db.InternalChatConversations.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct)
            ?? throw new KeyNotFoundException("Conversación no encontrada.");

        if (IsConversationDeletedForUser(conversation.DeletedForUsersJson, NormalizeUser(currentUsername)))
            throw new KeyNotFoundException("Conversación no disponible.");

        var rows = await _db.InternalChatMessages.AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.SentAt)
            .ToListAsync(ct);

        return rows.Select(m => new ChatMessageDto(
            m.Id, m.ConversationId, m.SenderUsername, m.SenderDisplayName, m.Message,
            ResolveAttachmentUrl(m.AttachmentUrl, m.AttachmentName, uploadsRoot),
            m.AttachmentName, m.AttachmentContentType, m.SentAt)).ToList();
    }

    public async Task<(ChatMessageDto Message, string OTNumber, string CreatedByDisplayName, string LastMessagePreview)> SendMessageAsync(
        Guid conversationId, SendChatMessageCommand command, string username, CancellationToken ct = default)
    {
        var messageText = (command.Message ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(messageText))
            throw new InvalidOperationException("El mensaje no puede estar vacío.");
        if (messageText.Length > 4000)
            throw new InvalidOperationException("El mensaje no puede superar 4000 caracteres.");

        var conversation = await _db.InternalChatConversations.FirstOrDefaultAsync(c => c.Id == conversationId, ct)
            ?? throw new KeyNotFoundException("Conversación no encontrada.");
        UnhideConversationForUser(conversation, username);

        var senderDisplayName = string.IsNullOrWhiteSpace(command.SenderDisplayName) ? username : command.SenderDisplayName.Trim();
        var msg = new InternalChatMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            SenderUsername = username,
            SenderDisplayName = senderDisplayName,
            Message = messageText,
            SentAt = DateTime.UtcNow
        };

        conversation.UpdatedAt = msg.SentAt;
        _db.InternalChatMessages.Add(msg);
        await _db.SaveChangesAsync(ct);

        var dto = new ChatMessageDto(
            msg.Id, msg.ConversationId, msg.SenderUsername, msg.SenderDisplayName, msg.Message,
            msg.AttachmentUrl, msg.AttachmentName, msg.AttachmentContentType, msg.SentAt);

        return (dto, conversation.OTNumber, conversation.CreatedByDisplayName, BuildConversationLastMessage(msg));
    }

    public async Task<SendChatAttachmentsResultDto> SendAttachmentsAsync(
        Guid conversationId,
        string? message,
        string? senderDisplayName,
        string username,
        string uploadsRoot,
        IReadOnlyList<ChatUploadFileDto> files,
        CancellationToken ct = default)
    {
        if (files == null || files.Count == 0)
            throw new InvalidOperationException("Debe enviar al menos un archivo válido.");
        if (files.Count > 10)
            throw new InvalidOperationException("Solo se permiten hasta 10 adjuntos por envío.");

        var conversation = await _db.InternalChatConversations.FirstOrDefaultAsync(c => c.Id == conversationId, ct)
            ?? throw new KeyNotFoundException("Conversación no encontrada.");
        UnhideConversationForUser(conversation, username);

        var senderName = string.IsNullOrWhiteSpace(senderDisplayName) ? username : senderDisplayName.Trim();
        var relativeDir = Path.Combine("chat", conversationId.ToString("N"));
        var physicalDir = Path.Combine(uploadsRoot, relativeDir);
        Directory.CreateDirectory(physicalDir);
        var finalText = (message ?? string.Empty).Trim();
        var createdMessages = new List<InternalChatMessage>();

        for (var i = 0; i < files.Count; i++)
        {
            var currentFile = files[i];
            if (currentFile.Length == 0) continue;
            if (currentFile.Length > 26_214_400)
                throw new InvalidOperationException($"El archivo '{currentFile.FileName}' supera el máximo de 25 MB.");
            if (!TryValidateAttachment(currentFile, out var validationError))
                throw new InvalidOperationException($"{validationError} Archivo: {currentFile.FileName}");

            var safeOriginal = SanitizeFileName(currentFile.FileName);
            var ext = Path.GetExtension(safeOriginal);
            var storedFileName = $"{conversationId:N}_{DateTime.UtcNow:yyyyMMdd_HHmmss}_{Guid.NewGuid():N}{ext}";
            var physicalPath = Path.Combine(physicalDir, storedFileName);
            await using (var stream = File.Create(physicalPath))
            {
                await currentFile.Content.CopyToAsync(stream, ct);
            }

            var publicUrl = $"/uploads/{relativeDir.Replace('\\', '/')}/{storedFileName}";
            var msg = new InternalChatMessage
            {
                Id = Guid.NewGuid(),
                ConversationId = conversationId,
                SenderUsername = username,
                SenderDisplayName = senderName,
                Message = i == 0 ? finalText : string.Empty,
                AttachmentUrl = publicUrl,
                AttachmentName = safeOriginal,
                AttachmentContentType = currentFile.ContentType,
                SentAt = DateTime.UtcNow
            };
            _db.InternalChatMessages.Add(msg);
            createdMessages.Add(msg);
        }

        if (createdMessages.Count == 0)
            throw new InvalidOperationException("Debe enviar al menos un archivo válido.");

        conversation.UpdatedAt = createdMessages.MaxBy(m => m.SentAt)?.SentAt ?? DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return new SendChatAttachmentsResultDto(
            conversation.Id,
            conversation.OTNumber,
            conversation.CreatedByDisplayName,
            conversation.UpdatedAt,
            createdMessages.Select(m => new ChatMessageDto(
                m.Id, m.ConversationId, m.SenderUsername, m.SenderDisplayName, m.Message,
                m.AttachmentUrl, m.AttachmentName, m.AttachmentContentType, m.SentAt)).ToList());
    }

    public async Task<DeleteChatForUserResultDto> DeleteForCurrentUserAsync(
        Guid conversationId, string currentUsername, string uploadsRoot, CancellationToken ct = default)
    {
        var normalized = NormalizeUser(currentUsername);
        if (string.IsNullOrWhiteSpace(normalized))
            throw new InvalidOperationException("Usuario no válido.");

        var conversation = await _db.InternalChatConversations.FirstOrDefaultAsync(c => c.Id == conversationId, ct)
            ?? throw new KeyNotFoundException("Conversación no encontrada.");

        var deletedUsers = ParseDeletedUsers(conversation.DeletedForUsersJson);
        deletedUsers.Add(normalized);

        var participants = await _db.InternalChatMessages.AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .Select(m => m.SenderUsername)
            .ToListAsync(ct);
        participants.Add(conversation.CreatedByUsername);

        var normalizedParticipants = participants
            .Select(NormalizeUser)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var everyoneDeleted = normalizedParticipants.Count > 0 &&
                              normalizedParticipants.All(x => deletedUsers.Contains(x));

        var otNumber = conversation.OTNumber;
        if (everyoneDeleted)
        {
            var relatedMessages = await _db.InternalChatMessages
                .Where(m => m.ConversationId == conversationId)
                .ToListAsync(ct);
            _db.InternalChatMessages.RemoveRange(relatedMessages);
            _db.InternalChatConversations.Remove(conversation);
            await _db.SaveChangesAsync(ct);
            TryDeleteConversationUploadDirectory(uploadsRoot, conversationId);
            return new DeleteChatForUserResultDto(true, conversationId, otNumber);
        }

        conversation.DeletedForUsersJson = SerializeDeletedUsers(deletedUsers);
        await _db.SaveChangesAsync(ct);
        return new DeleteChatForUserResultDto(false, conversationId, otNumber);
    }

    private static string BuildConversationLastMessage(InternalChatMessage msg)
    {
        var text = (msg.Message ?? string.Empty).Trim();
        if (!string.IsNullOrWhiteSpace(text)) return text;
        if (!string.IsNullOrWhiteSpace(msg.AttachmentName)) return $"[Archivo] {msg.AttachmentName}";
        return "Nuevo mensaje";
    }

    public static string BuildLastMessagePreview(ChatMessageDto msg)
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

    private static bool TryValidateAttachment(ChatUploadFileDto file, out string error)
    {
        error = string.Empty;
        var extension = Path.GetExtension(file.FileName);
        if (!AllowedAttachmentExtensions.Contains(extension))
        {
            error = "Tipo de archivo no permitido. Solo PDF e imágenes (JPG, PNG, WEBP, GIF).";
            return false;
        }

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

    private static bool HasValidFileSignature(ChatUploadFileDto file, string extension)
    {
        Span<byte> header = stackalloc byte[1024];
        var stream = file.Content;
        if (stream.CanSeek) stream.Position = 0;
        var read = stream.Read(header);
        if (stream.CanSeek) stream.Position = 0;
        if (read < 4) return false;

        return extension.ToLowerInvariant() switch
        {
            ".pdf" => HasPdfSignatureInFirstKb(header[..read]),
            ".jpg" or ".jpeg" => read >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF,
            ".png" => read >= 8 &&
                      header[0] == 0x89 && header[1] == 0x50 && header[2] == 0x4E && header[3] == 0x47 &&
                      header[4] == 0x0D && header[5] == 0x0A && header[6] == 0x1A && header[7] == 0x0A,
            ".gif" => read >= 6 &&
                      header[0] == 0x47 && header[1] == 0x49 && header[2] == 0x46 &&
                      header[3] == 0x38 && (header[4] == 0x37 || header[4] == 0x39) && header[5] == 0x61,
            ".webp" => read >= 12 &&
                       header[0] == 0x52 && header[1] == 0x49 && header[2] == 0x46 && header[3] == 0x46 &&
                       header[8] == 0x57 && header[9] == 0x45 && header[10] == 0x42 && header[11] == 0x50,
            _ => false
        };
    }

    private static bool HasPdfSignatureInFirstKb(ReadOnlySpan<byte> data)
    {
        for (var i = 0; i <= data.Length - 4; i++)
        {
            if (data[i] == 0x25 && data[i + 1] == 0x50 && data[i + 2] == 0x44 && data[i + 3] == 0x46)
                return true;
        }
        return false;
    }

    private static string? ResolveAttachmentUrl(string? attachmentUrl, string? attachmentName, string uploadsRoot)
    {
        if (string.IsNullOrWhiteSpace(attachmentUrl))
            return attachmentUrl;

        var normalized = attachmentUrl.Replace('\\', '/');
        var relative = normalized.StartsWith("/uploads/", StringComparison.OrdinalIgnoreCase)
            ? normalized["/uploads/".Length..]
            : normalized.TrimStart('/');
        var physicalCurrent = Path.Combine(uploadsRoot, relative.Replace('/', Path.DirectorySeparatorChar));
        if (File.Exists(physicalCurrent))
            return normalized.StartsWith("/") ? normalized : "/" + normalized;

        if (string.IsNullOrWhiteSpace(attachmentName))
            return normalized.StartsWith("/") ? normalized : "/" + normalized;

        var match = Regex.Match(attachmentName, @"^([a-fA-F0-9]{32})_");
        if (!match.Success)
            return normalized.StartsWith("/") ? normalized : "/" + normalized;

        var inferredConversationFolder = match.Groups[1].Value.ToLowerInvariant();
        var inferredRelative = $"chat/{inferredConversationFolder}/{attachmentName}";
        var physicalInferred = Path.Combine(uploadsRoot, inferredRelative.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(physicalInferred))
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
        return ParseDeletedUsers(deletedForUsersJson).Contains(currentUsername);
    }

    private static void UnhideConversationForUser(InternalChatConversation conversation, string? username)
    {
        var normalized = NormalizeUser(username);
        if (string.IsNullOrWhiteSpace(normalized)) return;
        var deletedUsers = ParseDeletedUsers(conversation.DeletedForUsersJson);
        if (!deletedUsers.Remove(normalized)) return;
        conversation.DeletedForUsersJson = SerializeDeletedUsers(deletedUsers);
    }

    private static void TryDeleteConversationUploadDirectory(string uploadsRoot, Guid conversationId)
    {
        try
        {
            var conversationUploads = Path.Combine(uploadsRoot, "chat", conversationId.ToString("N"));
            if (Directory.Exists(conversationUploads))
                Directory.Delete(conversationUploads, true);
        }
        catch
        {
            // No bloqueamos la operación principal por fallo al borrar archivos.
        }
    }
}