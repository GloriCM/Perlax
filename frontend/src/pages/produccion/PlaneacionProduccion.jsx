import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActionIcon,
    Button,
    Card,
    Group,
    Modal,
    Select,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconChevronLeft, IconChevronRight, IconRefresh, IconSearch, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import '@mantine/dates/styles.css';
import { schedulingApi } from '../../services/schedulingApi';
import './PlaneacionProduccion.css';

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const BLOCK_TYPE_OPTIONS = [
    { value: 'Op', label: 'Produccion (OP)' },
    { value: 'Capacitacion', label: 'Capacitacion' },
    { value: 'Limpieza', label: 'Limpieza' },
];

const blockClass = (blockType) => {
    if (blockType === 'Capacitacion') return 'planeacion-gantt__block--capacitacion';
    if (blockType === 'Limpieza') return 'planeacion-gantt__block--limpieza';
    return 'planeacion-gantt__block--op';
};

const blockLabel = (block) => {
    if (block.blockType === 'Op') return block.opNumber || 'OP';
    if (block.blockType === 'Capacitacion') return 'Capacitacion';
    if (block.blockType === 'Limpieza') return 'Limpieza';
    return block.blockType;
};

function clipBlockDays(block, year, month, daysInMonth) {
    const start = new Date(block.plannedStart);
    const end = new Date(block.plannedEnd);
    let startDay = start.getUTCDate();
    let endDay = end.getUTCDate();

    if (start.getUTCFullYear() < year || (start.getUTCFullYear() === year && start.getUTCMonth() + 1 < month)) {
        startDay = 1;
    }
    if (end.getUTCFullYear() > year || (end.getUTCFullYear() === year && end.getUTCMonth() + 1 > month)) {
        endDay = daysInMonth;
    }

    if (start.getUTCFullYear() > year || (start.getUTCFullYear() === year && start.getUTCMonth() + 1 > month)) {
        return null;
    }
    if (end.getUTCFullYear() < year || (end.getUTCFullYear() === year && end.getUTCMonth() + 1 < month)) {
        return null;
    }

    return { startDay, endDay, span: Math.max(1, endDay - startDay + 1) };
}

export default function PlaneacionProduccion() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const [gantt, setGantt] = useState(null);
    const [openOrders, setOpenOrders] = useState([]);
    const [scheduleModal, setScheduleModal] = useState(false);
    const [editBlock, setEditBlock] = useState(null);
    const [form, setForm] = useState({
        manufacturingOrderId: '',
        processCode: '',
        blockType: 'Op',
        plannedStart: new Date(),
        plannedEnd: new Date(),
        notes: '',
    });

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search.trim()), 350);
        return () => clearTimeout(timer);
    }, [search]);

    const loadGantt = useCallback(async () => {
        setLoading(true);
        try {
            const data = await schedulingApi.getGantt({ year, month, q: debouncedSearch || undefined });
            setGantt(data);
        } catch (error) {
            notifications.show({
                title: 'Error al cargar planeacion',
                message: error?.message || 'No se pudo cargar el Gantt.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    }, [year, month, debouncedSearch]);

    const loadOpenOrders = useCallback(async () => {
        try {
            const rows = await schedulingApi.listOpenOrders();
            setOpenOrders(Array.isArray(rows) ? rows : []);
        } catch {
            setOpenOrders([]);
        }
    }, []);

    useEffect(() => {
        loadGantt();
    }, [loadGantt]);

    useEffect(() => {
        loadOpenOrders();
    }, [loadOpenOrders]);

    const processes = gantt?.processes || [];
    const blocks = gantt?.blocks || [];
    const weeks = gantt?.weeks || [];
    const daysInMonth = gantt?.daysInMonth || 30;

    const blocksByProcess = useMemo(() => {
        const map = {};
        processes.forEach((p) => { map[p.code] = []; });
        blocks.forEach((block) => {
            if (!map[block.processCode]) map[block.processCode] = [];
            map[block.processCode].push(block);
        });
        return map;
    }, [blocks, processes]);

    const orderOptions = useMemo(() => openOrders.map((row) => ({
        value: row.id,
        label: `${row.opNumber} | ${row.otNumber} | ${row.clientName}`,
    })), [openOrders]);

    const processOptions = useMemo(() => processes.map((p) => ({
        value: p.code,
        label: p.label,
    })), [processes]);

    const shiftMonth = (delta) => {
        const date = new Date(Date.UTC(year, month - 1 + delta, 1));
        setYear(date.getUTCFullYear());
        setMonth(date.getUTCMonth() + 1);
    };

    const resetForm = () => {
        setForm({
            manufacturingOrderId: '',
            processCode: processes[0]?.code || '',
            blockType: 'Op',
            plannedStart: new Date(Date.UTC(year, month - 1, 1)),
            plannedEnd: new Date(Date.UTC(year, month - 1, 1)),
            notes: '',
        });
        setEditBlock(null);
    };

    const openScheduleModal = () => {
        resetForm();
        setScheduleModal(true);
    };

    const openEditModal = (block) => {
        setEditBlock(block);
        setForm({
            manufacturingOrderId: block.manufacturingOrderId || '',
            processCode: block.processCode,
            blockType: block.blockType || 'Op',
            plannedStart: new Date(block.plannedStart),
            plannedEnd: new Date(block.plannedEnd),
            notes: block.notes || '',
        });
        setScheduleModal(true);
    };

    const closeScheduleModal = () => {
        setScheduleModal(false);
        setEditBlock(null);
    };

    const handleSave = async () => {
        if (!form.processCode) {
            notifications.show({ title: 'Datos incompletos', message: 'Seleccione un proceso.', color: 'orange' });
            return;
        }
        if (form.blockType === 'Op' && !form.manufacturingOrderId) {
            notifications.show({ title: 'Datos incompletos', message: 'Seleccione una OP.', color: 'orange' });
            return;
        }

        const payload = {
            manufacturingOrderId: form.blockType === 'Op' ? form.manufacturingOrderId : null,
            processCode: form.processCode,
            blockType: form.blockType,
            plannedStart: form.plannedStart,
            plannedEnd: form.plannedEnd,
            sortOrder: 0,
            notes: form.notes || null,
        };

        try {
            if (editBlock) {
                await schedulingApi.updateBlock(editBlock.id, payload);
                notifications.show({ title: 'Actualizado', message: 'Bloque actualizado.', color: 'green' });
            } else {
                await schedulingApi.createBlock(payload);
                notifications.show({ title: 'Programado', message: 'OP programada en el Gantt.', color: 'green' });
            }
            closeScheduleModal();
            loadGantt();
        } catch (error) {
            notifications.show({
                title: 'Error al guardar',
                message: error?.message || 'No se pudo guardar la programacion.',
                color: 'red',
            });
        }
    };

    const handleDelete = async () => {
        if (!editBlock) return;
        try {
            await schedulingApi.deleteBlock(editBlock.id);
            notifications.show({ title: 'Eliminado', message: 'Bloque eliminado del Gantt.', color: 'green' });
            closeScheduleModal();
            loadGantt();
        } catch (error) {
            notifications.show({
                title: 'Error al eliminar',
                message: error?.message || 'No se pudo eliminar el bloque.',
                color: 'red',
            });
        }
    };

    const gridStyle = {
        '--gantt-days': daysInMonth,
    };

    return (
        <Stack gap="md">
            <Group justify="space-between" align="flex-end" wrap="wrap">
                <div>
                    <Title order={2}>Planeacion de Maquinas</Title>
                    <Text c="dimmed" size="sm">Programacion mensual de procesos productivos (OP, capacitacion, limpieza).</Text>
                </div>
                <Group gap="sm">
                    <Button onClick={openScheduleModal}>Programar OP</Button>
                    <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={loadGantt} loading={loading}>
                        Actualizar
                    </Button>
                </Group>
            </Group>

            <Card withBorder padding="md" className="planeacion-gantt">
                <Group justify="space-between" mb="md" wrap="wrap" className="planeacion-gantt__toolbar">
                    <Group gap="xs">
                        <ActionIcon variant="light" onClick={() => shiftMonth(-1)} aria-label="Mes anterior">
                            <IconChevronLeft size={16} />
                        </ActionIcon>
                        <Text className="planeacion-gantt__month-label">{`${MONTH_NAMES[month - 1]} ${year}`}</Text>
                        <ActionIcon variant="light" onClick={() => shiftMonth(1)} aria-label="Mes siguiente">
                            <IconChevronRight size={16} />
                        </ActionIcon>
                    </Group>
                    <TextInput
                        placeholder="Buscar OP, OT o cliente"
                        leftSection={<IconSearch size={16} />}
                        value={search}
                        onChange={(e) => setSearch(e.currentTarget.value)}
                        w={280}
                    />
                </Group>

                <div className="planeacion-gantt__scroll">
                    <div className="planeacion-gantt__grid" style={gridStyle}>
                        <div className="planeacion-gantt__week-row">
                            <div className="planeacion-gantt__corner">Proceso</div>
                            {weeks.map((week) => (
                                <div
                                    key={week.label}
                                    className="planeacion-gantt__week-cell"
                                    style={{ gridColumn: `${week.startDay + 1} / ${week.endDay + 2}` }}
                                >
                                    {week.label}
                                </div>
                            ))}
                        </div>

                        {processes.map((process) => (
                            <div key={process.code} className="planeacion-gantt__process-row">
                                <div className="planeacion-gantt__process-label">{process.label}</div>
                                <div className="planeacion-gantt__day-cells" style={gridStyle}>
                                    {Array.from({ length: daysInMonth }, (_, idx) => (
                                        <div key={idx} className="planeacion-gantt__day-cell" />
                                    ))}
                                    {(blocksByProcess[process.code] || []).map((block) => {
                                        const span = clipBlockDays(block, year, month, daysInMonth);
                                        if (!span) return null;
                                        return (
                                            <div
                                                key={block.id}
                                                className={`planeacion-gantt__block ${blockClass(block.blockType)}`}
                                                style={{ gridColumn: `${span.startDay} / ${span.endDay + 1}` }}
                                                title={`${blockLabel(block)}${block.clientName ? ` - ${block.clientName}` : ''}`}
                                                onClick={() => openEditModal(block)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => { if (e.key === 'Enter') openEditModal(block); }}
                                            >
                                                {blockLabel(block)}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="planeacion-gantt__legend">
                    <span className="planeacion-gantt__legend-item">
                        <span className="planeacion-gantt__legend-dot" style={{ background: 'var(--gantt-block-op)' }} />
                        OP
                    </span>
                    <span className="planeacion-gantt__legend-item">
                        <span className="planeacion-gantt__legend-dot" style={{ background: 'var(--gantt-block-cap)' }} />
                        Capacitacion
                    </span>
                    <span className="planeacion-gantt__legend-item">
                        <span className="planeacion-gantt__legend-dot" style={{ background: 'var(--gantt-block-limp)' }} />
                        Limpieza
                    </span>
                </div>
            </Card>

            <Modal
                opened={scheduleModal}
                onClose={closeScheduleModal}
                title={editBlock ? 'Editar programacion' : 'Programar OP'}
                size="md"
            >
                <Stack gap="sm">
                    <Select
                        label="Tipo de bloque"
                        data={BLOCK_TYPE_OPTIONS}
                        value={form.blockType}
                        onChange={(value) => setForm((prev) => ({ ...prev, blockType: value || 'Op' }))}
                    />
                    {form.blockType === 'Op' && (
                        <Select
                            label="Orden de produccion"
                            placeholder="Seleccione OP"
                            searchable
                            data={orderOptions}
                            value={form.manufacturingOrderId}
                            onChange={(value) => setForm((prev) => ({ ...prev, manufacturingOrderId: value || '' }))}
                        />
                    )}
                    <Select
                        label="Proceso"
                        placeholder="Seleccione proceso"
                        data={processOptions}
                        value={form.processCode}
                        onChange={(value) => setForm((prev) => ({ ...prev, processCode: value || '' }))}
                    />
                    <DateInput
                        label="Fecha inicio"
                        value={form.plannedStart}
                        onChange={(value) => setForm((prev) => ({ ...prev, plannedStart: value || prev.plannedStart }))}
                    />
                    <DateInput
                        label="Fecha fin"
                        value={form.plannedEnd}
                        minDate={form.plannedStart}
                        onChange={(value) => setForm((prev) => ({ ...prev, plannedEnd: value || prev.plannedEnd }))}
                    />
                    <TextInput
                        label="Notas"
                        value={form.notes}
                        onChange={(e) => setForm((prev) => ({ ...prev, notes: e.currentTarget.value }))}
                    />
                    <Group justify="space-between" mt="md">
                        {editBlock ? (
                            <Button color="red" variant="light" leftSection={<IconTrash size={16} />} onClick={handleDelete}>
                                Eliminar
                            </Button>
                        ) : <span />}
                        <Group>
                            <Button variant="default" onClick={closeScheduleModal}>Cancelar</Button>
                            <Button onClick={handleSave}>{editBlock ? 'Guardar' : 'Programar'}</Button>
                        </Group>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}