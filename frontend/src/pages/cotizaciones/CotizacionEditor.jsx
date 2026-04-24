import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    Badge,
    Box,
    Button,
    Card,
    Divider,
    Group,
    NumberInput,
    Radio,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Tabs,
    Text,
    TextInput,
    Textarea,
    Title
} from '@mantine/core';
import { IconCalculator, IconDeviceFloppy, IconPrinter, IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';

const TAB_KEYS = [
    'medidasTroquel', 'materiales', 'impresion', 'terminados', 'manija', 'ventanilla', 'procesos', 'talleres'
];

const EMPTY_TABS = {
    medidasTroquel: { costo: 0, notas: '' },
    materiales: { costo: 0, notas: '' },
    impresion: { costo: 0, notas: '' },
    terminados: { costo: 0, notas: '' },
    manija: { costo: 0, notas: '' },
    ventanilla: { costo: 0, notas: '' },
    procesos: { costo: 0, notas: '' },
    talleres: { costo: 0, notas: '' },
};

export default function CotizacionEditor({ mode = 'from-ot' }) {
    const navigate = useNavigate();
    const { otId } = useParams();
    const [quotationId, setQuotationId] = useState(null);
    const [validated, setValidated] = useState(null);
    const [selectedTier, setSelectedTier] = useState('');
    const [selectedPrice, setSelectedPrice] = useState(0);

    const [form, setForm] = useState({
        sourceType: mode === 'manual' ? 'Manual' : 'FromOT',
        productionOrderId: null,
        productionOrderNumber: '',
        clientName: '',
        prospectClientName: '',
        productName: '',
        freightType: 'Local',
        quantities: [1000, 2000, 3000, 5000, 10000],
        tabs: EMPTY_TABS,
        deliveryConditions: 'Entrega sujeta a programación de producción.',
        priceConditions: 'Precios sujetos a cambios según especificaciones finales.',
        overheadPercent: 8
    });

    useEffect(() => {
        if (mode !== 'from-ot' || !otId) return;
        const load = async () => {
            const orders = await api.get('/production/quotations/from-ot');
            const order = (orders || []).find(o => o.id === otId);
            if (!order) return;
            setForm(prev => ({
                ...prev,
                productionOrderId: order.id,
                productionOrderNumber: order.otNumber,
                clientName: order.cliente,
                productName: order.productName
            }));
        };
        load();
    }, [mode, otId]);

    const costsRequest = useMemo(() => ({
        quantities: form.quantities,
        freightType: form.freightType,
        materialCost: Number(form.tabs.materiales.costo || 0),
        printCost: Number(form.tabs.impresion.costo || 0),
        finishingCost: Number(form.tabs.terminados.costo || 0),
        handleCost: Number(form.tabs.manija.costo || 0),
        windowCost: Number(form.tabs.ventanilla.costo || 0),
        processCost: Number(form.tabs.procesos.costo || 0),
        workshopCost: Number(form.tabs.talleres.costo || 0),
        overheadPercent: Number(form.overheadPercent || 0)
    }), [form]);

    const saveQuotation = async () => {
        const payload = {
            sourceType: form.sourceType,
            productionOrderId: form.productionOrderId,
            productionOrderNumber: form.productionOrderNumber,
            clientName: form.clientName,
            prospectClientName: form.prospectClientName,
            productName: form.productName,
            freightType: form.freightType,
            quantities: form.quantities,
            tabsDataJson: JSON.stringify(form.tabs),
            deliveryConditions: form.deliveryConditions,
            priceConditions: form.priceConditions
        };

        const result = quotationId
            ? await api.put(`/production/quotations/${quotationId}`, payload)
            : await api.post('/production/quotations', payload);

        setQuotationId(result.id);
        notifications.show({ title: 'Cotización guardada', message: `Consecutivo ${result.quoteNumber}`, color: 'teal' });
    };

    const validateCosts = async () => {
        const data = await api.post('/production/quotations/validate-costs', costsRequest);
        setValidated(data);
        notifications.show({ title: 'Costos validados', message: 'Revisa el detalle y continúa a selección de precio.', color: 'blue' });
    };

    const finalizePrice = async () => {
        if (!quotationId || !selectedTier || !selectedPrice) return;
        await api.post(`/production/quotations/${quotationId}/select-price`, {
            selectedPriceTier: selectedTier,
            selectedUnitPrice: selectedPrice,
            deliveryConditions: form.deliveryConditions,
            priceConditions: form.priceConditions
        });
        notifications.show({ title: 'Precio seleccionado', message: `Se fijó precio ${selectedTier}.`, color: 'teal' });
    };

    const setQty = (index, value) => {
        const next = [...form.quantities];
        next[index] = Number(value || 0);
        setForm(prev => ({ ...prev, quantities: next }));
    };

    const setTabCost = (key, value) => {
        setForm(prev => ({
            ...prev,
            tabs: { ...prev.tabs, [key]: { ...prev.tabs[key], costo: Number(value || 0) } }
        }));
    };

    const pickTier = (tier) => {
        if (!validated?.details?.length) return;
        const first = validated.details[0];
        const prices = first.suggestedSalePrices;
        const unit = tier === 'Bajo' ? prices.bajo : tier === 'Ideal' ? prices.ideal : prices.optimo;
        setSelectedTier(tier);
        setSelectedPrice(unit);
    };

    return (
        <Stack p="md" gap="lg">
            <Group justify="space-between">
                <Stack gap={2}>
                    <Title order={2} c="white">
                        {mode === 'manual' ? 'Cotización Manual' : `Cotización desde OT ${form.productionOrderNumber || ''}`}
                    </Title>
                    <Text c="dimmed" size="sm">Flujo: Guardar → Validar costos → Seleccionar precio → Imprimir / Enviar.</Text>
                </Stack>
                <Group>
                    <Button color="green" leftSection={<IconDeviceFloppy size={16} />} onClick={saveQuotation}>Guardar</Button>
                    <Button variant="light" color="gray" leftSection={<IconX size={16} />} onClick={() => navigate('/')}>Cerrar</Button>
                </Group>
            </Group>

            <Card className="glass-card">
                <SimpleGrid cols={4}>
                    <TextInput label="Cliente" value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.currentTarget.value })} />
                    <TextInput label="Cliente prospecto (manual)" value={form.prospectClientName} onChange={(e) => setForm({ ...form, prospectClientName: e.currentTarget.value })} />
                    <TextInput label="Producto y referencia" value={form.productName} onChange={(e) => setForm({ ...form, productName: e.currentTarget.value })} />
                    <Select
                        label="Tipo de flete"
                        data={['Local', 'Nacional']}
                        value={form.freightType}
                        onChange={(v) => setForm({ ...form, freightType: v || 'Local' })}
                    />
                </SimpleGrid>
                <Divider my="md" label="Rangos de cantidades" />
                <SimpleGrid cols={5}>
                    {[0, 1, 2, 3, 4].map(i => (
                        <NumberInput key={i} label={`Cantidad ${i + 1}`} value={form.quantities[i]} onChange={(v) => setQty(i, v)} min={1} />
                    ))}
                </SimpleGrid>
            </Card>

            <Card className="glass-card">
                <Tabs defaultValue="medidasTroquel" variant="outline">
                    <Tabs.List>
                        <Tabs.Tab value="medidasTroquel">Medidas y troquel</Tabs.Tab>
                        <Tabs.Tab value="materiales">Materiales</Tabs.Tab>
                        <Tabs.Tab value="impresion">Impresión</Tabs.Tab>
                        <Tabs.Tab value="terminados">Terminados</Tabs.Tab>
                        <Tabs.Tab value="manija">Manija</Tabs.Tab>
                        <Tabs.Tab value="ventanilla">Ventanilla</Tabs.Tab>
                        <Tabs.Tab value="procesos">Procesos</Tabs.Tab>
                        <Tabs.Tab value="talleres">Talleres</Tabs.Tab>
                    </Tabs.List>

                    {TAB_KEYS.map(key => (
                        <Tabs.Panel key={key} value={key} pt="md">
                            <SimpleGrid cols={2}>
                                <NumberInput
                                    label={`Costo ${key}`}
                                    value={form.tabs[key].costo}
                                    onChange={(v) => setTabCost(key, v)}
                                    min={0}
                                />
                                <Textarea
                                    label="Notas técnicas"
                                    value={form.tabs[key].notas}
                                    onChange={(e) => setForm(prev => ({
                                        ...prev,
                                        tabs: { ...prev.tabs, [key]: { ...prev.tabs[key], notas: e.currentTarget.value } }
                                    }))}
                                />
                            </SimpleGrid>
                        </Tabs.Panel>
                    ))}
                </Tabs>
            </Card>

            <Card className="glass-card">
                <Group justify="space-between">
                    <Group>
                        <NumberInput
                            label="Overhead %"
                            value={form.overheadPercent}
                            min={0}
                            onChange={(v) => setForm({ ...form, overheadPercent: Number(v || 0) })}
                        />
                        <Button mt={24} leftSection={<IconCalculator size={16} />} onClick={validateCosts}>Validar costos</Button>
                    </Group>
                    <Group>
                        <Button variant="light" color="indigo" leftSection={<IconPrinter size={16} />} onClick={() => window.print()}>
                            Imprimir cotización
                        </Button>
                    </Group>
                </Group>

                {validated && (
                    <Box mt="lg">
                        <Divider my="sm" label="Detalle de validación de costos" />
                        <Table striped>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Cantidad</Table.Th>
                                    <Table.Th>Costo Unitario</Table.Th>
                                    <Table.Th>Precio Bajo</Table.Th>
                                    <Table.Th>Precio Ideal</Table.Th>
                                    <Table.Th>Precio Óptimo</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {validated.details.map((d) => (
                                    <Table.Tr key={d.quantity}>
                                        <Table.Td>{d.quantity}</Table.Td>
                                        <Table.Td>${d.totalUnitCost}</Table.Td>
                                        <Table.Td><Badge color="red">${d.suggestedSalePrices.bajo}</Badge></Table.Td>
                                        <Table.Td><Badge color="yellow">${d.suggestedSalePrices.ideal}</Badge></Table.Td>
                                        <Table.Td><Badge color="green">${d.suggestedSalePrices.optimo}</Badge></Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>

                        <Divider my="md" label="Escoja el precio de venta" />
                        <Radio.Group value={selectedTier} onChange={pickTier}>
                            <Group>
                                <Radio value="Bajo" label="Bajo" />
                                <Radio value="Ideal" label="Ideal" />
                                <Radio value="Optimo" label="Óptimo" />
                            </Group>
                        </Radio.Group>
                        <Text mt="sm">Precio unitario seleccionado: <b>${selectedPrice || 0}</b></Text>
                        <SimpleGrid cols={2} mt="md">
                            <Textarea
                                label="Condiciones de entrega"
                                value={form.deliveryConditions}
                                onChange={(e) => setForm({ ...form, deliveryConditions: e.currentTarget.value })}
                            />
                            <Textarea
                                label="Condiciones de precio"
                                value={form.priceConditions}
                                onChange={(e) => setForm({ ...form, priceConditions: e.currentTarget.value })}
                            />
                        </SimpleGrid>
                        <Button mt="md" onClick={finalizePrice} disabled={!quotationId || !selectedTier}>Siguiente / Confirmar precio</Button>
                    </Box>
                )}
            </Card>
        </Stack>
    );
}
