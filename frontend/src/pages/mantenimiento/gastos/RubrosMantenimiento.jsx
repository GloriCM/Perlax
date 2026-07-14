import React, { useEffect, useState } from 'react';
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
  Tooltip,
} from '@mantine/core';
import { IconArrowLeft, IconPlus, IconPencil, IconTrash, IconFolder } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import GastosTabs from '../../../components/GastosTabs';
import { notifications } from '@mantine/notifications';
import { getRubros, saveRubros } from './storage';

const PATH_PREFIX = '/mantenimiento/gastos';

export default function RubrosMantenimiento() {
  const navigate = useNavigate();
  const [rubros, setRubros] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [rubroName, setRubroName] = useState('');

  useEffect(() => {
    setRubros(getRubros());
  }, []);

  useEffect(() => {
    if (rubros.length > 0) saveRubros(rubros);
  }, [rubros]);

  const handleAdd = () => {
    setEditingIndex(null);
    setRubroName('');
    setModalOpen(true);
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setRubroName(rubros[index]);
    setModalOpen(true);
  };

  const handleSave = () => {
    const value = rubroName.trim();
    if (!value) return;

    const exists = rubros.some((r, i) => i !== editingIndex && r.toLowerCase() === value.toLowerCase());
    if (exists) {
      notifications.show({
        title: 'Rubro duplicado',
        message: 'Ya existe un rubro con ese nombre.',
        color: 'orange',
      });
      return;
    }

    if (editingIndex !== null) {
      const next = [...rubros];
      next[editingIndex] = value;
      setRubros(next);
      notifications.show({ title: 'Rubro actualizado', message: `"${value}" actualizado.`, color: 'blue' });
    } else {
      setRubros((prev) => [...prev, value]);
      notifications.show({ title: 'Rubro creado', message: `"${value}" agregado.`, color: 'teal' });
    }
    setModalOpen(false);
  };

  const handleDelete = (index) => {
    const name = rubros[index];
    setRubros((prev) => prev.filter((_, i) => i !== index));
    notifications.show({ title: 'Rubro eliminado', message: `"${name}" eliminado.`, color: 'red' });
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
              <Title order={2} c="white">Rubros de Mantenimiento</Title>
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
          <IconFolder size={18} style={{ color: '#d97706' }} />
          <Text fw={700} c="white">Rubros</Text>
        </Group>

        <Stack gap={0}>
          {rubros.map((rubro, index) => (
            <Box key={`${rubro}-${index}`} px="md" py="sm" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}>
              <Group justify="space-between">
                <Text size="sm" c="gray.3" fw={500}>{rubro}</Text>
                <Group gap="xs">
                  <Tooltip label="Editar">
                    <ActionIcon variant="subtle" color="yellow" size="md" onClick={() => handleEdit(index)}>
                      <IconPencil size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Eliminar">
                    <ActionIcon variant="subtle" color="red" size="md" onClick={() => handleDelete(index)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Box>
          ))}
        </Stack>
      </Paper>

      <Modal opened={modalOpen} onClose={() => setModalOpen(false)} title={editingIndex !== null ? 'Editar Rubro' : 'Nuevo Rubro'} centered radius="lg"
        styles={{ header: { background: '#1e293b', borderBottom: '1px solid rgba(255,255,255,0.08)' }, body: { background: '#1e293b' }, title: { color: 'white', fontWeight: 700 }, close: { color: 'white' } }}>
        <Stack>
          <TextInput
            label="Nombre del Rubro"
            placeholder="Ej: Ferreteria"
            value={rubroName}
            onChange={(e) => setRubroName(e.currentTarget.value)}
            styles={{ label: { color: '#94a3b8', marginBottom: 4 }, input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
          />
          <Group justify="flex-end">
            <Button variant="subtle" color="gray" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button color="teal" onClick={handleSave} disabled={!rubroName.trim()}>{editingIndex !== null ? 'Guardar' : 'Crear Rubro'}</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
}

