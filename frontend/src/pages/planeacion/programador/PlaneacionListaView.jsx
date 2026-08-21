import { useCallback, useEffect, useState } from 'react';
import {
    Badge,
    Button,
    Group,
    ScrollArea,
    Table,
    Text,
} from '@mantine/core';
import { IconChevronDown, IconChevronUp, IconPencil, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { schedulingApi } from '../../../services/schedulingApi';

const STATUS_COLOR = {
    Programado: 'blue',
    EnProceso: 'cyan',
    Hecho: 'green',
    Cancelado: 'gray',
};

const formatDate = (value) => {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('es-CO');
};

export default function PlaneacionListaView({ year, month, search, statusFilter, refreshKey, onRefresh, onEditBlock }) {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState([]);
    const [expandedId, setExpandedId] = useState(null);

    const loadList = useCallback(async () => {
        setLoading(true);
        try {
            const data = await schedulingApi.getList({
                year,
                month,
                q: search || undefined,
                status: statusFilter || undefined,
            });
            setRows(Array.isArray(data) ? data : []);
        } catch (error) {
            notifications.show({
                title: 'Error al cargar lista',
                message: error?.message || 'No se pudo cargar la programacion.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    }, [year, month, search, statusFilter]);

    useEffect(() => {
        loadList();
    }, [loadList, refreshKey]);

    const handleDeleteProgram = async (manufacturingOrderId) => {
        if (!window.confirm('Eliminar toda la programacion de esta OP?')) return;
        try {
            await schedulingApi.deleteProgram(manufacturingOrderId);
            notifications.show({ title: 'Eliminado', message: 'Programacion eliminada.', color: 'green' });
            onRefresh?.();
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo eliminar.', color: 'red' });
        }
    };

    if (loading && rows.length === 0) {
        return <Text c="dimmed" size="sm">Cargando programaciones...</Text>;
    }

    if (rows.length === 0) {
        return <Text c="dimmed" size="sm">No hay OPs programadas en este periodo.</Text>;
    }

    return (
        <ScrollArea>
            <Table striped highlightOnHover withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>OP</Table.Th>
                        <Table.Th>OT / Cliente</Table.Th>
                        <Table.Th>Estado</Table.Th>
                        <Table.Th>Inicio</Table.Th>
                        <Table.Th>Fin</Table.Th>
                        <Table.Th>Procesos</Table.Th>
                        <Table.Th />
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.flatMap((row) => {
                        const expanded = expandedId === row.manufacturingOrderId;
                        const mainRow = (
                            <Table.Tr key={row.manufacturingOrderId}>
                                <Table.Td>
                                    <Group gap={6}>
                                        <Text fw={600}>{row.opNumber}</Text>
                                        {row.isUrgency ? <Badge color="red" size="xs">Urgencia</Badge> : null}
                                    </Group>
                                </Table.Td>
                                <Table.Td>
                                    <Text size="sm">{row.otNumber}</Text>
                                    <Text size="xs" c="dimmed">{row.clientName}</Text>
                                </Table.Td>
                                <Table.Td>
                                    <Badge color={STATUS_COLOR[row.generalStatus] || 'gray'} variant="light">
                                        {row.generalStatus}
                                    </Badge>
                                </Table.Td>
                                <Table.Td>{formatDate(row.plannedStart)}</Table.Td>
                                <Table.Td>{formatDate(row.plannedEnd)}</Table.Td>
                                <Table.Td>{row.processCount}</Table.Td>
                                <Table.Td>
                                    <Group gap={4}>
                                        <Button
                                            size="xs"
                                            variant="subtle"
                                            onClick={() => setExpandedId(expanded ? null : row.manufacturingOrderId)}
                                            leftSection={expanded ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
                                        >
                                            Detalle
                                        </Button>
                                        <Button
                                            size="xs"
                                            color="red"
                                            variant="subtle"
                                            leftSection={<IconTrash size={14} />}
                                            onClick={() => handleDeleteProgram(row.manufacturingOrderId)}
                                        >
                                            Quitar
                                        </Button>
                                    </Group>
                                </Table.Td>
                            </Table.Tr>
                        );
                        if (!expanded) return [mainRow];
                        return [
                            mainRow,
                            <Table.Tr key={`${row.manufacturingOrderId}-detail`}>
                                <Table.Td colSpan={7}>
                                    <Table withColumnBorders>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Proceso</Table.Th>
                                                <Table.Th>Inicio</Table.Th>
                                                <Table.Th>Fin</Table.Th>
                                                <Table.Th>Horas</Table.Th>
                                                <Table.Th>Estado</Table.Th>
                                                <Table.Th />
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {row.processes.map((proc) => (
                                                <Table.Tr key={proc.id}>
                                                    <Table.Td>{proc.processCode}</Table.Td>
                                                    <Table.Td>{formatDate(proc.plannedStart)}</Table.Td>
                                                    <Table.Td>{formatDate(proc.plannedEnd)}</Table.Td>
                                                    <Table.Td>{proc.estimatedHours ?? '—'}</Table.Td>
                                                    <Table.Td>{proc.status}</Table.Td>
                                                    <Table.Td>
                                                        <Button
                                                            size="xs"
                                                            variant="subtle"
                                                            leftSection={<IconPencil size={14} />}
                                                            onClick={() => onEditBlock?.(proc)}
                                                        >
                                                            Editar
                                                        </Button>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </Table.Td>
                            </Table.Tr>,
                        ];
                    })}
                </Table.Tbody>
            </Table>
        </ScrollArea>
    );
}