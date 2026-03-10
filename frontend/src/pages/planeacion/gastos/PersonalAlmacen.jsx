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
    IconUsers,
    IconTable
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { notifications } from '@mantine/notifications';

const initialPersonal = [
    { id: 1, name: 'FABIAN NOGUERA', cc: '1113673255', salario: 1900000 },
    { id: 2, name: 'JOAN MAURICIO ROJAS', cc: '1130651381', salario: 1900000 },
];

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

const PersonalAlmacen = ({ titulo = 'Personal', subtitulo = 'Gastos de Planeación' }) => {
    const navigate = useNavigate();
    const [personal, setPersonal] = useState(initialPersonal);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState({ name: '', cc: '', salario: 0 });

    const handleAdd = () => {
        setEditingItem(null);
        setForm({ name: '', cc: '', salario: 0 });
        setModalOpen(true);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setForm({ name: item.name, cc: item.cc, salario: item.salario });
        setModalOpen(true);
    };

    const handleSave = () => {
        if (!form.name.trim() || !form.cc.trim()) return;

        if (editingItem) {
            setPersonal(prev => prev.map(p => p.id === editingItem.id ? { ...p, ...form } : p));
            notifications.show({ title: 'Personal actualizado', message: `"${form.name}" actualizado.`, color: 'blue' });
        } else {
            const newId = Math.max(...personal.map(p => p.id), 0) + 1;
            setPersonal(prev => [...prev, { id: newId, ...form }]);
            notifications.show({ title: 'Personal agregado', message: `"${form.name}" añadido al listado.`, color: 'teal' });
        }
        setModalOpen(false);
    };

    const handleDelete = (item) => {
        setPersonal(prev => prev.filter(p => p.id !== item.id));
        notifications.show({ title: 'Personal eliminado', message: `"${item.name}" eliminado.`, color: 'red' });
    };

    return (
        <Container size="xl" py="xl">
            {/* Header */}
            <Paper p="lg" radius="lg" mb="lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Group justify="space-between" align="center">
                    <Group>
                        <Button variant="subtle" color="gray" size="sm" leftSection={<IconArrowLeft size={18} />} onClick={() => navigate('/')} c="dimmed" styles={{ root: { padding: '4px 10px' } }}>
                            Volver al Panel
                        </Button>
                        <div>
                            <Text size="xs" c="dimmed" fw={700} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>{subtitulo}</Text>
                            <Title order={2} c="white">{titulo}</Title>
                        </div>
                    </Group>
                </Group>
            </Paper>

            {/* List Header */}
            <Paper p="md" radius="lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Group justify="space-between" mb="lg" px="sm">
                    <Group gap="xs">
                        <IconUsers size={22} style={{ color: '#6366f1' }} />
                        <Title order={3} c="white">Listado de Personal de Almacén (Horas Extras)</Title>
                    </Group>
                    <Group gap="sm">
                        <Button color="teal" leftSection={<IconTable size={16} />} radius="md">
                            Excel H. Extras
                        </Button>
                        <Button color="blue" leftSection={<IconPlus size={16} />} radius="md" onClick={handleAdd}>
                            + Nuevo Personal de Almacén
                        </Button>
                    </Group>
                </Group>

                <Stack gap={0}>
                    <AnimatePresence>
                        {personal.map((item, index) => (
                            <motion.div key={item.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ delay: index * 0.04, duration: 0.25 }}>
                                <Box px="md" py="sm" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s ease' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <Group justify="space-between" align="center">
                                        <Stack gap={2}>
                                            <Text size="sm" fw={700} c="white" style={{ textTransform: 'uppercase' }}>{item.name}</Text>
                                            <Text size="xs" c="dimmed">C.C. {item.cc}</Text>
                                            <Text size="xs" c="gray.4">Salario: {formatCurrency(item.salario)}</Text>
                                        </Stack>
                                        <Group gap="xs">
                                            <ActionIcon variant="light" color="yellow" size="lg" onClick={() => handleEdit(item)}>
                                                <IconPencil size={18} />
                                            </ActionIcon>
                                            <ActionIcon variant="light" color="red" size="lg" onClick={() => handleDelete(item)}>
                                                <IconTrash size={18} />
                                            </ActionIcon>
                                        </Group>
                                    </Group>
                                </Box>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {personal.length === 0 && (
                        <Box p="xl" ta="center"><Text c="dimmed">No hay personal registrado.</Text></Box>
                    )}
                </Stack>
            </Paper>

            {/* Modal */}
            <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Editar Personal' : 'Nuevo Personal'} centered radius="lg" size="sm"
                styles={{ header: { background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { background: '#1e293b' }, title: { color: 'white', fontWeight: 700 }, close: { color: 'white' } }}>
                <Stack>
                    <TextInput label="Nombres y Apellidos" placeholder="Escribir..." value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.currentTarget.value }))} autoFocus
                        styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
                    <TextInput label="Cédula" placeholder="Num. CC" value={form.cc} onChange={(e) => setForm(prev => ({ ...prev, cc: e.currentTarget.value }))}
                        styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
                    <NumberInput label="Salario" placeholder="0" value={form.salario} onChange={(val) => setForm(prev => ({ ...prev, salario: val || 0 }))} prefix="$ " thousandSeparator="." decimalSeparator=","
                        styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" color="gray" onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button color="blue" onClick={handleSave} disabled={!form.name.trim() || !form.cc.trim()}>{editingItem ? 'Guardar Cambios' : 'Registrar'}</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
};

export default PersonalAlmacen;
