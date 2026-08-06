import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Badge,
    Button,
    Card,
    Group,
    Modal,
    NumberInput,
    ScrollArea,
    Stack,
    Table,
    Tabs,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconDoorEnter, IconRefresh, IconSearch } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import '@mantine/dates/styles.css';
import { calcQuantityToProduce, manufacturingOrdersApi } from '../../services/manufacturingOrdersApi';

const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-CO');
};

const formatNumber = (value) =>
    Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });

export default function AperturaProduccion() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('pendientes');
    const [loading, setLoading] = useState(false);
    const [pending, setPending] = useState([]);
    const [opened, setOpened] = useState([]);
    const [search, setSearch] = useState('');
    const [openModal, setOpenModal] = useState({ opened: false, row: null });
    const [openForm, setOpenForm] = useState({
        openingDate: new Date(),
        receiptPercentage: 10,
        quantityToProduce: 0,
    });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [pendingRows, openedRows] = await Promise.all([
                manufacturingOrdersApi.listPendingOpening(),
                manufacturingOrdersApi.listOpened(),
            ]);
            setPending(Array.isArray(pendingRows) ? pendingRows : []);
            setOpened(Array.isArray(openedRows) ? openedRows : []);
        } catch (error) {
            notifications.show({
                title: 'Error al cargar',
                message: error?.message || 'No se pudieron cargar las ordenes de produccion.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const filterRows = useCallback((rows) => {
        const term = search.trim().toLowerCase();
        if (!term) return rows;
        return rows.filter((row) =>
            [row.opNumber, row.orderNumber, row.otNumber, row.clientName, row.productName, row.referenceName]
                .filter(Boolean)
                .some((field) => String(field).toLowerCase().includes(term)));
    }, [search]);

    const pendingFiltered = useMemo(() => filterRows(pending), [filterRows, pending]);
    const openedFiltered = useMemo(() => filterRows(opened), [filterRows, opened]);

    const openOpenModal = (row) => {
        const receiptPercentage = Number(row.receiptPercentage ?? 10);
        setOpenForm({
            openingDate: new Date(),
            receiptPercentage,
            quantityToProduce: Number(row.quantityToProduce)
                || calcQuantityToProduce(row.quantityOrdered, receiptPercentage),
        });
        setOpenModal({ opened: true, row });
    };

    const closeOpenModal = () => setOpenModal({ opened: false, row: null });

    const handleReceiptChange = (value) => {
        const receiptPercentage = Number(value ?? 0);
        const row = openModal.row;
        setOpenForm((prev) => ({
            ...prev,
            receiptPercentage,
            quantityToProduce: calcQuantityToProduce(row?.quantityOrdered, receiptPercentage),
        }));
    };

    const handleOpenOrder = async () => {
        const row = openModal.row;
        if (!row?.id) return;
        if (!openForm.openingDate) {
            notifications.show({ title: 'Fecha requerida', message: 'Indique la fecha de apertura.', color: 'yellow' });
            return;
        }
        try {
            await manufacturingOrdersApi.open(row.id, {
                openingDate: openForm.openingDate,
                receiptPercentage: openForm.receiptPercentage,
                quantityToProduce: openForm.quantityToProduce,
            });
            notifications.show({
                title: 'OP abierta',
                message: `La orden ${row.opNumber} quedo en estado Abierta.`,
                color: 'green',
            });
            closeOpenModal();
            loadData();
        } catch (error) {
            notifications.show({
                title: 'No se pudo abrir',
                message: error?.message || 'Revise los datos e intente de nuevo.',
                color: 'red',
            });
        }
    };

    const renderPendingTable = () => (
        <ScrollArea>
            <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>OP</Table.Th>
                        <Table.Th>Pedido</Table.Th>
                        <Table.Th>OT</Table.Th>
                        <Table.Th>Cliente</Table.Th>
                        <Table.Th>Producto</Table.Th>
                        <Table.Th>Referencia</Table.Th>
                        <Table.Th>Cant. pedida</Table.Th>
                        <Table.Th>% recibo</Table.Th>
                        <Table.Th>Cant. a producir</Table.Th>
                        <Table.Th>Entrega</Table.Th>
                        <Table.Th></Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {pendingFiltered.length === 0 ? (
                        <Table.Tr>
                            <Table.Td colSpan={11}>
                                <Text ta="center" c="dimmed" py="md">
                                    {loading ? 'Cargando...' : 'No hay pedidos aprobados pendientes de apertura.'}
                                </Text>
                            </Table.Td>
                        </Table.Tr>
                    ) : pendingFiltered.map((row) => (
                        <Table.Tr key={row.id}>
                            <Table.Td><Text fw={700}>{row.opNumber}</Text></Table.Td>
                            <Table.Td>{row.orderNumber}</Table.Td>
                            <Table.Td>{row.otNumber}</Table.Td>
                            <Table.Td>{row.clientName}</Table.Td>
                            <Table.Td>{row.productName}</Table.Td>
                            <Table.Td>{row.referenceName || '—'}</Table.Td>
                            <Table.Td>{formatNumber(row.quantityOrdered)}</Table.Td>
                            <Table.Td>{formatNumber(row.receiptPercentage)}%</Table.Td>
                            <Table.Td>{formatNumber(row.quantityToProduce)}</Table.Td>
                            <Table.Td>{formatDate(row.agreedDeliveryDate)}</Table.Td>
                            <Table.Td>
                                <Button size="xs" leftSection={<IconDoorEnter size={14} />} onClick={() => openOpenModal(row)}>
                                    Abrir
                                </Button>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </ScrollArea>
    );

    const renderOpenedTable = () => (
        <ScrollArea>
            <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>OP</Table.Th>
                        <Table.Th>Pedido</Table.Th>
                        <Table.Th>Cliente</Table.Th>
                        <Table.Th>Producto</Table.Th>
                        <Table.Th>Cant. a producir</Table.Th>
                        <Table.Th>Fecha apertura</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        <Table.Th></Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {openedFiltered.length === 0 ? (
                        <Table.Tr>
                            <Table.Td colSpan={8}>
                                <Text ta="center" c="dimmed" py="md">
                                    {loading ? 'Cargando...' : 'Aun no hay ordenes abiertas.'}
                                </Text>
                            </Table.Td>
                        </Table.Tr>
                    ) : openedFiltered.map((row) => (
                        <Table.Tr key={row.id}>
                            <Table.Td><Text fw={700}>{row.opNumber}</Text></Table.Td>
                            <Table.Td>{row.orderNumber}</Table.Td>
                            <Table.Td>{row.clientName}</Table.Td>
                            <Table.Td>{row.productName}</Table.Td>
                            <Table.Td>{formatNumber(row.quantityToProduce)}</Table.Td>
                            <Table.Td>{formatDate(row.openingDate)}</Table.Td>
                            <Table.Td><Badge color="green">{row.status}</Badge></Table.Td>
                            <Table.Td>
                                <Button size="xs" variant="light" onClick={() => navigate(`/produccion/op/${row.id}`)}>
                                    Ver detalle
                                </Button>
                            </Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </ScrollArea>
    );

    return (
        <Stack gap="md" p="md">
            <Group justify="space-between" align="flex-end">
                <div>
                    <Title order={2}>Apertura de produccion</Title>
                    <Text c="dimmed" size="sm">
                        Genere y abra ordenes de produccion (OP) a partir de pedidos de cliente aprobados.
                    </Text>
                </div>
                <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={loadData} loading={loading}>
                    Actualizar
                </Button>
            </Group>

            <Card withBorder padding="md" radius="md">
                <TextInput
                    placeholder="Buscar por OP, pedido, OT, cliente o producto..."
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    mb="md"
                />

                <Tabs value={tab} onChange={setTab}>
                    <Tabs.List>
                        <Tabs.Tab value="pendientes">Pendientes ({pendingFiltered.length})</Tabs.Tab>
                        <Tabs.Tab value="abiertas">Abiertas ({openedFiltered.length})</Tabs.Tab>
                    </Tabs.List>
                    <Tabs.Panel value="pendientes" pt="md">{renderPendingTable()}</Tabs.Panel>
                    <Tabs.Panel value="abiertas" pt="md">{renderOpenedTable()}</Tabs.Panel>
                </Tabs>
            </Card>

            <Modal opened={openModal.opened} onClose={closeOpenModal} title="Abrir orden de produccion" centered>
                {openModal.row && (
                    <Stack gap="sm">
                        <Text size="sm"><strong>OP:</strong> {openModal.row.opNumber}</Text>
                        <Text size="sm"><strong>Cliente:</strong> {openModal.row.clientName}</Text>
                        <Text size="sm"><strong>Producto:</strong> {openModal.row.productName}</Text>
                        <DateInput
                            label="Fecha de apertura"
                            value={openForm.openingDate}
                            onChange={(v) => setOpenForm((f) => ({ ...f, openingDate: v }))}
                            required
                        />
                        <NumberInput
                            label="% recibo mercancia"
                            min={0}
                            max={100}
                            decimalScale={2}
                            value={openForm.receiptPercentage}
                            onChange={handleReceiptChange}
                        />
                        <NumberInput
                            label="Cantidad a producir"
                            min={1}
                            decimalScale={0}
                            value={openForm.quantityToProduce}
                            onChange={(v) => setOpenForm((f) => ({ ...f, quantityToProduce: Number(v || 0) }))}
                        />
                        <Group justify="flex-end" mt="sm">
                            <Button variant="default" onClick={closeOpenModal}>Cancelar</Button>
                            <Button onClick={handleOpenOrder}>Confirmar apertura</Button>
                        </Group>
                    </Stack>
                )}
            </Modal>
        </Stack>
    );
}