import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Badge, Button, Card, Group, Menu, Modal, NumberInput, Stack, Table, Text, TextInput, Title,
} from '@mantine/core';
import { IconFileTypePdf, IconPlus, IconTruck } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';
import { openCommercialPrint } from '../../services/commercialPrint';

const money = (v) => Number(v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

export default function InformeRemisiones() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [transportId, setTransportId] = useState(null);
    const [transport, setTransport] = useState({ carrier: '', plate: '', driver: '', cost: 0, notes: '' });

    const load = async () => {
        try {
            setRows(await api.get('/production/remisiones') || []);
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo cargar el informe.', color: 'red' });
        }
    };

    useEffect(() => { load(); }, []);

    const saveTransport = async () => {
        try {
            await api.put(`/production/remisiones/${transportId}/transport`, transport);
            notifications.show({ title: 'Transporte asignado', color: 'green' });
            setTransportId(null);
            load();
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo guardar transporte.', color: 'red' });
        }
    };

    return (
        <Stack gap="md" p="md">
            <Group justify="space-between">
                <Title order={2}>Informe de remisiones</Title>
                <Button leftSection={<IconPlus size={16} />} onClick={() => navigate('/remisiones/nueva')}>Nueva</Button>
            </Group>
            <Card withBorder>
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>No.</Table.Th>
                            <Table.Th>Fecha</Table.Th>
                            <Table.Th>Cliente</Table.Th>
                            <Table.Th>Pedido</Table.Th>
                            <Table.Th>Cantidad</Table.Th>
                            <Table.Th>Estado</Table.Th>
                            <Table.Th>Transporte</Table.Th>
                            <Table.Th />
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows.map((r) => (
                            <Table.Tr key={r.id}>
                                <Table.Td>
                                    <Text c="blue" style={{ cursor: 'pointer' }} onClick={() => navigate(`/remisiones/nueva/${r.id}`)}>{r.remisionNumber}</Text>
                                </Table.Td>
                                <Table.Td>{r.remisionDate ? new Date(r.remisionDate).toLocaleDateString('es-CO') : '—'}</Table.Td>
                                <Table.Td>{r.clientName}</Table.Td>
                                <Table.Td>{r.customerOrderNumber}</Table.Td>
                                <Table.Td>{r.totalQuantity}</Table.Td>
                                <Table.Td><Badge color={r.isInvoiced ? 'green' : 'yellow'}>{r.isInvoiced ? 'Facturada' : r.status}</Badge></Table.Td>
                                <Table.Td>{r.hasTransport ? money(r.transportCost) : '—'}</Table.Td>
                                <Table.Td>
                                    <Group gap="xs" wrap="nowrap">
                                        <Button size="xs" variant="light" leftSection={<IconTruck size={14} />}
                                            onClick={() => { setTransportId(r.id); setTransport({ carrier: '', plate: '', driver: '', cost: 0, notes: '' }); }}>
                                            Transporte
                                        </Button>
                                        <Menu shadow="md" width={200}>
                                            <Menu.Target>
                                                <Button size="xs" variant="light" color="blue" leftSection={<IconFileTypePdf size={14} />}>
                                                    Imprimir
                                                </Button>
                                            </Menu.Target>
                                            <Menu.Dropdown>
                                                <Menu.Item onClick={() => openCommercialPrint(`remisiones/${r.id}/print`)}>
                                                    Remisión
                                                </Menu.Item>
                                                <Menu.Item onClick={() => openCommercialPrint(`remisiones/${r.id}/print/ticket?format=local`)}>
                                                    Ficha LOCAL
                                                </Menu.Item>
                                                <Menu.Item onClick={() => openCommercialPrint(`remisiones/${r.id}/print/ticket?format=expor`)}>
                                                    Ficha EXPOR
                                                </Menu.Item>
                                                <Menu.Item onClick={() => openCommercialPrint(`remisiones/${r.id}/print/ticket?format=tickets`)}>
                                                    Tickets
                                                </Menu.Item>
                                            </Menu.Dropdown>
                                        </Menu>
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                        {!rows.length && <Table.Tr><Table.Td colSpan={8}><Text c="dimmed">Sin remisiones.</Text></Table.Td></Table.Tr>}
                    </Table.Tbody>
                </Table>
            </Card>

            <Modal opened={Boolean(transportId)} onClose={() => setTransportId(null)} title="Asignar transporte">
                <Stack>
                    <TextInput label="Transportador" required value={transport.carrier} onChange={(e) => setTransport({ ...transport, carrier: e.currentTarget.value })} />
                    <TextInput label="Placa" value={transport.plate} onChange={(e) => setTransport({ ...transport, plate: e.currentTarget.value })} />
                    <TextInput label="Conductor" value={transport.driver} onChange={(e) => setTransport({ ...transport, driver: e.currentTarget.value })} />
                    <NumberInput label="Costo flete" min={0} value={transport.cost} onChange={(v) => setTransport({ ...transport, cost: v || 0 })} />
                    <TextInput label="Notas" value={transport.notes} onChange={(e) => setTransport({ ...transport, notes: e.currentTarget.value })} />
                    <Button onClick={saveTransport}>Confirmar</Button>
                </Stack>
            </Modal>
        </Stack>
    );
}
