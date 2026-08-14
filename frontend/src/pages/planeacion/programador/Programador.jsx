import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActionIcon,
    Button,
    Card,
    Group,
    Modal,
    SegmentedControl,
    Select,
    Stack,
    Tabs,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconChevronLeft, IconChevronRight, IconRefresh, IconSearch, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import '@mantine/dates/styles.css';
import { schedulingApi, STATUS_FILTERS } from '../../../services/schedulingApi';
import PlaneacionProgramWizard from './PlaneacionProgramWizard';
import PlaneacionListaView from './PlaneacionListaView';
import PlaneacionGanttView from './PlaneacionGanttView';
import PlaneacionRosterView from './PlaneacionRosterView';
import PlaneacionProcesosModal from './PlaneacionProcesosModal';
import PlaneacionMetaMesModal from './PlaneacionMetaMesModal';
import {
    buildDayHourWindow,
    buildWeeks,
    shiftViewPeriod,
    toBlockPayload,
    weekIndexForDay,
    ZOOM_MODES,
} from './planeacionGanttUtils';
import './Programador.css';

const MONTH_NAMES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

const BLOCK_TYPE_OPTIONS = [
    { value: 'Op', label: 'Produccion (OP)' },
    { value: 'Capacitacion', label: 'Capacitacion' },
    { value: 'Limpieza', label: 'Limpieza' },
];

export default function Programador() {
    const now = new Date();
    const [year, setYear] = useState(now.getFullYear());
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [zoomMode, setZoomMode] = useState('mes');
    const [weekIndex, setWeekIndex] = useState(weekIndexForDay(now.getDate()));
    const [selectedDay, setSelectedDay] = useState(now.getDate());
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [viewTab, setViewTab] = useState('gantt');
    const [processManageMode, setProcessManageMode] = useState(false);
    const [procesosModalOpen, setProcesosModalOpen] = useState(false);
    const [metaMesOpen, setMetaMesOpen] = useState(false);
    const [billingSummary, setBillingSummary] = useState(null);
    const [refreshKey, setRefreshKey] = useState(0);
    const [loading, setLoading] = useState(false);
    const [gantt, setGantt] = useState(null);
    const [openOrders, setOpenOrders] = useState([]);
    const [scheduleModal, setScheduleModal] = useState(false);
    const [wizardOpen, setWizardOpen] = useState(false);
    const [auxModal, setAuxModal] = useState({ opened: false, blockType: 'Capacitacion' });
    const [editBlock, setEditBlock] = useState(null);
    const [savingBlock, setSavingBlock] = useState(false);
    const [shifts, setShifts] = useState([]);
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
            const [data, billing] = await Promise.all([
                schedulingApi.getGantt({ year, month, q: debouncedSearch || undefined, status: statusFilter || undefined }),
                schedulingApi.getBillingSummary({ year, month }),
            ]);
            setGantt(data);
            setBillingSummary(billing);
        } catch (error) {
            notifications.show({
                title: 'Error al cargar planeacion',
                message: error?.message || 'No se pudo cargar el Gantt.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    }, [year, month, debouncedSearch, statusFilter]);

    const bumpRefresh = () => setRefreshKey((v) => v + 1);

    const loadOpenOrders = useCallback(async () => {
        try {
            const rows = await schedulingApi.listOpenOrders();
            setOpenOrders(Array.isArray(rows) ? rows : []);
        } catch {
            setOpenOrders([]);
        }
    }, []);

    const loadShifts = useCallback(async () => {
        try {
            const rows = await schedulingApi.listShifts();
            setShifts(Array.isArray(rows) ? rows : []);
        } catch {
            setShifts([]);
        }
    }, []);

    useEffect(() => {
        loadGantt();
    }, [loadGantt]);

    useEffect(() => {
        loadShifts();
    }, [loadShifts]);

    useEffect(() => {
        loadOpenOrders();
    }, [loadOpenOrders]);

    const processes = gantt?.processes || [];
    const blocks = gantt?.blocks || [];
    const weeksInMonth = useMemo(() => buildWeeks(year, month), [year, month]);
    const dayHourWindow = useMemo(() => buildDayHourWindow(shifts), [shifts]);

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

    const goToday = () => {
        const today = new Date();
        setYear(today.getFullYear());
        setMonth(today.getMonth() + 1);
        setWeekIndex(weekIndexForDay(today.getDate()));
        setSelectedDay(today.getDate());
    };

    const applyPeriod = (period) => {
        setYear(period.year);
        setMonth(period.month);
        setWeekIndex(period.weekIndex);
        setSelectedDay(period.selectedDay);
        if (period.zoomMode) setZoomMode(period.zoomMode);
    };

    const shiftPeriod = (delta) => {
        applyPeriod(shiftViewPeriod({ year, month, zoomMode, weekIndex, selectedDay }, delta));
    };

    const handleSelectWeek = (index) => {
        setWeekIndex(index);
        setZoomMode('semana');
        const week = weeksInMonth[index];
        if (week) setSelectedDay(week.startDay);
    };

    const handleSelectDay = (day) => {
        setSelectedDay(day);
        setWeekIndex(weekIndexForDay(day));
        setZoomMode('dia');
    };

    const openAuxModal = (blockType) => {
        resetForm();
        setForm((prev) => ({ ...prev, blockType, manufacturingOrderId: '' }));
        setAuxModal({ opened: true, blockType });
        setScheduleModal(true);
    };

    const handleSaved = () => {
        loadGantt();
        bumpRefresh();
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
            handleSaved();
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
            handleSaved();
        } catch (error) {
            notifications.show({
                title: 'Error al eliminar',
                message: error?.message || 'No se pudo eliminar el bloque.',
                color: 'red',
            });
        }
    };

    const handleMoveBlock = async (block, patch) => {
        setSavingBlock(true);
        const previous = gantt;
        setGantt((current) => {
            if (!current?.blocks) return current;
            return {
                ...current,
                blocks: current.blocks.map((item) => (
                    item.id === block.id
                        ? { ...item, ...patch }
                        : item
                )),
            };
        });
        try {
            await schedulingApi.updateBlock(block.id, toBlockPayload(block, patch));
            handleSaved();
        } catch (error) {
            setGantt(previous);
            notifications.show({
                title: 'No se pudo mover',
                message: error?.message || 'Hay un cruce de horario o datos invalidos.',
                color: 'red',
            });
        } finally {
            setSavingBlock(false);
        }
    };

    const handleDeleteBlock = async (block) => {
        if (!window.confirm(`Eliminar "${block.opNumber || block.blockType}"?`)) return;
        setSavingBlock(true);
        try {
            await schedulingApi.deleteBlock(block.id);
            notifications.show({ title: 'Eliminado', message: 'Actividad eliminada.', color: 'green' });
            handleSaved();
        } catch (error) {
            notifications.show({
                title: 'Error al eliminar',
                message: error?.message || 'No se pudo eliminar.',
                color: 'red',
            });
        } finally {
            setSavingBlock(false);
        }
    };

    const handleDropAux = async ({ blockType, processCode, plannedStart, plannedEnd }) => {
        setSavingBlock(true);
        try {
            await schedulingApi.createBlock({
                manufacturingOrderId: null,
                processCode,
                blockType,
                plannedStart,
                plannedEnd,
                sortOrder: 0,
                notes: null,
            });
            notifications.show({ title: 'Programado', message: `${blockType} agregada al Gantt.`, color: 'green' });
            handleSaved();
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error?.message || 'No se pudo crear la actividad.',
                color: 'red',
            });
        } finally {
            setSavingBlock(false);
        }
    };

    const startAuxDrag = (event, blockType) => {
        event.dataTransfer.setData('application/x-perlax-aux', blockType);
        event.dataTransfer.setData('text/plain', blockType);
        event.dataTransfer.effectAllowed = 'copy';
    };

    const periodLabel = useMemo(() => {
        if (zoomMode === 'dia') {
            return `${selectedDay} ${MONTH_NAMES[month - 1]} ${year}`;
        }
        if (zoomMode === 'semana') {
            const week = weeksInMonth[weekIndex];
            return week ? `Semana ${week.label} (${week.rangeLabel})` : `${MONTH_NAMES[month - 1]} ${year}`;
        }
        return `${MONTH_NAMES[month - 1]} ${year}`;
    }, [zoomMode, selectedDay, month, year, weeksInMonth, weekIndex]);

    return (
        <Stack gap="md">
            <Group justify="space-between" align="flex-end" wrap="wrap">
                <div>
                    <Title order={2}>Planeacion de Maquinas</Title>
                    <Text c="dimmed" size="sm">Programacion mensual de procesos productivos (OP, capacitacion, limpieza).</Text>
                </div>
                <Group gap="sm" wrap="wrap">
                    <Button onClick={() => setWizardOpen(true)}>+ Programar OP</Button>
                    <Button color="teal" variant="light" onClick={() => setMetaMesOpen(true)}>Meta mes</Button>
                    <Button
                        variant={processManageMode ? 'filled' : 'light'}
                        color={processManageMode ? 'teal' : undefined}
                        onClick={() => setProcessManageMode((v) => !v)}
                    >
                        Procesos
                    </Button>
                    <Button
                        variant="light"
                        draggable
                        onDragStart={(event) => startAuxDrag(event, 'Capacitacion')}
                        onClick={() => openAuxModal('Capacitacion')}
                    >
                        Capacitacion
                    </Button>
                    <Button
                        variant="light"
                        draggable
                        onDragStart={(event) => startAuxDrag(event, 'Limpieza')}
                        onClick={() => openAuxModal('Limpieza')}
                    >
                        Limpieza
                    </Button>
                    <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => { loadGantt(); bumpRefresh(); }} loading={loading}>
                        Actualizar
                    </Button>
                </Group>
            </Group>

            <Card withBorder padding="md" className="planeacion-gantt">
                <Group justify="space-between" mb="md" wrap="wrap" className="planeacion-gantt__toolbar">
                    <Group gap="xs" wrap="wrap">
                        <ActionIcon variant="light" onClick={() => shiftPeriod(-1)} aria-label="Periodo anterior">
                            <IconChevronLeft size={16} />
                        </ActionIcon>
                        <Button variant="subtle" size="compact-sm" onClick={goToday}>Hoy</Button>
                        <Text className="planeacion-gantt__month-label">{periodLabel}</Text>
                        <ActionIcon variant="light" onClick={() => shiftPeriod(1)} aria-label="Periodo siguiente">
                            <IconChevronRight size={16} />
                        </ActionIcon>
                        <SegmentedControl
                            value={zoomMode}
                            onChange={(value) => {
                                setZoomMode(value);
                                if (value === 'semana' && !weeksInMonth[weekIndex]) setWeekIndex(0);
                            }}
                            data={ZOOM_MODES}
                        />
                    </Group>
                    <Group gap="sm" wrap="wrap">
                        <SegmentedControl
                            value={statusFilter}
                            onChange={setStatusFilter}
                            data={STATUS_FILTERS.map((f) => ({ value: f.value, label: f.label }))}
                        />
                        <TextInput
                            placeholder="Buscar OP, OT o cliente"
                            leftSection={<IconSearch size={16} />}
                            value={search}
                            onChange={(e) => setSearch(e.currentTarget.value)}
                            w={280}
                        />
                    </Group>
                </Group>

                {(zoomMode === 'mes' || zoomMode === 'semana') && (
                    <Group gap="xs" mb="md" className="planeacion-gantt__week-chips">
                        {weeksInMonth.map((week) => (
                            <button
                                key={week.label}
                                type="button"
                                className={`planeacion-gantt__week-chip ${week.colorClass}${zoomMode === 'semana' && weekIndex === week.index ? ' planeacion-gantt__week-chip--active' : ''}`}
                                onClick={() => handleSelectWeek(week.index)}
                                title={week.rangeLabel}
                            >
                                {week.label}
                            </button>
                        ))}
                    </Group>
                )}

                <Tabs value={viewTab} onChange={setViewTab}>
                    <Tabs.List mb="md">
                        <Tabs.Tab value="gantt">Gantt</Tabs.Tab>
                        <Tabs.Tab value="lista">Lista</Tabs.Tab>
                        <Tabs.Tab value="roster">Roster</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="gantt">
                        <PlaneacionGanttView
                            year={year}
                            month={month}
                            monthName={`${MONTH_NAMES[month - 1]} ${year}`}
                            zoomMode={zoomMode}
                            weekIndex={weekIndex}
                            selectedDay={selectedDay}
                            processes={processes}
                            blocksByProcess={blocksByProcess}
                            onSelectWeek={handleSelectWeek}
                            onSelectDay={handleSelectDay}
                            onEditBlock={openEditModal}
                            onMoveBlock={handleMoveBlock}
                            onDeleteBlock={handleDeleteBlock}
                            onDropAux={handleDropAux}
                            processManageMode={processManageMode}
                            onManageProcesses={() => setProcesosModalOpen(true)}
                            onProcessChanged={handleSaved}
                            billingSummary={billingSummary}
                            onDefineMeta={() => setMetaMesOpen(true)}
                            dayHourWindow={dayHourWindow}
                        />

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
                            {savingBlock && <span className="planeacion-gantt__saving">guardando...</span>}
                            <span className="planeacion-gantt__hint">Arrastre barras para mover. Bordes para redimensionar. Clic derecho para editar. Arrastre Capacitacion/Limpieza a una fila.</span>
                        </div>
                    </Tabs.Panel>

                    <Tabs.Panel value="lista">
                        <PlaneacionListaView
                            year={year}
                            month={month}
                            search={debouncedSearch}
                            statusFilter={statusFilter}
                            refreshKey={refreshKey}
                            onRefresh={handleSaved}
                            onEditBlock={openEditModal}
                        />
                    </Tabs.Panel>

                    <Tabs.Panel value="roster" keepMounted={false}>
                        {viewTab === 'roster' && (
                            <PlaneacionRosterView
                                year={year}
                                month={month}
                                selectedDay={selectedDay}
                                processes={processes}
                                refreshKey={refreshKey}
                                onRefresh={handleSaved}
                            />
                        )}
                    </Tabs.Panel>
                </Tabs>
            </Card>

            <PlaneacionProgramWizard
                opened={wizardOpen}
                onClose={() => setWizardOpen(false)}
                processes={processes}
                defaultYear={year}
                defaultMonth={month}
                onSaved={handleSaved}
            />

            <PlaneacionProcesosModal
                opened={procesosModalOpen}
                onClose={() => setProcesosModalOpen(false)}
                onChanged={handleSaved}
            />

            <PlaneacionMetaMesModal
                opened={metaMesOpen}
                onClose={() => setMetaMesOpen(false)}
                year={year}
                month={month}
                monthName={MONTH_NAMES[month - 1]}
                onSaved={loadGantt}
            />

            <Modal
                opened={scheduleModal}
                onClose={closeScheduleModal}
                title={editBlock ? 'Editar programacion' : (form.blockType === 'Op' ? 'Programar bloque OP' : `Programar ${form.blockType}`)}
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