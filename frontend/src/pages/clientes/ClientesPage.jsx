import { useEffect, useState } from 'react';
import {
    Button, Card, Group, Modal, NumberInput, Stack, Switch, Table, Text, TextInput, Title,
} from '@mantine/core';
import { IconPlus, IconRefresh } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';

const empty = {
    name: '', nit: '', contactName: '', phone: '', email: '', address: '', receiptPercentage: 10, isActive: true,
};

export default function ClientesPage() {
    const [rows, setRows] = useState([]);
    const [form, setForm] = useState(null);
    const [syncing, setSyncing] = useState(false);

    const load = async () => {
        try { setRows(await api.get('/production/customers?onlyActive=false') || []); }
        catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudieron cargar clientes.', color: 'red' });
        }
    };

    useEffect(() => { load(); }, []);

    const syncFromDocuments = async () => {
        setSyncing(true);
        try {
            const result = await api.post('/production/customers/sync-from-documents', {});
            notifications.show({
                title: 'Clientes sincronizados',
                message: `Creados: ${result.created ?? 0} · Enlazados: ${result.linked ?? 0} · Total maestro: ${result.totalInMaster ?? 0}`,
                color: 'green',
            });
            await load();
        } catch (error) {
            notifications.show({ title: 'Error al sincronizar', message: error?.message || 'No se pudo sincronizar.', color: 'red' });
        } finally {
            setSyncing(false);
        }
    };

    const save = async () => {
        try {
            if (form.id) await api.put(`/production/customers/${form.id}`, form);
            else await api.post('/production/customers', form);
            notifications.show({ title: 'Cliente guardado', color: 'green' });
            setForm(null);
            load();
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo guardar.', color: 'red' });
        }
    };

    return (
        <Stack gap="md" p="md">
            <Group justify="space-between">
                <div>
                    <Title order={2}>Clientes</Title>
                    <Text size="sm" c="dimmed">
                        Maestro canónico. Las OT, pedidos y OP se enlazan por CustomerId. Si ves la lista vacía pero ya hay OT/OP, sincroniza.
                    </Text>
                </div>
                <Group>
                    <Button variant="light" leftSection={<IconRefresh size={16} />} loading={syncing} onClick={syncFromDocuments}>
                        Sincronizar desde OT/OP
                    </Button>
                    <Button leftSection={<IconPlus size={16} />} onClick={() => setForm({ ...empty })}>Nuevo cliente</Button>
                </Group>
            </Group>
            <Card withBorder>
                <Table striped>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Nombre</Table.Th>
                            <Table.Th>NIT</Table.Th>
                            <Table.Th>Contacto</Table.Th>
                            <Table.Th>% recibo</Table.Th>
                            <Table.Th>Activo</Table.Th>
                            <Table.Th />
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows.map((r) => (
                            <Table.Tr key={r.id}>
                                <Table.Td>{r.name}</Table.Td>
                                <Table.Td>{r.nit || '—'}</Table.Td>
                                <Table.Td>{r.contactName || '—'}</Table.Td>
                                <Table.Td>{r.receiptPercentage}%</Table.Td>
                                <Table.Td>{r.isActive ? 'Sí' : 'No'}</Table.Td>
                                <Table.Td>
                                    <Button size="xs" variant="light" onClick={() => setForm({ ...r })}>Editar</Button>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                        {!rows.length && (
                            <Table.Tr>
                                <Table.Td colSpan={6}>
                                    <Text c="dimmed">
                                        Sin clientes en el maestro. Pulse &quot;Sincronizar desde OT/OP&quot; para importar razones sociales ya usadas, o cree uno nuevo.
                                    </Text>
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Card>

            <Modal opened={Boolean(form)} onClose={() => setForm(null)} title={form?.id ? 'Editar cliente' : 'Nuevo cliente'}>
                {form && (
                    <Stack>
                        <TextInput label="Nombre" required value={form.name} onChange={(e) => setForm({ ...form, name: e.currentTarget.value })} />
                        <TextInput label="NIT" value={form.nit || ''} onChange={(e) => setForm({ ...form, nit: e.currentTarget.value })} />
                        <TextInput label="Contacto" value={form.contactName || ''} onChange={(e) => setForm({ ...form, contactName: e.currentTarget.value })} />
                        <TextInput label="Teléfono" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.currentTarget.value })} />
                        <TextInput label="Email" value={form.email || ''} onChange={(e) => setForm({ ...form, email: e.currentTarget.value })} />
                        <TextInput label="Dirección" value={form.address || ''} onChange={(e) => setForm({ ...form, address: e.currentTarget.value })} />
                        <NumberInput label="% recibo mercancía" min={0} max={100} value={form.receiptPercentage}
                            onChange={(v) => setForm({ ...form, receiptPercentage: v ?? 10 })} />
                        <Switch label="Activo" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.currentTarget.checked })} />
                        <Button onClick={save}>Guardar</Button>
                    </Stack>
                )}
            </Modal>
        </Stack>
    );
}
