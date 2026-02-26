import { useState, useEffect } from 'react';
import {
    Title,
    Text,
    Button,
    Table,
    Group,
    ActionIcon,
    Badge,
    Modal,
    TextInput,
    NumberInput,
    Stack,
    LoadingOverlay,
    Box
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';
import productionService from '../services/productionService';

export default function ProductionOrdersPage() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalOpened, setModalOpened] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [formLoading, setFormLoading] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            setLoading(true);
            const data = await productionService.getOrders();
            setOrders(data);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateOrUpdate = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = {
            productCode: formData.get('productCode'),
            productName: formData.get('productName'),
            plannedQuantity: parseInt(formData.get('plannedQuantity')),
            scheduledStart: new Date(formData.get('scheduledStart'))
        };

        try {
            setFormLoading(true);
            if (selectedOrder) {
                await productionService.updateOrder(selectedOrder.id, {
                    ...data,
                    producedQuantity: parseInt(formData.get('producedQuantity') || '0'),
                    status: formData.get('status')
                });
            } else {
                await productionService.createOrder(data);
            }
            fetchOrders();
            setModalOpened(false);
        } catch (error) {
            console.error('Error saving order:', error);
        } finally {
            setFormLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (confirm('¿Estás seguro de eliminar esta orden?')) {
            try {
                await productionService.deleteOrder(id);
                fetchOrders();
            } catch (error) {
                console.error('Error deleting order:', error);
            }
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Pending': return 'yellow';
            case 'InProgress': return 'blue';
            case 'Completed': return 'green';
            case 'Cancelled': return 'red';
            default: return 'gray';
        }
    };

    return (
        <Box pos="relative" p="md">
            <LoadingOverlay visible={loading} />

            <Group justify="space-between" mb="xl">
                <div>
                    <Title order={2} c="white">Órdenes de Producción</Title>
                    <Text c="dimmed" size="sm">Gestiona y monitorea las líneas de producción activas</Text>
                </div>
                <Button
                    leftSection={<IconPlus size={18} />}
                    onClick={() => { setSelectedOrder(null); setModalOpened(true); }}
                    variant="light"
                    color="indigo"
                >
                    Nueva Orden
                </Button>
            </Group>

            <Table highlightOnHover variant="vertical" striped color="indigo" styles={{
                table: { color: '#e2e8f0' },
                thead: { background: 'rgba(255,255,255,0.03)' }
            }}>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Código</Table.Th>
                        <Table.Th>Producto</Table.Th>
                        <Table.Th>Planificado</Table.Th>
                        <Table.Th>Producido</Table.Th>
                        <Table.Th>Inicio Programado</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        <Table.Th>Acciones</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {orders.map((order) => (
                        <Table.Tr key={order.id}>
                            <Table.Td>{order.productCode}</Table.Td>
                            <Table.Td>{order.productName}</Table.Td>
                            <Table.Td>{order.plannedQuantity}</Table.Td>
                            <Table.Td>{order.producedQuantity}</Table.Td>
                            <Table.Td>{new Date(order.scheduledStart).toLocaleDateString()}</Table.Td>
                            <Table.Td>
                                <Badge color={getStatusColor(order.status)} variant="light">
                                    {order.status}
                                </Badge>
                            </Table.Td>
                            <Table.Td>
                                <Group gap="xs">
                                    <ActionIcon
                                        variant="subtle"
                                        color="gray"
                                        onClick={() => { setSelectedOrder(order); setModalOpened(true); }}
                                    >
                                        <IconEdit size={16} />
                                    </ActionIcon>
                                    <ActionIcon
                                        variant="subtle"
                                        color="red"
                                        onClick={() => handleDelete(order.id)}
                                    >
                                        <IconTrash size={16} />
                                    </ActionIcon>
                                </Group>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>

            <Modal
                opened={modalOpened}
                onClose={() => setModalOpened(false)}
                title={selectedOrder ? 'Editar Orden' : 'Nueva Orden'}
                styles={{ content: { background: '#1a1b1e', color: 'white' } }}
            >
                <form onSubmit={handleCreateOrUpdate}>
                    <Stack>
                        <TextInput
                            label="Código de Producto"
                            name="productCode"
                            defaultValue={selectedOrder?.productCode}
                            required
                        />
                        <TextInput
                            label="Nombre del Producto"
                            name="productName"
                            defaultValue={selectedOrder?.productName}
                            required
                        />
                        <NumberInput
                            label="Cantidad Planificada"
                            name="plannedQuantity"
                            defaultValue={selectedOrder?.plannedQuantity}
                            required
                        />
                        {selectedOrder && (
                            <NumberInput
                                label="Cantidad Producida"
                                name="producedQuantity"
                                defaultValue={selectedOrder?.producedQuantity}
                            />
                        )}
                        <DateInput
                            label="Fecha de Inicio"
                            name="scheduledStart"
                            defaultValue={selectedOrder ? new Date(selectedOrder.scheduledStart) : new Date()}
                        />
                        <Button type="submit" loading={formLoading} fullWidth mt="md">
                            {selectedOrder ? 'Actualizar' : 'Crear'}
                        </Button>
                    </Stack>
                </form>
            </Modal>
        </Box>
    );
}
