import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Badge,
    Button,
    Card,
    Group,
    Modal,
    Progress,
    ScrollArea,
    SimpleGrid,
    Stack,
    Table,
    Text,
    Textarea,
    TextInput,
    Title,
} from '@mantine/core';
import { IconEye, IconFileText, IconLock, IconRefresh, IconSearch } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { manufacturingOrdersApi } from '../../../services/manufacturingOrdersApi';

const STATUS_FILTERS = [
    { value: '', label: 'Todas' },
    { value: 'Abierta', label: 'Abiertas' },
    { value: 'EnProduccion', label: 'En produccion' },
    { value: 'Terminada', label: 'Terminadas' },
    { value: 'Cerrada', label: 'Cerradas' },
];

const STATUS_META = {
    Abierta: { label: 'Abierta', color: 'blue' },
    EnProduccion: { label: 'En produccion', color: 'cyan' },
    Terminada: { label: 'Terminada', color: 'green' },
    Cerrada: { label: 'Cerrada', color: 'gray' },
};

const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-CO');
};

const formatNumber = (value) =>
    Number(value || 0).toLocaleString('es-CO', { maximumFractionDigits: 0 });

export default function EstadoOrdenesProduccion() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [allRows, setAllRows] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [closeModal, setCloseModal] = useState({ opened: false, row: null });
    const [importModal, setImportModal] = useState({ opened: false, loading: false, row: null, data: null });

    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await manufacturingOrdersApi.listStatusBoard();
            setAllRows(Array.isArray(data) ? data : []);
        } catch (error) {
            notifications.show({
                title: 'Error al cargar',
                message: error?.message || 'No se pudo cargar el estado de las ordenes.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const counts = useMemo(() => {
        const base = { '': allRows.length };
        allRows.forEach((row) => {
            base[row.displayStatus] = (base[row.displayStatus] || 0) + 1;
        });
        return base;
    }, [allRows]);

    const rows = useMemo(() => {
        const term = search.trim().toLowerCase();
        return allRows.filter((row) => {
            if (statusFilter && row.displayStatus !== statusFilter) return false;
            if (!term) return true;
            return [
                row.opNumber,
                row.orderNumber,
                row.otNumber,
                row.clientName,
                row.productName,
                row.referenceName,
                row.displayStatus,
            ].some((field) => String(field || '').toLowerCase().includes(term));
        });
    }, [allRows, search, statusFilter]);

    const handleClose = async () => {
        const row = closeModal.row;
        if (!row?.id) return;
        try {
            await manufacturingOrdersApi.close(row.id);
            notifications.show({
                title: 'OP cerrada',
                message: `La orden ${row.opNumber} fue cerrada.`,
                color: 'green',
            });
            setCloseModal({ opened: false, row: null });
            loadData();
        } catch (error) {
            notifications.show({
                title: 'No se pudo cerrar',
                message: error?.message || 'Revise e intente de nuevo.',
                color: 'red',
            });
        }
    };

    const openImportReview = async (row) => {
        setImportModal({ opened: true, loading: true, row, data: null });
        try {
            const res = await manufacturingOrdersApi.getLegacyImport(row.id);
            let parsed = null;
            if (res?.legacyImportJson) {
                try { parsed = JSON.parse(res.legacyImportJson); } catch { parsed = null; }
            }
            setImportModal({
                opened: true,
                loading: false,
                row,
                data: { ...res, parsed },
            });
        } catch (error) {
            setImportModal({ opened: false, loading: false, row: null, data: null });
            notifications.show({
                title: 'Sin textos importados',
                message: error?.message || 'No hay importación legacy para esta OP.',
                color: 'yellow',
            });
        }
    };

    const renderStatusBadge = (displayStatus) => {
        const meta = STATUS_META[displayStatus] || { label: displayStatus || '—', color: 'gray' };
        return <Badge color={meta.color}>{meta.label}</Badge>;
    };

    return (
        <Stack gap="md" p="md">
            <Group justify="space-between" align="flex-end">
                <div>
                    <Title order={2}>Estado de ordenes</Title>
                    <Text c="dimmed" size="sm">
                        Seguimiento de OP abiertas (incluye las cargadas en OP existente) con avance desde planta.
                    </Text>
                </div>
                <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={loadData} loading={loading}>
                    Actualizar
                </Button>
            </Group>

            <Card withBorder padding="md" radius="md">
                <Group gap="xs" mb="md" wrap="wrap">
                    {STATUS_FILTERS.map((filter) => (
                        <Button
                            key={filter.value || 'all'}
                            size="xs"
                            variant={statusFilter === filter.value ? 'filled' : 'light'}
                            onClick={() => setStatusFilter(filter.value)}
                        >
                            {filter.label} ({counts[filter.value] ?? 0})
                        </Button>
                    ))}
                </Group>

                <TextInput
                    placeholder="Buscar por OP, pedido, cliente, producto o estado..."
                    leftSection={<IconSearch size={16} />}
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    mb="md"
                />

                <ScrollArea>
                    <Table striped highlightOnHover withTableBorder>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>OP</Table.Th>
                                <Table.Th>Pedido</Table.Th>
                                <Table.Th>Cliente</Table.Th>
                                <Table.Th>Producto</Table.Th>
                                <Table.Th>Objetivo</Table.Th>
                                <Table.Th>Producido</Table.Th>
                                <Table.Th>Avance</Table.Th>
                                <Table.Th>Estado</Table.Th>
                                <Table.Th>Apertura</Table.Th>
                                <Table.Th>Entrega</Table.Th>
                                <Table.Th></Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {rows.length === 0 ? (
                                <Table.Tr>
                                    <Table.Td colSpan={11}>
                                        <Text ta="center" c="dimmed" py="md">
                                            {loading ? 'Cargando...' : 'No hay ordenes abiertas con ese filtro.'}
                                        </Text>
                                    </Table.Td>
                                </Table.Tr>
                            ) : rows.map((row) => (
                                <Table.Tr key={row.id}>
                                    <Table.Td>
                                        <Group gap={6} wrap="nowrap">
                                            <Text fw={700}>{row.opNumber}</Text>
                                            {row.isExistingOp && (
                                                <Badge size="xs" variant="light" color="indigo">Existente</Badge>
                                            )}
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>{row.orderNumber}</Table.Td>
                                    <Table.Td>{row.clientName}</Table.Td>
                                    <Table.Td>{row.productName}</Table.Td>
                                    <Table.Td>{formatNumber(row.quantityToProduce)}</Table.Td>
                                    <Table.Td>{formatNumber(row.quantityProduced)}</Table.Td>
                                    <Table.Td style={{ minWidth: 140 }}>
                                        <Group gap={6} wrap="nowrap">
                                            <Progress value={Number(row.progressPercent || 0)} size="sm" style={{ flex: 1 }} />
                                            <Text size="xs" w={42}>{Number(row.progressPercent || 0)}%</Text>
                                        </Group>
                                    </Table.Td>
                                    <Table.Td>{renderStatusBadge(row.displayStatus)}</Table.Td>
                                    <Table.Td>{formatDate(row.openingDate)}</Table.Td>
                                    <Table.Td>{formatDate(row.agreedDeliveryDate)}</Table.Td>
                                    <Table.Td>
                                        <Group gap={4} wrap="nowrap">
                                            <Button
                                                size="xs"
                                                variant="light"
                                                leftSection={<IconEye size={14} />}
                                                onClick={() => navigate(`/produccion/op/${row.id}`)}
                                            >
                                                Ver
                                            </Button>
                                            <Button
                                                size="xs"
                                                variant="subtle"
                                                leftSection={<IconFileText size={14} />}
                                                onClick={() => openImportReview(row)}
                                            >
                                                Textos
                                            </Button>
                                            {row.displayStatus !== 'Cerrada' && (
                                                <Button
                                                    size="xs"
                                                    color="gray"
                                                    variant="outline"
                                                    leftSection={<IconLock size={14} />}
                                                    onClick={() => setCloseModal({ opened: true, row })}
                                                >
                                                    Cerrar
                                                </Button>
                                            )}
                                        </Group>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            </Card>

            <Modal
                opened={closeModal.opened}
                onClose={() => setCloseModal({ opened: false, row: null })}
                title="Cerrar orden de produccion"
                centered
            >
                {closeModal.row && (
                    <Stack gap="sm">
                        <Text size="sm">
                            Confirma el cierre de la OP <strong>{closeModal.row.opNumber}</strong> ({closeModal.row.clientName}).
                        </Text>
                        <Text size="sm" c="dimmed">
                            Producido: {formatNumber(closeModal.row.quantityProduced)} de {formatNumber(closeModal.row.quantityToProduce)}.
                        </Text>
                        <Group justify="flex-end" mt="sm">
                            <Button variant="default" onClick={() => setCloseModal({ opened: false, row: null })}>
                                Cancelar
                            </Button>
                            <Button color="gray" onClick={handleClose}>Confirmar cierre</Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            <Modal
                opened={importModal.opened}
                onClose={() => setImportModal({ opened: false, loading: false, row: null, data: null })}
                title={importModal.row ? `Textos importados — OP ${importModal.row.opNumber}` : 'Textos importados'}
                size="xl"
                centered
            >
                {importModal.loading ? (
                    <Text c="dimmed">Cargando…</Text>
                ) : !importModal.data?.hasImport ? (
                    <Text c="dimmed">Esta OP no tiene textos de importación PDF guardados.</Text>
                ) : (
                    <Stack gap="md">
                        <Text size="sm" c="dimmed">
                            Guardado: {importModal.data.parsed?.importedAtUtc
                                ? new Date(importModal.data.parsed.importedAtUtc).toLocaleString('es-CO')
                                : '—'}
                            {importModal.data.parsed?.importedBy ? ` · ${importModal.data.parsed.importedBy}` : ''}
                        </Text>
                        <SimpleGrid cols={{ base: 1, md: 2 }}>
                            <Textarea
                                label={`Ficha (${importModal.data.parsed?.fichaFileName || 'PDF'})`}
                                minRows={14}
                                readOnly
                                value={importModal.data.parsed?.rawFichaText || ''}
                                styles={{ input: { fontFamily: 'monospace', fontSize: 11 } }}
                            />
                            <Textarea
                                label={`OP (${importModal.data.parsed?.opFileName || 'PDF'})`}
                                minRows={14}
                                readOnly
                                value={importModal.data.parsed?.rawOpText || ''}
                                styles={{ input: { fontFamily: 'monospace', fontSize: 11 } }}
                            />
                        </SimpleGrid>
                    </Stack>
                )}
            </Modal>
        </Stack>
    );
}