import { useCallback, useEffect, useState } from 'react';
import {
    ActionIcon,
    Button,
    Group,
    Modal,
    Stack,
    Text,
    TextInput,
} from '@mantine/core';
import { IconArrowDown, IconArrowUp, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { schedulingApi } from '../../../services/schedulingApi';

export default function PlaneacionProcesosModal({ opened, onClose, onChanged }) {
    const [loading, setLoading] = useState(false);
    const [processes, setProcesses] = useState([]);
    const [newLabel, setNewLabel] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editLabel, setEditLabel] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const rows = await schedulingApi.listAllProcesses();
            setProcesses(Array.isArray(rows) ? rows.filter((p) => p.isActive !== false) : []);
        } catch (error) {
            notifications.show({
                title: 'Error',
                message: error?.message || 'No se pudieron cargar los procesos.',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (opened) load();
    }, [opened, load]);

    const notifyChanged = () => {
        onChanged?.();
    };

    const handleAdd = async () => {
        if (!newLabel.trim()) return;
        try {
            await schedulingApi.createProcess({ label: newLabel.trim() });
            setNewLabel('');
            await load();
            notifyChanged();
            notifications.show({ title: 'Proceso agregado', message: 'Nuevo proceso creado.', color: 'green' });
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo crear.', color: 'red' });
        }
    };

    const handleSaveEdit = async (id) => {
        if (!editLabel.trim()) return;
        try {
            await schedulingApi.updateProcess(id, { label: editLabel.trim() });
            setEditingId(null);
            await load();
            notifyChanged();
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo actualizar.', color: 'red' });
        }
    };

    const handleDelete = async (proc) => {
        if (!window.confirm(`Eliminar el proceso "${proc.label}"?`)) return;
        try {
            await schedulingApi.deleteProcess(proc.id);
            await load();
            notifyChanged();
            notifications.show({ title: 'Eliminado', message: 'Proceso eliminado.', color: 'green' });
        } catch (error) {
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo eliminar.', color: 'red' });
        }
    };

    const move = async (index, direction) => {
        const target = index + direction;
        if (target < 0 || target >= processes.length) return;
        const ordered = [...processes];
        [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
        setProcesses(ordered);
        try {
            await schedulingApi.reorderProcesses(ordered.map((p) => p.id));
            notifyChanged();
        } catch (error) {
            await load();
            notifications.show({ title: 'Error', message: error?.message || 'No se pudo reordenar.', color: 'red' });
        }
    };

    return (
        <Modal opened={opened} onClose={onClose} title="Gestion de procesos" size="md">
            <Stack gap="sm">
                <Group gap="xs">
                    <TextInput
                        placeholder="Nombre del nuevo proceso"
                        value={newLabel}
                        onChange={(e) => setNewLabel(e.currentTarget.value)}
                        style={{ flex: 1 }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
                    />
                    <Button leftSection={<IconPlus size={16} />} onClick={handleAdd} loading={loading}>Agregar</Button>
                </Group>

                <div className="planeacion-procesos__list">
                    {processes.map((proc, index) => (
                        <div key={proc.id} className="planeacion-procesos__item">
                            <Group gap="xs" wrap="nowrap" style={{ flex: 1 }}>
                                <Group gap={2}>
                                    <ActionIcon variant="subtle" size="sm" onClick={() => move(index, -1)} disabled={index === 0} aria-label="Subir">
                                        <IconArrowUp size={14} />
                                    </ActionIcon>
                                    <ActionIcon variant="subtle" size="sm" onClick={() => move(index, 1)} disabled={index === processes.length - 1} aria-label="Bajar">
                                        <IconArrowDown size={14} />
                                    </ActionIcon>
                                </Group>
                                {editingId === proc.id ? (
                                    <Group gap="xs" style={{ flex: 1 }}>
                                        <TextInput
                                            size="xs"
                                            value={editLabel}
                                            onChange={(e) => setEditLabel(e.currentTarget.value)}
                                            style={{ flex: 1 }}
                                            autoFocus
                                        />
                                        <Button size="compact-xs" onClick={() => handleSaveEdit(proc.id)}>Guardar</Button>
                                        <Button size="compact-xs" variant="subtle" onClick={() => setEditingId(null)}>Cancelar</Button>
                                    </Group>
                                ) : (
                                    <>
                                        <Text size="sm" style={{ flex: 1 }}>{proc.label}</Text>
                                        <Text size="xs" c="dimmed">{proc.code}</Text>
                                    </>
                                )}
                            </Group>
                            {editingId !== proc.id && (
                                <Group gap={4}>
                                    <ActionIcon variant="light" color="blue" size="sm" onClick={() => { setEditingId(proc.id); setEditLabel(proc.label); }} aria-label="Editar">
                                        <IconPencil size={14} />
                                    </ActionIcon>
                                    <ActionIcon variant="light" color="red" size="sm" onClick={() => handleDelete(proc)} aria-label="Eliminar">
                                        <IconTrash size={14} />
                                    </ActionIcon>
                                </Group>
                            )}
                        </div>
                    ))}
                    {processes.length === 0 && !loading && (
                        <Text c="dimmed" size="sm" ta="center" py="md">No hay procesos configurados.</Text>
                    )}
                </div>
            </Stack>
        </Modal>
    );
}