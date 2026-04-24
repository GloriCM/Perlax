import {
    Card,
    Title,
    Text,
    Group,
    Button,
    Stack,
    TextInput,
    Box,
    Table,
    ScrollArea,
    ActionIcon,
    Badge,
    Tooltip
} from '@mantine/core';
import {
    IconSearch,
    IconX,
    IconCircleCheck,
    IconCircleX,
    IconTrash
} from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../utils/api';

export default function ListaOT() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [search, setSearch] = useState('');
    const [scrolled, setScrolled] = useState(false);
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await api.get('/production/orders');
            if (data) {
                setOrders(data);
            }
        } catch (error) {
            console.error("Error fetching orders", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, otNumber) => {
        if (!window.confirm(`¿Está seguro de que desea eliminar la OT ${otNumber || ''}? Esta acción no se puede deshacer.`)) {
            return;
        }

        try {
            await api.delete(`/production/orders/${id}`);
            setOrders(prev => prev.filter(o => o.id !== id));
        } catch (error) {
            console.error("Error deleting order", error);
            alert("No se pudo eliminar la orden: " + (error.message || "Error desconocido"));
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    useEffect(() => {
        const ot = searchParams.get('ot');
        if (ot) {
            setSearch(ot);
        }
    }, [searchParams]);

    // Filter logic
    const filteredData = useMemo(() => orders.filter(item =>
        Object.values(item).some(val =>
            String(val).toLowerCase().includes(search.toLowerCase())
        )
    ), [orders, search]);

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

    const rows = filteredData.map((item) => (
        <Table.Tr key={item.id} style={{
            transition: 'background-color 0.2s ease',
            backgroundColor: 'transparent'
        }}>
            <Table.Td>
                <Text size="sm" fw={700} c="indigo.4">{item.otNumber || item.otNumber || item.OTNumber || 'N/A'}</Text>
            </Table.Td>
            <Table.Td><Text size="sm">{item.lineaPT}</Text></Table.Td>
            <Table.Td><Text size="sm" fw={500}>{item.cliente}</Text></Table.Td>
            <Table.Td><Text size="sm" style={{ maxWidth: 300 }} truncate>{item.productName}</Text></Table.Td>
            <Table.Td><Text size="sm">{item.parts?.length || 0}</Text></Table.Td>
            <Table.Td><Text size="sm">{new Date(item.createdAt).toLocaleDateString()}</Text></Table.Td>
            <Table.Td><Text size="sm">{item.ejecutivoCuenta}</Text></Table.Td>
            <Table.Td><Text size="sm">{item.status}</Text></Table.Td>
            <Table.Td>
                <Badge
                    variant="light"
                    color={item.status === 'Aprobado' ? 'green' : 'yellow'}
                    leftSection={item.status === 'Aprobado' ? <IconCircleCheck size={12} /> : <IconCircleX size={12} />}
                >
                    {item.status}
                </Badge>
            </Table.Td>
            <Table.Td>
                <Group gap={8} justify="flex-end">
                    <Tooltip label="Eliminar OT">
                        <ActionIcon variant="light" color="red" size="sm" onClick={() => handleDelete(item.id, item.otNumber)}>
                            <IconTrash size={16} />
                        </ActionIcon>
                    </Tooltip>
                </Group>
            </Table.Td>
        </Table.Tr>
    ));

    return (
        <Stack spacing="lg" p="md">
            <Group justify="space-between" align="flex-end">
                <Stack gap={4}>
                    <Title order={2} style={{ color: '#fff', letterSpacing: '-0.5px' }}>Listado General de OT</Title>
                    <Text c="dimmed" size="sm">Consulta y gestión de órdenes de trabajo</Text>
                </Stack>
                <Button
                    variant="light"
                    color="red"
                    leftSection={<IconX size={18} />}
                    onClick={() => navigate('/')}
                    styles={{ root: { borderRadius: '10px' } }}
                >
                    Cerrar
                </Button>
            </Group>

            <Card styles={glassStyles} p={0}>
                <Box p="md" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <TextInput
                        placeholder="Buscar por OT, cliente, producto..."
                        leftSection={<IconSearch size={18} stroke={1.5} />}
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                        variant="filled"
                        styles={{
                            input: {
                                background: 'rgba(255,255,255,0.03)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                borderRadius: '10px'
                            }
                        }}
                    />
                </Box>

                <ScrollArea h={600} onScrollPositionChange={({ y }) => setScrolled(y !== 0)}>
                    <Table
                        verticalSpacing="sm"
                        horizontalSpacing="md"
                        highlightOnHover
                        stickyHeader
                        styles={{
                            thead: {
                                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                                backdropFilter: 'blur(10px)',
                            },
                            th: {
                                color: '#94a3b8',
                                fontSize: '12px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px',
                                fontWeight: 700,
                                borderBottom: '1px solid rgba(255,255,255,0.1) !important'
                            },
                            td: {
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                color: '#e2e8f0'
                            }
                        }}
                    >
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>OT No</Table.Th>
                                <Table.Th>Línea</Table.Th>
                                <Table.Th>Cliente</Table.Th>
                                <Table.Th>Producto y Ref</Table.Th>
                                <Table.Th>Pieza N</Table.Th>
                                <Table.Th>Fecha</Table.Th>
                                <Table.Th>Ejecutivo</Table.Th>
                                <Table.Th>SIIGO</Table.Th>
                                <Table.Th>Estado</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>Acciones</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>{rows}</Table.Tbody>
                    </Table>
                    {filteredData.length === 0 && (
                        <Box p="xl" style={{ textAlign: 'center' }}>
                            <Text c="dimmed">No se encontraron órdenes de trabajo</Text>
                        </Box>
                    )}
                </ScrollArea>

                <Box p="xs" style={{ background: 'rgba(0,0,0,0.2)', textAlign: 'right' }}>
                    <Text size="xs" c="dimmed" pr="md">Mostrando {filteredData.length} de {orders.length} registros</Text>
                </Box>
            </Card>
        </Stack>
    );
}
