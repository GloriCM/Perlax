import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Badge, Button, Card, Group, Modal, NumberInput, Select, SimpleGrid, Stack, Table, Text, TextInput, Textarea, Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconArrowLeft } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { manufacturingOrdersApi } from '../../../services/manufacturingOrdersApi';
import { api } from '../../../utils/api';

const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-CO');
};

const formatNumber = (value) => Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });
const formatQty = (value) => Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 2 });
const money = (v) => Number(v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });

const TIPOS_COMPRA = [
    { value: 'consumo_diario', label: 'Insumos de Consumo Diario' },
    { value: 'cajas_empaque', label: 'Cajas y Empaque' },
    { value: 'gomas_adhesivos', label: 'Gomas y Adhesivos' },
    { value: 'pantone', label: 'Tinta' },
];

export default function DetalleOpPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [op, setOp] = useState(null);
    const [materials, setMaterials] = useState([]);
    const [labor, setLabor] = useState([]);
    const [workshops, setWorkshops] = useState([]);
    const [costs, setCosts] = useState(null);
    const [modal, setModal] = useState(null);
    const [form, setForm] = useState({});

    const reloadDetail = async () => {
        const [mats, lab, ws, cost] = await Promise.all([
            api.get(`/production/manufacturing-orders/${id}/materials`),
            api.get(`/production/manufacturing-orders/${id}/labor`),
            api.get(`/production/manufacturing-orders/${id}/workshops`),
            api.get(`/production/manufacturing-orders/${id}/cost-summary`),
        ]);
        setMaterials(mats || []);
        setLabor(lab || []);
        setWorkshops(ws || []);
        setCosts(cost);
    };

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        manufacturingOrdersApi.getById(id)
            .then(async (data) => {
                if (cancelled) return;
                setOp(data);
                await reloadDetail();
            })
            .catch((error) => {
                if (cancelled) return;
                notifications.show({ title: 'OP no encontrada', message: error?.message || 'No se pudo cargar.', color: 'red' });
                navigate('/produccion/apertura');
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [id, navigate]);

    const openModal = (type) => {
        if (type === 'materials') setForm({ partName: 'Pieza', category: 'MateriaPrima', productName: '', quantity: 1, unit: 'UND', unitCost: 0, notes: '' });
        if (type === 'labor') setForm({ partName: 'Pieza', workStation: '', observations: '', quantity: 0, rollWidth: null, cutLength: null, sheetWidth: null, sheetLength: null, cabida: null });
        if (type === 'workshops') setForm({ workshopName: '', workType: '', quantityDelivered: 0, fajado: 0, estresado: 0, empacado: 0, unitPrice: 0, observations: '', deliveryToWorkshopDate: new Date() });
        if (type === 'delivery') setForm({ productionDeliveryDate: costs?.productionDeliveryDate ? new Date(costs.productionDeliveryDate) : new Date() });
        setModal(type);
    };

    const saveModal = async () => {
        try {
            if (modal === 'materials') await api.post(`/production/manufacturing-orders/${id}/materials`, form);
            if (modal === 'labor') await api.post(`/production/manufacturing-orders/${id}/labor`, form);
            if (modal === 'workshops') await api.post(`/production/manufacturing-orders/${id}/workshops`, form);
            if (modal === 'delivery') {
                await api.put(`/production/manufacturing-orders/${id}/production-delivery-date`, {
                    productionDeliveryDate: form.productionDeliveryDate,
                });
            }
            setModal(null);
            await reloadDetail();
            notifications.show({ title: 'Guardado', color: 'green' });
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo guardar.', color: 'red' });
        }
    };

    const openSolicitar = async (line) => {
        setModal('solicitar');
        setForm({
            lineId: line.id,
            productName: line.productName,
            tipoRequisicionId: line.category === 'Impresion' ? 'pantone' : 'consumo_diario',
            loading: true,
        });
        try {
            const data = await api.get(`/production/manufacturing-orders/${id}/materials/${line.id}/disponibilidad`);
            setForm((current) => ({ ...current, ...data, loading: false }));
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo consultar el inventario.', color: 'red' });
            setModal(null);
        }
    };

    const confirmarSolicitud = async () => {
        try {
            const result = await api.post(`/production/manufacturing-orders/${id}/materials/${form.lineId}/solicitar`, {
                tipoRequisicionId: form.tipoRequisicionId || null,
            });
            const partes = [];
            if (Number(result?.fromStock) > 0) partes.push(`De bodega: ${formatQty(result.fromStock)}`);
            if (result?.requisicionCodigo) partes.push(`Compra ${result.requisicionCodigo}: ${formatQty(result.toPurchase)}`);
            notifications.show({ title: 'Material solicitado', message: partes.join('. ') || 'Listo.', color: 'green' });
            setModal(null);
            await reloadDetail();
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo solicitar.', color: 'red' });
        }
    };

    const removeRow = async (type, lineId) => {
        try {
            await api.delete(`/production/manufacturing-orders/${id}/${type}/${lineId}`);
            await reloadDetail();
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo eliminar.', color: 'red' });
        }
    };

    if (loading) return <Stack p="md"><Text c="dimmed">Cargando orden de produccion...</Text></Stack>;
    if (!op) return null;

    return (
        <Stack gap="md" p="md">
            <Group justify="space-between">
                <Group>
                    <Button variant="subtle" leftSection={<IconArrowLeft size={16} />} onClick={() => navigate('/produccion/estado-ordenes')}>Volver</Button>
                    <div>
                        <Title order={2}>OP {op.opNumber}</Title>
                        <Text c="dimmed" size="sm">Pedido {op.orderNumber} · OT {op.otNumber}</Text>
                    </div>
                </Group>
                <Badge size="lg" color={op.status === 'Abierta' ? 'green' : op.status === 'Cerrada' ? 'gray' : 'yellow'}>{op.status}</Badge>
            </Group>

            <Card withBorder padding="md" radius="md">
                <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                    <div><Text size="xs" c="dimmed">Cliente</Text><Text fw={600}>{op.clientName}</Text></div>
                    <div><Text size="xs" c="dimmed">Producto</Text><Text fw={600}>{op.productName}</Text></div>
                    <div><Text size="xs" c="dimmed">Referencia</Text><Text fw={600}>{op.referenceName || '—'}</Text></div>
                    <div><Text size="xs" c="dimmed">Cantidad a producir</Text><Text fw={600}>{formatNumber(op.quantityToProduce)}</Text></div>
                    <div><Text size="xs" c="dimmed">Fecha apertura</Text><Text fw={600}>{formatDate(op.openingDate)}</Text></div>
                    <div><Text size="xs" c="dimmed">Entrega producción</Text><Text fw={600}>{formatDate(costs?.productionDeliveryDate)}</Text></div>
                </SimpleGrid>
            </Card>

            <Group>
                <Button variant="light" onClick={() => openModal('materials')}>Materiales</Button>
                <Button variant="light" onClick={() => openModal('labor')}>Procesos</Button>
                <Button variant="light" onClick={() => openModal('workshops')}>Talleres</Button>
                <Button variant="light" onClick={() => openModal('delivery')}>Fecha entrega</Button>
            </Group>

            {costs && (
                <Card withBorder>
                    <Title order={4} mb="sm">Estadística de costos</Title>
                    <SimpleGrid cols={{ base: 2, md: 4 }}>
                        <div><Text size="xs" c="dimmed">Materiales</Text><Text fw={600}>{money(costs.materialsCost)}</Text></div>
                        <div><Text size="xs" c="dimmed">Talleres</Text><Text fw={600}>{money(costs.workshopsCost)}</Text></div>
                        <div><Text size="xs" c="dimmed">Consumos</Text><Text fw={600}>{money(costs.consumptionsCost)}</Text></div>
                        <div><Text size="xs" c="dimmed">Fletes</Text><Text fw={600}>{money(costs.transportCost)}</Text></div>
                        <div><Text size="xs" c="dimmed">Total costo</Text><Text fw={700}>{money(costs.totalCost)}</Text></div>
                        <div><Text size="xs" c="dimmed">Venta estimada</Text><Text fw={700}>{money(costs.estimatedSale)}</Text></div>
                    </SimpleGrid>
                </Card>
            )}

            <Card withBorder>
                <Title order={5} mb="xs">Materiales</Title>
                <Table><Table.Tbody>
                    {materials.map((m) => {
                        const pedido = Number(m.quantityFromStock) > 0 || Boolean(m.requisicionId);
                        return (
                        <Table.Tr key={m.id}>
                            <Table.Td>{m.partName}</Table.Td>
                            <Table.Td>{m.productName}</Table.Td>
                            <Table.Td>{formatQty(m.quantity)} {m.unit}</Table.Td>
                            <Table.Td>{money(m.unitCost)}</Table.Td>
                            <Table.Td>
                                {Number(m.quantityFromStock) > 0 && <Text size="xs">En bodega: {formatQty(m.quantityFromStock)}</Text>}
                                {m.requisicionCodigo && (
                                    <Button size="xs" variant="subtle" onClick={() => navigate('/compras/requisicion')}>{m.requisicionCodigo}</Button>
                                )}
                                {!pedido && <Button size="xs" onClick={() => openSolicitar(m)}>Solicitar</Button>}
                            </Table.Td>
                            <Table.Td>{!pedido && <Button size="xs" color="red" variant="subtle" onClick={() => removeRow('materials', m.id)}>Quitar</Button>}</Table.Td>
                        </Table.Tr>
                        );
                    })}
                    {!materials.length && <Table.Tr><Table.Td><Text c="dimmed">Sin materiales.</Text></Table.Td></Table.Tr>}
                </Table.Tbody></Table>
            </Card>

            <Card withBorder>
                <Title order={5} mb="xs">Procesos / MO</Title>
                <Table><Table.Tbody>
                    {labor.map((m) => (
                        <Table.Tr key={m.id}>
                            <Table.Td>{m.partName}</Table.Td>
                            <Table.Td>{m.workStation}</Table.Td>
                            <Table.Td>{m.quantity}</Table.Td>
                            <Table.Td>{m.observations || '—'}</Table.Td>
                            <Table.Td><Button size="xs" color="red" variant="subtle" onClick={() => removeRow('labor', m.id)}>Quitar</Button></Table.Td>
                        </Table.Tr>
                    ))}
                    {!labor.length && <Table.Tr><Table.Td><Text c="dimmed">Sin procesos.</Text></Table.Td></Table.Tr>}
                </Table.Tbody></Table>
            </Card>

            <Card withBorder>
                <Title order={5} mb="xs">Talleres externos</Title>
                <Table><Table.Tbody>
                    {workshops.map((m) => (
                        <Table.Tr key={m.id}>
                            <Table.Td>{m.workshopName}</Table.Td>
                            <Table.Td>{m.workType}</Table.Td>
                            <Table.Td>{m.quantityDelivered}</Table.Td>
                            <Table.Td>{money(m.unitPrice)}</Table.Td>
                            <Table.Td><Button size="xs" color="red" variant="subtle" onClick={() => removeRow('workshops', m.id)}>Quitar</Button></Table.Td>
                        </Table.Tr>
                    ))}
                    {!workshops.length && <Table.Tr><Table.Td><Text c="dimmed">Sin talleres.</Text></Table.Td></Table.Tr>}
                </Table.Tbody></Table>
            </Card>

            <Modal opened={Boolean(modal)} onClose={() => setModal(null)} title={
                modal === 'materials' ? 'Agregar material' :
                modal === 'solicitar' ? 'Solicitar material' :
                modal === 'labor' ? 'Agregar proceso' :
                modal === 'workshops' ? 'Asignar taller' : 'Fecha entrega producción'
            } size="lg">
                <Stack>
                    {modal === 'materials' && (
                        <>
                            <TextInput label="Pieza" value={form.partName} onChange={(e) => setForm({ ...form, partName: e.currentTarget.value })} />
                            <Select label="Categoría" data={['MateriaPrima', 'Impresion', 'Acabado', 'Terminado']} value={form.category} onChange={(v) => setForm({ ...form, category: v })} />
                            <TextInput label="Material" required value={form.productName} onChange={(e) => setForm({ ...form, productName: e.currentTarget.value })} />
                            <Group grow>
                                <NumberInput label="Cantidad" min={0} value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v || 0 })} />
                                <TextInput label="Unidad" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.currentTarget.value })} />
                                <NumberInput label="Costo unitario" min={0} value={form.unitCost} onChange={(v) => setForm({ ...form, unitCost: v || 0 })} />
                            </Group>
                        </>
                    )}
                    {modal === 'solicitar' && (
                        form.loading ? <Text c="dimmed">Consultando inventario...</Text> : (
                            <>
                                <Text fw={600}>{form.productName}</Text>
                                <SimpleGrid cols={2}>
                                    <div><Text size="xs" c="dimmed">Pedido</Text><Text>{formatQty(form.quantity)}</Text></div>
                                    <div><Text size="xs" c="dimmed">Disponible</Text><Text>{formatQty(form.available)}</Text></div>
                                    <div><Text size="xs" c="dimmed">De bodega</Text><Text>{formatQty(form.fromStock)}</Text></div>
                                    <div><Text size="xs" c="dimmed">A comprar</Text><Text>{formatQty(form.toPurchase)}</Text></div>
                                </SimpleGrid>
                                {Number(form.toPurchase) > 0 && (
                                    <Select
                                        label="Tipo de compra"
                                        data={TIPOS_COMPRA}
                                        value={form.tipoRequisicionId}
                                        onChange={(v) => setForm({ ...form, tipoRequisicionId: v })}
                                    />
                                )}
                                {form.alreadyRequested && <Text c="dimmed">Este material ya fue solicitado.</Text>}
                            </>
                        )
                    )}
                    {modal === 'labor' && (
                        <>
                            <TextInput label="Pieza" value={form.partName} onChange={(e) => setForm({ ...form, partName: e.currentTarget.value })} />
                            <TextInput label="Puesto de trabajo" required value={form.workStation} onChange={(e) => setForm({ ...form, workStation: e.currentTarget.value })} />
                            <NumberInput label="Cantidad" value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v || 0 })} />
                            <Textarea label="Observaciones" value={form.observations} onChange={(e) => setForm({ ...form, observations: e.currentTarget.value })} />
                        </>
                    )}
                    {modal === 'workshops' && (
                        <>
                            <TextInput label="Taller" required value={form.workshopName} onChange={(e) => setForm({ ...form, workshopName: e.currentTarget.value })} />
                            <TextInput label="Tipo de trabajo" value={form.workType} onChange={(e) => setForm({ ...form, workType: e.currentTarget.value })} />
                            <Group grow>
                                <NumberInput label="Cantidad" value={form.quantityDelivered} onChange={(v) => setForm({ ...form, quantityDelivered: v || 0 })} />
                                <NumberInput label="Precio unitario" min={0.01} value={form.unitPrice} onChange={(v) => setForm({ ...form, unitPrice: v || 0 })} />
                            </Group>
                            <DateInput label="Entrega a taller" value={form.deliveryToWorkshopDate} onChange={(v) => setForm({ ...form, deliveryToWorkshopDate: v })} />
                        </>
                    )}
                    {modal === 'delivery' && (
                        <DateInput label="Fecha entrega producción" value={form.productionDeliveryDate} onChange={(v) => setForm({ ...form, productionDeliveryDate: v })} />
                    )}
                    {modal === 'solicitar' ? (
                        <Button onClick={confirmarSolicitud} disabled={form.loading || form.alreadyRequested || (Number(form.toPurchase) > 0 && !form.tipoRequisicionId)}>
                            Confirmar
                        </Button>
                    ) : (
                        <Button onClick={saveModal}>Guardar</Button>
                    )}
                </Stack>
            </Modal>
        </Stack>
    );
}
