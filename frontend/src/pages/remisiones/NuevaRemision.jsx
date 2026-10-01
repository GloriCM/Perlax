import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Button, Card, Checkbox, Group, NumberInput, Select, Stack, Table, Text, TextInput, Textarea, Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconArrowLeft, IconDeviceFloppy } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';

export default function NuevaRemision() {
    const navigate = useNavigate();
    const { id } = useParams();
    const [number, setNumber] = useState('');
    const [orders, setOrders] = useState([]);
    const [customerOrderId, setCustomerOrderId] = useState(null);
    const [remisionDate, setRemisionDate] = useState(new Date());
    const [notes, setNotes] = useState('');
    const [lines, setLines] = useState([]);
    const [saving, setSaving] = useState(false);

    const selectedOrder = useMemo(
        () => orders.find((o) => o.customerOrderId === customerOrderId) || null,
        [orders, customerOrderId],
    );

    useEffect(() => {
        const load = async () => {
            try {
                const [dispatchable, next] = await Promise.all([
                    api.get('/production/remisiones/dispatchable'),
                    id ? Promise.resolve(null) : api.get('/production/remisiones/next-number'),
                ]);
                setOrders(dispatchable || []);
                if (next) setNumber(String(next));

                if (id) {
                    const detail = await api.get(`/production/remisiones/${id}`);
                    setNumber(detail.remisionNumber);
                    setCustomerOrderId(detail.customerOrderId);
                    setRemisionDate(detail.remisionDate ? new Date(detail.remisionDate) : new Date());
                    setNotes(detail.notes || '');
                    setLines((detail.items || []).map((i) => ({
                        customerOrderItemId: i.customerOrderItemId,
                        productName: i.productName,
                        referenceName: i.referenceName,
                        remainingQuantity: i.remainingQuantity + i.quantity,
                        quantity: i.quantity,
                        dispatchNotes: i.dispatchNotes || '',
                        isFinalDispatch: i.isFinalDispatch,
                        unitPrice: i.unitPrice,
                    })));
                }
            } catch (error) {
                notifications.show({ title: 'Error', message: error?.message || 'No se pudo cargar remisiones.', color: 'red' });
            }
        };
        load();
    }, [id]);

    useEffect(() => {
        if (id || !selectedOrder) return;
        setLines((selectedOrder.items || []).map((i) => ({
            customerOrderItemId: i.customerOrderItemId,
            productName: i.productName,
            referenceName: i.referenceName,
            remainingQuantity: i.remainingQuantity,
            quantity: i.remainingQuantity,
            dispatchNotes: '',
            isFinalDispatch: false,
            unitPrice: i.unitPrice,
        })));
    }, [selectedOrder, id]);

    const save = async () => {
        if (!customerOrderId) {
            notifications.show({ title: 'Pedido requerido', message: 'Seleccione un pedido.', color: 'yellow' });
            return;
        }
        const items = lines.filter((l) => Number(l.quantity) > 0).map((l) => ({
            customerOrderItemId: l.customerOrderItemId,
            quantity: Number(l.quantity),
            dispatchNotes: l.dispatchNotes || null,
            isFinalDispatch: Boolean(l.isFinalDispatch),
        }));
        if (!items.length) {
            notifications.show({ title: 'Sin cantidades', message: 'Indique al menos una cantidad a despachar.', color: 'yellow' });
            return;
        }
        setSaving(true);
        try {
            const payload = { customerOrderId, remisionDate, notes, items };
            if (id) {
                await api.put(`/production/remisiones/${id}`, payload);
                notifications.show({ title: 'Remisión actualizada', color: 'green' });
            } else {
                const created = await api.post('/production/remisiones', payload);
                notifications.show({ title: 'Remisión creada', message: created.remisionNumber, color: 'green' });
                navigate(`/remisiones/informe`);
                return;
            }
            navigate('/remisiones/informe');
        } catch (error) {
            notifications.show({ title: 'No se pudo guardar', message: error?.message || 'Error', color: 'red' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Stack gap="md" p="md">
            <Group justify="space-between">
                <Group>
                    <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/remisiones/informe')}>Volver</Button>
                    <div>
                        <Title order={2}>{id ? 'Editar remisión' : 'Nueva remisión'}</Title>
                        <Text c="dimmed" size="sm">{number || '—'}</Text>
                    </div>
                </Group>
                <Button leftSection={<IconDeviceFloppy size={16} />} loading={saving} onClick={save}>Guardar</Button>
            </Group>

            <Card withBorder padding="md">
                <Group grow align="flex-end">
                    <Select
                        label="Pedido"
                        searchable
                        disabled={Boolean(id)}
                        data={(orders || []).map((o) => ({
                            value: o.customerOrderId,
                            label: `${o.orderNumber} · ${o.clientName}`,
                        }))}
                        value={customerOrderId}
                        onChange={setCustomerOrderId}
                    />
                    <DateInput label="Fecha remisión" value={remisionDate} onChange={setRemisionDate} />
                    <TextInput label="Cliente" value={selectedOrder?.clientName || ''} readOnly />
                </Group>
                <Textarea mt="md" label="Observaciones" value={notes} onChange={(e) => setNotes(e.currentTarget.value)} />
            </Card>

            <Card withBorder padding="md">
                <Title order={4} mb="sm">Detalle</Title>
                <Table striped>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Producto</Table.Th>
                            <Table.Th>Pendiente</Table.Th>
                            <Table.Th>Cantidad</Table.Th>
                            <Table.Th>Obs. despacho</Table.Th>
                            <Table.Th>Despacho final</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {lines.map((line) => (
                            <Table.Tr key={line.customerOrderItemId}>
                                <Table.Td>
                                    <Text fw={600}>{line.productName}</Text>
                                    <Text size="xs" c="dimmed">{line.referenceName}</Text>
                                </Table.Td>
                                <Table.Td>{line.remainingQuantity}</Table.Td>
                                <Table.Td style={{ width: 140 }}>
                                    <NumberInput min={0} max={line.remainingQuantity} value={line.quantity}
                                        onChange={(v) => setLines((prev) => prev.map((x) => x.customerOrderItemId === line.customerOrderItemId ? { ...x, quantity: v || 0 } : x))} />
                                </Table.Td>
                                <Table.Td>
                                    <TextInput value={line.dispatchNotes}
                                        onChange={(e) => setLines((prev) => prev.map((x) => x.customerOrderItemId === line.customerOrderItemId ? { ...x, dispatchNotes: e.currentTarget.value } : x))} />
                                </Table.Td>
                                <Table.Td>
                                    <Checkbox checked={line.isFinalDispatch}
                                        onChange={(e) => setLines((prev) => prev.map((x) => x.customerOrderItemId === line.customerOrderItemId ? { ...x, isFinalDispatch: e.currentTarget.checked } : x))}
                                        label="Cerrar OP" />
                                </Table.Td>
                            </Table.Tr>
                        ))}
                        {!lines.length && (
                            <Table.Tr><Table.Td colSpan={5}><Text c="dimmed">Seleccione un pedido con saldo pendiente.</Text></Table.Td></Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Card>
        </Stack>
    );
}
