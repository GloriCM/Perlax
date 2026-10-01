import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Badge, Button, Card, Group, Modal, Stack, Table, Text, Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconFileTypePdf, IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';
import { openCommercialPrint } from '../../services/commercialPrint';

const money = (v) => Number(v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function InformeFacturas() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [edit, setEdit] = useState(null);

    const load = async () => {
        try { setRows(await api.get('/production/facturas') || []); }
        catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo cargar facturas.', color: 'red' });
        }
    };

    useEffect(() => { load(); }, []);

    const voidInvoice = async (id) => {
        if (!window.confirm('¿Anular esta factura? La remisión quedará pendiente de nuevo.')) return;
        try {
            await api.put(`/production/facturas/${id}/void`);
            notifications.show({ title: 'Factura anulada', color: 'green' });
            load();
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo anular.', color: 'red' });
        }
    };

    const saveEdit = async () => {
        try {
            await api.put(`/production/facturas/${edit.id}`, {
                invoiceDate: edit.invoiceDate,
                dueDate: edit.dueDate,
                notes: edit.notes,
            });
            notifications.show({ title: 'Factura actualizada', color: 'green' });
            setEdit(null);
            load();
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo actualizar.', color: 'red' });
        }
    };

    return (
        <Stack gap="md" p="md">
            <Group justify="space-between">
                <Title order={2}>Informe de facturación</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/facturacion/nueva')}>Nueva</Button>
            </Group>
            <Card withBorder>
                <Table striped>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Factura</Table.Th>
                            <Table.Th>Fecha</Table.Th>
                            <Table.Th>Cliente</Table.Th>
                            <Table.Th>Remisión</Table.Th>
                            <Table.Th>Bruto</Table.Th>
                            <Table.Th>IVA</Table.Th>
                            <Table.Th>Neto</Table.Th>
                            <Table.Th>Estado</Table.Th>
                            <Table.Th />
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows.map((r) => (
                            <Table.Tr key={r.id}>
                                <Table.Td>{r.invoiceNumber}</Table.Td>
                                <Table.Td>{r.invoiceDate ? new Date(r.invoiceDate).toLocaleDateString('es-CO') : '—'}</Table.Td>
                                <Table.Td>{r.clientName}</Table.Td>
                                <Table.Td>{r.remisionNumber}</Table.Td>
                                <Table.Td>{money(r.subtotal)}</Table.Td>
                                <Table.Td>{money(r.taxAmount)}</Table.Td>
                                <Table.Td>{money(r.totalAmount)}</Table.Td>
                                <Table.Td><Badge color={r.status === 'Anulada' ? 'red' : 'green'}>{r.status}</Badge></Table.Td>
                                <Table.Td>
                                    <Group gap="xs">
                                        <Button size="xs" variant="light" leftSection={<IconFileTypePdf size={14} />}
                                            onClick={() => openCommercialPrint(`facturas/${r.id}/print`)}>
                                            Imprimir
                                        </Button>
                                        <Button size="xs" variant="light" disabled={r.status === 'Anulada'}
                                            onClick={() => setEdit({
                                                id: r.id,
                                                invoiceDate: r.invoiceDate ? new Date(r.invoiceDate) : new Date(),
                                                dueDate: r.dueDate ? new Date(r.dueDate) : null,
                                                notes: '',
                                            })}>Repasar</Button>
                                        <Button size="xs" color="red" variant="light" disabled={r.status === 'Anulada'}
                                            onClick={() => voidInvoice(r.id)}>Anular</Button>
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                        {!rows.length && <Table.Tr><Table.Td colSpan={9}><Text c="dimmed">Sin facturas.</Text></Table.Td></Table.Tr>}
                    </Table.Tbody>
                </Table>
            </Card>

            <Modal opened={Boolean(edit)} onClose={() => setEdit(null)} title="Repasar factura">
                {edit && (
                    <Stack>
                        <DateInput label="Fecha factura" value={edit.invoiceDate} onChange={(v) => setEdit({ ...edit, invoiceDate: v })} />
                        <DateInput label="Vencimiento" value={edit.dueDate} onChange={(v) => setEdit({ ...edit, dueDate: v })} clearable />
                        <Button onClick={saveEdit}>Guardar</Button>
                    </Stack>
                )}
            </Modal>
        </Stack>
    );
}
