import { useEffect, useState } from 'react';
import { Card, Title, Text, Stack, Table, Group, Button, ActionIcon } from '@mantine/core';
import { IconArrowLeft, IconEdit, IconTrash, IconFileTypePdf, IconClipboardList } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { api, getApiOrigin } from '../../utils/api';
import { notifications } from '@mantine/notifications';

export default function CotizadorGuardadas() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            setLoading(true);
            const data = await api.get('/production/cotizador');
            setItems(Array.isArray(data) ? data : []);
        } catch (e) {
            notifications.show({ title: 'Error', message: e.message || 'No se pudo cargar', color: 'red' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const remove = async (id, quoteNumber) => {
        if (!window.confirm(`Eliminar cotizacion ${quoteNumber}?`)) return;
        await api.delete(`/production/cotizador/${id}`);
        notifications.show({ title: 'Eliminada', message: quoteNumber, color: 'green' });
        load();
    };

    const openPdf = (id, type) => {
        const token = JSON.parse(localStorage.getItem('user') || '{}')?.Token
            || JSON.parse(localStorage.getItem('user') || '{}')?.token;
        const url = `${getApiOrigin()}/api/production/cotizador/${id}/pdf/${type}${token ? `?access_token=${encodeURIComponent(token)}` : ''}`;
        window.open(url, '_blank', 'noopener,noreferrer');
    };

    const convertToOt = async (quoteId, quoteNumber) => {
        if (!window.confirm(`¿Convertir ${quoteNumber} en borrador de OT?`)) return;
        try {
            const result = await api.post(`/production/cotizador/${quoteId}/convert-to-ot`);
            notifications.show({
                title: 'OT creada',
                message: `Borrador OT ${result.otNumber} generado`,
                color: 'green',
            });
            navigate(`/ordenes/nueva?id=${result.orderId}`);
        } catch (e) {
            notifications.show({ title: 'Error', message: e.message || 'No se pudo convertir', color: 'red' });
        }
    };

    return (
        <Stack p="md" gap="lg">
            <Group justify="space-between">
                <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/cotizador')}>Volver</Button>
                <Title order={3} c="white">Cotizaciones guardadas</Title>
            </Group>
            <Card className="glass-card">
                <Table striped highlightOnHover>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>N</Table.Th>
                            <Table.Th>Cliente</Table.Th>
                            <Table.Th>Trabajo</Table.Th>
                            <Table.Th>Tipo</Table.Th>
                            <Table.Th>Fecha</Table.Th>
                            <Table.Th>Acciones</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {items.map((q) => (
                            <Table.Tr key={q.id}>
                                <Table.Td>{q.quoteNumber}</Table.Td>
                                <Table.Td>{q.clientName}</Table.Td>
                                <Table.Td>{q.workName || q.productName}</Table.Td>
                                <Table.Td>{q.productType}</Table.Td>
                                <Table.Td>{q.requestDate ? new Date(q.requestDate).toLocaleDateString() : ''}</Table.Td>
                                <Table.Td>
                                    <Group gap="xs">
                                        <ActionIcon variant="light" onClick={() => navigate(`/cotizador/${q.id}`)}><IconEdit size={16} /></ActionIcon>
                                        <ActionIcon variant="light" color="blue" title="Propuesta comercial" onClick={() => openPdf(q.id, 'propuesta')}><IconFileTypePdf size={16} /></ActionIcon>
                                        <ActionIcon variant="light" color="cyan" title="Hoja de producción" onClick={() => openPdf(q.id, 'produccion')}><IconFileTypePdf size={16} /></ActionIcon>
                                        {!q.productionOrderId && (
                                            <ActionIcon variant="light" color="teal" title="Convertir a OT" onClick={() => convertToOt(q.id, q.quoteNumber)}><IconClipboardList size={16} /></ActionIcon>
                                        )}
                                        <ActionIcon variant="light" color="red" title="Eliminar" onClick={() => remove(q.id, q.quoteNumber)}><IconTrash size={16} /></ActionIcon>
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        ))}
                        {!loading && items.length === 0 && (
                            <Table.Tr><Table.Td colSpan={6}><Text c="dimmed" ta="center" py="lg">Sin cotizaciones guardadas</Text></Table.Td></Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </Card>
        </Stack>
    );
}