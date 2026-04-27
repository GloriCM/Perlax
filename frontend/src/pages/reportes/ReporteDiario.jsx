import { useEffect, useMemo, useState } from 'react';
import {
    ActionIcon,
    Badge,
    Button,
    Card,
    Divider,
    Group,
    NumberInput,
    ScrollArea,
    SegmentedControl,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Text,
    TextInput,
    Textarea,
    ThemeIcon,
    Title
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import {
    IconArrowLeft,
    IconArrowRight,
    IconChevronsLeft,
    IconChevronsRight,
    IconClock,
    IconDeviceFloppy,
    IconHammer,
    IconPlayerTrackNext,
    IconPlus,
    IconRefresh,
    IconSettings
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { api } from '../../utils/api';

const toDateInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
};

const toIsoFromLocalInput = (value) => {
    if (!value) return null;
    return new Date(value).toISOString();
};

const toHours = (startAt, endAt) => {
    if (!startAt || !endAt) return 0;
    const diffMs = new Date(endAt).getTime() - new Date(startAt).getTime();
    if (diffMs <= 0) return 0;
    return Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
};

const createEmptyProcess = () => ({
    machineName: '',
    productionOrderNumber: '',
    processCode: '',
    startAt: '',
    endAt: '',
    quantityProcessed: 0,
    observations: ''
});

const isProcessRowEmpty = (row) =>
    !row.machineName &&
    !row.productionOrderNumber &&
    !row.processCode &&
    !row.startAt &&
    !row.endAt &&
    !Number(row.quantityProcessed || 0) &&
    !row.observations;

const isProcessRowComplete = (row) =>
    Boolean(
        row.machineName &&
        row.productionOrderNumber &&
        row.processCode &&
        row.startAt &&
        row.endAt &&
        Number(row.quantityProcessed || 0) > 0
    );

export default function ReporteDiario() {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const [catalogs, setCatalogs] = useState({ machines: [], processCodes: [], orderNumbers: [], operators: [] });
    const [records, setRecords] = useState([]);
    const [recordIndex, setRecordIndex] = useState(-1);
    const [editingId, setEditingId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [activityMode, setActivityMode] = useState('hours');

    const [form, setForm] = useState({
        processDate: new Date(),
        operatorName: ''
    });

    const [processes, setProcesses] = useState([createEmptyProcess()]);

    const machineOptions = useMemo(() => (catalogs.machines || []).map(x => ({ value: x, label: x })), [catalogs.machines]);
    const codeOptions = useMemo(() => (catalogs.processCodes || []).map(x => ({ value: x, label: x })), [catalogs.processCodes]);
    const orderOptions = useMemo(() => (catalogs.orderNumbers || []).map(x => ({ value: x, label: x })), [catalogs.orderNumbers]);
    const operatorOptions = useMemo(() => (catalogs.operators || []).map(x => ({ value: x, label: x })), [catalogs.operators]);

    const completedProcesses = useMemo(
        () => processes.filter(row => isProcessRowComplete(row)),
        [processes]
    );

    const totals = useMemo(() => ({
        processes: completedProcesses.length,
        hours: completedProcesses.reduce((acc, cur) => acc + toHours(cur.startAt, cur.endAt), 0),
        quantity: completedProcesses.reduce((acc, cur) => acc + Number(cur.quantityProcessed || 0), 0)
    }), [completedProcesses]);

    const inputStyles = {
        label: { color: '#e2e8f0', fontWeight: 700 },
        input: {
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(99, 102, 241, 0.28)',
            borderRadius: '10px',
            color: '#fff',
            '&:focus': { borderColor: '#6366f1', background: 'rgba(255, 255, 255, 0.07)' }
        }
    };

    const selectStyles = {
        label: { color: '#e2e8f0', fontWeight: 700 },
        input: {
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid rgba(99, 102, 241, 0.28)',
            borderRadius: '10px',
            color: '#fff',
            '&:focus': { borderColor: '#6366f1', background: 'rgba(255, 255, 255, 0.07)' }
        },
        dropdown: {
            background: 'rgba(15, 23, 42, 0.98)',
            border: '1px solid rgba(99, 102, 241, 0.35)',
            borderRadius: '12px'
        }
    };

    const loadCatalogsAndRecords = async () => {
        try {
            const [catalogData, reportData] = await Promise.all([
                api.get('/production/daily-reports/catalogs'),
                api.get('/production/daily-reports')
            ]);

            setCatalogs(catalogData || { machines: [], processCodes: [], orderNumbers: [], operators: [] });
            setRecords(reportData || []);
        } catch (error) {
            notifications.show({
                title: 'Error cargando módulo',
                message: error?.message || 'No se pudo cargar la información de Reporte Diario.',
                color: 'red'
            });
        }
    };

    useEffect(() => {
        loadCatalogsAndRecords();
    }, []);

    const newRecord = () => {
        setEditingId(null);
        setRecordIndex(-1);
        setForm({ processDate: new Date(), operatorName: '' });
        setProcesses([createEmptyProcess()]);
    };

    const loadRecordById = async (id, index = -1) => {
        try {
            const data = await api.get(`/production/daily-reports/${id}`);
            setEditingId(data.id);
            setRecordIndex(index);
            setForm({
                processDate: data.processDate ? new Date(data.processDate) : new Date(),
                operatorName: data.operatorName || ''
            });

            const mappedProcesses = (data.processes || []).map(proc => ({
                machineName: proc.machineName || '',
                productionOrderNumber: proc.productionOrderNumber || '',
                processCode: proc.processCode || '',
                startAt: toDateInputValue(proc.startAt),
                endAt: toDateInputValue(proc.endAt),
                quantityProcessed: Number(proc.quantityProcessed || 0),
                observations: proc.observations || ''
            }));
            setProcesses([...mappedProcesses, createEmptyProcess()]);
        } catch (error) {
            notifications.show({
                title: 'No se pudo cargar registro',
                message: error?.message || 'Error consultando reporte.',
                color: 'red'
            });
        }
    };

    const addProcess = () => {
        if (!form.operatorName.trim()) {
            notifications.show({ title: 'Validación', message: 'Debe asignar OPERARIO antes de agregar procesos.', color: 'yellow' });
            return;
        }

        setProcesses(prev => [...prev, createEmptyProcess()]);
    };

    const updateProcessCell = (index, field, value) => {
        setProcesses(prev => prev.map((row, idx) => (idx === index ? { ...row, [field]: value } : row)));
    };

    const removeProcess = (index) => {
        setProcesses(prev => {
            const next = prev.filter((_, idx) => idx !== index);
            return next.length === 0 ? [createEmptyProcess()] : next;
        });
    };

    const saveReport = async () => {
        if (!form.operatorName.trim()) {
            notifications.show({ title: 'Validación', message: 'El OPERARIO es obligatorio.', color: 'yellow' });
            return;
        }
        if (!form.processDate) {
            notifications.show({ title: 'Validación', message: 'La FECHA es obligatoria.', color: 'yellow' });
            return;
        }
        if (completedProcesses.length === 0) {
            notifications.show({ title: 'Validación', message: 'Debe agregar por lo menos un proceso.', color: 'yellow' });
            return;
        }

        const hasPartialRows = processes.some(row => !isProcessRowEmpty(row) && !isProcessRowComplete(row));
        if (hasPartialRows) {
            notifications.show({ title: 'Validación', message: 'Hay filas incompletas en la tabla. Complete o elimine esas filas.', color: 'yellow' });
            return;
        }

        const hasInvalidRange = completedProcesses.some(row => new Date(row.endAt) < new Date(row.startAt));
        if (hasInvalidRange) {
            notifications.show({ title: 'Validación', message: 'En una o más filas, FIN es menor que INICIO.', color: 'yellow' });
            return;
        }

        const payload = {
            processDate: form.processDate,
            operatorName: form.operatorName,
            processes: completedProcesses.map(proc => ({
                machineName: proc.machineName,
                productionOrderNumber: proc.productionOrderNumber,
                processCode: proc.processCode,
                startAt: toIsoFromLocalInput(proc.startAt),
                endAt: toIsoFromLocalInput(proc.endAt),
                quantityProcessed: proc.quantityProcessed,
                observations: proc.observations
            }))
        };

        try {
            setSaving(true);
            if (editingId) {
                await api.put(`/production/daily-reports/${editingId}`, payload);
            } else {
                await api.post('/production/daily-reports', payload);
            }

            notifications.show({
                title: 'Reporte guardado',
                message: 'Registro diario guardado correctamente.',
                color: 'teal'
            });

            await loadCatalogsAndRecords();
            newRecord();
        } catch (error) {
            notifications.show({
                title: 'Error guardando',
                message: error?.message || 'No se pudo guardar el reporte.',
                color: 'red'
            });
        } finally {
            setSaving(false);
        }
    };

    const goToFirst = () => {
        if (records.length === 0) return;
        loadRecordById(records[0].id, 0);
    };
    const goToLast = () => {
        if (records.length === 0) return;
        const index = records.length - 1;
        loadRecordById(records[index].id, index);
    };
    const goPrev = () => {
        if (recordIndex <= 0) return;
        const index = recordIndex - 1;
        loadRecordById(records[index].id, index);
    };
    const goNext = () => {
        if (recordIndex < 0 || recordIndex >= records.length - 1) return;
        const index = recordIndex + 1;
        loadRecordById(records[index].id, index);
    };

    return (
        <Stack gap="lg" p="md">
            <Card className="glass-card" p="lg">
                <Stack gap="md">
                    <Group justify="space-between">
                        <Group gap="md">
                            <ThemeIcon size={40} radius="md" variant="gradient" gradient={{ from: 'indigo', to: 'violet' }}>
                                <IconHammer size={20} />
                            </ThemeIcon>
                            <Title order={2} c="white">Reporte Diario de Operaciones</Title>
                        </Group>
                        <Group>
                            <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={loadCatalogsAndRecords}>Actualizar</Button>
                            <Button variant="light" leftSection={<IconPlus size={16} />} onClick={newRecord}>Nuevo registro</Button>
                        </Group>
                    </Group>

                    <Group justify="center" gap="xl">
                        <Button variant="outline" color="yellow" leftSection={<IconSettings size={16} />}>Maquinas y Talleres</Button>
                        <Button variant="outline" color="yellow" leftSection={<IconSettings size={16} />}>Crear Codigos</Button>
                    </Group>

                    <Divider label="Registro de Actividades" labelPosition="center" />
                    <SegmentedControl
                        fullWidth
                        value={activityMode}
                        onChange={setActivityMode}
                        data={[
                            { label: 'Por Horas', value: 'hours' },
                            { label: 'Por Maquina', value: 'machine' },
                            { label: 'Taller Interno', value: 'internal' },
                            { label: 'Camion', value: 'truck' }
                        ]}
                    />
                </Stack>
            </Card>

            <SimpleGrid cols={{ base: 1, sm: 3 }}>
                <Card className="glass-card" p="md"><Text c="dimmed" size="xs">Procesos cargados</Text><Title order={3} c="white">{totals.processes}</Title></Card>
                <Card className="glass-card" p="md"><Text c="dimmed" size="xs">Horas acumuladas</Text><Title order={3} c="white">{totals.hours.toFixed(2)}</Title></Card>
                <Card className="glass-card" p="md"><Text c="dimmed" size="xs">Cantidad total</Text><Title order={3} c="white">{totals.quantity.toLocaleString()}</Title></Card>
            </SimpleGrid>

            <Card className="glass-card" p="lg">
                <Stack gap="md">
                    <Group grow>
                        <DateInput label="Fecha" value={form.processDate} onChange={(value) => setForm(prev => ({ ...prev, processDate: value || new Date() }))} styles={inputStyles} />
                        <Select label="Operario" placeholder="Seleccione o escriba operario" searchable data={operatorOptions} value={form.operatorName} onChange={(value) => setForm(prev => ({ ...prev, operatorName: value || '' }))} styles={selectStyles} />
                    </Group>

                    <Divider label="Carga rápida por tabla" labelPosition="left" />

                    <div style={{ background: '#f8fafc', borderRadius: 12, padding: 10, border: '1px solid #cbd5e1' }}>
                        <ScrollArea h={240}>
                            <Table striped highlightOnHover withTableBorder withColumnBorders>
                                <Table.Thead style={{ background: '#e2e8f0' }}>
                                    <Table.Tr>
                                        <Table.Th style={{ color: '#0f172a' }}>Maquina</Table.Th>
                                        <Table.Th style={{ color: '#0f172a' }}>Orden</Table.Th>
                                        <Table.Th style={{ color: '#0f172a' }}>Codigo</Table.Th>
                                        <Table.Th style={{ color: '#0f172a' }}>Inicio</Table.Th>
                                        <Table.Th style={{ color: '#0f172a' }}>Final</Table.Th>
                                        <Table.Th style={{ color: '#0f172a' }}>Horas</Table.Th>
                                        <Table.Th style={{ color: '#0f172a' }}>Tiros</Table.Th>
                                        <Table.Th style={{ color: '#0f172a' }}>Observaciones</Table.Th>
                                        <Table.Th style={{ color: '#0f172a' }}>Accion</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {processes.map((row, idx) => (
                                        <Table.Tr key={`row-${idx}`}>
                                            <Table.Td>
                                                <Select
                                                    data={machineOptions}
                                                    value={row.machineName}
                                                    onChange={(value) => updateProcessCell(idx, 'machineName', value || '')}
                                                    size="xs"
                                                    comboboxProps={{ withinPortal: false }}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <Select
                                                    data={orderOptions}
                                                    value={row.productionOrderNumber}
                                                    onChange={(value) => updateProcessCell(idx, 'productionOrderNumber', value || '')}
                                                    size="xs"
                                                    comboboxProps={{ withinPortal: false }}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <Select
                                                    data={codeOptions}
                                                    value={row.processCode}
                                                    onChange={(value) => updateProcessCell(idx, 'processCode', value || '')}
                                                    size="xs"
                                                    comboboxProps={{ withinPortal: false }}
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <TextInput
                                                    type="datetime-local"
                                                    value={row.startAt}
                                                    onChange={(event) => updateProcessCell(idx, 'startAt', event.currentTarget.value)}
                                                    size="xs"
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <TextInput
                                                    type="datetime-local"
                                                    value={row.endAt}
                                                    onChange={(event) => updateProcessCell(idx, 'endAt', event.currentTarget.value)}
                                                    size="xs"
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <Text size="xs" c="#0f172a" fw={600}>
                                                    {toHours(row.startAt, row.endAt).toFixed(2)}
                                                </Text>
                                            </Table.Td>
                                            <Table.Td>
                                                <NumberInput
                                                    value={row.quantityProcessed}
                                                    min={0}
                                                    onChange={(value) => updateProcessCell(idx, 'quantityProcessed', Number(value || 0))}
                                                    size="xs"
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <TextInput
                                                    value={row.observations}
                                                    onChange={(event) => updateProcessCell(idx, 'observations', event.currentTarget.value)}
                                                    size="xs"
                                                />
                                            </Table.Td>
                                            <Table.Td>
                                                <Button variant="subtle" color="red" size="compact-xs" onClick={() => removeProcess(idx)}>
                                                    X
                                                </Button>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>
                    </div>

                    <Group justify="space-between">
                        <Text size="sm" c="dimmed">
                            Operario: <strong>{form.operatorName || '-'}</strong> | Modo: <strong>{activityMode}</strong> | Usuario: <strong>{user.username || 'Sistema'}</strong>
                        </Text>
                        <Group>
                            <Button variant="light" leftSection={<IconPlayerTrackNext size={16} />} onClick={addProcess}>Siguiente fila</Button>
                            <Button leftSection={<IconDeviceFloppy size={16} />} onClick={saveReport} loading={saving}>Guardar</Button>
                        </Group>
                    </Group>
                </Stack>
            </Card>

            <Card className="glass-card" p="lg">
                <Group justify="space-between" mb="sm">
                    <Title order={4} c="white">Registros por proceso</Title>
                    <Group>
                        <ActionIcon variant="light" onClick={goToFirst}><IconChevronsLeft size={16} /></ActionIcon>
                        <ActionIcon variant="light" onClick={goPrev}><IconArrowLeft size={16} /></ActionIcon>
                        <Badge variant="light">{recordIndex >= 0 ? `${recordIndex + 1} / ${records.length}` : `0 / ${records.length}`}</Badge>
                        <ActionIcon variant="light" onClick={goNext}><IconArrowRight size={16} /></ActionIcon>
                        <ActionIcon variant="light" onClick={goToLast}><IconChevronsRight size={16} /></ActionIcon>
                    </Group>
                </Group>

                <ScrollArea h={310}>
                    <Table stickyHeader highlightOnHover>
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Maquina</Table.Th>
                                <Table.Th>Fecha</Table.Th>
                                <Table.Th>Orden</Table.Th>
                                <Table.Th>Inicio</Table.Th>
                                <Table.Th>Final</Table.Th>
                                <Table.Th>Horas</Table.Th>
                                <Table.Th>Actividad</Table.Th>
                                <Table.Th>Tiros</Table.Th>
                                <Table.Th>Observaciones</Table.Th>
                                <Table.Th />
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {processes.map((proc, idx) => (
                                <Table.Tr key={`${proc.machineName}-${idx}`}>
                                    <Table.Td>{proc.machineName}</Table.Td>
                                    <Table.Td>{form.processDate ? new Date(form.processDate).toLocaleDateString() : '-'}</Table.Td>
                                    <Table.Td>{proc.productionOrderNumber}</Table.Td>
                                    <Table.Td>{proc.startAt ? new Date(proc.startAt).toLocaleTimeString() : '-'}</Table.Td>
                                    <Table.Td>{proc.endAt ? new Date(proc.endAt).toLocaleTimeString() : '-'}</Table.Td>
                                    <Table.Td>{toHours(proc.startAt, proc.endAt).toFixed(2)}</Table.Td>
                                    <Table.Td>{proc.processCode}</Table.Td>
                                    <Table.Td>{Number(proc.quantityProcessed || 0).toLocaleString()}</Table.Td>
                                    <Table.Td>{proc.observations || '*'}</Table.Td>
                                    <Table.Td>
                                        <Button variant="subtle" color="red" size="compact-xs" onClick={() => removeProcess(idx)}>Quitar</Button>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                            {processes.length === 0 && (
                                <Table.Tr>
                                    <Table.Td colSpan={10}><Text c="dimmed" ta="center">No hay procesos cargados para este operario.</Text></Table.Td>
                                </Table.Tr>
                            )}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>

                <Group justify="flex-end" mt="sm">
                    <Text c="dimmed" size="sm">Total Horas: <strong>{totals.hours.toFixed(2)}</strong></Text>
                    <Text c="dimmed" size="sm">Total Tiros: <strong>{totals.quantity.toLocaleString()}</strong></Text>
                </Group>
            </Card>
        </Stack>
    );
}
