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
import { getMedidas, getProductos, getRubros, saveProductos } from './storage';

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
    setRubros(getRubros());
    setProductos(getProductos());
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
              <Text size="xs" c="dimmed" fw={700} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                Control de Gastos
              </Text>
              <Title order={2} c="white">Productos de Mantenimiento</Title>
            </div>
          </Group>
          <Button color="teal" leftSection={<IconPlus size={16} />} radius="md" onClick={handleAdd}>
            Agregar
          </Button>
        </Group>
      </Paper>

      <GastosTabs pathPrefix={PATH_PREFIX} />

      <Paper p="md" radius="lg" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <Group gap="xs" mb="md" px="sm">
          <IconPackage size={18} style={{ color: '#22c55e' }} />
          <Text fw={700} c="white">Productos</Text>
        </Group>

        <Stack gap={0}>
          {productos.map((item) => (
            <Box key={item.id} px="md" py="md" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text fw={700} size="md" c="white">{item.nombre}</Text>
                  <Text size="xs" c="blue.4">{item.rubro}</Text>
                  <Text size="xs" c="gray.4">Ref: {item.referencia || 'N/A'} | Medida: {item.medida} | Reorden: {item.puntoReorden}</Text>
                  <Text size="xs" c="gray.5">{item.descripcion || 'Sin descripcion'}</Text>
                </Stack>
                <Group gap="xs">
                  <Tooltip label="Editar">
                    <ActionIcon variant="subtle" color="yellow" onClick={() => handleEdit(item)}>
                      <IconPencil size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Eliminar">
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(item)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Box>
          ))}
          {productos.length === 0 && (
            <Box p="xl" ta="center">
              <Text c="dimmed">No hay productos registrados.</Text>
            </Box>
          )}
        </Stack>
      </Paper>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Producto' : 'Nuevo Producto'} centered radius="lg" size="lg"
        styles={{ header: { background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { background: '#1e293b' }, title: { color: 'white', fontWeight: 700 }, close: { color: 'white' } }}>
        <Stack>
          <Select
            label="Rubro *"
            placeholder="Seleccionar rubro"
            data={rubrosConProducto}
            value={form.rubro}
            onChange={(value) => setForm((prev) => ({ ...prev, rubro: value || '' }))}
            styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
          />
          <TextInput label="Nombre del producto *" value={form.nombre} onChange={(e) => setForm((prev) => ({ ...prev, nombre: e.currentTarget.value }))} placeholder="Nombre"
            styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
          <TextInput label="Referencia" value={form.referencia} onChange={(e) => setForm((prev) => ({ ...prev, referencia: e.currentTarget.value }))} placeholder="Referencia"
            styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
          <TextInput label="Descripcion" value={form.descripcion} onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.currentTarget.value }))} placeholder="Descripcion"
            styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
          <Group grow>
            <Select
              label="Medida *"
              placeholder="Seleccionar medida"
              data={medidas}
              value={form.medida}
              onChange={(value) => setForm((prev) => ({ ...prev, medida: value || '' }))}
              styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
            />
            <NumberInput
              label="Punto de reorden"
              value={form.puntoReorden}
              onChange={(value) => setForm((prev) => ({ ...prev, puntoReorden: Number(value || 0) }))}
              min={0}
              styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
            />
          </Group>
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button color="teal" onClick={handleSave} disabled={!form.rubro || !form.nombre.trim() || !form.medida}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

