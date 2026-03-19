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
    Modal,
    Tooltip
} from '@mantine/core';
import {
    IconArrowLeft,
    IconPlus,
    IconPencil,
    IconTrash,
    IconFolder
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import GastosTabs from '../../components/GastosTabs';
import { notifications } from '@mantine/notifications';

const initialRubros = [
    { id: 1, name: 'Horas Extras' },
    { id: 2, name: 'Mantenimiento' },
    { id: 3, name: 'Repuesto' },
    { id: 4, name: 'Refrigerios' },
    { id: 5, name: 'Recargo' },
    { id: 6, name: 'Prestadores de Servicios' },
];

const RubrosGastos = ({ titulo = 'Rubros de Producción', subtitulo = 'Control de Gastos', showTabs = false, pathPrefix = '/planeacion/gastos' }) => {
    const navigate = useNavigate();
    const [rubros, setRubros] = useState(initialRubros);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRubro, setEditingRubro] = useState(null);
    const [rubroName, setRubroName] = useState('');

    const handleAdd = () => {
        setEditingRubro(null);
        setRubroName('');
        setModalOpen(true);
    };

    const handleEdit = (rubro) => {
        setEditingRubro(rubro);
        setRubroName(rubro.name);
        setModalOpen(true);
    };

    const handleSave = () => {
        if (!rubroName.trim()) return;

        if (editingRubro) {
            setRubros(prev => prev.map(r =>
                r.id === editingRubro.id ? { ...r, name: rubroName.trim() } : r
            ));
            notifications.show({
                title: 'Rubro actualizado',
                message: `"${rubroName.trim()}" ha sido actualizado correctamente.`,
                color: 'blue',
            });
        } else {
            const newId = Math.max(...rubros.map(r => r.id), 0) + 1;
            setRubros(prev => [...prev, { id: newId, name: rubroName.trim() }]);
            notifications.show({
                title: 'Rubro creado',
                message: `"${rubroName.trim()}" ha sido añadido correctamente.`,
                color: 'teal',
            });
        }
        setModalOpen(false);
    };

    const handleDelete = (rubro) => {
        setRubros(prev => prev.filter(r => r.id !== rubro.id));
        notifications.show({
            title: 'Rubro eliminado',
            message: `"${rubro.name}" ha sido eliminado.`,
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
                                {subtitulo}
                            </Text>
                            <Title order={2} c="white">{titulo}</Title>
                        </div>
                    </Group>
                    <Button
                        color="teal"
                        leftSection={<IconPlus size={16} />}
                        radius="md"
                        onClick={handleAdd}
                    >
                        + Agregar
                    </Button>
                </Group>
            </Paper>

            {showTabs && <GastosTabs pathPrefix={pathPrefix} />}

            {/* Rubros List */}
            <Paper
                p="md"
                radius="lg"
                style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <Group gap="xs" mb="md" px="sm">
                    <IconFolder size={18} style={{ color: '#d97706' }} />
                    <Text fw={700} c="white">Rubros</Text>
                </Group>

                <Stack gap={0}>
                    <AnimatePresence>
                        {rubros.map((rubro, index) => (
                            <motion.div
                                key={rubro.id}
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
                                        cursor: 'default',
                                        '&:hover': { background: 'rgba(255,255,255,0.03)' },
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    <Group justify="space-between">
                                        <Text size="sm" c="gray.3" fw={500}>
                                            {rubro.name}
                                        </Text>
                                        <Group gap="xs">
                                            <Tooltip label="Editar">
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="yellow"
                                                    size="md"
                                                    onClick={() => handleEdit(rubro)}
                                                >
                                                    <IconPencil size={16} />
                                                </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label="Eliminar">
                                                <ActionIcon
                                                    variant="subtle"
                                                    color="red"
                                                    size="md"
                                                    onClick={() => handleDelete(rubro)}
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

                    {rubros.length === 0 && (
                        <Box p="xl" ta="center">
                            <Text c="dimmed">No hay rubros registrados.</Text>
                        </Box>
                    )}
                </Stack>
            </Paper>

            {/* Add/Edit Modal */}
            <Modal
                opened={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingRubro ? 'Editar Rubro' : 'Nuevo Rubro'}
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
                        label="Nombre del Rubro"
                        placeholder="Ej: Materia Prima"
                        value={rubroName}
                        onChange={(e) => setRubroName(e.currentTarget.value)}
                        styles={{
                            label: { color: '#94a3b8', marginBottom: 4 },
                            input: {
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                            },
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                        autoFocus
                    />
                    <Group justify="flex-end">
                        <Button variant="subtle" color="gray" onClick={() => setModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button color="teal" onClick={handleSave} disabled={!rubroName.trim()}>
                            {editingRubro ? 'Guardar' : 'Crear Rubro'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
};

export default RubrosGastos;
