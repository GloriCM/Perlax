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
    IconClock,
    IconFileSpreadsheet
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { notifications } from '@mantine/notifications';

const initialTipos = [
    { id: 1, name: 'Extra Diurna', factor: 1.25 },
    { id: 2, name: 'Dominical o Festivo', factor: 1.8 },
    { id: 3, name: 'hora extra nocturna', factor: 1.7 },
];

const HorasExtra = () => {
    const navigate = useNavigate();
    const [tipos, setTipos] = useState(initialTipos);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingTipo, setEditingTipo] = useState(null);
    const [form, setForm] = useState({ name: '', factor: 1.0 });

    const handleAdd = () => {
        setEditingTipo(null);
        setForm({ name: '', factor: 1.0 });
        setModalOpen(true);
    };

    const handleEdit = (tipo) => {
        setEditingTipo(tipo);
        setForm({ name: tipo.name, factor: tipo.factor });
        setModalOpen(true);
    };

    const handleSave = () => {
        if (!form.name.trim()) return;

        if (editingTipo) {
            setTipos(prev => prev.map(t =>
                t.id === editingTipo.id ? { ...t, ...form } : t
            ));
            notifications.show({
                title: 'Tipo actualizado',
                message: `"${form.name}" ha sido actualizado correctamente.`,
                color: 'blue',
            });
        } else {
            const newId = Math.max(...tipos.map(t => t.id), 0) + 1;
            setTipos(prev => [...prev, { id: newId, ...form }]);
            notifications.show({
                title: 'Tipo creado',
                message: `"${form.name}" ha sido añadido correctamente.`,
                color: 'teal',
            });
        }
        setModalOpen(false);
    };

    const handleDelete = (tipo) => {
        setTipos(prev => prev.filter(t => t.id !== tipo.id));
        notifications.show({
            title: 'Tipo eliminado',
            message: `"${tipo.name}" ha sido eliminado.`,
            color: 'red',
        });
    };

    return (
        <Container size="xl" py="xl">
            {/* Header */}
            <Paper
                p="lg"
                radius="lg"
                mb="lg"
                style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <Group justify="space-between" align="center">
                    <Group>
                        <Button
                            variant="subtle"
                            color="gray"
                            size="sm"
                            leftSection={<IconArrowLeft size={18} />}
                            onClick={() => navigate('/')}
                            c="dimmed"
                            styles={{ root: { padding: '4px 10px' } }}
                        >
                            Volver al Panel
                        </Button>
                        <div>
                            <Text size="xs" c="dimmed" fw={700} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Control de Personal
                            </Text>
                            <Title order={2} c="white">Horas Extra</Title>
                        </div>
                    </Group>
                    <Group gap="sm">
                        <Button
                            color="red"
                            variant="filled"
                            size="sm"
                            radius="md"
                            leftSection={<IconFileSpreadsheet size={16} />}
                        >
                            Reporte Excel
                        </Button>
                        <Button
                            color="teal"
                            leftSection={<IconPlus size={16} />}
                            radius="md"
                            onClick={handleAdd}
                        >
                            + Agregar
                        </Button>
                    </Group>
                </Group>
            </Paper>

            {/* Tipos de Hora List */}
            <Paper
                p="md"
                radius="lg"
                style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <Group gap="xs" mb="md" px="sm">
                    <IconClock size={18} style={{ color: '#6366f1' }} />
                    <Text fw={700} c="white">Tipos de Hora</Text>
                </Group>

                <Stack gap={0}>
                    <AnimatePresence>
                        {tipos.map((tipo, index) => (
                            <motion.div
                                key={tipo.id}
                                initial={{ opacity: 0, x: -15 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 15 }}
                                transition={{ delay: index * 0.04, duration: 0.25 }}
                            >
                                <Box
                                    px="md"
                                    py="sm"
                                    style={{
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                        transition: 'background 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Group justify="space-between">
                                        <Stack gap={2}>
                                            <Text size="sm" c="gray.3" fw={600}>
                                                {tipo.name}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                Factor: {tipo.factor}
                                            </Text>
                                        </Stack>
                                        <Group gap="xs">
                                            <Tooltip label="Editar">
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="yellow"
                                                    size="md"
                                                    onClick={() => handleEdit(tipo)}
                                                >
                                                    <IconPencil size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label="Eliminar">
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="red"
                                                    size="md"
                                                    onClick={() => handleDelete(tipo)}
                                                >
                                                    <IconTrash size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    </Group>
                                </Box>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {tipos.length === 0 && (
                        <Box p="xl" ta="center">
                            <Text c="dimmed">No hay tipos de hora registrados.</Text>
                        </Box>
                    )}
                </Stack>
            </Paper>

            {/* Add/Edit Modal */}
            <Modal
                opened={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingTipo ? 'Editar Tipo de Hora' : 'Nuevo Tipo de Hora'}
                centered
                radius="lg"
                styles={{
                    header: { background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)' },
                    body: { background: '#1e293b' },
                    title: { color: 'white', fontWeight: 700 },
                    close: { color: 'white' },
                }}
            >
                <Stack>
                    <TextInput
                        label="Nombre"
                        placeholder="Ej: Extra Diurna"
                        value={form.name}
                        onChange={(e) => setForm(prev => ({ ...prev, name: e.currentTarget.value }))}
                        styles={{
                            label: { color: '#94a3b8', marginBottom: 4 },
                            input: {
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                            },
                        }}
                        autoFocus
                    />
                    <NumberInput
                        label="Factor"
                        placeholder="Ej: 1.25"
                        value={form.factor}
                        onChange={(val) => setForm(prev => ({ ...prev, factor: val || 1.0 }))}
                        decimalScale={2}
                        step={0.05}
                        min={1.0}
                        max={5.0}
                        styles={{
                            label: { color: '#94a3b8', marginBottom: 4 },
                            input: {
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                            },
                        }}
                    />
                    <Group justify="flex-end" mt="sm">
                        <Button variant="subtle" color="gray" onClick={() => setModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button color="teal" onClick={handleSave} disabled={!form.name.trim()}>
                            {editingTipo ? 'Guardar' : 'Crear Tipo'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
};

export default HorasExtra;
