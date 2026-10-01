import { useEffect, useState } from 'react';
import {
    Button, Card, Group, NumberInput, Select, Stack, Table, Text, Textarea, Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconDeviceFloppy, IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';

const REASON_OPTIONS = [
    { value: 'Calidad', label: 'Calidad / defecto' },
    { value: 'Cantidad', label: 'Cantidad incorrecta' },
    { value: 'Cliente', label: 'Devolución del cliente' },
    { value: 'Otro', label: 'Otro' },
];

export default function DevolucionesPt() {
    const [returnable, setReturnable] = useState([]);
    const [rows, setRows] = useState([]);
    const [nextNumber, setNextNumber] = useState('');
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        remisionItemId: null,
        manufacturingOrderId: null,
        remisionId: null,
        returnDate: new Date(),
        quantity: 0,
        maxQuantity: 0,
        reason: 'Cliente',
        notes: '',
        label: '',
    });

    const load = async () => {
        try {
            const [ret, list, next] = await Promise.all([
                api.get('/production/inventario-pt/returns/returnable'),
                api.get('/production/inventario-pt/returns'),
                api.get('/production/inventario-pt/returns/next-number'),
            ]);
            setReturnable(ret || []);
            setRows(list || []);
            setNextNumber(String(next || ''));
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo cargar devoluciones.', color: 'red' });
        }
    };

    useEffect(() => { load(); }, []);

    const selectItem = (remisionItemId) => {
        const item = (returnable || []).find((r) => r.remisionItemId === remisionItemId);
        if (!item) {
            setForm((f) => ({ ...f, remisionItemId: null, manufacturingOrderId: null, remisionId: null, maxQuantity: 0, quantity: 0, label: '' }));
            return;
        }
        setForm((f) => ({
            ...f,
            remisionItemId: item.remisionItemId,
            manufacturingOrderId: item.manufacturingOrderId,
            remisionId: item.remisionId,
            maxQuantity: item.returnableQuantity,
            quantity: item.returnableQuantity,
            label: `${item.remisionNumber} · OP ${item.opNumber} · ${item.productName}`,
        }));
    };

    const save = async () => {
        if (!form.manufacturingOrderId || !form.remisionItemId) {
            notifications.show({ title: 'Seleccione despacho', message: 'Elija un ítem remisionado a devolver.', color: 'yellow' });
            return;
        }
        if (!form.quantity || form.quantity <= 0) {
            notifications.show({ title: 'Cantidad', message: 'Indique una cantidad mayor a cero.', color: 'yellow' });
            return;
        }
        setSaving(true);
        try {
            const created = await api.post('/production/inventario-pt/returns', {
                manufacturingOrderId: form.manufacturingOrderId,
                remisionId: form.remisionId,
                remisionItemId: form.remisionItemId,
                returnDate: form.returnDate,
                quantity: form.quantity,
                reason: form.reason,
                notes: form.notes,
            });
            notifications.show({ title: 'Devolución registrada', message: created.returnNumber, color: 'green' });
            setForm({
                remisionItemId: null,
                manufacturingOrderId: null,
                remisionId: null,
                returnDate: new Date(),
                quantity: 0,
                maxQuantity: 0,
                reason: 'Cliente',
                notes: '',
                label: '',
            });
            load();
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo guardar.', color: 'red' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <Stack gap="md" p="md">
            <Group justify="space-between">
                <div>
                    <Title order={2}>Devoluciones de producto terminado</Title>
                    <Text c="dimmed" size="sm">
                        El cliente devuelve mercancía ya remisionada: vuelve a stock PT y libera saldo para un nuevo despacho.
                    </Text>
                </div>
                <Text size="sm" c="dimmed">Próximo: {nextNumber || '—'}</Text>
            </Group>

            <Card withBorder>
                <Title order={4} mb="sm">Nueva devolución</Title>
                <Stack>
                    <Select
                        label="Despacho (remisión / OP)"
                        searchable
                        placeholder="Seleccione ítem remisionado con saldo devoluble"
                        data={(returnable || []).map((r) => ({
                            value: r.remisionItemId,
                            label: `${r.remisionNumber} · OP ${r.opNumber} · ${r.clientName} · ${r.productName} (máx ${r.returnableQuantity})`,
                        }))}
                        value={form.remisionItemId}
                        onChange={selectItem}
                    />
                    <Group grow>
                        <DateInput label="Fecha devolución" value={form.returnDate} onChange={(v) => setForm({ ...form, returnDate: v })} />
                        <NumberInput
                            label="Cantidad"
                            min={0}
                            max={form.maxQuantity || undefined}
                            value={form.quantity}
                            onChange={(v) => setForm({ ...form, quantity: v || 0 })}
                            description={form.maxQuantity ? `Máximo devoluble: ${form.maxQuantity}` : undefined}
                        />
                        <Select
                            label="Motivo"
                            data={REASON_OPTIONS}
                            value={form.reason}
                            onChange={(v) => setForm({ ...form, reason: v || 'Cliente' })}
                        />
                    </Group>
                    <Textarea label="Observaciones" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.currentTarget.value })} />
                    <Group>
                        <Button leftSection={<IconDeviceFloppy size={16} />} loading={saving} onClick={save}>
                            Registrar devolución
                        </Button>
                    </Group>
                </Stack>
            </Card>

            <Card withBorder>
                <Group justify="space-between" mb="sm">
                    <Title order={4}>Historial</Title>
                    <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={load}>Actualizar</Button>
                </Group>
                <Table striped>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>No.</Table.Th>
                            <Table.Th>Fecha</Table.Th>
                            <Table.Th>OP</Table.Th>
                            <Table.Th>Cliente</Table.Th>
                            <Table.Th>Producto</Table.Th>
                            <Table.Th>Cantidad</Table.Th>
                            <Table.Th>Motivo</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows.map((r) => (
                            <Table.Tr key={r.id}>
                                <Table.Td>{r.returnNumber}</Table.Td>
                                <Table.Td>{r.returnDate ? new Date(r.returnDate).toLocaleDateString('es-CO') : '—'}</Table.Td>
                                <Table.Td>{r.opNumber}</Table.Td>
                                <Table.Td>{r.clientName}</Table.Td>
                                <Table.Td>
                                    <Text fw={600}>{r.productName}</Text>
                                    <Text size="xs" c="dimmed">{r.referenceName}</Text>
                                </Table.Td>
                                <Table.Td>{r.quantity}</Table.Td>
                                <Table.Td>{r.reason || '—'}</Table.Td>
                            </Table.Tr>
                        ))}
                        {!rows.length && (
                            <Table.Tr><Table.Td colSpan={7}><Text c="dimmed">Sin devoluciones registradas.</Text></Table.Td></Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Card>
        </Stack>
    );
}
