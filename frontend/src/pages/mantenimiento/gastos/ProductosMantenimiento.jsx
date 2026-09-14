import React, { useEffect, useMemo, useState } from 'react';
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
} from '@mantine/core';
import { IconArrowLeft, IconPlus, IconPencil, IconTrash, IconPackage } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import GastosTabs from '../../../components/GastosTabs';
import { notifications } from '@mantine/notifications';
import { api } from '../../../utils/api';
import { getMedidas, getProductos, saveProductos } from './storage';
import { toTitleCase } from '../../produccion/gastos/gastosText';

const PATH_PREFIX = '/mantenimiento/gastos';

const emptyForm = {
  rubro: '',
  nombre: '',
  referencia: '',
  descripcion: '',
  medida: '',
  puntoReorden: 0,
};

export default function ProductosMantenimiento() {
  const navigate = useNavigate();
  const [rubros, setRubros] = useState([]);
  const [productos, setProductos] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const rows = await api.get('/gastos/mantenimiento/rubros');
        if (cancelled) return;
        const names = (Array.isArray(rows) ? rows : [])
          .map((r) => toTitleCase(r.name || r.Name || ''))
          .filter(Boolean);
        setRubros(names);
      } catch (e) {
        notifications.show({
          title: 'Error',
          message: e?.message || 'No se pudieron cargar los rubros.',
          color: 'red',
        });
      }
    })();
    setProductos(getProductos());
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (productos.length >= 0) saveProductos(productos);
  }, [productos]);

  const rubrosConProducto = useMemo(
    () => rubros.filter((r) => r.toLowerCase() !== 'mantenimiento').map((r) => ({ value: r, label: r })),
    [rubros]
  );

  const medidas = getMedidas().map((m) => ({ value: m, label: m }));

  const handleAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      rubro: item.rubro,
      nombre: item.nombre,
      referencia: item.referencia,
      descripcion: item.descripcion,
      medida: item.medida,
      puntoReorden: item.puntoReorden,
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.rubro || !form.nombre.trim() || !form.medida) return;

    if (form.rubro.toLowerCase() === 'mantenimiento') {
      notifications.show({
        title: 'Rubro no permitido',
        message: 'No se pueden crear productos para el rubro Mantenimiento.',
        color: 'orange',
      });
      return;
    }

    if (editingId) {
      setProductos((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...form, nombre: form.nombre.trim() } : p)));
      notifications.show({ title: 'Producto actualizado', message: `"${form.nombre.trim()}" actualizado.`, color: 'blue' });
    } else {
      const newId = Math.max(0, ...productos.map((p) => p.id)) + 1;
      setProductos((prev) => [...prev, { id: newId, ...form, nombre: form.nombre.trim() }]);
      notifications.show({ title: 'Producto creado', message: `"${form.nombre.trim()}" agregado.`, color: 'teal' });
    }
    setModalOpen(false);
  };

  const handleDelete = (item) => {
    setProductos((prev) => prev.filter((p) => p.id !== item.id));
    notifications.show({ title: 'Producto eliminado', message: `"${item.nombre}" eliminado.`, color: 'red' });
  };

  return (
    <Container size="xl" py="xl">
      <Paper p="lg" radius="lg" mb="lg" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Group justify="space-between" align="center">
          <Group>
            <Button variant="subtle" color="gray" size="sm" leftSection={<IconArrowLeft size={18} />} onClick={() => navigate('/')} c="dimmed" styles={{ root: { padding: '4px 10px' } }}>
              Volver al Panel
            </Button>
            <div>
              <Title order={3} c="white">Productos de Mantenimiento</Title>
              <Text size="sm" c="dimmed">Catálogo de productos (local hasta API dedicada)</Text>
            </div>
          </Group>
          <Button leftSection={<IconPlus size={16} />} onClick={handleAdd}>Nuevo producto</Button>
        </Group>
        <Box mt="md">
          <GastosTabs pathPrefix={PATH_PREFIX} />
        </Box>
      </Paper>

      <Stack gap="sm">
        {productos.length === 0 ? (
          <Text c="dimmed">No hay productos.</Text>
        ) : productos.map((item) => (
          <Paper key={item.id} p="md" radius="md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Group justify="space-between">
              <Group>
                <IconPackage size={18} />
                <div>
                  <Text fw={600} c="white">{item.nombre}</Text>
                  <Text size="xs" c="dimmed">{item.rubro} · {item.referencia || 'sin ref'} · {item.medida}</Text>
                </div>
              </Group>
              <Group gap={4}>
                <Tooltip label="Editar">
                  <ActionIcon variant="subtle" onClick={() => handleEdit(item)}><IconPencil size={16} /></ActionIcon>
                </Tooltip>
                <Tooltip label="Eliminar">
                  <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(item)}><IconTrash size={16} /></ActionIcon>
                </Tooltip>
              </Group>
            </Group>
          </Paper>
        ))}
      </Stack>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar producto' : 'Nuevo producto'}>
        <Stack>
          <Select label="Rubro" data={rubrosConProducto} value={form.rubro} onChange={(v) => setForm({ ...form, rubro: v || '' })} searchable required />
          <TextInput label="Nombre" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
          <TextInput label="Referencia" value={form.referencia} onChange={(e) => setForm({ ...form, referencia: e.target.value })} />
          <TextInput label="Descripción" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} />
          <Select label="Medida" data={medidas} value={form.medida} onChange={(v) => setForm({ ...form, medida: v || '' })} required />
          <NumberInput label="Punto de reorden" value={form.puntoReorden} onChange={(v) => setForm({ ...form, puntoReorden: Number(v) || 0 })} min={0} />
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}
