import { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { IconX } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { schedulingApi } from '../../../services/schedulingApi';
import { dailyProductionApi } from '../../reportes/utils/dailyProductionApi';

const DAY_LABELS = ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'];

const COVERAGE_FILTERS = [
    { value: 'all', label: 'Todos' },
    { value: 'sin_config', label: 'Sin config' },
    { value: 'sin_op', label: 'Sin op.' },
    { value: 'cubierta', label: 'Cubiertas' },
];

function pickId(item) {
    return item?.id ?? item?.Id ?? null;
}

function shortName(name) {
    if (!name) return '';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length <= 2) return name;
    return `${parts[0]} ${parts[parts.length - 1]}`;
}

export default function PlaneacionCoberturaView({ weekStart, refreshKey, onRefresh }) {
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [coverage, setCoverage] = useState(null);
    const [operators, setOperators] = useState([]);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [assignModal, setAssignModal] = useState(null);
    const [selectedOperatorId, setSelectedOperatorId] = useState(null);

    const loadCoverage = useCallback(async () => {
        setLoading(true);
        try {
            const data = await schedulingApi.getCoverage({ weekStart, q: search.trim() || undefined });
            setCoverage(data);
        } catch (error) {
            notifications.show({
                title: 'Error al cargar cobertura',
                message: error?.message || 'No se pudo cargar la cobertura.',
                color: 'red',
            });
            setCoverage(null);
        } finally {
            setLoading(false);
        }
    }, [weekStart, search]);

    const loadOperators = useCallback(async () => {
        try {
            const rows = await dailyProductionApi.listOperators();
            setOperators(Array.isArray(rows) ? rows : []);
        } catch {
            setOperators([]);
        }
    }, []);

    useEffect(() => { loadOperators(); }, [loadOperators]);
    useEffect(() => { loadCoverage(); }, [loadCoverage, refreshKey]);

    const operatorOptions = useMemo(() => operators
        .map((o) => {
            const id = pickId(o);
            const label = o.displayName ?? o.DisplayName ?? o.name ?? o.Name;
            if (!id || !label) return null;
            return { value: String(id), label: String(label) };
        })
        .filter(Boolean), [operators]);

    const machines = useMemo(() => {
        const rows = coverage?.machines || [];
        if (statusFilter === 'all') return rows;
        return rows.filter((m) => m.status === statusFilter);
    }, [coverage, statusFilter]);

    const openAssign = (machineId, dayOfWeek, shiftId, roleTag, shiftCode) => {
        setAssignModal({ machineId, dayOfWeek, shiftId, roleTag, shiftCode });
        setSelectedOperatorId(null);
    };

    const handleAssign = async () => {
        if (!assignModal || !selectedOperatorId) return;
        setSaving(true);
        try {
            await schedulingApi.createCoverageAssignment({
                weekStart,
                machineId: assignModal.machineId,
                dayOfWeek: assignModal.dayOfWeek,
                shiftId: assignModal.shiftId,
                operatorId: selectedOperatorId,
                roleTag: assignModal.roleTag,
            });
            setAssignModal(null);
            await loadCoverage();
            onRefresh?.();
            notifications.show({ title: 'Asignado', message: 'Operario agregado a la cobertura.', color: 'green' });
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error?.message || 'No se pudo asignar.',
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleRemove = async (assignmentId) => {
        setSaving(true);
        try {
            await schedulingApi.deleteCoverageAssignment(assignmentId);
            await loadCoverage();
            onRefresh?.();
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error?.message || 'No se pudo quitar.',
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading && !coverage) {
        return <Group justify="center" py="xl"><Loader size="sm" /></Group>;
    }

    return (
        <Stack gap="md" className="planeacion-cobertura">
            <Text size="sm" c="dimmed">
                Asigne operarios (Op) y auxiliares (Ax) por máquina, día y turno. Configure turnos habilitados en la pestaña Turnos.
            </Text>

            <Group justify="space-between" wrap="wrap">
                <TextInput
                    placeholder="Buscar máquina..."
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    w={240}
                />
                <SegmentedControl
                    value={statusFilter}
                    onChange={setStatusFilter}
                    data={COVERAGE_FILTERS}
                />
            </Group>

            {loading ? (
                <Group justify="center" py="md"><Loader size="sm" /></Group>
            ) : (
                <div className="planeacion-cobertura__scroll">
                    <table className="planeacion-cobertura__table">
                        <thead>
                            <tr>
                                <th className="planeacion-cobertura__machine-col">Máquina</th>
                                {DAY_LABELS.map((label, idx) => {
                                    const d = new Date(weekStart);
                                    d.setUTCDate(d.getUTCDate() + idx);
                                    return (
                                        <th key={label} className={idx >= 5 ? 'planeacion-cobertura__weekend' : ''}>
                                            <span>{label}</span>
                                            <span className="planeacion-cobertura__day-num">{d.getUTCDate()}</span>
                                        </th>
                                    );
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {machines.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="planeacion-cobertura__empty">
                                        Sin máquinas que coincidan con los filtros.
                                    </td>
                                </tr>
                            )}
                            {machines.map((machine) => (
                                <tr key={machine.id}>
                                    <td className="planeacion-cobertura__machine">
                                        <Group gap={6} wrap="nowrap">
                                            <span className={`planeacion-cobertura__dot planeacion-cobertura__dot--${machine.status}`} />
                                            <div>
                                                <Text size="sm" fw={600}>{machine.name}</Text>
                                                <Text size="xs" c="dimmed">
                                                    {machine.enabledShiftCount || 0} turno(s)
                                                    {machine.status === 'sin_config' && ' · sin config'}
                                                    {machine.status === 'sin_op' && ' · falta op.'}
                                                </Text>
                                            </div>
                                        </Group>
                                    </td>
                                    {(machine.days || []).map((day, idx) => (
                                        <td key={day.dayOfWeek} className={`planeacion-cobertura__cell${idx >= 5 ? ' planeacion-cobertura__cell--weekend' : ''}`}>
                                            {(day.shifts || []).length === 0 && (
                                                <Text size="xs" c="dimmed" ta="center">Sin turnos</Text>
                                            )}
                                            {(day.shifts || []).map((slot) => (
                                                <div key={slot.shiftId} className="planeacion-cobertura__slot">
                                                    <Text size="xs" fw={600} className="planeacion-cobertura__slot-label">
                                                        {slot.code || slot.name}
                                                    </Text>
                                                    <div className="planeacion-cobertura__chips">
                                                        {(slot.assignments || []).map((a) => (
                                                            <span
                                                                key={a.id}
                                                                className={`planeacion-cobertura__chip planeacion-cobertura__chip--${a.roleTag === 'Ax' ? 'ax' : 'op'}`}
                                                            >
                                                                <span>{a.roleTag} {shortName(a.operatorName)}</span>
                                                                <button
                                                                    type="button"
                                                                    className="planeacion-cobertura__chip-remove"
                                                                    onClick={() => handleRemove(a.id)}
                                                                    disabled={saving}
                                                                    aria-label="Quitar"
                                                                >
                                                                    <IconX size={10} />
                                                                </button>
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <Group gap={4} mt={4}>
                                                        {!slot.hasOperator && (
                                                            <button
                                                                type="button"
                                                                className="planeacion-cobertura__add"
                                                                onClick={() => openAssign(machine.id, day.dayOfWeek, slot.shiftId, 'Op', slot.code)}
                                                                disabled={saving}
                                                            >
                                                                +Op
                                                            </button>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="planeacion-cobertura__add planeacion-cobertura__add--ax"
                                                            onClick={() => openAssign(machine.id, day.dayOfWeek, slot.shiftId, 'Ax', slot.code)}
                                                            disabled={saving}
                                                        >
                                                            +Ax
                                                        </button>
                                                    </Group>
                                                </div>
                                            ))}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal
                opened={!!assignModal}
                onClose={() => setAssignModal(null)}
                title={assignModal ? `Asignar ${assignModal.roleTag} · ${assignModal.shiftCode}` : 'Asignar'}
                size="sm"
            >
                <Stack gap="sm">
                    <Select
                        label="Operario / auxiliar"
                        data={operatorOptions}
                        value={selectedOperatorId}
                        onChange={setSelectedOperatorId}
                        searchable
                        placeholder="Buscar persona..."
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setAssignModal(null)}>Cancelar</Button>
                        <Button onClick={handleAssign} loading={saving} disabled={!selectedOperatorId}>Asignar</Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}
