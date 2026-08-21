import { useCallback, useEffect, useState } from 'react';
import {
    ActionIcon,
    Button,
    Checkbox,
    Group,
    Loader,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import { IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { schedulingApi } from '../../../services/schedulingApi';

function formatShiftTime(value) {
    if (!value) return '';
    const parts = String(value).split(':');
    const h = parseInt(parts[0], 10);
    const m = parts[1] || '00';
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return m === '00' ? `${h12} ${ampm}` : `${h12}:${m} ${ampm}`;
}

function toTimeInputValue(value) {
    if (!value) return '07:00';
    const parts = String(value).split(':');
    return `${parts[0]?.padStart(2, '0') || '07'}:${parts[1]?.padStart(2, '0') || '00'}`;
}

const emptyForm = () => ({
    name: '',
    startTime: '07:00',
    endTime: '16:30',
    crossesMidnight: false,
});

function readTextInputValue(value) {
    if (typeof value === 'string') return value;
    return value?.currentTarget?.value ?? value?.target?.value ?? '';
}

function readCheckboxValue(value) {
    if (typeof value === 'boolean') return value;
    return !!value?.currentTarget?.checked;
}

export default function PlaneacionHorariosCatalogView({ onChanged }) {
    const [loading, setLoading] = useState(false);
    const [shifts, setShifts] = useState([]);
    const [form, setForm] = useState(emptyForm());
    const [editingId, setEditingId] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const rows = await schedulingApi.listShifts();
            setShifts(Array.isArray(rows) ? rows : []);
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error?.message || 'No se pudieron cargar los horarios.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const resetForm = () => {
        setEditingId(null);
        setForm(emptyForm());
    };

    const handleSave = async () => {
        if (!form.name.trim()) {
            notifications.show({ title: 'Datos incompletos', message: 'Indique un nombre para el horario.', color: 'orange' });
            return;
        }
        const payload = {
            name: form.name.trim(),
            startTime: form.startTime,
            endTime: form.endTime,
            crossesMidnight: form.crossesMidnight,
            sortOrder: 0,
        };
        try {
            if (editingId) {
                await schedulingApi.updateShift(editingId, payload);
                notifications.show({ title: 'Horario actualizado', message: 'Cambios guardados.', color: 'green' });
            } else {
                await schedulingApi.createShift(payload);
                notifications.show({ title: 'Horario creado', message: 'Nuevo horario disponible.', color: 'green' });
            }
            resetForm();
            await load();
            onChanged?.();
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo guardar.', color: 'red' });
        }
    };

    const handleEdit = (shift) => {
        setEditingId(shift.id ?? shift.Id);
        setForm({
            name: shift.name || shift.Name || '',
            startTime: toTimeInputValue(shift.startTime ?? shift.StartTime),
            endTime: toTimeInputValue(shift.endTime ?? shift.EndTime),
            crossesMidnight: !!(shift.crossesMidnight ?? shift.CrossesMidnight),
        });
    };

    const handleDelete = async (shift) => {
        const id = shift.id ?? shift.Id;
        const name = shift.name ?? shift.Name ?? 'horario';
        if (!window.confirm(`Eliminar el horario "${name}"?`)) return;
        try {
            await schedulingApi.deleteShift(id);
            if (editingId === id) resetForm();
            await load();
            onChanged?.();
            notifications.show({ title: 'Eliminado', message: 'Horario eliminado.', color: 'green' });
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo eliminar.', color: 'red' });
        }
    };

    if (loading && shifts.length === 0) {
        return <Group justify="center" py="xl"><Loader size="sm" /></Group>;
    }

    return (
        <Stack gap="sm" className="planeacion-horarios-catalog">
            <Text size="sm" c="dimmed">
                Catálogo de horarios de planta (ej. 7:00 am - 1:00 pm, 7:00 am - 4:30 pm). Luego habilitelos por máquina en la pestaña Turnos.
            </Text>

            <TextInput
                label="Nombre"
                placeholder="Ej. T1 - 7am - 1pm"
                value={form.name}
                onChange={(value) => setForm((p) => ({ ...p, name: readTextInputValue(value) }))}
            />
            <Group grow>
                <TextInput
                    label="Hora inicio"
                    type="time"
                    value={form.startTime}
                    onChange={(value) => setForm((p) => ({ ...p, startTime: readTextInputValue(value) || '07:00' }))}
                />
                <TextInput
                    label="Hora fin"
                    type="time"
                    value={form.endTime}
                    onChange={(value) => setForm((p) => ({ ...p, endTime: readTextInputValue(value) || '16:30' }))}
                />
            </Group>
            <Checkbox
                label="Cruza medianoche (turno nocturno)"
                checked={form.crossesMidnight}
                onChange={(value) => setForm((p) => ({ ...p, crossesMidnight: readCheckboxValue(value) }))}
            />
            <Group justify="space-between">
                {editingId ? (
                    <Button variant="subtle" onClick={resetForm}>Cancelar edición</Button>
                ) : <span />}
                <Button leftSection={<IconPlus size={16} />} onClick={handleSave} loading={loading}>
                    {editingId ? 'Guardar cambios' : 'Agregar horario'}
                </Button>
            </Group>

            <div className="planeacion-procesos__list">
                {shifts.map((shift) => {
                    const id = shift.id ?? shift.Id;
                    return (
                        <div key={String(id)} className="planeacion-procesos__item">
                            <div style={{ flex: 1 }}>
                                <Text size="sm" fw={600}>{shift.name ?? shift.Name}</Text>
                                <Text size="xs" c="dimmed">
                                    {formatShiftTime(shift.startTime ?? shift.StartTime)} - {formatShiftTime(shift.endTime ?? shift.EndTime)}
                                    {shift.hours ? ` (${shift.hours}h)` : ''}
                                </Text>
                            </div>
                            <Group gap={4}>
                                <ActionIcon variant="light" color="blue" size="sm" onClick={() => handleEdit(shift)} aria-label="Editar">
                                    <IconPencil size={14} />
                                </ActionIcon>
                                <ActionIcon variant="light" color="red" size="sm" onClick={() => handleDelete(shift)} aria-label="Eliminar">
                                    <IconTrash size={14} />
                                </ActionIcon>
                            </Group>
                        </div>
                    );
                })}
                {shifts.length === 0 && !loading && (
                    <Text c="dimmed" size="sm" ta="center" py="md">No hay horarios. Agregue al menos uno arriba.</Text>
                )}
            </div>
        </Stack>
    );
}
