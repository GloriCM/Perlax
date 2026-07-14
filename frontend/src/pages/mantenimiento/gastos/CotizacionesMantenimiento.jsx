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
  Modal,
  Select,
  Tooltip,
  NumberInput,
  TextInput,
  Badge,
} from '@mantine/core';
import { IconArrowLeft, IconPlus, IconPencil, IconTrash, IconFileDollar } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import GastosTabs from '../../../components/GastosTabs';
import { notifications } from '@mantine/notifications';
import {
  getCotizaciones,
  getProductos,
  getProveedores,
  getRubros,
  saveCotizaciones,
} from './storage';

const PATH_PREFIX = '/mantenimiento/gastos';

const formatCurrency = (value) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

const emptyForm = {
  rubro: '',
  productoId: '',
  proveedorId: '',
  cantidad: 0,
  valorUnitario: 0,
  precioTotal: 0,
  descripcion: '',
};

export default function CotizacionesMantenimiento() {
  const navigate = useNavigate();
  const [rubros, setRubros] = useState([]);
  const [productos, setProductos] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cotizaciones, setCotizaciones] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setRubros(getRubros());
    setProductos(getProductos());
    setProveedores(getProveedores());
    setCotizaciones(getCotizaciones());
  }, []);

  useEffect(() => {
    if (cotizaciones.length >= 0) saveCotizaciones(cotizaciones);
  }, [cotizaciones]);

  const rubroOptions = useMemo(() => rubros.map((r) => ({ value: r, label: r })), [rubros]);
  const isMantenimiento = form.rubro.toLowerCase() === 'mantenimiento';

  const productosFiltrados = useMemo(
    () => productos.filter((p) => p.rubro === form.rubro).map((p) => ({ value: String(p.id), label: `${p.nombre} (${p.referencia || 'sin ref'})` })),
    [productos, form.rubro]
  );

  const proveedoresFiltrados = useMemo(
    () => proveedores.filter((p) => p.rubro === form.rubro).map((p) => ({ value: String(p.id), label: p.nombre })),
    [proveedores, form.rubro]
  );

  const handleAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      rubro: item.rubro,
      productoId: item.productoId ? String(item.productoId) : '',
      proveedorId: item.proveedorId ? String(item.proveedorId) : '',
      cantidad: item.cantidad || 0,
      valorUnitario: item.valorUnitario || 0,
      precioTotal: item.precioTotal || 0,
      descripcion: item.descripcion || '',
    });
    setModalOpen(true);
  };

  const handleRubroChange = (value) => {
    const rubro = value || '';
    setForm((prev) => ({
      ...prev,
      rubro,
      productoId: '',
      proveedorId: '',
      cantidad: 0,
      valorUnitario: 0,
      precioTotal: 0,
    }));
  };

  const handleCantidadChange = (value) => {
    const cantidad = Number(value || 0);
    setForm((prev) => ({
      ...prev,
      cantidad,
      precioTotal: cantidad * Number(prev.valorUnitario || 0),
    }));
  };

  const handleValorUnitarioChange = (value) => {
    const valorUnitario = Number(value || 0);
    setForm((prev) => ({
      ...prev,
      valorUnitario,
      precioTotal: Number(prev.cantidad || 0) * valorUnitario,
    }));
  };

  const validate = () => {
    if (!form.rubro || !form.proveedorId) return false;
    if (isMantenimiento) {
      return Number(form.precioTotal || 0) > 0;
    }
    return (
      !!form.productoId &&
      Number(form.cantidad || 0) > 0 &&
      Number(form.valorUnitario || 0) > 0 &&
      Number(form.precioTotal || 0) > 0
    );
  };

  const handleSave = () => {
    if (!validate()) {
      notifications.show({
        title: 'Datos incompletos',
        message: 'Completa los campos obligatorios de la cotizacion.',
        color: 'orange',
      });
      return;
    }

    const payload = {
      rubro: form.rubro,
      productoId: isMantenimiento ? null : Number(form.productoId),
      proveedorId: Number(form.proveedorId),
      cantidad: isMantenimiento ? null : Number(form.cantidad),
      valorUnitario: isMantenimiento ? null : Number(form.valorUnitario),
      precioTotal: Number(form.precioTotal),
      descripcion: form.descripcion.trim(),
      fecha: new Date().toISOString().split('T')[0],
    };

    if (editingId) {
      setCotizaciones((prev) => prev.map((c) => (c.id === editingId ? { ...c, ...payload } : c)));
      notifications.show({ title: 'Cotizacion actualizada', message: 'Se actualizo correctamente.', color: 'blue' });
    } else {
      const newId = Math.max(0, ...cotizaciones.map((c) => c.id)) + 1;
      setCotizaciones((prev) => [...prev, { id: newId, ...payload }]);
      notifications.show({ title: 'Cotizacion creada', message: 'Se registro correctamente.', color: 'teal' });
    }
    setModalOpen(false);
  };

  const handleDelete = (item) => {
    setCotizaciones((prev) => prev.filter((c) => c.id !== item.id));
    notifications.show({ title: 'Cotizacion eliminada', message: 'Registro eliminado.', color: 'red' });
  };

  const getProveedorName = (id) => proveedores.find((p) => p.id === Number(id))?.nombre || 'Sin proveedor';
  const getProductoName = (id) => productos.find((p) => p.id === Number(id))?.nombre || 'No aplica';

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
              <Title order={2} c="white">Cotizaciones de Mantenimiento</Title>
            </div>
          </Group>
          <Button color="teal" leftSection={<IconPlus size={16} />} radius="md" onClick={handleAdd}>
            Nueva Cotizacion
          </Button>
        </Group>
      </Paper>

      <GastosTabs pathPrefix={PATH_PREFIX} />

      <Paper p="md" radius="lg" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
        <Group gap="xs" mb="md" px="sm">
          <IconFileDollar size={18} style={{ color: '#6366f1' }} />
          <Text fw={700} c="white">Registro de Cotizaciones</Text>
        </Group>

        <Stack gap={0}>
          {cotizaciones.map((item) => (
            <Box key={item.id} px="md" py="md" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Group gap="sm">
                    <Text fw={700} size="md" c="white">{item.rubro}</Text>
                    <Badge color="blue" variant="light">{item.fecha}</Badge>
                  </Group>
                  <Text size="xs" c="gray.4">Proveedor: {getProveedorName(item.proveedorId)}</Text>
                  <Text size="xs" c="gray.4">Producto: {item.rubro === 'Mantenimiento' ? 'No aplica' : getProductoName(item.productoId)}</Text>
                  {item.rubro !== 'Mantenimiento' && (
                    <Text size="xs" c="gray.4">Cantidad: {item.cantidad} | V. Unitario: {formatCurrency(item.valorUnitario)}</Text>
                  )}
                  {item.descripcion && <Text size="xs" c="gray.5">{item.descripcion}</Text>}
                </Stack>
                <Stack align="flex-end" gap="xs">
                  <Text fw={700} size="lg" style={{ fontFamily: 'monospace', color: '#e2e8f0' }}>{formatCurrency(item.precioTotal)}</Text>
                  <Group gap="xs">
                    <ActionIcon variant="subtle" color="yellow" onClick={() => handleEdit(item)}>
                      <IconPencil size={16} />
                    </ActionIcon>
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(item)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Group>
                </Stack>
              </Group>
            </Box>
          ))}
          {cotizaciones.length === 0 && (
            <Box p="xl" ta="center">
              <Text c="dimmed">No hay cotizaciones registradas.</Text>
            </Box>
          )}
        </Stack>
      </Paper>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Cotizacion' : 'Nueva Cotizacion'} centered radius="lg" size="lg"
        styles={{ header: { background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { background: '#1e293b' }, title: { color: 'white', fontWeight: 700 }, close: { color: 'white' } }}>
        <Stack>
          <Select
            label="Rubro *"
            placeholder="Seleccione Rubro"
            data={rubroOptions}
            value={form.rubro}
            onChange={handleRubroChange}
            searchable
            styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
          />
          {!isMantenimiento && (
            <Select
              label="Producto *"
              placeholder="Seleccione Producto"
              data={productosFiltrados}
              value={form.productoId}
              onChange={(value) => setForm((prev) => ({ ...prev, productoId: value || '' }))}
              disabled={!form.rubro}
              searchable
              styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
            />
          )}
          <Select
            label="Proveedor *"
            placeholder="Seleccione Proveedor"
            data={proveedoresFiltrados}
            value={form.proveedorId}
            onChange={(value) => setForm((prev) => ({ ...prev, proveedorId: value || '' }))}
            disabled={!form.rubro}
            searchable
            styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
          />
          {!isMantenimiento ? (
            <Group grow>
              <NumberInput
                label="Cantidad *"
                value={form.cantidad}
                onChange={handleCantidadChange}
                min={0}
                styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
              />
              <NumberInput
                label="Valor Unitario *"
                value={form.valorUnitario}
                onChange={handleValorUnitarioChange}
                min={0}
                thousandSeparator="."
                prefix="$ "
                styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
              />
            </Group>
          ) : null}
          <NumberInput
            label="Precio Total (Auto) *"
            value={form.precioTotal}
            onChange={(value) => setForm((prev) => ({ ...prev, precioTotal: Number(value || 0) }))}
            readOnly={!isMantenimiento}
            min={0}
            thousandSeparator="."
            prefix="$ "
            styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
          />
          <TextInput
            label="Descripcion"
            value={form.descripcion}
            onChange={(e) => setForm((prev) => ({ ...prev, descripcion: e.currentTarget.value }))}
            placeholder="Opcional..."
            styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button color="teal" onClick={handleSave} disabled={!validate()}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

