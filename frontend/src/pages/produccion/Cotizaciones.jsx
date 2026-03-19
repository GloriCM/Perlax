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
    Select,
    Tooltip,
    Badge,
    FileInput
} from '@mantine/core';
import {
    IconArrowLeft,
    IconPlus,
    IconPencil,
    IconTrash,
    IconFileDollar,
    IconBuildingFactory2,
    IconCalendar,
    IconDownload,
    IconUpload
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import GastosTabs from '../../components/GastosTabs';
import { notifications } from '@mantine/notifications';

const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

const initialCotizaciones = [
    { id: 1, proveedor: 'Ferrelopez S.A.S', concepto: 'Mantenimiento preventivo', fecha: '2026-03-01', monto: 1250000, estado: 'Aprobada', archivo: 'cotizacion_ferrelopez_001.pdf' },
    { id: 2, proveedor: 'Distribuidora Nacional', concepto: 'Compra de repuestos', fecha: '2026-03-05', monto: 850000, estado: 'Pendiente', archivo: 'repuestos_marzo.pdf' },
    { id: 3, proveedor: 'Cali Bandas', concepto: 'Cambio de bandas transportadoras', fecha: '2026-02-28', monto: 3200000, estado: 'Rechazada', archivo: null },
];

const ESTADOS = ['Pendiente', 'Aprobada', 'Rechazada'];
const PROVEEDORES = ['Ferrelopez S.A.S', 'Distribuidora Nacional', 'Cali Bandas', 'Suministros El Punto S.A.S'];

const Cotizaciones = ({ titulo = 'Cotizaciones de Producción', subtitulo = 'Control de Gastos', showTabs = false, pathPrefix = '/planeacion/gastos' }) => {
    const navigate = useNavigate();
    const [cotizaciones, setCotizaciones] = useState(initialCotizaciones);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [form, setForm] = useState({ proveedor: '', concepto: '', monto: 0, estado: 'Pendiente', file: null });

    const handleAdd = () => {
        setEditingItem(null);
        setForm({ proveedor: '', concepto: '', monto: 0, estado: 'Pendiente', file: null });
        setModalOpen(true);
    };

    const handleEdit = (item) => {
        setEditingItem(item);
        setForm({ proveedor: item.proveedor, concepto: item.concepto, monto: item.monto, estado: item.estado, file: null });
        setModalOpen(true);
    };

    const handleSave = () => {
        if (!form.proveedor || !form.concepto) return;

        if (editingItem) {
            setCotizaciones(prev => prev.map(c =>
                c.id === editingItem.id ? { ...c, ...form, archivo: form.file ? form.file.name : c.archivo } : c
            ));
            notifications.show({ title: 'Cotización actualizada', message: `Cotización de "${form.proveedor}" editada.`, color: 'blue' });
        } else {
            const newId = Math.max(...cotizaciones.map(c => c.id), 0) + 1;
            const newDate = new Date().toISOString().split('T')[0];
            setCotizaciones(prev => [...prev, { id: newId, fecha: newDate, archivo: form.file?.name || null, ...form }]);
            notifications.show({ title: 'Cotización registrada', message: `Cotización de "${form.proveedor}" guardada.`, color: 'teal' });
        }
        setModalOpen(false);
    };

    const handleDelete = (item) => {
        setCotizaciones(prev => prev.filter(c => c.id !== item.id));
        notifications.show({ title: 'Cotización eliminada', message: `Cotización de "${item.proveedor}" eliminada.`, color: 'red' });
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Aprobada': return 'teal';
            case 'Pendiente': return 'orange';
            case 'Rechazada': return 'red';
            default: return 'gray';
        }
    };

    return (
        <Container size="xl" py="xl">
            {/* Header */}
            <Paper p="lg" radius="lg" mb="lg" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
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
                        + Nueva Cotización
                    </Button>
                </Group>
            </Paper>

            {showTabs && <GastosTabs pathPrefix={pathPrefix} />}

            {/* List */}
            <Paper p="md" radius="lg" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Group gap="xs" mb="md" px="sm">
                    <IconFileDollar size={18} style={{ color: '#6366f1' }} />
                    <Text fw={700} c="white">Registro de Cotizaciones</Text>
                </Group>

                <Stack gap={0}>
                    <AnimatePresence>
                        {cotizaciones.map((item, index) => (
                            <motion.div key={item.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 15 }} transition={{ delay: index * 0.04, duration: 0.25 }}>
                                <Box px="md" py="md" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)', borderLeft: `3px solid var(--mantine-color-${getStatusColor(item.estado)}-filled)`, transition: 'background 0.15s ease' }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                                    <Group justify="space-between" align="flex-start">
                                        <Stack gap={4}>
                                            <Group gap="sm">
                                                <Text fw={700} size="md" c="white">{item.concepto}</Text>
                                                <Badge color={getStatusColor(item.estado)} variant="filled" size="sm">{item.estado}</Badge>
                                            </Group>

                                            <Group gap="lg" mt={4}>
                                                <Group gap={4}>
                                                    <IconBuildingFactory2 size={14} style={{ color: '#64748b' }} />
                                                    <Text size="xs" c="blue.4" fw={500}>{item.proveedor}</Text>
                                                </Group>
                                                <Group gap={4}>
                                                    <IconCalendar size={14} style={{ color: '#64748b' }} />
                                                    <Text size="xs" c="gray.4">{item.fecha}</Text>
                                                </Group>
                                            </Group>

                                            {item.archivo && (
                                                <Group gap={4} mt={6}>
                                                    <IconDownload size={14} style={{ color: '#10b981' }} />
                                                    <Text size="xs" c="teal.4" style={{ cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>{item.archivo}</Text>
                                                </Group>
                                            )}
                                        </Stack>

                                        <Stack align="flex-end" gap="xs">
                                            <Text fw={700} size="lg" style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>
                                                {formatCurrency(item.monto)}
                                            </Text>
                                            <Group gap="xs">
                                                <Button variant="subtle" color="blue" size="xs" leftSection={<IconPencil size={14} />} onClick={() => handleEdit(item)}>Editar</Button>
                                                <Button variant="subtle" color="red" size="xs" leftSection={<IconTrash size={14} />} onClick={() => handleDelete(item)}>Eliminar</Button>
                                            </Group>
                                        </Stack>
                                    </Group>
                                </Box>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {cotizaciones.length === 0 && (
                        <Box p="xl" ta="center"><Text c="dimmed">No hay cotizaciones registradas.</Text></Box>
                    )}
                </Stack>
            </Paper>

            {/* Modal */}
            <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingItem ? 'Editar Cotización' : 'Nueva Cotización'} centered radius="lg" size="lg"
                styles={{ header: { background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { background: '#1e293b' }, title: { color: 'white', fontWeight: 700 }, close: { color: 'white' } }}>
                <Stack>
                    <Select label="Proveedor" placeholder="Seleccionar" data={PROVEEDORES} value={form.proveedor} onChange={(val) => setForm(prev => ({ ...prev, proveedor: val || '' }))} searchable
                        styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
                    <TextInput label="Concepto / Detalle" placeholder="Ej: Mantenimiento Preventivo" value={form.concepto} onChange={(e) => setForm(prev => ({ ...prev, concepto: e.currentTarget.value }))}
                        styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
                    <NumberInput label="Monto Cotizado" placeholder="0" value={form.monto} onChange={(val) => setForm(prev => ({ ...prev, monto: val || 0 }))} prefix="$ " thousandSeparator="." decimalSeparator=","
                        styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
                    <Select label="Estado" data={ESTADOS} value={form.estado} onChange={(val) => setForm(prev => ({ ...prev, estado: val || 'Pendiente' }))}
                        styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
                    <FileInput label="Archivo Adjunto (Opcional)" placeholder={editingItem?.archivo || "Subir PDF o Imagen"} icon={<IconUpload size={14} />} onChange={(file) => setForm(prev => ({ ...prev, file }))}
                        styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
                    <Group justify="flex-end" mt="md">
                        <Button variant="subtle" color="gray" onClick={() => setModalOpen(false)}>Cancelar</Button>
                        <Button color="teal" onClick={handleSave} disabled={!form.proveedor || !form.concepto}>{editingItem ? 'Guardar Cambios' : 'Registrar Cotización'}</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
};

export default Cotizaciones;
