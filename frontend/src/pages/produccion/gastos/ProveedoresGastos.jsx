import React, { useCallback, useEffect, useState } from 'react';
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
    MultiSelect,
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
import GastosTabs from '../../../components/GastosTabs';
import { notifications } from '@mantine/notifications';
import { toTitleCase, toTitleCaseSaved, normalizeProveedorRubros, formatRubrosLabel, formatNit, isCompleteNit, formatCc, isCompleteCc } from './gastosText';
import { api } from '../../../utils/api';

const ProveedoresGastos = ({
    titulo = 'Proveedores',
    subtitulo = 'Control de Gastos',
    showTabs = false,
    pathPrefix = '/planeacion/gastos',
    areaKey = 'produccion',
}) => {
    const navigate = useNavigate();
    const [proveedores, setProveedores] = useState([]);
    const [rubroOptions, setRubroOptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingProv, setEditingProv] = useState(null);
    const [form, setForm] = useState({ name: '', rubros: [], asesor: '', nit: '', cedula: '', telefono: '' });

    const loadCatalog = useCallback(async () => {
        setLoading(true);
        try {
            const [provData, rubroData] = await Promise.all([
                api.get(`/gastos/${areaKey}/proveedores`),
                api.get(`/gastos/${areaKey}/rubros`),
            ]);
            setProveedores(Array.isArray(provData) ? provData : []);
            setRubroOptions(
                (Array.isArray(rubroData) ? rubroData : [])
                    .map((r) => r.name)
                    .filter(Boolean)
            );
        } catch (error) {
            notifications.show({
                title: 'No se pudo cargar el catálogo',
                message: error.message || 'Error de red',
                color: 'red',
            });
        } finally {
            setLoading(false);
        }
    }, [areaKey]);

    useEffect(() => {
        loadCatalog();
    }, [loadCatalog]);

    const handleAdd = () => {
        setEditingProv(null);
        setForm({ name: '', rubros: [], asesor: '', nit: '', cedula: '', telefono: '' });
        setModalOpen(true);
    };

    const handleEdit = (prov) => {
        setEditingProv(prov);
        setForm({
            name: prov.name,
            rubros: normalizeProveedorRubros(prov),
            asesor: prov.asesor || '',
            nit: formatNit(prov.nit || ''),
            cedula: formatCc(prov.cedula || ''),
            telefono: prov.telefono || '',
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!form.name.trim() || !form.rubros?.length || saving) return;
        const rubros = form.rubros.map((item) => toTitleCaseSaved(item)).filter(Boolean);
        if (form.nit && !isCompleteNit(form.nit)) {
            notifications.show({
                title: 'NIT incompleto',
                message: 'Si indica NIT, use el formato 900.123.456-7.',
                color: 'red',
            });
            return;
        }
        if (form.cedula && !isCompleteCc(form.cedula)) {
            notifications.show({
                title: 'C.C. incompleta',
                message: 'Si indica C.C., use el número separado en miles (ej. 1.234.567).',
                color: 'red',
            });
            return;
        }
        const payload = {
            name: toTitleCaseSaved(form.name),
            rubros,
            asesor: toTitleCaseSaved(form.asesor),
            nit: form.nit?.trim() || '',
            cedula: form.cedula?.trim() || '',
            telefono: form.telefono?.trim() || '',
        };
        setSaving(true);
        try {
            if (editingProv) {
                await api.post(`/gastos/${areaKey}/proveedores/${editingProv.id}`, payload);
                notifications.show({
                    title: 'Proveedor actualizado',
                    message: `"${payload.name}" se guardó en el servidor.`,
                    color: 'blue',
                });
            } else {
                await api.post(`/gastos/${areaKey}/proveedores`, payload);
                notifications.show({
                    title: 'Proveedor creado',
                    message: `"${payload.name}" se guardó en el servidor.`,
                    color: 'teal',
                });
            }
            setModalOpen(false);
            await loadCatalog();
        } catch (error) {
            const raw = error.message || 'Error de red';
            notifications.show({
                title: 'No se pudo guardar',
                message: /failed to fetch|network|connection/i.test(raw)
                    ? 'No hay conexión con el servidor. Reinicie el backend e intente de nuevo.'
                    : raw,
                color: 'red',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (prov) => {
        try {
            await api.delete(`/gastos/${areaKey}/proveedores/${prov.id}`);
            notifications.show({
                title: 'Proveedor eliminado',
                message: `"${prov.name}" se eliminó del servidor.`,
                color: 'red',
            });
            await loadCatalog();
        } catch (error) {
            notifications.show({
                title: 'No se pudo eliminar',
                message: error.message || 'Error de red',
                color: 'red',
            });
        }
    };

    const canSave = Boolean(form.name.trim() && form.rubros?.length)
        && (!form.nit || isCompleteNit(form.nit))
        && (!form.cedula || isCompleteCc(form.cedula));

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
                        Agregar
                    </Button>
                </Group>
            </Paper>

            {showTabs && <GastosTabs pathPrefix={pathPrefix} />}

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
                                                {toTitleCase(prov.name)}
                                            </Text>
                                            <Text size="xs" c="blue.4" fw={500}>
                                                {formatRubrosLabel(prov) || 'Sin rubro'}
                                            </Text>
                                            {prov.asesor && (
                                                <Text size="xs" c="dimmed">Asesor: {toTitleCase(prov.asesor)}</Text>
                                            )}

                                            {/* NIT + Phone */}
                                            <Group gap="lg" mt={4}>
                                                {prov.nit && (
                                                    <Group gap={4}>
                                                        <IconId size={14} style={{ color: '#64748b' }} />
                                                        <Text size="xs" c="gray.4">NIT: {formatNit(prov.nit)}</Text>
                                                    </Group>
                                                )}
                                                {prov.cedula && (
                                                    <Group gap={4}>
                                                        <IconId size={14} style={{ color: '#64748b' }} />
                                                        <Text size="xs" c="gray.4">C.C.: {formatCc(prov.cedula)}</Text>
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

                    {loading && (
                        <Box p="xl" ta="center">
                            <Text c="dimmed">Cargando proveedores...</Text>
                        </Box>
                    )}
                    {!loading && proveedores.length === 0 && (
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
                        onChange={(e) => setForm(prev => ({ ...prev, name: toTitleCase(e.currentTarget.value) }))}
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
                    <MultiSelect
                        label="Rubros"
                        placeholder="Seleccione uno o varios rubros"
                        data={rubroOptions}
                        value={form.rubros}
                        onChange={(val) => setForm(prev => ({ ...prev, rubros: val || [] }))}
                        searchable
                        required
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
                        label="Asesor"
                        placeholder="Opcional"
                        value={form.asesor}
                        onChange={(e) => setForm(prev => ({ ...prev, asesor: toTitleCase(e.currentTarget.value) }))}
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
                        label="NIT (opcional)"
                        placeholder="900.123.456-7"
                        value={form.nit}
                        onChange={(e) => setForm(prev => ({ ...prev, nit: formatNit(e.currentTarget.value) }))}
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
                        label="C.C. (opcional)"
                        placeholder="1.234.567"
                        value={form.cedula}
                        onChange={(e) => setForm(prev => ({ ...prev, cedula: formatCc(e.currentTarget.value) }))}
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
                        <Button color="teal" onClick={handleSave} disabled={!canSave} loading={saving}>
                            {editingProv ? 'Guardar' : 'Crear Proveedor'}
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
};

export default ProveedoresGastos;
