import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Group,
    Modal,
    NumberInput,
    ScrollArea,
    Stack,
    Table,
    Text,
    TextInput,
    Title
} from '@mantine/core';
import { IconCheck, IconMail, IconPrinter, IconSearch, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';

export default function InformePedidos() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [search, setSearch] = useState('');
    const [approvalModal, setApprovalModal] = useState({ opened: false, orderId: null });
    const [approvalRows, setApprovalRows] = useState([]);

    const fetchRows = async () => {
        try {
            setLoading(true);
            const data = await api.get('/production/customer-orders');
            setRows(data || []);
        } catch (error) {
            notifications.show({
                title: 'Error cargando pedidos',
                message: error?.message || 'No se pudo consultar el informe.',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
    }, []);

    const filteredRows = useMemo(() => rows.filter(item =>
        (item.orderNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.clientName || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.productName || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.referenceName || '').toLowerCase().includes(search.toLowerCase()) ||
        (item.purchaseOrderNumber || '').toLowerCase().includes(search.toLowerCase())
    ), [rows, search]);

    const openApprovalModal = async (orderId) => {
        try {
            const order = await api.get(`/production/customer-orders/${orderId}`);
            const approvalData = (order?.items || []).map(item => ({
                orderPartId: item.orderPartId,
                productName: item.productName,
                referenceName: item.referenceName,
                quantity: item.quantity,
                approvedUnitPrice: Number(item.approvedUnitPrice || 0)
            }));
            setApprovalRows(approvalData);
            setApprovalModal({ opened: true, orderId });
        } catch (error) {
            notifications.show({
                title: 'No se pudo abrir aprobación',
                message: error?.message || 'Error consultando el pedido.',
                color: 'red'
            });
        }
    };

    const submitApproval = async () => {
        const hasInvalid = approvalRows.some(item => !item.approvedUnitPrice || item.approvedUnitPrice <= 0);
        if (hasInvalid) {
            notifications.show({
                title: 'Precios incompletos',
                message: 'Todos los items requieren precio unitario aprobado mayor a cero.',
                color: 'yellow'
            });
            return;
        }

        try {
            await api.put(`/production/customer-orders/${approvalModal.orderId}/approve`, {
                items: approvalRows.map(item => ({
                    orderPartId: item.orderPartId,
                    approvedUnitPrice: item.approvedUnitPrice
                }))
            });
            notifications.show({
                title: 'Pedido aprobado',
                message: 'El pedido ahora queda disponible para producción y facturación.',
                color: 'teal'
            });
            setApprovalModal({ opened: false, orderId: null });
            setApprovalRows([]);
            fetchRows();
        } catch (error) {
            notifications.show({
                title: 'Error aprobando',
                message: error?.message || 'No se pudo aprobar el pedido.',
                color: 'red'
            });
        }
    };

    const grouped = useMemo(() => {
        const map = new Map();
        for (const row of filteredRows) {
            if (!map.has(row.id)) map.set(row.id, []);
            map.get(row.id).push(row);
        }
        return Array.from(map.values()).flat();
    }, [filteredRows]);

    return (
        <Stack gap="lg" p="md">
            <Group justify="space-between">
                <Stack gap={2}>
                    <Title order={2} c="white">Informe de Pedidos</Title>
                    <Text c="dimmed" size="sm">Listado de pedidos elaborados parcial o totalmente.</Text>
                </Stack>
                <Group>
                    <Button onClick={() => navigate('/pedidos/nuevo')}>Nuevo pedido</Button>
                    <Button variant="light" color="red" leftSection={<IconX size={16} />} onClick={() => navigate('/')}>
                        Cerrar
                    </Button>
                </Group>
            </Group>

            <Card className="glass-card">
                <TextInput
                    placeholder="Buscar por pedido, cliente, producto, referencia u OC..."
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    mb="md"
                />

                <ScrollArea h={620}>
                    <Table stickyHeader highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Pedido</Table.Th>
                                <Table.Th>No. Pedido</Table.Th>
                                <Table.Th>Fecha de pedido</Table.Th>
                                <Table.Th>Fecha de despacho</Table.Th>
                                <Table.Th>Cliente</Table.Th>
                                <Table.Th>Nombre del producto</Table.Th>
                                <Table.Th>Referencia</Table.Th>
                                <Table.Th>Orden de compra</Table.Th>
                                <Table.Th>Cantidad pedida</Table.Th>
                                <Table.Th>Precio uni aprobado</Table.Th>
                                <Table.Th style={{ textAlign: 'right' }}>Acciones</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {grouped.map((item, index) => (
                                <Table.Tr key={`${item.id}-${item.referenceName}-${index}`}>
                                    <Table.Td>
                                        <Badge color={item.isApproved ? 'teal' : 'gray'}>
                                            {item.isApproved ? 'Aprobado' : 'Pendiente'}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td>
                                        <Text
                                            c="blue"
                                            fw={700}
                                            style={{ cursor: 'pointer', textDecoration: 'underline' }}
                                            onClick={() => navigate(`/pedidos/nuevo/${item.id}`)}
                                        >
                                            {item.orderNumber}
                                        </Text>
                                    </Table.Td>
                                    <Table.Td>{item.orderDate ? new Date(item.orderDate).toLocaleDateString() : '-'}</Table.Td>
                                    <Table.Td>{item.dispatchDate ? new Date(item.dispatchDate).toLocaleDateString() : '-'}</Table.Td>
                                    <Table.Td>{item.clientName}</Table.Td>
                                    <Table.Td>{item.productName || '-'}</Table.Td>
                                    <Table.Td>{item.referenceName || '-'}</Table.Td>
                                    <Table.Td>{item.purchaseOrderNumber}</Table.Td>
                                    <Table.Td>{item.quantity || 0}</Table.Td>
                                    <Table.Td>{item.approvedUnitPrice ? Number(item.approvedUnitPrice).toLocaleString() : '-'}</Table.Td>
                                    <Table.Td>
                                        <Group gap={6} justify="flex-end">
                                            {!item.isApproved && (
                                                <ActionIcon color="teal" variant="light" onClick={() => openApprovalModal(item.id)} title="Aprobar y asignar precios">
                                                    <IconCheck size={16} />
                                                </ActionIcon>
                                            )}
                                            <ActionIcon
                                                color="blue"
                                                variant="light"
                                                onClick={() => window.print()}
                                                title="Imprimir nota de pedido"
                                            >
                                                <IconPrinter size={16} />
                                            </ActionIcon>
                                            <ActionIcon
                                                color="violet"
                                                variant="light"
                                                onClick={() => {
                                                    window.location.href = `mailto:?subject=Nota de pedido ${item.orderNumber}&body=Adjunto nota de pedido ${item.orderNumber}.`;
                                                }}
                                                title="Enviar por correo"
                                            >
                                                <IconMail size={16} />
                                            </ActionIcon>
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>

                    {!loading && grouped.length === 0 && (
                        <Stack align="center" py="xl">
                            <Text c="dimmed">No hay pedidos registrados.</Text>
                        </Stack>
                    )}
                </ScrollArea>
            </Card>

            <Modal
                opened={approvalModal.opened}
                onClose={() => setApprovalModal({ opened: false, orderId: null })}
                title="Aprobar pedido y asignar precios unitarios"
                size="lg"
            >
                <Stack>
                    {approvalRows.map((item, index) => (
                        <Card key={`${item.orderPartId}-${index}`} withBorder>
                            <Group justify="space-between" align="flex-end">
                                <Stack gap={1}>
                                    <Text fw={600}>{item.productName}</Text>
                                    <Text size="sm" c="dimmed">{item.referenceName} | Cantidad: {item.quantity}</Text>
                                </Stack>
                                <NumberInput
                                    label="Precio unitario aprobado"
                                    min={0}
                                    value={item.approvedUnitPrice}
                                    onChange={(value) => setApprovalRows(prev => prev.map((row, idx) => (
                                        idx === index ? { ...row, approvedUnitPrice: Number(value || 0) } : row
                                    )))}
                                />
                            </Group>
                        </Card>
                    ))}
                    <Group justify="flex-end">
                        <Button variant="light" onClick={() => setApprovalModal({ opened: false, orderId: null })}>
                            Cancelar
                        </Button>
                        <Button onClick={submitApproval}>Aprobar pedido</Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}
