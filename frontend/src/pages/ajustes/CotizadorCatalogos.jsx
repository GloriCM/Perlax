import { useCallback, useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
    ActionIcon,
    Button,
    Card,
    Group,
    Loader,
    Modal,
    NumberInput,
    ScrollArea,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
    Tooltip,
} from '@mantine/core';
import { IconArrowLeft, IconPencil, IconPlus, IconTrash } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { getCurrentUser, isAdmin } from '../../utils/permissions';
import { api } from '../../utils/api';
import {
    LINKT_CATALOGS,
    emptyForm,
    formToPayload,
    getCatalogConfig,
    getCatalogLabel,
    rowToForm,
} from './cotizadorCatalogStorage';

function CatalogFieldInput({ field, value, onChange, disabled }) {
    if (field.type === 'number') {
        return (
            <NumberInput
                label={field.label}
                value={value === '' || value === null || value === undefined ? '' : value}
                onChange={(next) => onChange(next ?? '')}
                required={field.required}
                disabled={disabled}
                hideControls
                min={0}
                decimalScale={4}
            />
        );
    }
    return (
        <TextInput
            label={field.label}
            value={value ?? ''}
            onChange={(event) => onChange(event.currentTarget.value)}
            required={field.required}
            disabled={disabled}
        />
    );
}

export default function CotizadorCatalogos() {
    const navigate = useNavigate();
    const me = getCurrentUser();
    const [catalogKey, setCatalogKey] = useState(LINKT_CATALOGS[0].value);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [recordModalOpen, setRecordModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [recordForm, setRecordForm] = useState({});
    const [saving, setSaving] = useState(false);

    const config = getCatalogConfig(catalogKey);
    const fields = config.fields;

    const catalogOptions = useMemo(
        () => LINKT_CATALOGS.map((item) => ({ value: item.value, label: item.label })),
        [],
    );

    const loadRows = useCallback(async () => {
        setLoading(true);
        try {
            const data = await api.get(`/production/cotizador/catalogs/${config.apiPath}`);
            setRows(Array.isArray(data) ? data : []);
        } catch (err) {
            notifications.show({
                title: 'Error',
                message: err.message || 'No se pudo cargar el catálogo',
                color: 'red',
            });
            setRows([]);
        } finally {
            setLoading(false);
        }
    }, [config.apiPath]);

    useEffect(() => {
        loadRows();
    }, [loadRows]);

    const openAddRecord = () => {
        setEditingId(null);
        setRecordForm(emptyForm(catalogKey));
        setRecordModalOpen(true);
    };

    const openEditRecord = (row) => {
        setEditingId(row.id);
        setRecordForm(rowToForm(catalogKey, row));
        setRecordModalOpen(true);
    };

    const saveRecord = async () => {
        const missing = fields.filter(
            (field) => field.required && !String(recordForm[field.key] ?? '').trim() && recordForm[field.key] !== 0,
        );
        if (missing.length) {
            notifications.show({
                title: 'Campos obligatorios',
                message: `Complete: ${missing.map((f) => f.label).join(', ')}`,
                color: 'red',
            });
            return;
        }

        setSaving(true);
        try {
            const payload = formToPayload(catalogKey, recordForm);
            if (editingId) {
                await api.put(`/production/cotizador/catalogs/${config.apiPath}/${editingId}`, payload);
                notifications.show({ title: 'Actualizado', message: getCatalogLabel(catalogKey), color: 'teal' });
            } else {
                await api.post(`/production/cotizador/catalogs/${config.apiPath}`, payload);
                notifications.show({ title: 'Creado', message: getCatalogLabel(catalogKey), color: 'teal' });
            }
            setRecordModalOpen(false);
            await loadRows();
        } catch (err) {
            notifications.show({ title: 'Error', message: err.message || 'No se pudo guardar', color: 'red' });
        } finally {
            setSaving(false);
        }
    };

    const deleteRecord = async (row) => {
        if (config.allowDelete === false) return;
        const label = rowToForm(catalogKey, row).nombre || row.id;
        if (!window.confirm(`¿Eliminar "${label}"?`)) return;
        try {
            await api.delete(`/production/cotizador/catalogs/${config.apiPath}/${row.id}`);
            notifications.show({ title: 'Eliminado', message: String(label), color: 'green' });
            await loadRows();
        } catch (err) {
            notifications.show({ title: 'Error', message: err.message || 'No se pudo eliminar', color: 'red' });
        }
    };

    if (!isAdmin(me)) return <Navigate to="/" replace />;

    const canCreate = config.allowCreate !== false;
    const canDelete = config.allowDelete !== false;

    return (
        <Stack p="md" gap="lg" className="fade-in">
            <Card className="glass-card">
                <Group justify="space-between" align="flex-start">
                    <Group align="flex-start">
                        <Button
                            variant="subtle"
                            color="gray"
                            leftSection={<IconArrowLeft size={16} />}
                            onClick={() => navigate('/ajustes')}
                        >
                            Volver
                        </Button>
                        <Stack gap={4}>
                            <Text size="xs" c="dimmed" fw={700} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Ajustes del sistema
                            </Text>
                            <Title order={2} c="white">
                                Catálogos del cotizador
                            </Title>
                            <Text size="sm" c="dimmed">
                                Mismos campos que Cotizador Link&apos;t. Los cambios se aplican al cálculo de cotizaciones.
                            </Text>
                        </Stack>
                    </Group>
                    <Select
                        label="Catálogo"
                        data={catalogOptions}
                        value={catalogKey}
                        onChange={(value) => value && setCatalogKey(value)}
                        w={260}
                        searchable
                    />
                </Group>
            </Card>

            <Card className="glass-card">
                <Group justify="space-between" mb="md">
                    <Stack gap={2}>
                        <Title order={4} c="white">
                            {getCatalogLabel(catalogKey)}
                        </Title>
                        <Text size="sm" c="dimmed">
                            {loading ? 'Cargando…' : `${rows.length} registro(s)`}
                        </Text>
                    </Stack>
                    {canCreate && (
                        <Button leftSection={<IconPlus size={16} />} onClick={openAddRecord}>
                            Nuevo registro
                        </Button>
                    )}
                </Group>

                {loading ? (
                    <Group justify="center" py="xl">
                        <Loader />
                    </Group>
                ) : (
                    <ScrollArea>
                        <Table striped highlightOnHover>
                            <Table.Thead>
                                <Table.Tr>
                                    {fields.map((field) => (
                                        <Table.Th key={field.key}>{field.label}</Table.Th>
                                    ))}
                                    <Table.Th ta="right">Acciones</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {rows.map((row) => {
                                    const formRow = rowToForm(catalogKey, row);
                                    return (
                                        <Table.Tr key={row.id}>
                                            {fields.map((field) => (
                                                <Table.Td key={field.key}>
                                                    {field.type === 'number'
                                                        ? Number(formRow[field.key] ?? 0).toLocaleString('es-CO')
                                                        : formRow[field.key]}
                                                </Table.Td>
                                            ))}
                                            <Table.Td>
                                                <Group justify="flex-end" gap="xs">
                                                    <Tooltip label="Editar">
                                                        <ActionIcon variant="subtle" color="yellow" onClick={() => openEditRecord(row)}>
                                                            <IconPencil size={16} />
                                                        </ActionIcon>
                                                    </Tooltip>
                                                    {canDelete && (
                                                        <Tooltip label="Eliminar">
                                                            <ActionIcon variant="subtle" color="red" onClick={() => deleteRecord(row)}>
                                                                <IconTrash size={16} />
                                                            </ActionIcon>
                                                        </Tooltip>
                                                    )}
                                                </Group>
                                            </Table.Td>
                                        </Table.Tr>
                                    );
                                })}
                                {!rows.length && (
                                    <Table.Tr>
                                        <Table.Td colSpan={fields.length + 1}>
                                            <Text c="dimmed" ta="center" py="lg">
                                                No hay registros en este catálogo.
                                            </Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                            </Table.Tbody>
                        </Table>
                    </ScrollArea>
                )}
            </Card>

            <Modal
                opened={recordModalOpen}
                onClose={() => setRecordModalOpen(false)}
                title={editingId ? 'Editar registro' : 'Nuevo registro'}
                centered
                size="lg"
            >
                <Stack>
                    <SimpleGrid cols={{ base: 1, sm: 2 }}>
                        {fields.map((field) => (
                            <CatalogFieldInput
                                key={field.key}
                                field={field}
                                value={recordForm[field.key]}
                                onChange={(value) => setRecordForm((prev) => ({ ...prev, [field.key]: value }))}
                                disabled={Boolean(editingId && field.readOnlyOnEdit)}
                            />
                        ))}
                    </SimpleGrid>
                    <Group justify="flex-end">
                        <Button variant="subtle" color="gray" onClick={() => setRecordModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={saveRecord} loading={saving}>
                            Guardar registro
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Stack>
    );
}
