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
    IconBuildingFactory2,
    IconId,
    IconPhone
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { notifications } from '@mantine/notifications';

const initialProveedores = [
    { id: 1, name: 'FERRELOPEZ', rubro: 'Mantenimiento', nit: '', telefono: '' },
    { id: 2, name: 'CALI BANDAS', rubro: 'Repuesto', nit: '900.985.09/9-2', telefono: '3162664451' },
    { id: 3, name: 'José Ramiro Puerta Gallego', rubro: 'Mantenimiento', nit: '901.442.622', telefono: '' },
    { id: 4, name: 'Transmisiones y mecánica industrial Ltda.', rubro: 'Mantenimiento', nit: '900.699.864-1', telefono: '3168655273' },
    { id: 5, name: 'Suministros El Punto S.A.S', rubro: 'Repuesto', nit: '900.123.456-7', telefono: '3001234567' },
    { id: 6, name: 'Distribuidora Nacional', rubro: 'Materia Prima', nit: '800.555.123-4', telefono: '' },
];

const RUBROS = ['Mantenimiento', 'Repuesto', 'Materia Prima', 'Refrigerios', 'Horas Extras', 'Prestadores de Servicios', 'Recargo', 'Transporte'];

const ProveedoresGastos = ({ titulo = 'Proveedores', subtitulo = 'Control de Gastos' }) => {
    const navigate = useNavigate();
    const [proveedores, setProveedores] = useState(initialProveedores);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProv, setEditingProv] = useState(null);
    const [form, setForm] = useState({ name: '', rubro: '', nit: '', telefono: '' });

    const handleAdd = () => {
        setEditingProv(null);
        setForm({ name: '', rubro: '', nit: '', telefono: '' });
        setModalOpen(true);
    };

    const handleEdit = (prov) => {
        setEditingProv(prov);
        setForm({ name: prov.name, rubro: prov.rubro, nit: prov.nit, telefono: prov.telefono });
        setModalOpen(true);
    };

    const handleSave = () => {
        if (!form.name.trim()) return;

        if (editingProv) {
            setProveedores(prev => prev.map(p =>
                p.id === editingProv.id ? { ...p, ...form } : p
            ));
            notifications.show({
                title: 'Proveedor actualizado',
                message: `"${form.name}" ha sido actualizado correctamente.`,
                color: 'blue',
            });
        } else {
            const newId = Math.max(...proveedores.map(p => p.id), 0) + 1;
            setProveedores(prev => [...prev, { id: newId, ...form }]);
            notifications.show({
                title: 'Proveedor creado',
                message: `"${form.name}" ha sido añadido correctamente.`,
                color: 'teal',
            });
        }
        setModalOpen(false);
    };

    const handleDelete = (prov) => {
        setProveedores(prev => prev.filter(p => p.id !== prov.id));
        notifications.show({
            title: 'Proveedor eliminado',
            message: `"${prov.name}" ha sido eliminado.`,
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

            {/* Proveedores List */}
            <Paper
                p="md"
                radius="lg"
                style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <Group gap="xs" mb="md" px="sm">
                    <IconBuildingFactory2 size={18} style={{ color: '#6366f1' }} />
                    <Text fw={700} c="white">Proveedores</Text>
                </Group>

                <Stack gap={0}>
                    <AnimatePresence>
                        {proveedores.map((prov, index) => (
                            <motion.div
                                key={prov.id}
                                initial={{ opacity: 0, x: -15 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 15 }}
                                transition={{ delay: index * 0.04, duration: 0.25 }}
                            >
                                <Box
                                    px="md"
                                    py="md"
                                    style={{
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                                        borderLeft: '3px solid #3b82f6',
                                        transition: 'background 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                >
                                    {/* Name + Actions */}
                                    <Group justify="space-between" align="flex-start">
                                        <Stack gap={4}>
                                            <Text fw={700} size="md" c="white">
                                                {prov.name}
                                            </Text>
                                            <Text size="xs" c="blue.4" fw={500}>
                                                {prov.rubro}
                                            </Text>

                                            {/* NIT + Phone */}
                                            <Group gap="lg" mt={4}>
                                                {prov.nit && (
                                                    <Group gap={4}>
                                                        <IconId size={14} style={{ color: '#64748b' }} />
                                                        <Text size="xs" c="gray.4">NIT: {prov.nit}</Text>
                                                    </Group>
                                                )}
                                                {prov.telefono && (
                                                    <Group gap={4}>
                                                        <IconPhone size={14} style={{ color: '#64748b' }} />
                                                        <Text size="xs" c="gray.4">Tel: {prov.telefono}</Text>
                                                    </Group>
                                                )}
                                            </Group>
                                        </Stack>

                                        <Group gap="sm" mt={4}>
                                            <Button
                                                variant="subtle"
                                                color="blue"
                                                size="xs"
                                                leftSection={<IconPencil size={14} />}
                                                onClick={() => handleEdit(prov)}
                                            >
                                                Editar
                                            </Button>
                                            <Button
                                                variant="subtle"
                                                color="red"
                                                size="xs"
                                                leftSection={<IconTrash size={14} />}
                                                onClick={() => handleDelete(prov)}
                                            >
                                                Eliminar
                                            </Button>
                                        </Group>
                                    </Group>
                                </Box>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {proveedores.length === 0 && (
                        <Box p="xl" ta="center">
                            <Text c="dimmed">No hay proveedores registrados.</Text>
                        </Box>
                    )}
                </Stack>
            </Paper>

            {/* Add/Edit Modal */}
            <Modal
                opened={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingProv ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                centered
                radius="lg"
                size="md"
                styles={{
                    header: { background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)' },
                    body: { background: '#1e293b' },
                    title: { color: 'white', fontWeight: 700 },
                    close: { color: 'white' },
                }}
            >
                <Stack>
                    <TextInput
                        label="Nombre del Proveedor"
                        placeholder="Ej: Suministros S.A.S"
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
                    <Select
                        label="Rubro"
                        placeholder="Seleccionar rubro"
                        data={RUBROS}
                        value={form.rubro}
                        onChange={(val) => setForm(prev => ({ ...prev, rubro: val || '' }))}
                        styles={{
                            label: { color: '#94a3b8', marginBottom: 4 },
                            input: {
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                            },
                        }}
                    />
                    <TextInput
                        label="NIT"
                        placeholder="Ej: 900.123.456-7"
                        value={form.nit}
                        onChange={(e) => setForm(prev => ({ ...prev, nit: e.currentTarget.value }))}
                        styles={{
                            label: { color: '#94a3b8', marginBottom: 4 },
                            input: {
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: 'white',
                            },
                        }}
                    />
                    <TextInput
                        label="Teléfono"
                        placeholder="Ej: 3001234567"
                        value={form.telefono}
                        onChange={(e) => setForm(prev => ({ ...prev, telefono: e.currentTarget.value }))}
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
                            {editingProv ? 'Guardar' : 'Crear Proveedor'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
};

export default ProveedoresGastos;
