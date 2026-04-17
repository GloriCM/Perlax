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
} from '@mantine/core';
import {
    IconSearch,
    IconHistory,
    IconRefresh,
    IconUser,
    IconActivity,
    IconMapPin
} from '@tabler/icons-react';
import { useState, useEffect } from 'react';
import { api } from '../../utils/api';
import { notifications } from '@mantine/notifications';

export default function Auditoria() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const data = await api.get('/audit/logs');
            setLogs(data);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
            notifications.show({
                title: 'Error',
                message: 'No se pudieron cargar los registros de auditoría',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const glassStyles = {
        root: {
            background: 'rgba(20, 30, 50, 0.7)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.4)',
            overflow: 'hidden'
        }
    };

    const rows = logs.filter(log =>
        [log.username, log.action, log.details].some(val =>
            String(val || '').toLowerCase().includes(search.toLowerCase())
        )
    ).map((log) => (
        <Table.Tr key={log.id}>
            <Table.Td>
                <Text size="xs" fw={700} c="dimmed">
                    {new Date(log.timestamp).toLocaleString()}
                </Text>
            </Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <IconUser size={14} color="#6366f1" />
                    <Text size="xs" fw={700}>{(log.username && log.username !== 'null') ? log.username : 'Sistema'}</Text>
                </Group>
            </Table.Td>
            <Table.Td>
                <Badge
                    variant="light"
                    color={log.action.includes('CREATE') ? 'green' : log.action.includes('DELETE') ? 'red' : 'blue'}
                    size="xs"
                >
                    {log.action}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Text size="xs" maw={400} truncate="end">{log.details}</Text>
            </Table.Td>
            <Table.Td>
                <Group gap="xs">
                    <IconMapPin size={12} color="#94a3b8" />
                    <Text size="xs" c="dimmed">{log.ipAddress}</Text>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Stack gap="lg" p="md">
            <Group justify="space-between" align="flex-end">
                <Stack gap={4}>
                    <Group gap="xs">
                        <IconHistory size={28} color="#6366f1" />
                        <Title order={2} style={{ color: '#fff' }}>Registro de Auditoría</Title>
                    </Group>
                    <Text c="dimmed" size="sm">Historial completo de cambios y acciones de usuarios</Text>
                </Stack>
                <ActionIcon
                    variant="light"
                    color="indigo"
                    size="lg"
                    onClick={fetchLogs}
                    loading={loading}
                >
                    <IconRefresh size={20} />
                </ActionIcon>
            </Group>

            <Card styles={glassStyles} p={0}>
                <Box p="md" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.02)' }}>
                    <TextInput
                        placeholder="Filtrar por usuario, acción o detalle..."
                        leftSection={<IconSearch size={18} stroke={1.5} />}
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                        variant="filled"
                        styles={{
                            input: {
                                background: 'rgba(0,0,0,0.2)',
                                border: '1px solid rgba(255,255,255,0.05)',
                                color: '#fff'
                            }
                        }}
                    />
                </Box>

                <ScrollArea h={600}>
                    <Table verticalSpacing="xs" horizontalSpacing="md" highlightOnHover
                        styles={{
                            thead: { backgroundColor: 'rgba(15, 23, 42, 0.9)' },
                            th: { color: '#94a3b8', fontSize: '10px', textTransform: 'uppercase', fontWeight: 800 },
                            td: { borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#e2e8f0' }
                        }}
                    >
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Fecha y Hora</Table.Th>
                                <Table.Th>Usuario</Table.Th>
                                <Table.Th>Acción</Table.Th>
                                <Table.Th>Detalles</Table.Th>
                                <Table.Th>Dirección IP</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {loading && logs.length === 0 ? (
                                <Table.Tr>
                                    <Table.Td colSpan={5}>
                                        <Text ta="center" py="xl" c="dimmed">Cargando registros...</Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : rows.length > 0 ? (
                                rows
                            ) : (
                                <Table.Tr>
                                    <Table.Td colSpan={5}>
                                        <Text ta="center" py="xl" c="dimmed">No se encontraron registros</Text>
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
