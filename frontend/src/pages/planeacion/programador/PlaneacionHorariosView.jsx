import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Button,
    Checkbox,
    Group,
    Loader,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { schedulingApi } from '../../../services/schedulingApi';
import { dailyProductionApi } from '../../reportes/utils/dailyProductionApi';

function formatShiftTime(value) {
    if (!value) return '';
    const parts = String(value).split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return m === '00' ? `${h12} ${ampm}` : `${h12}:${m} ${ampm}`;
}

export default function PlaneacionHorariosView() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [machines, setMachines] = useState([]);
    const [search, setSearch] = useState('');
    const [selectedId, setSelectedId] = useState('');
    const [machineDetail, setMachineDetail] = useState(null);
    const [enabled, setEnabled] = useState([]);

    const loadMachines = useCallback(async () => {
        setLoading(true);
        try {
            const rows = await dailyProductionApi.listMachines();
            setMachines(Array.isArray(rows) ? rows : []);
        } catch {
            setMachines([]);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMachineShifts = useCallback(async (machineId) => {
        if (!machineId) return;
        try {
            const data = await schedulingApi.getMachineShifts(machineId);
            setMachineDetail(data);
            const ids = (data?.shifts || []).filter((s) => s.isEnabled).map((s) => String(s.shiftId));
            setEnabled(ids);
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudieron cargar turnos.', color: 'red' });
        }
    }, []);

    useEffect(() => { loadMachines(); }, [loadMachines]);

    useEffect(() => {
        if (selectedId) loadMachineShifts(selectedId);
    }, [selectedId, loadMachineShifts]);

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();
        if (!term) return machines;
        return machines.filter((m) => {
            const name = String(m.name ?? m.Name ?? '').toLowerCase();
            const code = String(m.code ?? m.Code ?? '').toLowerCase();
            const proc = String(m.processCode ?? m.ProcessCode ?? '').toLowerCase();
            return name.includes(term) || code.includes(term) || proc.includes(term);
        });
    }, [machines, search]);

    useEffect(() => {
        if (!selectedId && filtered.length > 0) {
            setSelectedId(String(filtered[0].id ?? filtered[0].Id));
        }
    }, [filtered, selectedId]);

    const toggleShift = (shiftId) => {
        const id = String(shiftId);
        setEnabled((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    };

    const handleSave = async () => {
        if (!selectedId) return;
        setSaving(true);
        try {
            await schedulingApi.setMachineShifts(selectedId, enabled);
            notifications.show({ title: 'Guardado', message: 'Turnos habilitados para la maquina.', color: 'green' });
            await loadMachineShifts(selectedId);
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo guardar.', color: 'red' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <Group justify="center" py="xl"><Loader size="sm" /></Group>;

    return (
        <div className="planeacion-horarios">
            <Text size="sm" c="dimmed" mb="sm">
                Configure qué horarios del catálogo están habilitados en cada máquina (T1, T2, etc.) y cuántos turnos opera.
            </Text>
            <div className="planeacion-horarios__layout">
                <div className="planeacion-horarios__sidebar">
                    <TextInput placeholder="Buscar maquina..." value={search} onChange={(e) => setSearch(e.currentTarget.value)} mb="sm" />
                    <Stack gap={4}>
                        {filtered.map((m) => {
                            const id = String(m.id ?? m.Id);
                            const active = id === selectedId;
                            return (
                                <button
                                    key={id}
                                    type="button"
                                    className={`planeacion-horarios__machine${active ? ' planeacion-horarios__machine--active' : ''}`}
                                    onClick={() => setSelectedId(id)}
                                >
                                    <Text size="sm" fw={600}>{m.name ?? m.Name}</Text>
                                    {(m.processCode ?? m.ProcessCode) && (
                                        <Badge size="xs" variant="light">{m.processCode ?? m.ProcessCode}</Badge>
                                    )}
                                </button>
                            );
                        })}
                    </Stack>
                </div>
                <div className="planeacion-horarios__panel">
                    {machineDetail?.machine ? (
                        <Stack gap="sm">
                            <Group justify="space-between">
                                <div>
                                    <Text fw={700}>{machineDetail.machine.name}</Text>
                                    <Text size="xs" c="dimmed">Categoria: {machineDetail.machine.processCode || 'Sin asignar'}</Text>
                                </div>
                                <Button onClick={handleSave} loading={saving}>Guardar</Button>
                            </Group>
                            <Text size="sm" fw={600}>Turnos habilitados en esta maquina</Text>
                            {(machineDetail.shifts || []).map((s) => (
                                <Checkbox
                                    key={s.shiftId}
                                    label={`${s.code} - ${s.name} (${formatShiftTime(s.startTime)} - ${formatShiftTime(s.endTime)})`}
                                    checked={enabled.includes(String(s.shiftId))}
                                    onChange={() => toggleShift(s.shiftId)}
                                />
                            ))}
                        </Stack>
                    ) : (
                        <Text c="dimmed">Seleccione una maquina.</Text>
                    )}
                </div>
            </div>
        </div>
    );
}