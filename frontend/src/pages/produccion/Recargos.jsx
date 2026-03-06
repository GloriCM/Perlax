import React, { useState } from 'react';
import {
    Container,
    Paper,
    Title,
    Text,
    Group,
    Stack,
    Button,
    ActionIcon,
    Box,
    TextInput,
    NumberInput,
    Modal,
    Tooltip
} from '@mantine/core';
import {
    IconArrowLeft,
    IconPlus,
    IconPencil,
    IconTrash,
    IconMoon,
    IconFileSpreadsheet
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { notifications } from '@mantine/notifications';

const initialRecargos = [
    { id: 1, name: 'Recargo Nocturno', factor: 0.35 },
];

const Recargos = () => {
    const navigate = useNavigate();
    const [recargos, setRecargos] = useState(initialRecargos);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState({ name: '', factor: 0.35 });

    const handleAdd = () => {
        setEditingItem(null);
        setForm({ name: '', factor: 0.35 });
        setModalOpen(true);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setForm({ name: item.name, factor: item.factor });
        setModalOpen(true);
    };

    const handleSave = () => {
        if (!form.name.trim()) return;
        if (editingItem) {
            setRecargos(prev => prev.map(r => r.id === editingItem.id ? { ...r, ...form } : r));
            notifications.show({ title: 'Recargo actualizado', message: `"${form.name}" actualizado.`, color: 'blue' });
        } else {
            const newId = Math.max(...recargos.map(r => r.id), 0) + 1;
            setRecargos(prev => [...prev, { id: newId, ...form }]);
            notifications.show({ title: 'Recargo creado', message: `"${form.name}" añadido.`, color: 'teal' });
        }
        setModalOpen(false);
    };

    const handleDelete = (item) => {
        setRecargos(prev => prev.filter(r => r.id !== item.id));
        notifications.show({ title: 'Recargo eliminado', message: `"${item.name}" eliminado.`, color: 'red' });
    };

    return (
        <Container size="xl" py="xl">
            <Paper p="lg" radius="lg" mb="lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Group justify="space-between" align="center">
                    <Group>
                        <Button variant="subtle" color="gray" size="sm" leftSection={<IconArrowLeft size={18} />} onClick={() => navigate('/')} c="dimmed" styles={{ root: { padding: '4px 10px' } }}>
                            Volver al Panel
                        </Button>
                        <div>
                            <Text size="xs" c="dimmed" fw={700} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>Control de Personal</Text>
                            <Title order={2} c="white">Recargos</Title>
                        </div>
                    </Group>
                    <Group gap="sm">
                        <Button color="red" variant="filled" size="sm" radius="md" leftSection={<IconFileSpreadsheet size={16} />}>
                            Reporte Excel
                        </Button>
                        <Button color="teal" leftSection={<IconPlus size={16} />} radius="md" onClick={handleAdd}>
                            + Agregar
                        </Button>
                    </Group>
                </Group>
            </Paper>

            <Paper p="md" radius="lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Group gap="xs" mb="md" px="sm">
                    <IconMoon size={18} style={{ color: '#f59e0b' }} />
                    <Text fw={700} c="white">Tipos de Recargo</Text>
                </Group>

                <Stack gap={0}>
                    <AnimatePresence>
                        {recargos.map((item, index) => (
                            <motion.div key={item.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ delay: index * 0.04, duration: 0.25 }}>
                                <Box px="md" py="sm" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s ease' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <Group justify="space-between">
                                        <Stack gap={2}>
                                            <Text size="sm" c="gray.3" fw={600}>{item.name}</Text>
                                            <Text size="xs" c="dimmed">Factor: {item.factor}</Text>
                                        </Stack>
                                        <Group gap="xs">
                                            <Tooltip label="Editar">
                                                <ActionIcon variant="subtle" color="yellow" size="md" onClick={() => handleEdit(item)}>
                                                    <IconPencil size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label="Eliminar">
                                                <ActionIcon variant="subtle" color="red" size="md" onClick={() => handleDelete(item)}>
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    </Group>
                                </Box>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {recargos.length === 0 && (
                        <Box p="xl" ta="center"><Text c="dimmed">No hay tipos de recargo registrados.</Text></Box>
                    )}
                </Stack>
            </Paper>

            <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Editar Recargo' : 'Nuevo Recargo'} centered radius="lg"
                styles={{ header: { background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { background: '#1e293b' }, title: { color: 'white', fontWeight: 700 }, close: { color: 'white' } }}>
                <Stack>
                    <TextInput label="Nombre" placeholder="Ej: Recargo Nocturno" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.currentTarget.value }))} autoFocus
                        styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
                    <NumberInput label="Factor" placeholder="Ej: 0.35" value={form.factor} onChange={(val) => setForm(prev => ({ ...prev, factor: val || 0 }))} decimalScale={2} step={0.05} min={0} max={5.0}
                        styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
                    <Group justify="flex-end" mt="sm">
                        <Button variant="subtle" color="gray" onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button color="teal" onClick={handleSave} disabled={!form.name.trim()}>{editingItem ? 'Guardar' : 'Crear Recargo'}</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
};

export default Recargos;
