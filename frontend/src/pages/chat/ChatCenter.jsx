import {
    Card, Title, Text, Group, Stack, ThemeIcon, Box, Button, ScrollArea, Badge,
    TextInput, ActionIcon, FileButton, Tooltip, Menu, Loader
} from '@mantine/core';
import {
    IconUsers, IconSend, IconSearch, IconPaperclip, IconX, IconDotsVertical,
    IconTrash, IconMessageCircle, IconBuilding, IconUser
} from '@tabler/icons-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { api, getApiOrigin } from '../../utils/api';
import { resolveUploadUrl } from '../../utils/uploadUrl';
import { notifications } from '@mantine/notifications';
import { canAccessInternalChat, getCurrentUser, isAdmin } from '../../utils/permissions';

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function normalizeUsername(value) {
    return String(value || '').trim().toLowerCase();
}

function isDesignArea(area) {
    return normalizeText(area).includes('dise');
}

function isImageAttachment(contentType, fileName) {
    const byContentType = String(contentType || '').toLowerCase().startsWith('image/');
    if (byContentType) return true;
    const ext = String(fileName || '').split('.').pop()?.toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff'].includes(ext || '');
}

function normalizePickedFiles(input) {
    if (!input) return [];
    if (Array.isArray(input)) {
        return input.filter((x) => typeof File !== 'undefined' && x instanceof File);
    }
    if (typeof FileList !== 'undefined' && input instanceof FileList) {
        return Array.from(input).filter((x) => typeof File !== 'undefined' && x instanceof File);
    }
    if (typeof File !== 'undefined' && input instanceof File) {
        return [input];
    }
    return [];
}

function typeBadge(type) {
    if (type === 'Area') return { color: 'cyan', label: 'Área' };
    if (type === 'Direct') return { color: 'grape', label: 'Directo' };
    if (type === 'OpThread') return { color: 'orange', label: 'OP' };
    return { color: 'gray', label: type || 'Chat' };
}

function mapConversation(c) {
    return {
        id: c.id,
        conversationType: c.conversationType || c.ConversationType || 'OpThread',
        areaKey: c.areaKey || c.AreaKey || null,
        areaLabel: c.areaLabel || c.AreaLabel || c.areaKey || '',
        otNumber: c.otNumber || c.OTNumber || '',
        title: c.title || (c.otNumber ? `OP ${c.otNumber}` : 'Conversación'),
        createdBy: c.createdByDisplayName || c.createdByUsername || 'Usuario',
        lastMessage: c.lastMessage || 'Sin mensajes aún.',
        updatedAt: c.lastMessageAt || c.updatedAt,
        peerUsername: c.peerUsername || null,
        peerDisplayName: c.peerDisplayName || null,
    };
}

export default function ChatCenter() {
    const location = useLocation();
    const navigate = useNavigate();
    const hubRef = useRef(null);
    const joinedConversationRef = useRef(null);
    const activeConversationIdRef = useRef(null);
    const userSearchTimer = useRef(null);

    const [conversations, setConversations] = useState([]);
    const [loadingConversations, setLoadingConversations] = useState(true);
    const [activeConversationId, setActiveConversationId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [sending, setSending] = useState(false);
    const [connectingRealtime, setConnectingRealtime] = useState(false);
    const [listFilter, setListFilter] = useState('');
    const [messageDraft, setMessageDraft] = useState('');
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [userQuery, setUserQuery] = useState('');
    const [userResults, setUserResults] = useState([]);
    const [searchingUsers, setSearchingUsers] = useState(false);
    const [openingDirect, setOpeningDirect] = useState(false);
    const [accessDenied, setAccessDenied] = useState(false);

    const conversationIdFromUrl = useMemo(() => {
        const params = new URLSearchParams(location.search || '');
        return params.get('conversationId');
    }, [location.search]);

    const currentUser = useMemo(() => getCurrentUser() || {}, []);
    const chatAllowed = canAccessInternalChat(currentUser);
    const adminUser = isAdmin(currentUser);
    const designUser = adminUser || isDesignArea(currentUser?.area || currentUser?.Area);

    const senderDisplayName = useMemo(() => {
        return [currentUser?.firstName, currentUser?.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() || currentUser?.username || 'Usuario';
    }, [currentUser]);

    const authToken = useMemo(() => currentUser?.token || currentUser?.Token || '', [currentUser]);

    useEffect(() => {
        if (!chatAllowed) {
            setAccessDenied(true);
            notifications.show({
                title: 'Sin acceso',
                message: 'El chat interno es solo para Administradores y Administrativos.',
                color: 'red'
            });
            const t = setTimeout(() => navigate('/', { replace: true }), 1200);
            return () => clearTimeout(t);
        }
        return undefined;
    }, [chatAllowed, navigate]);

    useEffect(() => {
        activeConversationIdRef.current = activeConversationId;
    }, [activeConversationId]);

    const syncConversationGroup = async (conversationId) => {
        const conn = hubRef.current;
        if (!conn || conn.state !== 'Connected' || !conversationId) return;
        try {
            if (joinedConversationRef.current && joinedConversationRef.current !== conversationId) {
                await conn.invoke('LeaveConversation', joinedConversationRef.current);
            }
            await conn.invoke('JoinConversation', conversationId);
            joinedConversationRef.current = conversationId;
        } catch {
            // noop
        }
    };

    const loadConversations = async ({ preserveCurrent } = { preserveCurrent: true }) => {
        if (!chatAllowed) return;
        try {
            setLoadingConversations(true);
            const rows = await api.get('/production/internal-chat/conversations');
            const list = (rows || []).map(mapConversation);
            setConversations(list);

            if (list.length === 0) {
                setActiveConversationId(null);
                setMessages([]);
                return;
            }

            if (conversationIdFromUrl && list.some((x) => x.id === conversationIdFromUrl)) {
                setActiveConversationId(conversationIdFromUrl);
                return;
            }

            if (preserveCurrent && activeConversationId && list.some((x) => x.id === activeConversationId)) {
                return;
            }

            setActiveConversationId(list[0].id);
        } catch (error) {
            const msg = String(error?.message || '').toLowerCase();
            if (msg.includes('sin acceso') || msg.includes('403') || msg.includes('forbidden')) {
                setAccessDenied(true);
                return;
            }
            notifications.show({
                title: 'Error',
                message: error?.message || 'No se pudieron cargar las conversaciones.',
                color: 'red'
            });
        } finally {
            setLoadingConversations(false);
        }
    };

    const loadMessages = async (conversationId) => {
        if (!conversationId) {
            setMessages([]);
            return;
        }
        try {
            setLoadingMessages(true);
            const rows = await api.get(`/production/internal-chat/conversations/${conversationId}/messages`);
            setMessages(Array.isArray(rows) ? rows : []);
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error?.message || 'No se pudieron cargar los mensajes.',
                color: 'red'
            });
        } finally {
            setLoadingMessages(false);
        }
    };

    useEffect(() => {
        if (!chatAllowed) return;
        loadConversations({ preserveCurrent: false });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [conversationIdFromUrl, chatAllowed]);

    useEffect(() => {
        if (!chatAllowed) return;
        loadMessages(activeConversationId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeConversationId, chatAllowed]);

    useEffect(() => {
        if (!authToken || !chatAllowed) return undefined;
        let mounted = true;

        const startRealtime = async () => {
            try {
                setConnectingRealtime(true);
                const conn = new HubConnectionBuilder()
                    .withUrl(`${getApiOrigin()}/hubs/internal-chat`, {
                        accessTokenFactory: () => authToken,
                        withCredentials: false,
                    })
                    .withAutomaticReconnect()
                    .configureLogging(LogLevel.Warning)
                    .build();

                conn.on('MessageReceived', (msg) => {
                    if (msg?.conversationId !== activeConversationIdRef.current) {
                        setConversations((prev) => {
                            const idx = prev.findIndex((x) => x.id === msg?.conversationId);
                            if (idx === -1) {
                                loadConversations({ preserveCurrent: true });
                                return prev;
                            }
                            const next = [...prev];
                            next[idx] = {
                                ...next[idx],
                                lastMessage: msg?.message || next[idx].lastMessage,
                                updatedAt: msg?.sentAt || next[idx].updatedAt
                            };
                            next.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
                            return next;
                        });
                        return;
                    }
                    setMessages((prev) => {
                        const exists = prev.some((x) => x.id === msg.id);
                        return exists ? prev : [...prev, msg];
                    });
                });

                conn.on('ConversationUpserted', (conv) => {
                    setConversations((prev) => {
                        const mapped = mapConversation({
                            ...conv,
                            createdByDisplayName: conv.createdBy,
                            lastMessage: conv.lastMessage,
                        });
                        const idx = prev.findIndex((x) => x.id === mapped.id);
                        if (idx === -1) {
                            return [mapped, ...prev];
                        }
                        const next = [...prev];
                        next[idx] = { ...next[idx], ...mapped };
                        next.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
                        return next;
                    });
                });

                conn.on('ConversationDeleted', (payload) => {
                    const deletedId = payload?.id;
                    if (!deletedId) return;
                    setConversations((prev) => prev.filter((x) => x.id !== deletedId));
                    if (activeConversationIdRef.current === deletedId) {
                        setActiveConversationId(null);
                        setMessages([]);
                    }
                });

                conn.onreconnected(async () => {
                    await syncConversationGroup(activeConversationIdRef.current);
                });

                await conn.start();
                if (!mounted) {
                    await conn.stop();
                    return;
                }
                hubRef.current = conn;
                await syncConversationGroup(activeConversationIdRef.current);
            } catch {
                notifications.show({
                    title: 'Tiempo real no disponible',
                    message: 'No se pudo establecer conexión en vivo. Se mantiene modo API.',
                    color: 'yellow'
                });
            } finally {
                if (mounted) setConnectingRealtime(false);
            }
        };

        startRealtime();

        return () => {
            mounted = false;
            if (hubRef.current) {
                hubRef.current.stop();
                hubRef.current = null;
                joinedConversationRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [authToken, chatAllowed]);

    useEffect(() => {
        syncConversationGroup(activeConversationId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeConversationId]);

    useEffect(() => {
        if (!chatAllowed) return undefined;
        if (userSearchTimer.current) clearTimeout(userSearchTimer.current);
        const q = userQuery.trim();
        if (q.length < 1) {
            setUserResults([]);
            setSearchingUsers(false);
            return undefined;
        }
        setSearchingUsers(true);
        userSearchTimer.current = setTimeout(async () => {
            try {
                const rows = await api.get(`/production/internal-chat/users/search?q=${encodeURIComponent(q)}`);
                setUserResults(Array.isArray(rows) ? rows : []);
            } catch {
                setUserResults([]);
            } finally {
                setSearchingUsers(false);
            }
        }, 280);
        return () => {
            if (userSearchTimer.current) clearTimeout(userSearchTimer.current);
        };
    }, [userQuery, chatAllowed]);

    const openDirectChat = async (peerUsername) => {
        if (!peerUsername || openingDirect) return;
        try {
            setOpeningDirect(true);
            const conversation = await api.post('/production/internal-chat/conversations/direct', {
                peerUsername,
                createdByDisplayName: senderDisplayName
            });
            setUserQuery('');
            setUserResults([]);
            await loadConversations({ preserveCurrent: false });
            if (conversation?.id) {
                setActiveConversationId(conversation.id);
                navigate(`/chat?conversationId=${conversation.id}`, { replace: true });
            }
        } catch (error) {
            notifications.show({
                title: 'No se pudo abrir el chat',
                message: error?.message || 'Error al iniciar conversación directa.',
                color: 'red'
            });
        } finally {
            setOpeningDirect(false);
        }
    };

    const handleSend = async () => {
        const text = messageDraft.trim();
        if (!activeConversationId || (!text && selectedFiles.length === 0)) return;
        try {
            setSending(true);
            let sent = null;
            if (selectedFiles.length > 0) {
                const allowedMimeTypes = new Set([
                    'application/pdf',
                    'image/png',
                    'image/jpeg',
                    'image/webp',
                    'image/gif',
                ]);
                const allowedExtensions = new Set(['pdf', 'png', 'jpg', 'jpeg', 'webp', 'gif']);
                for (const selectedFile of selectedFiles) {
                    const mime = String(selectedFile.type || '').toLowerCase();
                    const ext = String(selectedFile.name || '').split('.').pop()?.toLowerCase();
                    const mimeOk = mime && allowedMimeTypes.has(mime);
                    const extOk = ext && allowedExtensions.has(ext);
                    if (!mimeOk && !extOk) {
                        notifications.show({
                            title: 'Archivo no permitido',
                            message: `No permitido: ${selectedFile.name}. Solo PDF e imágenes (PNG, JPG, WEBP, GIF).`,
                            color: 'red'
                        });
                        setSending(false);
                        return;
                    }
                }
                const fd = new FormData();
                selectedFiles.forEach((selectedFile) => {
                    if (typeof File !== 'undefined' && selectedFile instanceof File) {
                        fd.append('files', selectedFile);
                    }
                });
                fd.append('message', text);
                fd.append('senderDisplayName', senderDisplayName);
                sent = await api.postFormData(`/production/internal-chat/conversations/${activeConversationId}/messages/attachment`, fd);
            } else {
                sent = await api.post(`/production/internal-chat/conversations/${activeConversationId}/messages`, {
                    message: text,
                    senderDisplayName
                });
            }
            setMessageDraft('');
            setSelectedFiles([]);
            setMessages((prev) => {
                const payload = Array.isArray(sent) ? sent : sent ? [sent] : [];
                if (payload.length === 0) return prev;
                const existingIds = new Set(prev.map((x) => x.id));
                const toAdd = payload.filter((x) => x?.id && !existingIds.has(x.id));
                return toAdd.length ? [...prev, ...toAdd] : prev;
            });
            loadConversations();
        } catch (error) {
            notifications.show({
                title: 'No se pudo enviar',
                message: error?.message || 'Error al enviar el mensaje.',
                color: 'red'
            });
        } finally {
            setSending(false);
        }
    };

    const handleDeleteConversationForMe = async (conversationId) => {
        const target = conversations.find((x) => x.id === conversationId);
        const ok = window.confirm(`Se borrará el chat ${target?.title || ''} solo en tu vista. ¿Continuar?`);
        if (!ok) return;
        try {
            await api.delete(`/production/internal-chat/conversations/${conversationId}/my-view`);
            const next = conversations.filter((x) => x.id !== conversationId);
            setConversations(next);
            if (activeConversationId === conversationId) {
                setActiveConversationId(next[0]?.id || null);
                setMessages([]);
            }
            notifications.show({
                title: 'Chat borrado',
                message: 'La conversación se eliminó en tu canal.',
                color: 'teal'
            });
        } catch (error) {
            notifications.show({
                title: 'No se pudo borrar',
                message: error?.message || 'Error al borrar conversación.',
                color: 'red'
            });
        }
    };

    const filteredConversations = useMemo(() => {
        const term = normalizeText(listFilter);
        if (!term) return conversations;
        return conversations.filter((item) => {
            const haystack = normalizeText(`${item.title} ${item.createdBy} ${item.lastMessage} ${item.areaLabel} ${item.otNumber}`);
            return haystack.includes(term);
        });
    }, [conversations, listFilter]);

    const groupedByArea = useMemo(() => {
        const groups = new Map();
        const ensure = (key, label) => {
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    label,
                    channel: null,
                    directs: [],
                    ops: [],
                    other: [],
                });
            }
            return groups.get(key);
        };

        for (const item of filteredConversations) {
            if (item.conversationType === 'Direct') {
                const cross = ensure('_directos', 'Directos');
                cross.directs.push(item);
                continue;
            }

            const areaKey = item.areaKey || '_otros';
            const label = item.areaLabel || (areaKey === '_otros' ? 'Otros' : areaKey);
            const g = ensure(areaKey, label);
            if (item.conversationType === 'Area') g.channel = item;
            else if (item.conversationType === 'OpThread') g.ops.push(item);
            else g.other.push(item);
        }

        // Stable order: known areas first, then directos, then others
        const preferred = [
            'diseño', 'produccion', 'planeaccion', 'calidad', 'talleres',
            'ti', 'mantenimiento', 'sst', 'gestion humana', 'presupuestos', 'financiero', '_directos', '_otros'
        ];
        const keys = [...groups.keys()].sort((a, b) => {
            const ia = preferred.indexOf(a);
            const ib = preferred.indexOf(b);
            if (ia === -1 && ib === -1) return a.localeCompare(b);
            if (ia === -1) return 1;
            if (ib === -1) return -1;
            return ia - ib;
        });

        return keys.map((k) => groups.get(k)).filter(Boolean);
    }, [filteredConversations]);

    const activeConversation = conversations.find((x) => x.id === activeConversationId) || null;

    const renderConversationCard = (item) => {
        const badge = typeBadge(item.conversationType);
        return (
            <Card
                key={item.id}
                p="sm"
                onClick={() => {
                    setActiveConversationId(item.id);
                    navigate(`/chat?conversationId=${item.id}`, { replace: true });
                }}
                style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    cursor: 'pointer',
                    outline: activeConversationId === item.id ? '1px solid rgba(99,102,241,0.7)' : 'none'
                }}
            >
                <Group justify="space-between" align="flex-start">
                    <Box style={{ minWidth: 0, flex: 1 }}>
                        <Group gap={6} mb={2}>
                            <Text size="sm" fw={700} c="white" lineClamp={1}>{item.title}</Text>
                            <Badge size="xs" color={badge.color} variant="light">{badge.label}</Badge>
                        </Group>
                        <Text size="xs" c="dimmed" lineClamp={1}>{item.lastMessage}</Text>
                    </Box>
                    <Group gap={6}>
                        {activeConversationId === item.id ? <Badge color="indigo" size="xs">Activa</Badge> : null}
                        <Menu withinPortal={false} position="bottom-end">
                            <Menu.Target>
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    size="sm"
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label="Opciones conversación"
                                >
                                    <IconDotsVertical size={14} />
                                </ActionIcon>
                            </Menu.Target>
                            <Menu.Dropdown>
                                <Menu.Item
                                    color="red"
                                    leftSection={<IconTrash size={14} />}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteConversationForMe(item.id);
                                    }}
                                >
                                    Borrar para mí
                                </Menu.Item>
                            </Menu.Dropdown>
                        </Menu>
                    </Group>
                </Group>
            </Card>
        );
    };

    if (accessDenied || !chatAllowed) {
        return (
            <Stack gap="lg" className="fade-in">
                <Card className="glass-card" p="lg">
                    <Title order={3} c="white">Chat Interno</Title>
                    <Text size="sm" c="dimmed" mt="sm">
                        No tienes permiso para usar el chat. Solo Administradores, Administrativos y personal de Taller con vistas asignadas.
                    </Text>
                </Card>
            </Stack>
        );
    }

    return (
        <Stack gap="lg" className="fade-in">
            <Card
                className="glass-card"
                p="lg"
                style={{
                    background: 'linear-gradient(135deg, rgba(14,165,233,0.14), rgba(99,102,241,0.1))',
                }}
            >
                <Group justify="space-between" align="center">
                    <Box>
                        <Title order={3} c="white">Chat Interno</Title>
                        <Text size="sm" c="dimmed">
                            Canales por área, chats directos{designUser ? ' e hilos por OP en Diseño' : ''}.
                        </Text>
                    </Box>
                    {connectingRealtime ? (
                        <Badge size="sm" color="yellow" variant="light">Conectando...</Badge>
                    ) : (
                        <Badge size="sm" color="teal" variant="light">Tiempo real</Badge>
                    )}
                </Group>
            </Card>

            <Group align="stretch" grow wrap="wrap" className="chat-layout">
                <Card className="glass-card chat-panel-list" p="md" style={{ flex: 1.1, minWidth: 320 }}>
                    <Stack gap="sm" mb="sm">
                        <Group gap="xs">
                            <ThemeIcon variant="light" color="blue">
                                <IconUsers size={16} />
                            </ThemeIcon>
                            <Text fw={700} c="white">Conversaciones</Text>
                        </Group>

                        <TextInput
                            size="sm"
                            leftSection={searchingUsers ? <Loader size={12} /> : <IconSearch size={14} />}
                            placeholder="Buscar usuario para chat 1:1..."
                            value={userQuery}
                            onChange={(e) => setUserQuery(e.currentTarget.value)}
                        />
                        {userResults.length > 0 ? (
                            <Card p="xs" style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10 }}>
                                <Stack gap={4}>
                                    {userResults.map((u) => (
                                        <Group
                                            key={u.username}
                                            justify="space-between"
                                            p={6}
                                            style={{ cursor: 'pointer', borderRadius: 8 }}
                                            onClick={() => openDirectChat(u.username)}
                                        >
                                            <Box>
                                                <Text size="sm" c="white" fw={600}>{u.displayName || u.username}</Text>
                                                <Text size="xs" c="dimmed">
                                                    @{u.username}{u.areaLabel || u.area ? ` · ${u.areaLabel || u.area}` : ''}
                                                </Text>
                                            </Box>
                                            <ActionIcon variant="light" color="indigo" loading={openingDirect} aria-label="Abrir chat">
                                                <IconMessageCircle size={14} />
                                            </ActionIcon>
                                        </Group>
                                    ))}
                                </Stack>
                            </Card>
                        ) : null}

                        <TextInput
                            size="xs"
                            leftSection={<IconSearch size={14} />}
                            placeholder="Filtrar conversaciones"
                            value={listFilter}
                            onChange={(e) => setListFilter(e.currentTarget.value)}
                        />
                    </Stack>

                    <ScrollArea h={460}>
                        <Stack gap="md">
                            {loadingConversations ? (
                                <Text size="sm" c="dimmed">Cargando conversaciones...</Text>
                            ) : groupedByArea.length === 0 ? (
                                <Text size="sm" c="dimmed">No hay conversaciones.</Text>
                            ) : groupedByArea.map((group) => (
                                <Box key={group.key}>
                                    <Group gap={6} mb={6}>
                                        <ThemeIcon size="sm" variant="light" color={group.key === 'diseño' ? 'orange' : 'gray'}>
                                            {group.key === '_directos' ? <IconUser size={12} /> : <IconBuilding size={12} />}
                                        </ThemeIcon>
                                        <Text size="sm" fw={700} c="white">{group.label}</Text>
                                    </Group>
                                    <Stack gap="xs">
                                        {group.channel ? renderConversationCard(group.channel) : null}
                                        {group.key === 'diseño' && group.ops.length > 0 ? (
                                            <>
                                                <Text size="xs" c="dimmed" mt={4}>Por OP</Text>
                                                {group.ops.map(renderConversationCard)}
                                            </>
                                        ) : null}
                                        {group.key !== 'diseño' && group.ops.length > 0
                                            ? group.ops.map(renderConversationCard)
                                            : null}
                                        {group.directs.length > 0 ? (
                                            <>
                                                {group.key === '_directos' ? null : (
                                                    <Text size="xs" c="dimmed" mt={4}>Usuarios / directos</Text>
                                                )}
                                                {group.directs.map(renderConversationCard)}
                                            </>
                                        ) : null}
                                        {group.other.map(renderConversationCard)}
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    </ScrollArea>
                </Card>

                <Card className="glass-card chat-panel-messages" p="md" style={{ flex: 1.9, minWidth: 420 }}>
                    <Stack justify="space-between" h={560}>
                        <Box>
                            <Group gap="xs" mb={4}>
                                <Text fw={700} c="white">
                                    {activeConversation ? activeConversation.title : 'Selecciona una conversación'}
                                </Text>
                                {activeConversation ? (
                                    <Badge size="xs" color={typeBadge(activeConversation.conversationType).color} variant="light">
                                        {typeBadge(activeConversation.conversationType).label}
                                    </Badge>
                                ) : null}
                            </Group>
                            <Text size="xs" c="dimmed" mb={6}>
                                {activeConversation?.conversationType === 'Area'
                                    ? `Canal de ${activeConversation.areaLabel || activeConversation.areaKey || 'área'}`
                                    : activeConversation?.conversationType === 'OpThread'
                                        ? `Hilo OP ${activeConversation.otNumber || ''}`
                                        : activeConversation
                                            ? `Chat con ${activeConversation.peerDisplayName || activeConversation.title}`
                                            : ''}
                            </Text>
                            <ScrollArea h={380} mt="md" pr="xs">
                                <Stack gap="xs">
                                    {loadingMessages ? (
                                        <Text size="sm" c="dimmed">Cargando mensajes...</Text>
                                    ) : messages.length === 0 ? (
                                        <Text size="sm" c="dimmed">Aún no hay mensajes en esta conversación.</Text>
                                    ) : messages.map((msg) => {
                                        const isMine = normalizeUsername(msg.senderUsername) === normalizeUsername(currentUser?.username);
                                        return (
                                            <Card
                                                key={msg.id}
                                                p="xs"
                                                style={{
                                                    background: isMine ? 'rgba(99,102,241,0.22)' : 'rgba(255,255,255,0.04)',
                                                    border: isMine ? '1px solid rgba(129,140,248,0.6)' : '1px solid rgba(255,255,255,0.08)',
                                                    borderRadius: 10,
                                                    width: '78%',
                                                    marginLeft: isMine ? 'auto' : 0,
                                                    marginRight: isMine ? 0 : 'auto'
                                                }}
                                            >
                                                <Text size="xs" fw={700} c="white" ta={isMine ? 'right' : 'left'}>
                                                    {msg.senderDisplayName}
                                                </Text>
                                                <Text size="sm" c="gray.2" ta={isMine ? 'right' : 'left'}>
                                                    {msg.message}
                                                </Text>
                                                {msg.attachmentUrl ? (
                                                    <Box mt={6}>
                                                        {isImageAttachment(msg.attachmentContentType, msg.attachmentName) ? (
                                                            <a href={resolveUploadUrl(msg.attachmentUrl)} target="_blank" rel="noreferrer">
                                                                <img
                                                                    src={resolveUploadUrl(msg.attachmentUrl)}
                                                                    alt={msg.attachmentName || 'imagen'}
                                                                    style={{
                                                                        maxWidth: 260,
                                                                        maxHeight: 170,
                                                                        width: '100%',
                                                                        objectFit: 'contain',
                                                                        borderRadius: 8,
                                                                        border: '1px solid rgba(255,255,255,0.18)'
                                                                    }}
                                                                />
                                                            </a>
                                                        ) : (
                                                            <a
                                                                href={resolveUploadUrl(msg.attachmentUrl)}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                style={{ color: '#93c5fd', fontSize: 12 }}
                                                            >
                                                                {msg.attachmentName || 'Descargar archivo'}
                                                            </a>
                                                        )}
                                                    </Box>
                                                ) : null}
                                                <Text size="10px" c="dimmed" ta={isMine ? 'right' : 'left'}>
                                                    {msg.sentAt ? new Date(msg.sentAt).toLocaleString() : ''}
                                                </Text>
                                            </Card>
                                        );
                                    })}
                                </Stack>
                            </ScrollArea>
                        </Box>

                        <Card
                            p="md"
                            style={{
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px dashed rgba(255,255,255,0.12)',
                                borderRadius: 12
                            }}
                        >
                            <Group justify="space-between">
                                <TextInput
                                    placeholder={activeConversationId ? 'Escribe un mensaje...' : 'Selecciona una conversación'}
                                    value={messageDraft}
                                    onChange={(e) => setMessageDraft(e.currentTarget.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            handleSend();
                                        }
                                    }}
                                    disabled={!activeConversationId || sending}
                                    style={{ flex: 1 }}
                                />
                                <Tooltip label="Adjuntar PDF o imagen">
                                    <FileButton
                                        onChange={(files) => setSelectedFiles(normalizePickedFiles(files))}
                                        accept="application/pdf,image/png,image/jpeg,image/webp,image/gif"
                                        multiple
                                        disabled={!activeConversationId || sending}
                                    >
                                        {(props) => (
                                            <ActionIcon
                                                {...props}
                                                variant="light"
                                                color={selectedFiles.length > 0 ? 'indigo' : 'gray'}
                                                size="md"
                                                aria-label="Adjuntar archivo"
                                            >
                                                <IconPaperclip size={16} />
                                            </ActionIcon>
                                        )}
                                    </FileButton>
                                </Tooltip>
                                {selectedFiles.length > 0 ? (
                                    <Tooltip label="Quitar adjuntos">
                                        <ActionIcon
                                            variant="light"
                                            color="red"
                                            size="md"
                                            onClick={() => setSelectedFiles([])}
                                            aria-label="Quitar archivo"
                                        >
                                            <IconX size={14} />
                                        </ActionIcon>
                                    </Tooltip>
                                ) : null}
                                <Button
                                    size="xs"
                                    leftSection={<IconSend size={14} />}
                                    disabled={!activeConversationId || (!messageDraft.trim() && selectedFiles.length === 0) || sending}
                                    loading={sending}
                                    onClick={handleSend}
                                >
                                    Enviar
                                </Button>
                            </Group>
                            {selectedFiles.length > 0 ? (
                                <Text size="10px" c="dimmed" mt={6}>
                                    Adjuntados: {selectedFiles.length} archivo(s)
                                </Text>
                            ) : null}
                        </Card>
                    </Stack>
                </Card>
            </Group>
        </Stack>
    );
}
