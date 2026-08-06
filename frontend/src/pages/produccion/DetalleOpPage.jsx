import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Badge,
    Button,
    Card,
    Group,
    SimpleGrid,
    Stack,
    Text,
    Title,
} from '@mantine/core';
import { IconArrowLeft } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { manufacturingOrdersApi } from '../../services/manufacturingOrdersApi';

const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-CO');
};

const formatNumber = (value) =>
    Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });

export default function DetalleOpPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [op, setOp] = useState(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        manufacturingOrdersApi.getById(id)
            .then((data) => { if (!cancelled) setOp(data); })
            .catch((error) => {
                if (cancelled) return;
                notifications.show({
                    title: 'OP no encontrada',
                    message: error?.message || 'No se pudo cargar la orden de produccion.',
                    color: 'red',
                });
                navigate('/produccion/apertura');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [id, navigate]);

    if (loading) {
        return (
            <Stack p="md">
                <Text c="dimmed">Cargando orden de produccion...</Text>
            </Stack>
        );
    }

    if (!op) return null;

    return (
        <Stack gap="md" p="md">
            <Group justify="space-between">
                <Group>
                    <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/produccion/apertura')}>
                        Volver a apertura
                    </Button>
                    <div>
                        <Title order={2}>OP {op.opNumber}</Title>
                        <Text c="dimmed" size="sm">Pedido {op.orderNumber} · OT {op.otNumber}</Text>
                    </div>
                </Group>
                <Badge size="lg" color={op.status === 'Abierta' ? 'green' : 'yellow'}>{op.status}</Badge>
            </Group>

            <Card withBorder padding="md" radius="md">
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                    <div><Text size="xs" c="dimmed">Cliente</Text><Text fw={600}>{op.clientName}</Text></div>
                    <div><Text size="xs" c="dimmed">Producto</Text><Text fw={600}>{op.productName}</Text></div>
                    <div><Text size="xs" c="dimmed">Referencia</Text><Text fw={600}>{op.referenceName || '—'}</Text></div>
                    <div><Text size="xs" c="dimmed">OC cliente</Text><Text fw={600}>{op.purchaseOrderNumber || '—'}</Text></div>
                    <div><Text size="xs" c="dimmed">Cantidad pedida</Text><Text fw={600}>{formatNumber(op.quantityOrdered)}</Text></div>
                    <div><Text size="xs" c="dimmed">Cantidad a producir</Text><Text fw={600}>{formatNumber(op.quantityToProduce)}</Text></div>
                    <div><Text size="xs" c="dimmed">% recibo</Text><Text fw={600}>{formatNumber(op.receiptPercentage)}%</Text></div>
                    <div><Text size="xs" c="dimmed">Fecha apertura</Text><Text fw={600}>{formatDate(op.openingDate)}</Text></div>
                    <div><Text size="xs" c="dimmed">Entrega pactada</Text><Text fw={600}>{formatDate(op.agreedDeliveryDate)}</Text></div>
                </SimpleGrid>
            </Card>

            <Group>
                <Button variant="light" disabled>Materiales</Button>
                <Button variant="light" disabled>Procesos</Button>
                <Button variant="light" disabled>Talleres</Button>
            </Group>
            <Text size="sm" c="dimmed">Estas secciones se integraran en una fase posterior.</Text>
        </Stack>
    );
}