import { useEffect, useState } from 'react';
import {
    Button, Card, Group, Modal, NumberInput, Stack, Table, Text, Textarea, Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';

export default function ExistenciasPt() {
    const [rows, setRows] = useState([]);
    const [entry, setEntry] = useState(null);

    const load = async () => {
        try {
            setRows(await api.get('/production/inventario-pt?onlyWithStock=false') || []);
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo cargar inventario PT.', color: 'red' });
        }
    };

    useEffect(() => { load(); }, []);

    const saveEntry = async () => {
        try {
            await api.post('/production/inventario-pt/entries', entry);
            notifications.show({ title: 'Entrada registrada', color: 'green' });
            setEntry(null);
            load();
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo guardar.', color: 'red' });
        }
    };

    return (
        <Stack gap="md" p="md">
            <Title order={2}>Inventario de producto terminado</Title>
            <Card withBorder>
                <Table striped>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>OP</Table.Th>
                            <Table.Th>Cliente</Table.Th>
                            <Table.Th>Producto</Table.Th>
                            <Table.Th>A producir</Table.Th>
                            <Table.Th>Producido</Table.Th>
                            <Table.Th>Remisionado</Table.Th>
                            <Table.Th>Devuelto</Table.Th>
                            <Table.Th>Disponible</Table.Th>
                            <Table.Th />
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows.map((r) => (
                            <Table.Tr key={r.manufacturingOrderId}>
                                <Table.Td>{r.opNumber}</Table.Td>
                                <Table.Td>{r.clientName}</Table.Td>
                                <Table.Td>
                                    <Text fw={600}>{r.productName}</Text>
                                    <Text size="xs" c="dimmed">{r.referenceName}</Text>
                                </Table.Td>
                                <Table.Td>{r.quantityToProduce}</Table.Td>
                                <Table.Td>{r.producedQuantity}</Table.Td>
                                <Table.Td>{r.remisionedQuantity}</Table.Td>
                                <Table.Td>{r.returnedQuantity ?? 0}</Table.Td>
                                <Table.Td fw={700}>{r.availableQuantity}</Table.Td>
                                <Table.Td>
                                    <Button size="xs" variant="light"
                                        onClick={() => setEntry({
                                            manufacturingOrderId: r.manufacturingOrderId,
                                            entryDate: new Date(),
                                            quantity: 0,
                                            notes: '',
                                        })}>
                                        Gestionar
                                    </Button>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                        {!rows.length && <Table.Tr><Table.Td colSpan={9}><Text c="dimmed">Sin existencias.</Text></Table.Td></Table.Tr>}
                    </Table.Tbody>
                </Table>
            </Card>

            <Modal opened={Boolean(entry)} onClose={() => setEntry(null)} title="Entrada de PT">
                {entry && (
                    <Stack>
                        <DateInput label="Fecha" value={entry.entryDate} onChange={(v) => setEntry({ ...entry, entryDate: v })} />
                        <NumberInput label="Cantidad producida" min={0} value={entry.quantity} onChange={(v) => setEntry({ ...entry, quantity: v || 0 })} />
                        <Textarea label="Notas" value={entry.notes} onChange={(e) => setEntry({ ...entry, notes: e.currentTarget.value })} />
                        <Button onClick={saveEntry}>Guardar entrada</Button>
                    </Stack>
                )}
            </Modal>
        </Stack>
    );
}
