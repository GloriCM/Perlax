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
    Select,
    Tooltip
} from '@mantine/core';
import {
    IconArrowLeft,
    IconPlus,
    IconPencil,
    IconTrash,
    IconClipboardList
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { notifications } from '@mantine/notifications';

const initialTipos = [
    { id: 1, name: 'Agua/Luz/Alcantarillado/Aseo', rubro: 'Servicios Publicos' },
    { id: 2, name: 'Aire Acondicionado', rubro: 'Mantenimiento' },
    { id: 3, name: 'Arreglos Varios', rubro: 'Mantenimiento' },
    { id: 4, name: 'BUSQUEDA DE PERSONAL', rubro: 'SELECCION DE PERSONAL' },
    { id: 5, name: 'Desperdicio', rubro: 'Compradores de Desperdicio' },
    { id: 6, name: 'Eventos', rubro: 'Eventos empresa' },
    { id: 7, name: 'Filtro de agua', rubro: 'Filtro de agua' },
    { id: 8, name: 'GAS', rubro: 'SERVICIOS PUBLICOS 2' },
];

const RUBROS = [
    'Todos',
    'Servicios Publicos',
    'Mantenimiento',
    'SELECCION DE PERSONAL',
    'Compradores de Desperdicio',
    'Eventos empresa',
    'Filtro de agua',
    'SERVICIOS PUBLICOS 2'
];

const TiposServicio = ({ titulo = 'Tipos de Servicio', subtitulo = 'Gestión Humana - Gastos' }) => {
    const navigate = useNavigate();
    const [tipos, setTipos] = useState(initialTipos);
    const [filterRubro, setFilterRubro] = useState('Todos');
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState({ name: '', rubro: '' });

    const handleAdd = () => {
        setEditingItem(null);
        setForm({ name: '', rubro: '' });
        setModalOpen(true);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setForm({ name: item.name, rubro: item.rubro });
        setModalOpen(true);
    };

    const handleSave = () => {
        if (!form.name.trim()) return;

        if (editingItem) {
            setTipos(prev => prev.map(t => t.id === editingItem.id ? { ...t, ...form } : t));
            notifications.show({ title: 'Servicio actualizado', message: `"${form.name}" actualizado correctamente.`, color: 'blue' });
        } else {
            const newId = Math.max(...tipos.map(t => t.id), 0) + 1;
            setTipos(prev => [...prev, { id: newId, ...form }]);
            notifications.show({ title: 'Servicio creado', message: `"${form.name}" añadido correctamente.`, color: 'teal' });
        }
        setModalOpen(false);
    };

    const handleDelete = (item) => {
        setTipos(prev => prev.filter(t => t.id !== item.id));
        notifications.show({ title: 'Servicio eliminado', message: `"${item.name}" eliminado.`, color: 'red' });
    };

    const filteredTipos = filterRubro === 'Todos' ? tipos : tipos.filter(t => t.rubro === filterRubro);

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
                    <Button color="teal" leftSection={<IconPlus size={16} />} radius="md" onClick={handleAdd}>
                        + Agregar
                    </Button>
                </Group>
            </Paper>

            {/* List */}
            <Paper p="md" radius="lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Group justify="space-between" mb="lg" px="sm">
                    <Group gap="xs">
                        <IconClipboardList size={22} style={{ color: '#6366f1' }} />
                        <Title order={3} c="white">Tipos de Servicio</Title>
                    </Group>
                    <Group gap="xs" align="center">
                        <Text size="sm" c="dimmed">Filtrar por Rubro:</Text>
                        <Select
                            data={RUBROS}
                            value={filterRubro}
                            onChange={(val) => setFilterRubro(val || 'Todos')}
                            size="sm"
                            w={250}
                            styles={{
                                input: { background: 'white', color: 'black', borderRadius: '4px' }
                            }}
                        />
                    </Group>
                </Group>

                <Stack gap={0}>
                    <AnimatePresence>
                        {filteredTipos.map((item, index) => (
                            <motion.div key={item.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ delay: index * 0.04, duration: 0.25 }}>
                                <Box px="md" py="sm" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', transition: 'background 0.15s ease' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <Group justify="space-between">
                                        <Stack gap={2}>
                                            <Text size="sm" c="gray.3" fw={600}>{item.name}</Text>
                                            <Text size="xs" c="dimmed">Rubro: {item.rubro}</Text>
                                        </Stack>
                                        <Group gap="xs">
                                            <Tooltip label="Editar">
                                                <ActionIcon variant="subtle" color="yellow" size="md" onClick={() => handleEdit(item)}>
                                                    <IconPencil size={18} />
                                                </ActionIcon>
                                            </Tooltip>
                                            <Tooltip label="Eliminar">
                                                <ActionIcon variant="subtle" color="red" size="md" onClick={() => handleDelete(item)}>
                                                    <IconTrash size={18} />
                                                </ActionIcon>
                                            </Tooltip>
                                        </Group>
                                    </Group>
                                </Box>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {filteredTipos.length === 0 && (
                        <Box p="xl" ta="center"><Text c="dimmed">No se encontraron tipos de servicio.</Text></Box>
                    )}
                </Stack>
            </Paper>

            {/* Add/Edit Modal */}
            <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Editar Tipo de Servicio' : 'Nuevo Tipo de Servicio'} centered radius="lg"
                styles={{ header: { background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { background: '#1e293b' }, title: { color: 'white', fontWeight: 700 }, close: { color: 'white' } }}>
                <Stack>
                    <TextInput label="Nombre del Servicio" placeholder="Ej: Mantenimiento Preventivo" value={form.name} onChange={(e) => setForm(prev => ({ ...prev, name: e.currentTarget.value }))} autoFocus
                        styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
                    <TextInput label="Rubro" placeholder="Ej: Mantenimiento" value={form.rubro} onChange={(e) => setForm(prev => ({ ...prev, rubro: e.currentTarget.value }))}
                        styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
                    <Group justify="flex-end" mt="sm">
                        <Button variant="subtle" color="gray" onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button color="teal" onClick={handleSave} disabled={!form.name.trim()}>{editingItem ? 'Guardar' : 'Crear'}</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
};

export default TiposServicio;
