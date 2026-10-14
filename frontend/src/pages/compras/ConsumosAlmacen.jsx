import { useEffect, useMemo, useState } from 'react';
import {
    Button, Card, Group, NumberInput, Select, Stack, Table, Tabs, Text, TextInput, Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';
import { almacenApi } from '../../services/almacenApi';

export default function ConsumosAlmacen() {
    const [ops, setOps] = useState([]);
    const [consumptions, setConsumptions] = useState([]);
    const [stock, setStock] = useState([]);
    const [movements, setMovements] = useState([]);
    const [form, setForm] = useState({
        manufacturingOrderId: null,
        productId: null,
        productName: '',
        quantity: 1,
        unit: 'UND',
        unitCost: 0,
        deliveredTo: '',
        applicationDate: new Date(),
        notes: '',
    });
    const [entry, setEntry] = useState({ productId: null, productName: '', quantity: 1, unitCost: 0, reference: '' });
    const [productos, setProductos] = useState([]);

    const load = async () => {
        try {
            const [opened, cons, bal, mov, catalogo] = await Promise.all([
                api.get('/production/manufacturing-orders/opened'),
                api.get('/production/inventory/consumptions'),
                api.get('/production/inventory/stock'),
                api.get('/production/inventory/movements'),
                almacenApi.listProductos({}),
            ]);
            setOps(opened || []);
            setConsumptions(cons || []);
            setStock(bal || []);
            setMovements(mov || []);
            setProductos(Array.isArray(catalogo) ? catalogo : []);
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo cargar inventarios.', color: 'red' });
        }
    };

    useEffect(() => { load(); }, []);

    const productoOptions = useMemo(
        () => productos
            .filter((p) => p.activo !== false && p.id && p.nombre)
            .map((p) => ({ value: String(p.id), label: p.nombre })),
        [productos]
    );

    const applyProducto = (id, target) => {
        const p = productos.find((x) => String(x.id) === String(id));
        if (!p) return { ...target, productId: null, productName: '' };
        return {
            ...target,
            productId: p.id,
            productName: p.nombre,
            unit: p.unidadSugerida || target.unit,
            unitCost: Number(p.costoEstandar) || 0,
        };
    };

    const saveConsumption = async () => {
        if (!form.productId) {
            notifications.show({ title: 'Elija un producto del inventario', color: 'red' });
            return;
        }
        try {
            await api.post('/production/inventory/consumptions', form);
            notifications.show({ title: 'Aplicación registrada', color: 'green' });
            setForm({ ...form, productId: null, productName: '', quantity: 1, deliveredTo: '', notes: '' });
            load();
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo guardar.', color: 'red' });
        }
    };

    const saveEntry = async () => {
        if (!entry.productId) {
            notifications.show({ title: 'Elija un producto del inventario', color: 'red' });
            return;
        }
        try {
            await api.post('/production/inventory/stock/entries', entry);
            notifications.show({ title: 'Entrada registrada', color: 'green' });
            setEntry({ productId: null, productName: '', quantity: 1, unitCost: 0, reference: '' });
            load();
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo registrar entrada.', color: 'red' });
        }
    };

    return (
        <Stack gap="md" p="md">
            <Title order={2}>Consumos y saldos de almacén</Title>
            <Tabs defaultValue="consumo">
                <Tabs.List>
                    <Tabs.Tab value="consumo">Nuevo consumo</Tabs.Tab>
                    <Tabs.Tab value="aplicaciones">Aplicaciones</Tabs.Tab>
                    <Tabs.Tab value="saldos">Saldos</Tabs.Tab>
                    <Tabs.Tab value="movimientos">Historial</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="consumo" pt="md">
                    <Card withBorder>
                        <Stack>
                            <Select
                                label="OP abierta"
                                searchable
                                data={(ops || []).map((o) => ({ value: o.id, label: `${o.opNumber} · ${o.productName}` }))}
                                value={form.manufacturingOrderId}
                                onChange={(v) => setForm({ ...form, manufacturingOrderId: v })}
                            />
                            <Group grow>
                                <Select
                                    label="Producto"
                                    searchable
                                    placeholder="Buscar en el inventario..."
                                    nothingFoundMessage="No está en el inventario"
                                    data={productoOptions}
                                    value={form.productId ? String(form.productId) : null}
                                    limit={20}
                                    onChange={(id) => setForm((current) => applyProducto(id, current))}
                                />
                                <TextInput label="Entregado a" value={form.deliveredTo} onChange={(e) => setForm({ ...form, deliveredTo: e.currentTarget.value })} />
                            </Group>
                            <Group grow>
                                <NumberInput label="Cantidad" min={0} value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v || 0 })} />
                                <TextInput label="Unidad" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.currentTarget.value })} />
                                <NumberInput label="Costo unitario" min={0} value={form.unitCost} onChange={(v) => setForm({ ...form, unitCost: v || 0 })} />
                                <DateInput label="Fecha" value={form.applicationDate} onChange={(v) => setForm({ ...form, applicationDate: v })} />
                            </Group>
                            <Button onClick={saveConsumption}>Enviar aplicación</Button>
                        </Stack>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="aplicaciones" pt="md">
                    <Card withBorder>
                        <Table striped>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>No.</Table.Th>
                                    <Table.Th>Fecha</Table.Th>
                                    <Table.Th>OP</Table.Th>
                                    <Table.Th>Producto</Table.Th>
                                    <Table.Th>Cantidad</Table.Th>
                                    <Table.Th>Entregado a</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {consumptions.map((c) => (
                                    <Table.Tr key={c.id}>
                                        <Table.Td>{c.applicationNumber}</Table.Td>
                                        <Table.Td>{c.applicationDate ? new Date(c.applicationDate).toLocaleDateString('es-CO') : '—'}</Table.Td>
                                        <Table.Td>{c.opNumber}</Table.Td>
                                        <Table.Td>{c.productName}</Table.Td>
                                        <Table.Td>{c.quantity} {c.unit}</Table.Td>
                                        <Table.Td>{c.deliveredTo}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="saldos" pt="md">
                    <Card withBorder mb="md">
                        <Title order={5} mb="sm">Registrar entrada (compra/recepción)</Title>
                        <Group align="flex-end">
                            <Select
                                label="Producto"
                                searchable
                                placeholder="Buscar en el inventario..."
                                nothingFoundMessage="No está en el inventario"
                                data={productoOptions}
                                value={entry.productId ? String(entry.productId) : null}
                                limit={20}
                                style={{ minWidth: 280 }}
                                onChange={(id) => setEntry((current) => applyProducto(id, current))}
                            />
                            <NumberInput label="Cantidad" value={entry.quantity} onChange={(v) => setEntry({ ...entry, quantity: v || 0 })} />
                            <NumberInput label="Costo" value={entry.unitCost} onChange={(v) => setEntry({ ...entry, unitCost: v || 0 })} />
                            <TextInput label="Referencia" value={entry.reference} onChange={(e) => setEntry({ ...entry, reference: e.currentTarget.value })} />
                            <Button onClick={saveEntry}>Agregar</Button>
                        </Group>
                    </Card>
                    <Card withBorder>
                        <Table striped>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Producto</Table.Th>
                                    <Table.Th>Comprado</Table.Th>
                                    <Table.Th>Consumido</Table.Th>
                                    <Table.Th>Disponible</Table.Th>
                                    <Table.Th>Último costo</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {stock.map((s) => (
                                    <Table.Tr key={`${s.productId || s.productName}`}>
                                        <Table.Td>{s.productName}</Table.Td>
                                        <Table.Td>{s.purchased}</Table.Td>
                                        <Table.Td>{s.consumed}</Table.Td>
                                        <Table.Td fw={700}>{s.available}</Table.Td>
                                        <Table.Td>{s.lastUnitCost}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                </Tabs.Panel>

                <Tabs.Panel value="movimientos" pt="md">
                    <Card withBorder>
                        <Table striped>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Fecha</Table.Th>
                                    <Table.Th>Tipo</Table.Th>
                                    <Table.Th>Producto</Table.Th>
                                    <Table.Th>Cantidad</Table.Th>
                                    <Table.Th>Referencia</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {movements.map((m) => (
                                    <Table.Tr key={m.id}>
                                        <Table.Td>{m.movementDate ? new Date(m.movementDate).toLocaleDateString('es-CO') : '—'}</Table.Td>
                                        <Table.Td>{m.movementType}</Table.Td>
                                        <Table.Td>{m.productName}</Table.Td>
                                        <Table.Td>{m.quantity}</Table.Td>
                                        <Table.Td>{m.reference || '—'}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Card>
                </Tabs.Panel>
            </Tabs>
        </Stack>
    );
}
