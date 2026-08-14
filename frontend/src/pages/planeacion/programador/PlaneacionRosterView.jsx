import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActionIcon,
    Alert,
    Badge,
    Button,
    Group,
    Loader,
    Modal,
    SegmentedControl,
    Select,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import { IconChevronLeft, IconChevronRight, IconPlus } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { schedulingApi } from '../../../services/schedulingApi';
import { dailyProductionApi } from '../../reportes/utils/dailyProductionApi';
import { formatWeekRange, getMondayOfWeek, shiftWeekStart } from './planeacionGanttUtils';
import PlaneacionHorariosView from './PlaneacionHorariosView';
import PlaneacionHorariosCatalogView from './PlaneacionHorariosCatalogView';
import PlaneacionCoberturaView from './PlaneacionCoberturaView';
import PlaneacionTurnosModal from './PlaneacionTurnosModal';

const ROSTER_SECTIONS = [
    { value: 'grilla', label: 'Grilla' },
    { value: 'horarios', label: 'Horarios' },
    { value: 'cobertura', label: 'Cobertura' },
    { value: 'turnos', label: 'Turnos' },
    { value: 'novedades', label: 'Novedades' },
];

const DAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];
const ROLE_TAGS = [
    { value: 'Op', label: 'Op' },
    { value: 'Ax', label: 'Ax' },
];

function formatShiftTime(value) {
    if (!value) return '';
    const parts = String(value).split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return m === '00' ? `${h12} ${ampm}` : `${h12}:${m} ${ampm}`;
}

function shiftDisplayLabel(shift) {
    if (!shift) return null;
    const start = formatShiftTime(shift.startTime);
    const end = formatShiftTime(shift.endTime);
    return `${start} - ${end}`;
}

function pickId(item) {
    return item?.id ?? item?.Id ?? null;
}

function pickLabel(item, ...keys) {
    for (const key of keys) {
        const value = item?.[key];
        if (value) return String(value);
    }
    return '';
}

function normalizeShiftCellValue(day, options) {
    if (!day || day.isOff) return 'off';
    if (!day.shiftId) return 'off';
    const str = String(day.shiftId);
    return options.some((o) => o.value === str) ? str : 'off';
}

function optionValueExists(value, options) {
    if (value == null || value === '') return false;
    return options.some((o) => o.value === String(value));
}

export default function PlaneacionRosterView({
    year,
    month,
    selectedDay,
    processes,
    refreshKey,
    onRefresh,
}) {
    const [weekStart, setWeekStart] = useState(() => getMondayOfWeek(year, month, selectedDay));
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [roster, setRoster] = useState(null);
    const [shifts, setShifts] = useState([]);
    const [operators, setOperators] = useState([]);
    const [machines, setMachines] = useState([]);
    const [rosterSection, setRosterSection] = useState('grilla');
    const [filterProcess, setFilterProcess] = useState('');
    const [filterPerson, setFilterPerson] = useState('');
    const [addOpen, setAddOpen] = useState(false);
    const [horariosOpen, setHorariosOpen] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    const [rowForm, setRowForm] = useState({ rowType: 'machine', processCode: '', machineId: null, operatorId: null, roleTag: 'Op' });

    useEffect(() => {
        setWeekStart(getMondayOfWeek(year, month, selectedDay));
    }, [year, month, selectedDay]);

    const loadMeta = useCallback(async () => {
        try {
            const [shiftRows, operatorRows, machineRows] = await Promise.all([
                schedulingApi.listShifts(),
                dailyProductionApi.listOperators(),
                dailyProductionApi.listMachines(),
            ]);
            setShifts(Array.isArray(shiftRows) ? shiftRows : []);
            setOperators(Array.isArray(operatorRows) ? operatorRows : []);
            setMachines(Array.isArray(machineRows) ? machineRows : []);
        } catch {
            setShifts([]);
            setOperators([]);
            setMachines([]);
        }
    }, []);

    const loadRoster = useCallback(async () => {
        setLoading(true);
        try {
            const q = [filterProcess, filterPerson].filter(Boolean).join(' ').trim() || undefined;
            const data = await schedulingApi.getRoster({ weekStart, q });
            setRoster(data);
        } catch (error) {
            notifications.show({
                title: 'Error al cargar roster',
                message: error?.message || 'No se pudo cargar el roster.',
                color: 'red',
            });
            setRoster(null);
        } finally {
            setLoading(false);
        }
    }, [weekStart, filterProcess, filterPerson]);

    useEffect(() => { loadMeta(); }, [loadMeta]);
    useEffect(() => { loadRoster(); }, [loadRoster, refreshKey]);

    const shiftOptions = useMemo(() => [
        { value: 'off', label: 'OFF' },
        ...shifts.map((s) => ({
            value: String(s.id ?? s.Id),
            label: `${s.name || s.Name || s.code || s.Code} (${shiftDisplayLabel(s) || ''})`,
        })),
    ], [shifts]);

    const processOptions = useMemo(() => (processes || []).map((p) => ({
        value: p.code,
        label: p.label,
    })), [processes]);

    const operatorOptions = useMemo(() => operators
        .map((o) => {
            const id = pickId(o);
            const label = pickLabel(o, 'displayName', 'DisplayName', 'name', 'Name', 'code', 'Code');
            if (!id || !label) return null;
            return { value: String(id), label };
        })
        .filter(Boolean), [operators]);

    const machineOptions = useMemo(() => machines
        .map((m) => {
            const id = pickId(m);
            const label = pickLabel(m, 'name', 'Name', 'code', 'Code');
            const processCode = m.processCode ?? m.ProcessCode ?? '';
            if (!id || !label) return null;
            return { value: String(id), label, processCode };
        })
        .filter(Boolean), [machines]);

    const handleDayChange = async (row, day, value) => {
        const days = row.days.map((d) => {
            if (d.dayOfWeek !== day.dayOfWeek) return { dayOfWeek: d.dayOfWeek, shiftId: d.shiftId, isOff: d.isOff };
            if (value === 'off') return { dayOfWeek: d.dayOfWeek, shiftId: null, isOff: true };
            return { dayOfWeek: d.dayOfWeek, shiftId: value, isOff: false };
        });
        setSaving(true);
        try {
            await schedulingApi.updateRosterRow(row.id, {
                weekStart,
                processCode: row.processCode,
                machineId: row.machineId,
                operatorId: row.operatorId,
                roleTag: row.roleTag,
                days,
            });
            await loadRoster();
            onRefresh?.();
        } catch (error) {
            notifications.show({
                title: 'Error al guardar',
                message: error?.message || 'No se pudo actualizar el dia.',
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    const openAddRow = () => {
        setEditingRow(null);
        setRowForm({
            rowType: 'machine',
            processCode: processOptions[0]?.value || '',
            machineId: machineOptions[0]?.value || null,
            operatorId: null,
            roleTag: 'Op',
        });
        setAddOpen(true);
    };

    const openEditRow = (row) => {
        setEditingRow(row);
        const operatorId = row.operatorId ? String(row.operatorId) : null;
        const isProcess = row.rowKind === 'process' || !row.machineId;
        setRowForm({
            rowType: isProcess ? 'process' : 'machine',
            processCode: optionValueExists(row.processCode, processOptions) ? row.processCode : (processOptions[0]?.value || ''),
            machineId: row.machineId ? String(row.machineId) : null,
            operatorId: optionValueExists(operatorId, operatorOptions) ? operatorId : null,
            roleTag: row.roleTag || 'Op',
        });
        setAddOpen(true);
    };

    const handleSaveRow = async () => {
        if (rowForm.rowType === 'machine' && !rowForm.machineId) {
            notifications.show({ title: 'Datos incompletos', message: 'Seleccione una maquina.', color: 'orange' });
            return;
        }
        if (rowForm.rowType === 'process' && !rowForm.processCode) {
            notifications.show({ title: 'Datos incompletos', message: 'Seleccione un proceso.', color: 'orange' });
            return;
        }
        setSaving(true);
        try {
            const selectedMachine = machineOptions.find((m) => m.value === rowForm.machineId);
            const payload = {
                weekStart,
                processCode: rowForm.rowType === 'process'
                    ? rowForm.processCode
                    : (selectedMachine?.processCode || rowForm.processCode),
                machineId: rowForm.rowType === 'machine' ? rowForm.machineId : null,
                operatorId: rowForm.operatorId || null,
                roleTag: rowForm.roleTag,
            };
            if (editingRow) {
                await schedulingApi.updateRosterRow(editingRow.id, payload);
                notifications.show({ title: 'Fila actualizada', message: 'Cambios guardados.', color: 'green' });
            } else {
                await schedulingApi.createRosterRow(payload);
                notifications.show({ title: 'Fila agregada', message: 'Trabajador agregado al roster.', color: 'green' });
            }
            setAddOpen(false);
            setEditingRow(null);
            await loadRoster();
            onRefresh?.();
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error?.message || 'No se pudo guardar la fila.',
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteRow = async (row) => {
        setSaving(true);
        try {
            await schedulingApi.deleteRosterRow(row.id);
            await loadRoster();
            onRefresh?.();
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error?.message || 'No se pudo quitar la fila.',
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleCopyPrevious = async () => {
        setSaving(true);
        try {
            const result = await schedulingApi.copyPreviousRoster(weekStart);
            await loadRoster();
            onRefresh?.();
            notifications.show({
                title: 'Roster copiado',
                message: `Se copiaron ${result?.copied ?? 0} filas de la semana anterior.`,
                color: 'green',
            });
        } catch (error) {
            notifications.show({
                title: 'Error al copiar',
                message: error?.message || 'No se pudo copiar la semana anterior.',
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    const rows = roster?.rows || [];

    return (
        <Stack gap="md" className="planeacion-roster">
            <Group justify="space-between" wrap="wrap">
                <Group gap="xs">
                    <ActionIcon variant="light" onClick={() => setWeekStart((w) => shiftWeekStart(w, -1))} aria-label="Semana anterior">
                        <IconChevronLeft size={16} />
                    </ActionIcon>
                    <Text fw={600} className="planeacion-roster__range">{formatWeekRange(weekStart)}</Text>
                    <ActionIcon variant="light" onClick={() => setWeekStart((w) => shiftWeekStart(w, 1))} aria-label="Semana siguiente">
                        <IconChevronRight size={16} />
                    </ActionIcon>
                </Group>
                <Group gap="xs" wrap="wrap">
                    <Button variant="light" color="violet" size="compact-sm" leftSection={<IconPlus size={14} />} onClick={() => setHorariosOpen(true)}>Horarios</Button>
                    <Button variant="light" size="compact-sm" onClick={handleCopyPrevious} loading={saving}>Copiar ant.</Button>
                    {rosterSection === 'grilla' && (
                        <Button leftSection={<IconPlus size={14} />} size="compact-sm" onClick={openAddRow}>Agregar fila</Button>
                    )}
                </Group>
            </Group>

            <Group justify="space-between" wrap="wrap">
                <SegmentedControl
                    value={rosterSection}
                    onChange={setRosterSection}
                    data={ROSTER_SECTIONS}
                />
            </Group>

            {rosterSection === 'grilla' && shifts.length === 0 && !loading && (
                <Alert color="blue" variant="light" title="Sin horarios configurados">
                    Use el boton <strong>+ Horarios</strong> o la pestaña <strong>Horarios</strong> para crear turnos (ej. 7:00 am - 4:30 pm). Luego habilitelos por máquina en <strong>Turnos</strong>.
                </Alert>
            )}

            {rosterSection === 'grilla' && (
                <Alert color="gray" variant="light" title="Grilla semanal">
                    La mayoria de filas son por <strong>maquina</strong> (SpeedMaster, Sord Z…). Use fila por <strong>proceso/categoria</strong>
                    solo cuando un operario cubre varias maquinas del mismo tipo (ej. Robert en Convertidora).
                </Alert>
            )}

            {rosterSection === 'grilla' && (
            <Group gap="sm" wrap="wrap">
                <TextInput
                    placeholder="Filtrar maquina/proceso..."
                    value={filterProcess}
                    onChange={(e) => setFilterProcess(e.currentTarget.value)}
                    w={220}
                />
                <TextInput
                    placeholder="Filtrar persona..."
                    value={filterPerson}
                    onChange={(e) => setFilterPerson(e.currentTarget.value)}
                    w={220}
                />
            </Group>
            )}

            {rosterSection === 'horarios' && (
                <PlaneacionHorariosCatalogView onChanged={loadMeta} />
            )}

            {rosterSection === 'turnos' && <PlaneacionHorariosView />}

            {rosterSection === 'cobertura' && (
                <PlaneacionCoberturaView
                    weekStart={weekStart}
                    refreshKey={refreshKey}
                    onRefresh={onRefresh}
                />
            )}

            {rosterSection === 'novedades' && (
                <Alert color="blue" variant="light" title="Novedades">
                    Incapacidades, faltas y permisos del personal. Proximamente.
                </Alert>
            )}

            {rosterSection === 'grilla' && (loading ? (
                <Group justify="center" py="xl"><Loader size="sm" /></Group>
            ) : (
                <div className="planeacion-roster__scroll">
                    <table className="planeacion-roster__table">
                        <thead>
                            <tr>
                                <th>Proceso / Maquina</th>
                                <th>Trabajador</th>
                                {DAY_LABELS.map((label, idx) => {
                                    const d = new Date(weekStart);
                                    d.setUTCDate(d.getUTCDate() + idx);
                                    return (
                                        <th key={label}>
                                            <span>{label}</span>
                                            <span className="planeacion-roster__day-num">{d.getUTCDate()}</span>
                                        </th>
                                    );
                                })}
                                <th>h</th>
                                <th>HE</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.length === 0 && (
                                <tr>
                                    <td colSpan={10} className="planeacion-roster__empty">Sin filas en esta semana. Use &quot;Agregar fila&quot; o &quot;Copiar ant.&quot;</td>
                                </tr>
                            )}
                            {rows.map((row) => (
                                <tr key={row.id}>
                                    <td className="planeacion-roster__process">
                                        <Group gap={4}>
                                            <span>{row.displayLabel || row.machineName || row.processLabel}</span>
                                            {row.rowKind === 'process' && <Badge size="xs" color="grape">Proceso</Badge>}
                                        </Group>
                                        {row.rowKind === 'machine' && row.processLabel && (
                                            <Text size="xs" c="dimmed">{row.processLabel}</Text>
                                        )}
                                    </td>
                                    <td className="planeacion-roster__worker">
                                        <Group gap={4} wrap="nowrap">
                                            <Badge size="xs" variant="light">{row.roleTag || 'Op'}</Badge>
                                            <span>{row.operatorName || 'Sin asignar'}</span>
                                        </Group>
                                        <Group gap={8} mt={4}>
                                            <button type="button" className="planeacion-roster__edit" onClick={() => openEditRow(row)} disabled={saving}>
                                                editar
                                            </button>
                                            <button type="button" className="planeacion-roster__remove" onClick={() => handleDeleteRow(row)} disabled={saving}>
                                                x quitar
                                            </button>
                                        </Group>
                                    </td>
                                    {(row.days || []).map((day) => {
                                        const cellValue = normalizeShiftCellValue(day, shiftOptions);
                                        const shift = shifts.find((s) => String(s.id ?? s.Id) === String(day.shiftId));
                                        return (
                                            <td key={day.dayOfWeek} className={`planeacion-roster__day${day.isOff ? ' planeacion-roster__day--off' : ''}`}>
                                                <Select
                                                    size="xs"
                                                    data={shiftOptions}
                                                    value={cellValue}
                                                    onChange={(value) => handleDayChange(row, day, value ?? 'off')}
                                                    disabled={saving || shiftOptions.length <= 1}
                                                    comboboxProps={{ withinPortal: true }}
                                                    classNames={{ input: 'planeacion-roster__shift-input' }}
                                                    allowDeselect={false}
                                                />
                                                {!day.isOff && (
                                                    <Text size="xs" className="planeacion-roster__hours">{day.hours}h</Text>
                                                )}
                                                {day.isOff && <Text size="xs" c="blue" className="planeacion-roster__off">OFF</Text>}
                                                {!day.isOff && shift && (
                                                    <Text size="xs" c="dimmed" className="planeacion-roster__shift-label">{shiftDisplayLabel(shift)}</Text>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="planeacion-roster__total">{row.totalHours}</td>
                                    <td className={`planeacion-roster__overtime${row.overtimeHours > 0 ? ' planeacion-roster__overtime--active' : ''}`}>
                                        {row.overtimeHours > 0 ? row.overtimeHours : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ))}

            <Modal
                opened={addOpen}
                onClose={() => { setAddOpen(false); setEditingRow(null); }}
                title={editingRow ? 'Editar fila del roster' : 'Agregar fila al roster'}
                size="sm"
            >
                <Stack gap="sm">
                    <SegmentedControl
                        value={rowForm.rowType}
                        onChange={(v) => setRowForm((p) => ({
                            ...p,
                            rowType: v,
                            machineId: v === 'machine' ? (machineOptions[0]?.value || null) : null,
                        }))}
                        data={[
                            { value: 'machine', label: 'Por maquina' },
                            { value: 'process', label: 'Por proceso (categoria)' },
                        ]}
                    />
                    {rowForm.rowType === 'machine' ? (
                        <Select
                            label="Maquina"
                            description="Ej. 6 SpeedMaster, 4 Sord Z"
                            data={machineOptions}
                            value={rowForm.machineId}
                            onChange={(v) => setRowForm((p) => ({ ...p, machineId: v }))}
                            searchable
                        />
                    ) : (
                        <Select
                            label="Proceso (categoria)"
                            description="Ej. Convertidora — cuando el operario cubre 1A y 1B"
                            data={processOptions}
                            value={optionValueExists(rowForm.processCode, processOptions) ? rowForm.processCode : null}
                            onChange={(v) => setRowForm((p) => ({ ...p, processCode: v || '' }))}
                            searchable
                        />
                    )}
                    <Select
                        label="Trabajador"
                        data={operatorOptions}
                        value={rowForm.operatorId}
                        onChange={(v) => setRowForm((p) => ({ ...p, operatorId: v }))}
                        clearable
                        searchable
                        placeholder="Buscar operario..."
                    />
                    <Select label="Rol" data={ROLE_TAGS} value={rowForm.roleTag} onChange={(v) => setRowForm((p) => ({ ...p, roleTag: v || 'Op' }))} allowDeselect={false} />
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => { setAddOpen(false); setEditingRow(null); }}>Cancelar</Button>
                        <Button onClick={handleSaveRow} loading={saving}>{editingRow ? 'Guardar' : 'Agregar'}</Button>
                    </Group>
                </Stack>
            </Modal>

            <PlaneacionTurnosModal
                opened={horariosOpen}
                onClose={() => setHorariosOpen(false)}
                onChanged={loadMeta}
            />
        </Stack>
    );
}