import React, { useState } from 'react';
import {
    Container,
    Paper,
    Title,
    Text,
    Group,
    Stack,
    Button,
    Box,
    NumberInput,
    Modal,
    TextInput
} from '@mantine/core';
import {
    IconArrowLeft,
    IconPlus,
    IconPencil,
    IconCoin,
    IconUsers
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { notifications } from '@mantine/notifications';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

const initialOperarios = [
    { id: 1, name: 'Bedoya Maria Fernanda', salario: 2090905 },
    { id: 2, name: 'Blandon Moreno Jose Lizandro', salario: 2150905 },
    { id: 3, name: 'Cristian Felipe Echavarria', salario: 1750905 },
    { id: 4, name: 'Cruz Pinto Alberto', salario: 2090905 },
    { id: 5, name: 'Enrique Muñoz Hector Hilde', salario: 2750905 },
    { id: 6, name: 'Escobar Cardona John Fredy', salario: 2650905 },
    { id: 7, name: 'Gomez Ruiz William Hernan', salario: 1850905 },
    { id: 8, name: 'helder valencia', salario: 1750905 },
];

const Salarios = ({ titulo = 'Salarios de Operarios', subtitulo = 'Control de Personal' }) => {
    const navigate = useNavigate();
    const [operarios, setOperarios] = useState(initialOperarios);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingOp, setEditingOp] = useState(null);
    const [form, setForm] = useState({ name: '', salario: 0 });

    const handleAdd = () => {
        setEditingOp(null);
        setForm({ name: '', salario: 0 });
        setModalOpen(true);
    };

    const handleAjustar = (op) => {
        setEditingOp(op);
        setForm({ name: op.name, salario: op.salario });
        setModalOpen(true);
    };

    const handleSave = () => {
        if (!form.name.trim()) return;
        if (editingOp) {
            setOperarios(prev => prev.map(o => o.id === editingOp.id ? { ...o, ...form } : o));
            notifications.show({ title: 'Salario ajustado', message: `Salario de "${form.name}" actualizado a ${formatCurrency(form.salario)}.`, color: 'blue' });
        } else {
            const newId = Math.max(...operarios.map(o => o.id), 0) + 1;
            setOperarios(prev => [...prev, { id: newId, ...form }]);
            notifications.show({ title: 'Operario añadido', message: `"${form.name}" registrado correctamente.`, color: 'teal' });
        }
        setModalOpen(false);
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

            {/* Add Button */}
            <Button
                fullWidth
                size="lg"
                radius="md"
                mb="lg"
                color="teal"
                leftSection={<IconPlus size={20} />}
                onClick={handleAdd}
                styles={{
                    root: {
                        background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                        fontWeight: 700,
                        fontSize: 16,
                        letterSpacing: '0.5px',
                        boxShadow: '0 4px 15px rgba(20, 184, 166, 0.3)',
                    }
                }}
            >
                + Agregar Nuevo Operario
            </Button>

            {/* Operarios List */}
            <Paper p="md" radius="lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Stack gap={0}>
                    <AnimatePresence>
                        {operarios.map((op, index) => (
                            <motion.div key={op.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ delay: index * 0.03, duration: 0.25 }}>
                                <Box px="md" py="sm"
                                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s ease' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <Group justify="space-between">
                                        <Stack gap={2}>
                                            <Text size="sm" c="gray.3" fw={600}>{op.name}</Text>
                                            <Group gap={4}>
                                                <IconCoin size={14} style={{ color: '#d97706' }} />
                                                <Text size="xs" c="gray.4">Salario: {formatCurrency(op.salario)}</Text>
                                            </Group>
                                        </Stack>
                                        <Button
                                            variant="subtle"
                                            color="blue"
                                            size="xs"
                                            leftSection={<IconPencil size={14} />}
                                            onClick={() => handleAjustar(op)}
                                        >
                                            Ajustar
                                        </Button>
                                    </Group>
                                </Box>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {operarios.length === 0 && (
                        <Box p="xl" ta="center"><Text c="dimmed">No hay operarios registrados.</Text></Box>
                    )}
                </Stack>
            </Paper>

            {/* Add/Edit Modal */}
            <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingOp ? 'Ajustar Salario' : 'Nuevo Operario'} centered radius="lg"
                styles={{ header: { background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { background: '#1e293b' }, title: { color: 'white', fontWeight: 700 }, close: { color: 'white' } }}>
                <Stack>
                    <TextInput label="Nombre del Operario" placeholder="Ej: Juan Pérez" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.currentTarget.value }))} autoFocus
                        disabled={!!editingOp}
                        styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
                    <NumberInput label="Salario" placeholder="Ej: 2090905" value={form.salario} onChange={(val) => setForm(prev => ({ ...prev, salario: val || 0 }))}
                        prefix="$ " thousandSeparator="." decimalSeparator="," min={0}
                        styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
                    <Group justify="flex-end" mt="sm">
                        <Button variant="subtle" color="gray" onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button color="teal" onClick={handleSave} disabled={!form.name.trim()}>{editingOp ? 'Guardar Ajuste' : 'Crear Operario'}</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
};

export default Salarios;
