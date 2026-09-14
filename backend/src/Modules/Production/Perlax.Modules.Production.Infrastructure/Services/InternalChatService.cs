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
    private readonly IChatUserDirectory _users;

    public InternalChatService(ProductionDbContext db, IChatUserDirectory users)
    {
        _db = db;
        _users = users;
    }

    public async Task EnsureAccessAsync(ChatCallerContext caller, CancellationToken ct = default)
    {
        var info = await _users.FindByUsernameAsync(caller.Username, ct);
        if (info == null || !ChatAccess.IsEligible(info.Role, info.AssignedViewsCount))
            throw new UnauthorizedAccessException("El chat interno solo está disponible para Administradores, Administrativos y personal de Taller con vistas asignadas.");
    }

    public async Task<IReadOnlyList<ChatConversationListItemDto>> GetConversationsAsync(
        ChatCallerContext caller, CancellationToken ct = default)
    {
        await EnsureAccessAsync(caller, ct);
        await EnsureHomeChannelsAsync(caller, ct);

        var normalizedUser = NormalizeUser(caller.Username);
        var isAdmin = ChatAccess.IsAdmin(caller.Role);
        var isDesign = ChatAccess.IsDesignArea(caller.Area);
        var userArea = ChatAccess.NormalizeArea(caller.Area);

        var participantIds = await _db.InternalChatParticipants.AsNoTracking()
            .Where(p => p.Username == normalizedUser)
            .Select(p => p.ConversationId)
            .ToListAsync(ct);

        var conversations = await _db.InternalChatConversations
            .AsNoTracking()
            .OrderByDescending(c => c.UpdatedAt)
            .Select(c => new
            {
                c.Id,
                c.ConversationType,
                c.AreaKey,
                c.DirectPairKey,
                c.OTNumber,
                c.Title,
                c.CreatedByDisplayName,
                c.CreatedByUsername,
                c.DeletedForUsersJson,
                c.CreatedAt,
                c.UpdatedAt,
                Participants = c.Participants.Select(p => p.Username).ToList(),
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

        var visible = conversations.Where(c =>
        {
            if (IsConversationDeletedForUser(c.DeletedForUsersJson, normalizedUser))
                return false;

            if (participantIds.Contains(c.Id))
                return true;

            if (c.ConversationType == InternalChatConversationType.Area)
            {
                if (isAdmin) return true;
                return string.Equals(ChatAccess.NormalizeArea(c.AreaKey), userArea, StringComparison.OrdinalIgnoreCase);
            }

            if (c.ConversationType == InternalChatConversationType.OpThread)
                return isAdmin || isDesign;

            return false;
        }).ToList();

        // Auto-membership for visible area/op threads so ACL stays consistent.
        foreach (var row in visible.Where(c => !participantIds.Contains(c.Id)))
        {
            await EnsureParticipantAsync(row.Id, normalizedUser, ct);
        }
        if (_db.ChangeTracker.HasChanges())
            await _db.SaveChangesAsync(ct);

        var peerLookup = new Dictionary<string, ChatUserInfo>(StringComparer.OrdinalIgnoreCase);
        var peerUsernames = visible
            .Where(c => c.ConversationType == InternalChatConversationType.Direct)
            .SelectMany(c => c.Participants)
            .Where(u => !string.Equals(u, normalizedUser, StringComparison.OrdinalIgnoreCase))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        foreach (var peer in peerUsernames)
        {
            var info = await _users.FindByUsernameAsync(peer, ct);
            if (info != null) peerLookup[NormalizeUser(info.Username)] = info;
        }

        return visible.Select(c =>
        {
            string? peerUsername = null;
            string? peerDisplayName = null;
            var title = c.Title;
            if (c.ConversationType == InternalChatConversationType.Direct)
            {
                peerUsername = c.Participants
                    .FirstOrDefault(u => !string.Equals(u, normalizedUser, StringComparison.OrdinalIgnoreCase));
                if (peerUsername != null && peerLookup.TryGetValue(NormalizeUser(peerUsername), out var peerInfo))
                {
                    peerDisplayName = peerInfo.DisplayName;
                    title = peerInfo.DisplayName;
                }
                else if (!string.IsNullOrWhiteSpace(peerUsername))
                {
                    peerDisplayName = peerUsername;
                    title = peerUsername;
                }
            }

            return new ChatConversationListItemDto(
                c.Id,
                c.ConversationType.ToString(),
                c.AreaKey,
                c.OTNumber,
                title,
                c.CreatedByDisplayName,
                c.CreatedByUsername,
                c.CreatedAt,
                c.UpdatedAt,
                c.LastMessage,
                c.LastMessageAt,
                peerUsername,
                peerDisplayName);
        }).ToList();
    }

    public async Task<IReadOnlyList<ChatUserSearchItemDto>> SearchUsersAsync(
        ChatCallerContext caller, string query, CancellationToken ct = default)
    {
        await EnsureAccessAsync(caller, ct);
        var rows = await _users.SearchEligibleAsync(query, caller.Username, 20, ct);
        return rows.Select(u => new ChatUserSearchItemDto(u.Username, u.DisplayName, u.Role, u.Area)).ToList();
    }

    public async Task<ChatConversationSummaryDto> CreateOrGetFromOtAsync(
        CreateChatFromOtCommand command, ChatCallerContext caller, CancellationToken ct = default)
    {
        await EnsureAccessAsync(caller, ct);
        if (!ChatAccess.IsAdmin(caller.Role) && !ChatAccess.IsDesignArea(caller.Area))
            throw new UnauthorizedAccessException("Solo Diseño y Administradores pueden abrir hilos por OP.");

        var otNumber = (command.OTNumber ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(otNumber))
            throw new InvalidOperationException("OTNumber es obligatorio.");

        var normalizedOt = otNumber.ToUpperInvariant();
        var existing = await _db.InternalChatConversations
            .FirstOrDefaultAsync(c =>
                c.ConversationType == InternalChatConversationType.OpThread &&
                c.OTNumber == normalizedOt, ct);
        if (existing != null)
        {
            UnhideConversationForUser(existing, caller.Username);
            await EnsureParticipantAsync(existing.Id, caller.Username, ct);
            await _db.SaveChangesAsync(ct);
            return ToSummary(existing, false);
        }

        var displayName = string.IsNullOrWhiteSpace(command.CreatedByDisplayName)
            ? caller.DisplayName
            : command.CreatedByDisplayName.Trim();
        var productionOrderId = await _db.ProductionOrders.AsNoTracking()
            .Where(o => o.OTNumber == normalizedOt || o.OTNumber == otNumber)
            .Select(o => (Guid?)o.Id)
            .FirstOrDefaultAsync(ct);

        var conversation = new InternalChatConversation
        {
            Id = Guid.NewGuid(),
            ConversationType = InternalChatConversationType.OpThread,
            AreaKey = "diseño",
            OTNumber = normalizedOt,
            Title = $"OP {normalizedOt}",
            ProductionOrderId = productionOrderId,
            CreatedByUsername = caller.Username,
            CreatedByDisplayName = displayName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _db.InternalChatConversations.Add(conversation);
        await EnsureParticipantAsync(conversation.Id, caller.Username, ct);
        await _db.SaveChangesAsync(ct);
        return ToSummary(conversation, true);
    }

    public async Task<ChatConversationSummaryDto> CreateOrGetDirectAsync(
        CreateDirectChatCommand command, ChatCallerContext caller, CancellationToken ct = default)
    {
        await EnsureAccessAsync(caller, ct);
        var peerUsername = (command.PeerUsername ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(peerUsername))
            throw new InvalidOperationException("Debe indicar el usuario destino.");

        if (string.Equals(NormalizeUser(peerUsername), NormalizeUser(caller.Username), StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("No puedes abrir un chat directo contigo mismo.");

        var peer = await _users.FindByUsernameAsync(peerUsername, ct)
            ?? throw new InvalidOperationException("Usuario no encontrado.");
        if (!ChatAccess.IsEligible(peer.Role, peer.AssignedViewsCount))
            throw new InvalidOperationException("El usuario destino no puede usar el chat interno.");

        var pairKey = BuildDirectPairKey(caller.Username, peer.Username);
        var existing = await _db.InternalChatConversations
            .FirstOrDefaultAsync(c =>
                c.ConversationType == InternalChatConversationType.Direct &&
                c.DirectPairKey == pairKey, ct);
        if (existing != null)
        {
            UnhideConversationForUser(existing, caller.Username);
            await EnsureParticipantAsync(existing.Id, caller.Username, ct);
            await EnsureParticipantAsync(existing.Id, peer.Username, ct);
            await _db.SaveChangesAsync(ct);
            return ToSummary(existing, false, peer.DisplayName);
        }

        var displayName = string.IsNullOrWhiteSpace(command.CreatedByDisplayName)
            ? caller.DisplayName
            : command.CreatedByDisplayName.Trim();
        var conversation = new InternalChatConversation
        {
            Id = Guid.NewGuid(),
            ConversationType = InternalChatConversationType.Direct,
            DirectPairKey = pairKey,
            OTNumber = string.Empty,
            Title = peer.DisplayName,
            CreatedByUsername = caller.Username,
            CreatedByDisplayName = displayName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.InternalChatConversations.Add(conversation);
        await EnsureParticipantAsync(conversation.Id, caller.Username, ct);
        await EnsureParticipantAsync(conversation.Id, peer.Username, ct);
        await _db.SaveChangesAsync(ct);
        return ToSummary(conversation, true, peer.DisplayName);
    }

    public async Task<ChatConversationSummaryDto> CreateOrGetAreaAsync(
        CreateAreaChatCommand command, ChatCallerContext caller, CancellationToken ct = default)
    {
        await EnsureAccessAsync(caller, ct);
        var areaKey = ChatAccess.NormalizeArea(command.AreaKey);
        if (!ChatAccess.IsKnownArea(areaKey))
            throw new InvalidOperationException("Área no válida.");

        var isAdmin = ChatAccess.IsAdmin(caller.Role);
        var userArea = ChatAccess.NormalizeArea(caller.Area);
        if (!isAdmin && !string.Equals(areaKey, userArea, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException("Solo puedes abrir el canal de tu área.");

        var existing = await _db.InternalChatConversations
            .FirstOrDefaultAsync(c =>
                c.ConversationType == InternalChatConversationType.Area &&
                c.AreaKey == areaKey, ct);
        if (existing != null)
        {
            UnhideConversationForUser(existing, caller.Username);
            await EnsureParticipantAsync(existing.Id, caller.Username, ct);
            await _db.SaveChangesAsync(ct);
            return ToSummary(existing, false);
        }

        var displayName = string.IsNullOrWhiteSpace(command.CreatedByDisplayName)
            ? caller.DisplayName
            : command.CreatedByDisplayName.Trim();
        var conversation = new InternalChatConversation
        {
            Id = Guid.NewGuid(),
            ConversationType = InternalChatConversationType.Area,
            AreaKey = areaKey,
            OTNumber = string.Empty,
            Title = $"Canal {ChatAccess.AreaDisplayName(areaKey)}",
            CreatedByUsername = caller.Username,
            CreatedByDisplayName = displayName,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _db.InternalChatConversations.Add(conversation);
        await EnsureParticipantAsync(conversation.Id, caller.Username, ct);
        await _db.SaveChangesAsync(ct);
        return ToSummary(conversation, true);
    }

    public async Task<IReadOnlyList<ChatMessageDto>> GetMessagesAsync(
        Guid conversationId, ChatCallerContext caller, string uploadsRoot, CancellationToken ct = default)
    {
        await EnsureAccessAsync(caller, ct);
        var conversation = await _db.InternalChatConversations.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct)
            ?? throw new KeyNotFoundException("Conversación no encontrada.");

        if (!await CanAccessConversationAsync(conversation, caller, ct))
            throw new UnauthorizedAccessException("No tienes acceso a esta conversación.");

        if (IsConversationDeletedForUser(conversation.DeletedForUsersJson, NormalizeUser(caller.Username)))
            throw new KeyNotFoundException("Conversación no disponible.");

        await EnsureParticipantAsync(conversationId, caller.Username, ct);
        await _db.SaveChangesAsync(ct);

        var rows = await _db.InternalChatMessages.AsNoTracking()
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.SentAt)
            .ToListAsync(ct);

        return rows.Select(m => new ChatMessageDto(
            m.Id, m.ConversationId, m.SenderUsername, m.SenderDisplayName, m.Message,
            ResolveAttachmentUrl(m.AttachmentUrl, m.AttachmentName, uploadsRoot),
            m.AttachmentName, m.AttachmentContentType, m.SentAt)).ToList();
    }

    public async Task<SendChatMessageResultDto> SendMessageAsync(
        Guid conversationId, SendChatMessageCommand command, ChatCallerContext caller, CancellationToken ct = default)
    {
        await EnsureAccessAsync(caller, ct);
        var messageText = (command.Message ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(messageText))
            throw new InvalidOperationException("El mensaje no puede estar vacío.");
        if (messageText.Length > 4000)
            throw new InvalidOperationException("El mensaje no puede superar 4000 caracteres.");

        var conversation = await _db.InternalChatConversations.FirstOrDefaultAsync(c => c.Id == conversationId, ct)
            ?? throw new KeyNotFoundException("Conversación no encontrada.");
        if (!await CanAccessConversationAsync(conversation, caller, ct))
            throw new UnauthorizedAccessException("No tienes acceso a esta conversación.");

        UnhideConversationForUser(conversation, caller.Username);
        await EnsureParticipantAsync(conversation.Id, caller.Username, ct);

        var senderDisplayName = string.IsNullOrWhiteSpace(command.SenderDisplayName)
            ? caller.DisplayName
            : command.SenderDisplayName.Trim();
        var msg = new InternalChatMessage
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            SenderUsername = caller.Username,
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

        return new SendChatMessageResultDto(
            dto,
            conversation.ConversationType.ToString(),
            conversation.AreaKey,
            conversation.OTNumber,
            conversation.Title,
            conversation.CreatedByDisplayName,
            BuildConversationLastMessage(msg));
    }

    public async Task<SendChatAttachmentsResultDto> SendAttachmentsAsync(
        Guid conversationId,
        string? message,
        string? senderDisplayName,
        ChatCallerContext caller,
        string uploadsRoot,
        IReadOnlyList<ChatUploadFileDto> files,
        CancellationToken ct = default)
    {
        await EnsureAccessAsync(caller, ct);
        if (files == null || files.Count == 0)
            throw new InvalidOperationException("Debe enviar al menos un archivo válido.");
        if (files.Count > 10)
            throw new InvalidOperationException("Solo se permiten hasta 10 adjuntos por envío.");

        var conversation = await _db.InternalChatConversations.FirstOrDefaultAsync(c => c.Id == conversationId, ct)
            ?? throw new KeyNotFoundException("Conversación no encontrada.");
        if (!await CanAccessConversationAsync(conversation, caller, ct))
            throw new UnauthorizedAccessException("No tienes acceso a esta conversación.");

        UnhideConversationForUser(conversation, caller.Username);
        await EnsureParticipantAsync(conversation.Id, caller.Username, ct);

        var senderName = string.IsNullOrWhiteSpace(senderDisplayName) ? caller.DisplayName : senderDisplayName.Trim();
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
                SenderUsername = caller.Username,
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
            conversation.ConversationType.ToString(),
            conversation.AreaKey,
            conversation.OTNumber,
            conversation.Title,
            conversation.CreatedByDisplayName,
            conversation.UpdatedAt,
            createdMessages.Select(m => new ChatMessageDto(
                m.Id, m.ConversationId, m.SenderUsername, m.SenderDisplayName, m.Message,
                m.AttachmentUrl, m.AttachmentName, m.AttachmentContentType, m.SentAt)).ToList());
    }

    public async Task<DeleteChatForUserResultDto> DeleteForCurrentUserAsync(
        Guid conversationId, ChatCallerContext caller, string uploadsRoot, CancellationToken ct = default)
    {
        await EnsureAccessAsync(caller, ct);
        var normalized = NormalizeUser(caller.Username);
        if (string.IsNullOrWhiteSpace(normalized))
            throw new InvalidOperationException("Usuario no válido.");

        var conversation = await _db.InternalChatConversations.FirstOrDefaultAsync(c => c.Id == conversationId, ct)
            ?? throw new KeyNotFoundException("Conversación no encontrada.");

        var deletedUsers = ParseDeletedUsers(conversation.DeletedForUsersJson);
        deletedUsers.Add(normalized);

        var participants = await _db.InternalChatParticipants.AsNoTracking()
            .Where(p => p.ConversationId == conversationId)
            .Select(p => p.Username)
            .ToListAsync(ct);
        if (participants.Count == 0)
        {
            participants = await _db.InternalChatMessages.AsNoTracking()
                .Where(m => m.ConversationId == conversationId)
                .Select(m => m.SenderUsername)
                .ToListAsync(ct);
            participants.Add(conversation.CreatedByUsername);
        }

        var normalizedParticipants = participants
            .Select(NormalizeUser)
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var everyoneDeleted = normalizedParticipants.Count > 0 &&
                              normalizedParticipants.All(x => deletedUsers.Contains(x));

        var otNumber = conversation.OTNumber;
        var title = conversation.Title;
        if (everyoneDeleted && conversation.ConversationType != InternalChatConversationType.Area)
        {
            var relatedMessages = await _db.InternalChatMessages
                .Where(m => m.ConversationId == conversationId)
                .ToListAsync(ct);
            var relatedParticipants = await _db.InternalChatParticipants
                .Where(p => p.ConversationId == conversationId)
                .ToListAsync(ct);
            _db.InternalChatMessages.RemoveRange(relatedMessages);
            _db.InternalChatParticipants.RemoveRange(relatedParticipants);
            _db.InternalChatConversations.Remove(conversation);
            await _db.SaveChangesAsync(ct);
            TryDeleteConversationUploadDirectory(uploadsRoot, conversationId);
            return new DeleteChatForUserResultDto(true, conversationId, otNumber, title);
        }

        conversation.DeletedForUsersJson = SerializeDeletedUsers(deletedUsers);
        await _db.SaveChangesAsync(ct);
        return new DeleteChatForUserResultDto(false, conversationId, otNumber, title);
    }

    public async Task<bool> CanJoinConversationAsync(Guid conversationId, ChatCallerContext caller, CancellationToken ct = default)
    {
        var info = await _users.FindByUsernameAsync(caller.Username, ct);
        if (info == null || !ChatAccess.IsEligible(info.Role, info.AssignedViewsCount)) return false;
        var conversation = await _db.InternalChatConversations.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct);
        if (conversation == null) return false;
        return await CanAccessConversationAsync(conversation, caller, ct);
    }

    public async Task<IReadOnlyList<string>> GetParticipantUsernamesAsync(Guid conversationId, CancellationToken ct = default)
    {
        return await _db.InternalChatParticipants.AsNoTracking()
            .Where(p => p.ConversationId == conversationId)
            .Select(p => p.Username)
            .ToListAsync(ct);
    }

    private async Task EnsureHomeChannelsAsync(ChatCallerContext caller, CancellationToken ct)
    {
        if (ChatAccess.IsAdmin(caller.Role))
        {
            // Admin: ensure channels exist for all known areas so they appear in the list.
            foreach (var area in ChatAccess.AreaKeys)
            {
                await CreateOrGetAreaAsync(new CreateAreaChatCommand(area, caller.DisplayName), caller, ct);
            }
            return;
        }

        var areaKey = ChatAccess.NormalizeArea(caller.Area);
        if (ChatAccess.IsKnownArea(areaKey))
            await CreateOrGetAreaAsync(new CreateAreaChatCommand(areaKey, caller.DisplayName), caller, ct);
    }

    private async Task<bool> CanAccessConversationAsync(
        InternalChatConversation conversation, ChatCallerContext caller, CancellationToken ct)
    {
        var normalizedUser = NormalizeUser(caller.Username);
        var isParticipant = await _db.InternalChatParticipants.AsNoTracking()
            .AnyAsync(p => p.ConversationId == conversation.Id && p.Username == normalizedUser, ct);
        if (isParticipant) return true;

        if (ChatAccess.IsAdmin(caller.Role)) return true;

        if (conversation.ConversationType == InternalChatConversationType.Area)
        {
            return string.Equals(
                ChatAccess.NormalizeArea(conversation.AreaKey),
                ChatAccess.NormalizeArea(caller.Area),
                StringComparison.OrdinalIgnoreCase);
        }

        if (conversation.ConversationType == InternalChatConversationType.OpThread)
            return ChatAccess.IsDesignArea(caller.Area);

        return false;
    }

    private async Task EnsureParticipantAsync(Guid conversationId, string username, CancellationToken ct)
    {
        var normalized = NormalizeUser(username);
        if (string.IsNullOrWhiteSpace(normalized)) return;

        var exists = await _db.InternalChatParticipants
            .AnyAsync(p => p.ConversationId == conversationId && p.Username == normalized, ct);
        if (exists) return;

        // Also check tracked entities
        var tracked = _db.InternalChatParticipants.Local
            .Any(p => p.ConversationId == conversationId && p.Username == normalized);
        if (tracked) return;

        _db.InternalChatParticipants.Add(new InternalChatParticipant
        {
            Id = Guid.NewGuid(),
            ConversationId = conversationId,
            Username = normalized,
            JoinedAt = DateTime.UtcNow
        });
    }

    private static ChatConversationSummaryDto ToSummary(
        InternalChatConversation conversation, bool wasCreated, string? titleOverride = null)
        => new(
            conversation.Id,
            conversation.ConversationType.ToString(),
            conversation.AreaKey,
            conversation.OTNumber,
            titleOverride ?? conversation.Title,
            conversation.CreatedByDisplayName,
            conversation.CreatedByUsername,
            wasCreated);

    private static string BuildDirectPairKey(string a, string b)
    {
        var x = NormalizeUser(a);
        var y = NormalizeUser(b);
        return string.CompareOrdinal(x, y) <= 0 ? $"{x}|{y}" : $"{y}|{x}";
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
