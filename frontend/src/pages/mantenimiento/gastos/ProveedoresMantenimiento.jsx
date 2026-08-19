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
  Modal,
  MultiSelect,
  Tooltip,
} from '@mantine/core';
import { IconArrowLeft, IconPlus, IconPencil, IconTrash, IconBuildingFactory2, IconId, IconPhone } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import GastosTabs from '../../../components/GastosTabs';
import { notifications } from '@mantine/notifications';
import { getProveedores, getRubros, saveProveedores } from './storage';
import { toTitleCase, toTitleCaseSaved, normalizeProveedorRubros, formatRubrosLabel, formatNit, isCompleteNit, formatCc, isCompleteCc } from '../../produccion/gastos/gastosText';

const PATH_PREFIX = '/mantenimiento/gastos';

const emptyForm = { nombre: '', rubros: [], asesor: '', nit: '', cedula: '', telefono: '' };

export default function ProveedoresMantenimiento() {
  const navigate = useNavigate();
  const [rubros, setRubros] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    setRubros(getRubros().map((r) => toTitleCase(r)));
    setProveedores(getProveedores().map((p) => ({
      ...p,
      nombre: toTitleCase(p.nombre),
      rubros: normalizeProveedorRubros(p),
      rubro: normalizeProveedorRubros(p)[0] || '',
    })));
  }, []);

  useEffect(() => {
    if (proveedores.length >= 0) saveProveedores(proveedores);
  }, [proveedores]);

  const rubroOptions = useMemo(() => rubros.map((r) => ({ value: r, label: r })), [rubros]);

  const handleAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setForm({
      nombre: item.nombre,
      rubros: normalizeProveedorRubros(item),
      asesor: item.asesor || '',
      nit: formatNit(item.nit || ''),
      cedula: formatCc(item.cedula || ''),
      telefono: item.telefono || '',
    });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.nombre.trim() || !form.rubros?.length) return;
    const nombre = toTitleCaseSaved(form.nombre);
    const rubros = form.rubros.map((item) => toTitleCaseSaved(item)).filter(Boolean);
    const rubro = rubros[0] || '';
    if (form.nit && !isCompleteNit(form.nit)) return;
    if (form.cedula && !isCompleteCc(form.cedula)) return;

    const asesor = toTitleCaseSaved(form.asesor);
    const nit = formatNit(form.nit);
    const cedula = formatCc(form.cedula);

    if (editingId) {
      setProveedores((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...form, nombre, rubros, rubro, asesor, nit, cedula } : p)));
      notifications.show({ title: 'Proveedor actualizado', message: `"${nombre}" actualizado.`, color: 'blue' });
    } else {
      const newId = Math.max(0, ...proveedores.map((p) => p.id)) + 1;
      setProveedores((prev) => [...prev, { id: newId, ...form, nombre, rubros, rubro, asesor, nit, cedula }]);
      notifications.show({ title: 'Proveedor creado', message: `"${nombre}" agregado.`, color: 'teal' });
    }
    setModalOpen(false);
  };

  const handleDelete = (item) => {
    setProveedores((prev) => prev.filter((p) => p.id !== item.id));
    notifications.show({ title: 'Proveedor eliminado', message: `"${item.nombre}" eliminado.`, color: 'red' });
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
              <Title order={2} c="white">Proveedores de Mantenimiento</Title>
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
          <IconBuildingFactory2 size={18} style={{ color: '#6366f1' }} />
          <Text fw={700} c="white">Proveedores</Text>
        </Group>

        <Stack gap={0}>
          {proveedores.map((prov) => (
            <Box key={prov.id} px="md" py="md" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', borderLeft: '3px solid #3b82f6' }}>
              <Group justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text fw={700} size="md" c="white">{prov.nombre}</Text>
                  <Text size="xs" c="blue.4">{formatRubrosLabel(prov) || 'Sin rubro'}</Text>
                  {prov.asesor && <Text size="xs" c="dimmed">Asesor: {prov.asesor}</Text>}
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
                <Group gap="xs">
                  <Tooltip label="Editar">
                    <ActionIcon variant="subtle" color="yellow" onClick={() => handleEdit(prov)}>
                      <IconPencil size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Eliminar">
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(prov)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Box>
          ))}
          {proveedores.length === 0 && (
            <Box p="xl" ta="center">
              <Text c="dimmed">No hay proveedores registrados.</Text>
            </Box>
          )}
        </Stack>
      </Paper>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Editar Proveedor' : 'Agregar Proveedor'} centered radius="lg"
        styles={{ header: { background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { background: '#1e293b' }, title: { color: 'white', fontWeight: 700 }, close: { color: 'white' } }}>
        <Stack>
          <TextInput label="Nombre *" value={form.nombre} onChange={(e) => setForm((prev) => ({ ...prev, nombre: toTitleCase(e.currentTarget.value) }))} placeholder="Nombre del proveedor"
            styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
          <MultiSelect label="Rubros *" data={rubroOptions} value={form.rubros} onChange={(value) => setForm((prev) => ({ ...prev, rubros: value || [] }))} placeholder="Seleccione uno o varios rubros" searchable
            styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
          <TextInput label="Asesor" value={form.asesor} onChange={(e) => setForm((prev) => ({ ...prev, asesor: toTitleCase(e.currentTarget.value) }))} placeholder="Opcional"
            styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
          <TextInput
            label="NIT (opcional)"
            value={form.nit}
            onChange={(e) => setForm((prev) => ({ ...prev, nit: formatNit(e.currentTarget.value) }))}
            placeholder="900.123.456-7"
            styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
          />
          <TextInput
            label="C.C. (opcional)"
            value={form.cedula}
            onChange={(e) => setForm((prev) => ({ ...prev, cedula: formatCc(e.currentTarget.value) }))}
            placeholder="1.234.567"
            styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
          />
          <TextInput label="Telefono" value={form.telefono} onChange={(e) => setForm((prev) => ({ ...prev, telefono: e.currentTarget.value }))} placeholder="Telefono"
            styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }} />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button color="teal" onClick={handleSave} disabled={!form.nombre.trim() || !form.rubros?.length}>Guardar</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

