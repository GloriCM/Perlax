import {
    Card,
    Title,
    Text,
    Group,
    Stack,
    TextInput,
    Box,
    Table,
    ScrollArea,
    Badge,
    ActionIcon,
    Tooltip,
    Popover,
    UnstyledButton,
    Button,
    MultiSelect,
    Divider,
} from '@mantine/core';
import {
    IconSearch,
    IconHistory,
    IconRefresh,
    IconUser,
    IconMapPin,
    IconChevronDown,
    IconFilter,
    IconX,
} from '@tabler/icons-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { api } from '../../utils/api';
import { notifications } from '@mantine/notifications';

const emptyQuery = {
    from: null,
    to: null,
    usernames: [],
    actions: [],
    ipContains: '',
    detailsContains: '',
};

/** Evita que los desplegables internos (MultiSelect, etc.) cuenten como “clic fuera” y cierren el filtro. */
const filterComboboxProps = {
    withinPortal: false,
};

const dateInputStyles = {
    input: {
        colorScheme: 'dark',
        fontFamily: 'inherit',
    },
};

function FilterColumnHeader({ label, isOpen, onHeaderClick, onClose, active, children, width = 320 }) {
    return (
        <Popover
            opened={isOpen}
            onChange={(next) => {
                if (!next) onClose();
            }}
            closeOnClickOutside={false}
            closeOnEscape
            position="bottom-start"
            shadow="md"
            withinPortal
            width={width}
            styles={{
                dropdown: {
                    background: 'rgba(15, 23, 42, 0.98)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                },
            }}
        >
            <Popover.Target>
                <UnstyledButton
                    type="button"
                    onClick={onHeaderClick}
                    style={{
                        width: '100%',
                        padding: '4px 0',
                        borderRadius: 6,
                    }}
                >
                    <Group gap={6} wrap="nowrap" justify="space-between">
                        <Group gap={4} wrap="nowrap">
                            <Text size="xs" fw={800} tt="uppercase" c="dimmed">
                                {label}
                            </Text>
                            {active ? (
                                <IconFilter size={14} color="#818cf8" aria-hidden />
                            ) : null}
                        </Group>
                        <IconChevronDown size={14} color="#64748b" />
                    </Group>
                </UnstyledButton>
            </Popover.Target>
            <Popover.Dropdown p="md">{children}</Popover.Dropdown>
        </Popover>
    );
}

export default function Auditoria() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [metaLoading, setMetaLoading] = useState(true);
    const [metadata, setMetadata] = useState({ actions: [], ipAddresses: [] });
    /** Nombres de login reales (tabla Usuarios), no cadenas sueltas del historial. */
    const [systemUsernames, setSystemUsernames] = useState([]);
    const [quickSearch, setQuickSearch] = useState('');
    const [query, setQuery] = useState(() => ({ ...emptyQuery }));
    const [popover, setPopover] = useState(null);

    const [draftDateFrom, setDraftDateFrom] = useState('');
    const [draftDateTo, setDraftDateTo] = useState('');
    const [draftUsers, setDraftUsers] = useState([]);
    const [draftActions, setDraftActions] = useState([]);
    const [draftIp, setDraftIp] = useState('');
    const [draftDetails, setDraftDetails] = useState('');

    const fetchFilterSources = useCallback(async () => {
        setMetaLoading(true);
        try {
            const meta = await api.get('/audit/logs/metadata');
            setMetadata({
                actions: meta?.actions ?? meta?.Actions ?? [],
                ipAddresses: meta?.ipAddresses ?? meta?.IpAddresses ?? [],
            });
        } catch (e) {
            console.error(e);
            setMetadata({ actions: [], ipAddresses: [] });
            notifications.show({
                title: 'Aviso',
                message: 'No se pudieron cargar acciones/IP para filtros.',
                color: 'yellow',
            });
        }
        try {
            const users = await api.get('/users');
            if (Array.isArray(users)) {
                const names = users
                    .map((u) => u.username ?? u.Username)
                    .filter(Boolean)
                    .map((s) => String(s).trim())
                    .filter((s) => s.length > 0);
                setSystemUsernames([...new Set(names)].sort((a, b) => a.localeCompare(b, 'es')));
            } else {
                setSystemUsernames([]);
            }
        } catch (e) {
            console.error(e);
            setSystemUsernames([]);
            notifications.show({
                title: 'Aviso',
                message: 'No se pudo cargar la lista de usuarios del sistema para el filtro (¿permisos de administrador?).',
                color: 'yellow',
            });
        } finally {
            setMetaLoading(false);
        }
    }, []);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();
            if (query.from) params.set('from', query.from);
            if (query.to) params.set('to', query.to);
            if (query.usernames.length) params.set('usernames', query.usernames.join(','));
            if (query.actions.length) params.set('actions', query.actions.join(','));
            if (query.ipContains.trim()) params.set('ip', query.ipContains.trim());
            if (query.detailsContains.trim()) params.set('details', query.detailsContains.trim());
            const qs = params.toString();
            const data = await api.get(`/audit/logs${qs ? `?${qs}` : ''}`);
            setLogs(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar los registros de auditoría',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    }, [query]);

    useEffect(() => {
        fetchFilterSources();
    }, [fetchFilterSources]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const syncDraftsFromQuery = useCallback(() => {
        setDraftDateFrom(query.from || '');
        setDraftDateTo(query.to || '');
        setDraftUsers([...query.usernames]);
        setDraftActions([...query.actions]);
        setDraftIp(query.ipContains);
        setDraftDetails(query.detailsContains);
    }, [query]);

    const closePopover = () => setPopover(null);

    const toggleColumn = (id) => () => {
        if (popover === id) {
            setPopover(null);
        } else {
            syncDraftsFromQuery();
            setPopover(id);
        }
    };

    const displayedLogs = useMemo(() => {
        const q = quickSearch.trim().toLowerCase();
        if (!q) return logs;
        return logs.filter((log) =>
            [log.username, log.action, log.details, log.ipAddress].some((val) =>
                String(val || '').toLowerCase().includes(q)
            )
        );
    }, [logs, quickSearch]);

    const glassStyles = {
        root: {
            background: 'rgba(20, 30, 50, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
        },
    };

    const activeDate = Boolean(query.from || query.to);
    const activeUsers = query.usernames.length > 0;
    const activeActions = query.actions.length > 0;
    const activeIp = Boolean(query.ipContains.trim());
    const activeDetails = Boolean(query.detailsContains.trim());

    const applyDateFilter = () => {
        setQuery((prev) => ({
            ...prev,
            from: draftDateFrom.trim() || null,
            to: draftDateTo.trim() || null,
        }));
        setPopover(null);
    };

    const clearDateFilter = () => {
        setDraftDateFrom('');
        setDraftDateTo('');
        setQuery((prev) => ({ ...prev, from: null, to: null }));
        setPopover(null);
    };

    const applyUserFilter = () => {
        setQuery((prev) => ({ ...prev, usernames: [...draftUsers] }));
        setPopover(null);
    };

    const clearUserFilter = () => {
        setDraftUsers([]);
        setQuery((prev) => ({ ...prev, usernames: [] }));
        setPopover(null);
    };

    const applyActionFilter = () => {
        setQuery((prev) => ({ ...prev, actions: [...draftActions] }));
        setPopover(null);
    };

    const clearActionFilter = () => {
        setDraftActions([]);
        setQuery((prev) => ({ ...prev, actions: [] }));
        setPopover(null);
    };

    const applyIpFilter = () => {
        setQuery((prev) => ({ ...prev, ipContains: draftIp }));
        setPopover(null);
    };

    const clearIpFilter = () => {
        setDraftIp('');
        setQuery((prev) => ({ ...prev, ipContains: '' }));
        setPopover(null);
    };

    const applyDetailsFilter = () => {
        setQuery((prev) => ({ ...prev, detailsContains: draftDetails }));
        setPopover(null);
    };

    const clearDetailsFilter = () => {
        setDraftDetails('');
        setQuery((prev) => ({ ...prev, detailsContains: '' }));
        setPopover(null);
    };

    const clearAllFilters = () => {
        setQuery({ ...emptyQuery });
        setDraftDateFrom('');
        setDraftDateTo('');
        setDraftUsers([]);
        setDraftActions([]);
        setDraftIp('');
        setDraftDetails('');
        setPopover(null);
    };

    const rows = displayedLogs.map((log) => (
        <Table.Tr key={log.id}>
            <Table.Td>
                <Text size="xs" fw={700} c="dimmed">
                    {new Date(log.timestamp).toLocaleString()}
                </Text>
            </Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <IconUser size={14} color="#6366f1" />
                    <Text size="xs" fw={700}>
                        {log.username && log.username !== 'null' ? log.username : 'Sistema'}
                    </Text>
                </Group>
            </Table.Td>
            <Table.Td>
                <Badge
                    variant="light"
                    color={
                        log.action.includes('DELETE')
                            ? 'red'
                            : log.action.includes('CREATE') || log.action.includes('USER_CREATE')
                              ? 'green'
                              : 'blue'
                    }
                    size="xs"
                >
                    {log.action}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Text size="xs" maw={400} truncate="end">
                    {log.details}
                </Text>
            </Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <IconMapPin size={12} color="#94a3b8" />
                    <Text size="xs" c="dimmed">
                        {log.ipAddress}
                    </Text>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    const userOptions = useMemo(
        () => systemUsernames.map((u) => ({ value: u, label: u })),
        [systemUsernames]
    );
    const actionOptions = useMemo(
        () => (metadata.actions || []).map((a) => ({ value: a, label: a })),
        [metadata.actions]
    );

    return (
        <Stack gap="lg" p="md">
            <Group justify="space-between" align="flex-end">
                <Stack gap={4}>
                    <Group gap="xs">
                        <IconHistory size={28} color="#6366f1" />
                        <Title order={2} style={{ color: '#fff' }}>
                            Registro de Auditoría
                        </Title>
                    </Group>
                    <Text c="dimmed" size="sm">
                        Historial de cambios y acciones.                         Filtros por cabecera (servidor). Usuarios = cuentas dadas de alta en el módulo Usuarios; acción e IP
                        salen de los eventos recientes del auditoría.
                    </Text>
                </Stack>
                <ActionIcon
                    variant="light"
                    color="indigo"
                    size="lg"
                    onClick={() => {
                        fetchFilterSources();
                        fetchLogs();
                    }}
                    loading={loading || metaLoading}
                >
                    <IconRefresh size={20} />
                </ActionIcon>
            </Group>

            <Card styles={glassStyles} p={0}>
                <Box p="md" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                    <Stack gap="sm">
                        <TextInput
                            placeholder="Búsqueda rápida en esta página (usuario, acción, detalle, IP)…"
                            leftSection={<IconSearch size={18} stroke={1.5} />}
                            value={quickSearch}
                            onChange={(e) => setQuickSearch(e.currentTarget.value)}
                            variant="filled"
                            styles={{
                                input: {
                                    background: 'rgba(0,0,0,0.2)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    color: '#fff',
                                },
                            }}
                        />
                        <Group gap="xs" wrap="wrap">
                            {activeDate || activeUsers || activeActions || activeIp || activeDetails ? (
                                <>
                                    <Text size="xs" c="dimmed">
                                        Filtros activos:
                                    </Text>
                                    {activeDate ? (
                                        <Badge variant="light" color="violet" size="sm" rightSection={<IconX size={12} />}>
                                            Fecha: {query.from ?? '…'} — {query.to ?? '…'}
                                        </Badge>
                                    ) : null}
                                    {activeUsers ? (
                                        <Badge variant="light" color="cyan" size="sm">
                                            Usuarios: {query.usernames.length}
                                        </Badge>
                                    ) : null}
                                    {activeActions ? (
                                        <Badge variant="light" color="blue" size="sm">
                                            Acciones: {query.actions.length}
                                        </Badge>
                                    ) : null}
                                    {activeIp ? (
                                        <Badge variant="light" color="grape" size="sm">
                                            IP contiene…
                                        </Badge>
                                    ) : null}
                                    {activeDetails ? (
                                        <Badge variant="light" color="teal" size="sm">
                                            Detalle contiene…
                                        </Badge>
                                    ) : null}
                                    <Button size="xs" variant="subtle" color="gray" onClick={clearAllFilters}>
                                        Limpiar todos los filtros
                                    </Button>
                                </>
                            ) : (
                                <Text size="xs" c="dimmed">
                                    Pulse una cabecera de columna para abrir sus filtros.
                                </Text>
                            )}
                        </Group>
                    </Stack>
                </Box>

                <ScrollArea h={600}>
                    <Table
                        verticalSpacing="xs"
                        horizontalSpacing="md"
                        highlightOnHover
                        styles={{
                            thead: { backgroundColor: 'rgba(15, 23, 42, 0.9)' },
                            th: { color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 },
                            td: { borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' },
                        }}
                    >
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th style={{ minWidth: 160 }}>
                                    <FilterColumnHeader
                                        label="Fecha y Hora"
                                        isOpen={popover === 'fecha'}
                                        onHeaderClick={toggleColumn('fecha')}
                                        onClose={closePopover}
                                        active={activeDate}
                                        width={340}
                                    >
                                        <Stack gap="sm">
                                            <Text size="xs" c="dimmed">
                                                Rango por día (formato del navegador). Vacío = sin filtrar por fecha.
                                            </Text>
                                            <TextInput
                                                type="date"
                                                label="Desde"
                                                value={draftDateFrom}
                                                onChange={(e) => setDraftDateFrom(e.currentTarget.value)}
                                                max={draftDateTo || undefined}
                                                size="sm"
                                                styles={dateInputStyles}
                                            />
                                            <TextInput
                                                type="date"
                                                label="Hasta"
                                                value={draftDateTo}
                                                onChange={(e) => setDraftDateTo(e.currentTarget.value)}
                                                min={draftDateFrom || undefined}
                                                size="sm"
                                                styles={dateInputStyles}
                                            />
                                            <Group grow>
                                                <Button size="xs" onClick={applyDateFilter}>
                                                    Aplicar
                                                </Button>
                                                <Button size="xs" variant="default" onClick={clearDateFilter}>
                                                    Limpiar
                                                </Button>
                                            </Group>
                                        </Stack>
                                    </FilterColumnHeader>
                                </Table.Th>
                                <Table.Th style={{ minWidth: 140 }}>
                                    <FilterColumnHeader
                                        label="Usuario"
                                        isOpen={popover === 'usuario'}
                                        onHeaderClick={toggleColumn('usuario')}
                                        onClose={closePopover}
                                        active={activeUsers}
                                    >
                                        <Stack gap="sm">
                                            <Text size="xs" c="dimmed">
                                                Solo usuarios dados de alta en Configuración → Usuarios (no nombres
                                                sueltos de registros antiguos).
                                            </Text>
                                            <MultiSelect
                                                data={userOptions}
                                                value={draftUsers}
                                                onChange={setDraftUsers}
                                                searchable
                                                clearable
                                                nothingFoundMessage="Sin coincidencias"
                                                disabled={metaLoading}
                                                size="sm"
                                                comboboxProps={filterComboboxProps}
                                            />
                                            <Group grow>
                                                <Button size="xs" onClick={applyUserFilter}>
                                                    Aplicar
                                                </Button>
                                                <Button size="xs" variant="default" onClick={clearUserFilter}>
                                                    Limpiar
                                                </Button>
                                            </Group>
                                        </Stack>
                                    </FilterColumnHeader>
                                </Table.Th>
                                <Table.Th style={{ minWidth: 120 }}>
                                    <FilterColumnHeader
                                        label="Acción"
                                        isOpen={popover === 'accion'}
                                        onHeaderClick={toggleColumn('accion')}
                                        onClose={closePopover}
                                        active={activeActions}
                                    >
                                        <Stack gap="sm">
                                            <Text size="xs" c="dimmed">
                                                Elija los tipos de acción a mostrar.
                                            </Text>
                                            <MultiSelect
                                                data={actionOptions}
                                                value={draftActions}
                                                onChange={setDraftActions}
                                                searchable
                                                clearable
                                                nothingFoundMessage="Sin coincidencias"
                                                disabled={metaLoading}
                                                size="sm"
                                                comboboxProps={filterComboboxProps}
                                            />
                                            <Group grow>
                                                <Button size="xs" onClick={applyActionFilter}>
                                                    Aplicar
                                                </Button>
                                                <Button size="xs" variant="default" onClick={clearActionFilter}>
                                                    Limpiar
                                                </Button>
                                            </Group>
                                        </Stack>
                                    </FilterColumnHeader>
                                </Table.Th>
                                <Table.Th style={{ minWidth: 200 }}>
                                    <FilterColumnHeader
                                        label="Detalles"
                                        isOpen={popover === 'detalle'}
                                        onHeaderClick={toggleColumn('detalle')}
                                        onClose={closePopover}
                                        active={activeDetails}
                                    >
                                        <Stack gap="sm">
                                            <Text size="xs" c="dimmed">
                                                Texto que debe contener el campo detalles (búsqueda en servidor).
                                            </Text>
                                            <TextInput
                                                placeholder="Ej. USER_CREATE, OT, prueba…"
                                                value={draftDetails}
                                                onChange={(e) => setDraftDetails(e.currentTarget.value)}
                                                size="sm"
                                            />
                                            <Group grow>
                                                <Button size="xs" onClick={applyDetailsFilter}>
                                                    Aplicar
                                                </Button>
                                                <Button size="xs" variant="default" onClick={clearDetailsFilter}>
                                                    Limpiar
                                                </Button>
                                            </Group>
                                        </Stack>
                                    </FilterColumnHeader>
                                </Table.Th>
                                <Table.Th style={{ minWidth: 140 }}>
                                    <FilterColumnHeader
                                        label="Dirección IP"
                                        isOpen={popover === 'ip'}
                                        onHeaderClick={toggleColumn('ip')}
                                        onClose={closePopover}
                                        active={activeIp}
                                    >
                                        <Stack gap="sm">
                                            <Text size="xs" c="dimmed">
                                                Parte de la dirección IP (coincidencia parcial).
                                            </Text>
                                            <TextInput
                                                placeholder="Ej. 192.168"
                                                value={draftIp}
                                                onChange={(e) => setDraftIp(e.currentTarget.value)}
                                                size="sm"
                                            />
                                            {metadata.ipAddresses?.length ? (
                                                <>
                                                    <Divider label="IPs frecuentes" labelPosition="center" />
                                                    <Group gap={6} wrap="wrap">
                                                        {metadata.ipAddresses.slice(0, 12).map((ip) => (
                                                            <Badge
                                                                key={ip}
                                                                variant={draftIp === ip ? 'filled' : 'light'}
                                                                style={{ cursor: 'pointer' }}
                                                                onClick={() => setDraftIp(ip)}
                                                            >
                                                                {ip}
                                                            </Badge>
                                                        ))}
                                                    </Group>
                                                </>
                                            ) : null}
                                            <Group grow>
                                                <Button size="xs" onClick={applyIpFilter}>
                                                    Aplicar
                                                </Button>
                                                <Button size="xs" variant="default" onClick={clearIpFilter}>
                                                    Limpiar
                                                </Button>
                                            </Group>
                                        </Stack>
                                    </FilterColumnHeader>
                                </Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {loading && logs.length === 0 ? (
                                <Table.Tr>
                                    <Table.Td colSpan={5}>
                                        <Text ta="center" py="xl" c="dimmed">
                                            Cargando registros...
                                        </Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : rows.length > 0 ? (
                                rows
                            ) : (
                                <Table.Tr>
                                    <Table.Td colSpan={5}>
                                        <Text ta="center" py="xl" c="dimmed">
                                            No se encontraron registros con los filtros actuales
                                        </Text>
                                    </Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </Card>
        </Stack>
    );
}
