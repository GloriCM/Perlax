import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Badge,
    Button,
    Card,
    Group,
    NumberInput,
    ScrollArea,
    Select,
    Stack,
    Table,
    Text,
    TextInput,
    Title
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconArrowLeft, IconChevronLeft, IconChevronRight, IconDeviceFloppy, IconPlus, IconTrash, IconUsers, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';

export default function NuevoPedido() {
    const navigate = useNavigate();
    const { id } = useParams();
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    const [loading, setLoading] = useState(false);
    const [orderNumber, setOrderNumber] = useState('');
    const [availableProducts, setAvailableProducts] = useState([]);
    const [clientOptions, setClientOptions] = useState([]);
    const [items, setItems] = useState([]);
    const [formData, setFormData] = useState({
        clientName: '',
        orderDate: new Date(),
        purchaseOrderNumber: '',
        agreedDeliveryDate: null
    });

    const productOptions = useMemo(
        () => availableProducts.map(product => ({
            value: product.partId,
            label: `${product.otNumber} | ${product.productName} | ${product.referenceName}`
        })),
        [availableProducts]
    );

    useEffect(() => {
        const run = async () => {
            try {
                const [productsRes, productionOrdersRes, nextNumberRes] = await Promise.allSettled([
                    api.get('/production/customer-orders/available-products'),
                    api.get('/production/orders'),
                    id ? Promise.resolve(null) : api.get('/production/customer-orders/next-number')
                ]);

                const products = productsRes.status === 'fulfilled' ? (productsRes.value || []) : [];
                const productionOrders = productionOrdersRes.status === 'fulfilled' ? (productionOrdersRes.value || []) : [];
                const nextNumber = nextNumberRes.status === 'fulfilled' ? nextNumberRes.value : null;

                setAvailableProducts(products);
                const uniqueClients = [...new Set(
                    [
                        ...productionOrders.map(order => (order?.cliente || '').trim()),
                        ...products.map(product => (product?.clientName || '').trim())
                    ]
                        .filter(Boolean)
                )].sort((a, b) => a.localeCompare(b));
                setClientOptions(uniqueClients.map(client => ({ value: client, label: client })));
                if (!id) {
                    setOrderNumber(nextNumber || '');
                }
            } catch (error) {
                notifications.show({
                    title: 'Error inicializando pedido',
                    message: error?.message || 'No se pudieron cargar datos para nuevo pedido.',
                    color: 'red'
                });
            }
        };

        run();
    }, [id]);

    useEffect(() => {
        if (!id) return;

        const run = async () => {
            try {
                const data = await api.get(`/production/customer-orders/${id}`);
                if (!data) return;

                setOrderNumber(data.orderNumber || '');
                setFormData({
                    clientName: data.clientName || '',
                    orderDate: data.orderDate ? new Date(data.orderDate) : new Date(),
                    purchaseOrderNumber: data.purchaseOrderNumber || '',
                    agreedDeliveryDate: data.agreedDeliveryDate ? new Date(data.agreedDeliveryDate) : null
                });
                if (data.clientName) {
                    setClientOptions(prev => {
                        const exists = prev.some(x => x.value === data.clientName);
                        return exists ? prev : [...prev, { value: data.clientName, label: data.clientName }];
                    });
                }

                setItems((data.items || []).map(item => ({
                    orderPartId: item.orderPartId,
                    quantity: item.quantity || 0
                })));
            } catch (error) {
                notifications.show({
                    title: 'No se pudo cargar el pedido',
                    message: error?.message || 'Error desconocido.',
                    color: 'red'
                });
            }
        };

        run();
    }, [id]);

    const addItem = () => {
        setItems(prev => [...prev, { orderPartId: null, quantity: 0 }]);
    };

    const removeItem = (index) => {
        setItems(prev => prev.filter((_, idx) => idx !== index));
    };

    const updateItem = (index, field, value) => {
        setItems(prev => prev.map((row, idx) => (
            idx === index ? { ...row, [field]: value } : row
        )));
    };

    const validateBeforeSave = () => {
        if (!formData.clientName.trim()) return 'El campo CLIENTE es obligatorio.';
        if (!formData.purchaseOrderNumber.trim()) return 'El campo ORDEN DE COMPRA es obligatorio.';
        if (!formData.agreedDeliveryDate) return 'La FECHA PACTADA DE ENTREGA es obligatoria.';
        if (items.length === 0) return 'Debe agregar al menos un producto al pedido.';

        const hasInvalid = items.some(item => !item.orderPartId || !item.quantity || item.quantity <= 0);
        if (hasInvalid) return 'Todos los items deben tener producto aprobado y cantidad mayor a cero.';

        return null;
    };

    const calendarStyles = {
        input: {
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            color: 'white',
            '&:focus': {
                borderColor: '#6366f1',
                background: 'rgba(255, 255, 255, 0.08)',
            }
        },
        dropdown: {
            background: 'rgba(15, 23, 42, 0.98)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: '12px',
            boxShadow: '0 18px 40px rgba(0, 0, 0, 0.45)',
            backdropFilter: 'blur(10px)'
        },
        calendarHeaderControl: {
            color: '#e2e8f0',
            width: 30,
            height: 30,
            '& svg': {
                width: 16,
                height: 16
            }
        },
        calendarHeaderLevel: {
            color: '#e2e8f0',
            fontWeight: 700
        },
        weekday: {
            color: '#94a3b8',
            fontSize: '11px',
            fontWeight: 700
        },
        day: {
            color: '#e2e8f0',
            borderRadius: '8px',
            '&[data-selected]': {
                background: '#6366f1',
                color: 'white'
            },
            '&:hover': {
                background: 'rgba(99, 102, 241, 0.2)'
            }
        }
    };

    const textInputStyles = {
        label: {
            color: '#e2e8f0',
            fontWeight: 700
        },
        input: {
            background: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            color: 'white',
            '&:focus': {
                borderColor: '#6366f1',
                background: 'rgba(255, 255, 255, 0.08)',
            }
        }
    };

    const handleSave = async () => {
        const validationError = validateBeforeSave();
        if (validationError) {
            notifications.show({ title: 'Validación', message: validationError, color: 'yellow' });
            return;
        }

        const payload = {
            orderDate: formData.orderDate,
            clientName: formData.clientName,
            purchaseOrderNumber: formData.purchaseOrderNumber,
            agreedDeliveryDate: formData.agreedDeliveryDate,
            items
        };

        try {
            setLoading(true);
            if (id) {
                await api.put(`/production/customer-orders/${id}`, payload);
            } else {
                await api.post('/production/customer-orders', payload);
            }

            notifications.show({
                title: 'Pedido guardado',
                message: 'El pedido fue guardado correctamente.',
                color: 'teal'
            });
            navigate('/pedidos/informe');
        } catch (error) {
            notifications.show({
                title: 'Error guardando',
                message: error?.message || 'No se pudo guardar el pedido.',
                color: 'red'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Stack gap="lg" p="md">
            <Group justify="space-between">
                <Stack gap={2}>
                    <Group gap="xs">
                        <Title order={2} c="white">Nuevo Pedido</Title>
                        {orderNumber && <Badge color="violet">{orderNumber}</Badge>}
                    </Group>
                    <Text c="dimmed" size="sm">
                        Dependencia de OT y ficha técnica aprobada. Solo se listan productos con ficha aprobada.
                    </Text>
                </Stack>
                <Group>
                    <Button variant="light" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/pedidos/informe')}>
                        Volver al informe
                    </Button>
                    <Button variant="light" color="red" leftSection={<IconX size={16} />} onClick={() => navigate('/')}>
                        Cerrar
                    </Button>
                </Group>
            </Group>

            <Card className="glass-card">
                <Stack gap="md">
                    <Group grow>
                        <Select
                            label="Cliente"
                            description={`${clientOptions.length} clientes disponibles desde OT`}
                            placeholder="Buscar o seleccionar cliente..."
                            searchable
                            nothingFoundMessage="No se encontraron clientes"
                            maxDropdownHeight={260}
                            leftSection={<IconUsers size={16} />}
                            data={clientOptions}
                            value={formData.clientName}
                            onChange={(value) => setFormData(prev => ({ ...prev, clientName: value || '' }))}
                            comboboxProps={{ shadow: 'xl', width: 420, position: 'bottom-start' }}
                            styles={{
                                label: {
                                    color: '#e2e8f0',
                                    fontWeight: 700
                                },
                                description: {
                                    color: '#94a3b8'
                                },
                                input: {
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    border: '1px solid rgba(99, 102, 241, 0.4)',
                                    borderRadius: '10px',
                                    color: '#fff',
                                    fontWeight: 500
                                },
                                dropdown: {
                                    background: 'rgba(15, 23, 42, 0.98)',
                                    border: '1px solid rgba(99, 102, 241, 0.35)',
                                    borderRadius: '12px',
                                    backdropFilter: 'blur(12px)'
                                },
                                option: {
                                    borderRadius: '8px',
                                    marginBottom: '4px',
                                    fontSize: '13px',
                                    '&[data-combobox-active]': {
                                        background: 'rgba(99, 102, 241, 0.25)',
                                        color: '#e0e7ff'
                                    },
                                    '&[data-combobox-selected]': {
                                        background: 'rgba(99, 102, 241, 0.35)',
                                        color: '#c7d2fe',
                                        fontWeight: 700
                                    }
                                }
                            }}
                            required
                        />
                        <DateInput
                            label="Fecha de pedido"
                            value={formData.orderDate}
                            onChange={(value) => setFormData(prev => ({ ...prev, orderDate: value || new Date() }))}
                            styles={calendarStyles}
                            popoverProps={{ shadow: 'xl', position: 'bottom-start' }}
                            nextIcon={<IconChevronRight size={16} />}
                            previousIcon={<IconChevronLeft size={16} />}
                            hideOutsideDates
                        />
                    </Group>

                    <Group grow>
                        <TextInput
                            label="Orden de compra"
                            value={formData.purchaseOrderNumber}
                            onChange={(e) => setFormData(prev => ({ ...prev, purchaseOrderNumber: e.currentTarget.value }))}
                            styles={textInputStyles}
                            required
                        />
                        <DateInput
                            label="Fecha pactada de entrega"
                            value={formData.agreedDeliveryDate}
                            onChange={(value) => setFormData(prev => ({ ...prev, agreedDeliveryDate: value }))}
                            styles={calendarStyles}
                            popoverProps={{ shadow: 'xl', position: 'bottom-start' }}
                            nextIcon={<IconChevronRight size={16} />}
                            previousIcon={<IconChevronLeft size={16} />}
                            hideOutsideDates
                            required
                        />
                    </Group>

                    <Group grow>
                        <TextInput
                            label="Creado por"
                            value={user.username || 'Sistema'}
                            readOnly
                            styles={textInputStyles}
                        />
                        <DateInput
                            label="Fecha de despacho prevista"
                            value={formData.agreedDeliveryDate}
                            readOnly
                            styles={calendarStyles}
                        />
                    </Group>
                </Stack>
            </Card>

            <Card className="glass-card">
                <Group justify="space-between" mb="md">
                    <Title order={4} c="white">Items del pedido</Title>
                    <Button variant="light" color="violet" leftSection={<IconPlus size={16} />} onClick={addItem}>
                        Agregar item
                    </Button>
                </Group>

                <ScrollArea h={360}>
                    <Table highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Producto aprobado</Table.Th>
                                <Table.Th>Cantidad pedida</Table.Th>
                                <Table.Th style={{ width: 80, textAlign: 'right' }}>Acción</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {items.map((item, idx) => (
                                <Table.Tr key={`${item.orderPartId || 'row'}-${idx}`}>
                                    <Table.Td>
                                        <Select
                                            searchable
                                            placeholder="Seleccione OT + producto + referencia"
                                            data={productOptions}
                                            value={item.orderPartId}
                                            onChange={(value) => updateItem(idx, 'orderPartId', value)}
                                        />
                                    </Table.Td>
                                    <Table.Td>
                                        <NumberInput
                                            min={1}
                                            value={item.quantity}
                                            onChange={(value) => updateItem(idx, 'quantity', Number(value || 0))}
                                        />
                                    </Table.Td>
                                    <Table.Td style={{ textAlign: 'right' }}>
                                        <Button variant="subtle" color="red" onClick={() => removeItem(idx)}>
                                            <IconTrash size={16} />
                                        </Button>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </Card>

            <Group justify="flex-end">
                <Button
                    leftSection={<IconDeviceFloppy size={16} />}
                    onClick={handleSave}
                    loading={loading}
                >
                    Guardar pedido
                </Button>
            </Group>
        </Stack>
    );
}
