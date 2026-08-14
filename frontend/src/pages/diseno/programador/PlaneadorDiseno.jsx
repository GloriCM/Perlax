import { useEffect, useMemo, useState } from 'react';
import { api } from '../../../utils/api';
import {
    Alert,
    Badge,
    Box,
    Button,
    Card,
    Group,
    Modal,
    Progress,
    ScrollArea,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Tabs,
    Text,
    TextInput,
    Textarea,
    Title
} from '@mantine/core';
import { DateInput, DatesProvider } from '@mantine/dates';
import {
    IconAlertTriangle,
    IconBriefcase,
    IconCheck,
    IconChevronLeft,
    IconChevronRight,
    IconClipboardList,
    IconFilter,
    IconLayoutDashboard,
    IconPlus,
    IconTimeline
} from '@tabler/icons-react';
import '@mantine/dates/styles.css';
import './PlaneadorDiseno.css';

const calendarStyles = {
    input: {
        background: 'rgba(255, 255, 255, 0.05)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        color: 'white',
    },
    dropdown: {
        background: 'rgba(20, 30, 50, 0.98)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        borderRadius: '16px',
        padding: '12px',
    },
    calendarHeaderControl: {
        color: 'white',
        borderRadius: '10px',
    },
    calendarHeaderLevel: {
        color: 'white',
        fontWeight: 800,
        fontSize: '15px',
        borderRadius: '10px',
    },
    weekday: {
        color: '#6366f1',
        fontSize: '11px',
        fontWeight: 800,
        textTransform: 'uppercase',
    },
    day: {
        color: '#e2e8f0',
        borderRadius: '10px',
        '&[data-selected]': {
            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
            color: 'white',
            fontWeight: 800,
        },
    },
};

function normalizeText(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

function PlaneadorDateInput(props) {
    return (
        <DateInput
            locale="es"
            valueFormat="DD/MM/YYYY"
            styles={calendarStyles}
            popoverProps={{ shadow: 'xl', position: 'bottom-start' }}
            nextIcon={<IconChevronRight size={16} />}
            previousIcon={<IconChevronLeft size={16} />}
            {...props}
        />
    );
}

const ACTIVITY_OPTIONS = ['Planchas', 'Troquel', 'Muestras', 'Impresión digital', 'Arte', 'Expertis'];

function parseWorkFromApi(work) {
    return {
        ...work,
        createdAt: work.createdAt ? new Date(work.createdAt) : null,
        fechaRecepcion: work.fechaRecepcion ? new Date(work.fechaRecepcion) : null,
        fechaEntrega: work.fechaEntrega ? new Date(work.fechaEntrega) : null,
        fechaAprobacion: work.fechaAprobacion ? new Date(work.fechaAprobacion) : null,
        actividades: work.actividades || [],
        historial: work.historial || []
    };
}

function formatDateForApi(dateValue) {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}

function formatDateOnlyForApi(dateValue) {
    if (!dateValue) return null;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString().slice(0, 10);
}

function formatDate(dateValue) {
    if (!dateValue) return '-';
    return new Date(dateValue).toLocaleDateString('es-CO');
}

function getProgress(actividades) {
    if (!actividades?.length) return 0;
    const done = actividades.filter((item) => item.completada).length;
    return Math.round((done / actividades.length) * 100);
}

function getSemaforo(work) {
    if (work.estado === 'Finalizado') return 'verde';
    if (work.fichaAprobada && getProgress(work.actividades) >= 80) return 'verde';
    if (work.fechaEntrega && new Date(work.fechaEntrega) < new Date()) return 'rojo';
    if (getProgress(work.actividades) >= 40) return 'amarillo';
    return 'rojo';
}

function isDesignUser(user) {
    const role = String(user?.role || user?.Role || '').toLowerCase();
    const area = String(user?.area || user?.Area || '').toLowerCase();
    const dept = String(user?.department || user?.Department || '').toLowerCase();
    return role.includes('dise') || area.includes('dise') || dept.includes('dise') || role.includes('admin');
}

function createInitialForm() {
    return {
        cliente: '',
        vendedor: '',
        trabajo: '',
        responsable: '',
        fechaEntrega: null
    };
}

export default function PlaneadorDiseno() {
    const [works, setWorks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState('');
    const [newJobOpened, setNewJobOpened] = useState(false);
    const [detailOpened, setDetailOpened] = useState(false);
    const [selectedId, setSelectedId] = useState('');
    const [creationForm, setCreationForm] = useState(createInitialForm());
    const [creationErrors, setCreationErrors] = useState({});
    const [systemAlert, setSystemAlert] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [clientFilter, setClientFilter] = useState('');
    const [vendedorFilter, setVendedorFilter] = useState('');
    const [trabajoFilter, setTrabajoFilter] = useState('');
    const [designerFilter, setDesignerFilter] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [mainTab, setMainTab] = useState('dashboard');
    const [activityDraft, setActivityDraft] = useState({
        nombre: '',
        fechaEnvio: null,
        fechaRecepcion: null,
        repeticiones: 1,
        observaciones: ''
    });

    useEffect(() => {
        let cancelled = false;

        async function loadWorks() {
            setLoading(true);
            setLoadError('');
            try {
                const data = await api.get('/design/planner/jobs');
                if (!cancelled) {
                    setWorks((data || []).map(parseWorkFromApi));
                }
            } catch (error) {
                if (!cancelled) {
                    setLoadError(error.message || 'No se pudieron cargar los trabajos de diseño.');
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadWorks();
        return () => {
            cancelled = true;
        };
    }, []);

    const currentUser = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    }, []);

    const selectedWork = useMemo(() => works.find((item) => item.id === selectedId) || null, [works, selectedId]);

    const currentUserName = useMemo(() => {
        return [currentUser?.firstName, currentUser?.lastName]
            .filter(Boolean)
            .join(' ')
            .trim() || currentUser?.username || currentUser?.Username || '';
    }, [currentUser]);

    const filteredWorks = useMemo(() => {
        const matches = (value, filter) => {
            if (!filter.trim()) return true;
            return normalizeText(value).includes(normalizeText(filter));
        };

        return works.filter((item) => {
            if (statusFilter !== 'all' && item.estado !== statusFilter) return false;
            if (!matches(item.cliente, clientFilter)) return false;
            if (!matches(item.vendedor, vendedorFilter)) return false;
            if (!matches(item.trabajo, trabajoFilter)) return false;
            if (!matches(item.responsable, designerFilter)) return false;
            return true;
        });
    }, [works, statusFilter, clientFilter, vendedorFilter, trabajoFilter, designerFilter]);

    const hasActiveFilters = statusFilter !== 'all'
        || clientFilter.trim()
        || vendedorFilter.trim()
        || trabajoFilter.trim()
        || designerFilter.trim();

    const assignedWorks = useMemo(() => {
        const userKey = normalizeText(currentUserName);
        if (!userKey) return [];
        return filteredWorks.filter((item) => {
            const designerKey = normalizeText(item.responsable);
            return designerKey === userKey || designerKey.includes(userKey) || userKey.includes(designerKey);
        });
    }, [filteredWorks, currentUserName]);

    const assignedKpis = useMemo(() => {
        const total = assignedWorks.length;
        const enEspera = assignedWorks.filter((w) => w.estado === 'Nuevo Trabajo Pendiente').length;
        const enDesarrollo = assignedWorks.filter((w) => w.estado === 'En Desarrollo').length;
        const criticos = assignedWorks.filter((w) => getSemaforo(w) === 'rojo').length;
        return { total, enEspera, enDesarrollo, criticos };
    }, [assignedWorks]);

    const kpis = useMemo(() => {
        const total = works.length;
        const enEspera = works.filter((w) => w.estado === 'Nuevo Trabajo Pendiente').length;
        const enDesarrollo = works.filter((w) => w.estado === 'En Desarrollo').length;
        const criticos = works.filter((w) => getSemaforo(w) === 'rojo').length;
        return { total, enEspera, enDesarrollo, criticos };
    }, [works]);

    const clientOptions = useMemo(() => {
        return Array.from(new Set(works.map((w) => w.cliente))).map((cliente) => ({
            value: cliente,
            label: cliente
        }));
    }, [works]);

    const hasDesignPermissions = isDesignUser(currentUser);

    const resetCreationForm = () => {
        setCreationForm(createInitialForm());
        setCreationErrors({});
    };

    const handleCreateJob = async () => {
        const errors = {};
        if (!creationForm.cliente.trim()) errors.cliente = 'El cliente es obligatorio.';
        if (!creationForm.vendedor.trim()) errors.vendedor = 'El vendedor es obligatorio.';
        if (!creationForm.trabajo.trim()) errors.trabajo = 'El nombre del trabajo es obligatorio.';
        if (!creationForm.responsable.trim()) errors.responsable = 'El encargado responsable es obligatorio.';
        setCreationErrors(errors);
        if (Object.keys(errors).length > 0) return;

        try {
            const created = await api.post('/design/planner/jobs', {
                cliente: creationForm.cliente.trim(),
                vendedor: creationForm.vendedor.trim(),
                trabajo: creationForm.trabajo.trim(),
                responsable: creationForm.responsable.trim(),
                fechaEntrega: formatDateForApi(creationForm.fechaEntrega)
            });

            setWorks((prev) => [parseWorkFromApi(created), ...prev]);
            setSystemAlert('Trabajo registrado correctamente y notificación enviada a Diseño.');
            setNewJobOpened(false);
            resetCreationForm();
        } catch (error) {
            setSystemAlert(error.message || 'No se pudo registrar el trabajo.');
        }
    };

    const openDetail = (id) => {
        setSelectedId(id);
        setDetailOpened(true);
        setSystemAlert('');
    };

    const updateSelectedWork = (updater) => {
        setWorks((prev) => prev.map((item) => (item.id === selectedId ? updater(item) : item)));
    };

    const handleTechnicalSave = async () => {
        if (!hasDesignPermissions) {
            setSystemAlert('Solo usuarios del área de diseño pueden diligenciar la preparación técnica.');
            return;
        }
        if (!selectedWork) return;

        try {
            const updated = await api.put(`/design/planner/jobs/${selectedId}/technical-prep`, {
                fechaRecepcion: formatDateForApi(selectedWork.fechaRecepcion),
                requerimientos: selectedWork.requerimientos
            });
            setWorks((prev) => prev.map((item) => (item.id === selectedId ? parseWorkFromApi(updated) : item)));
            setSystemAlert('Preparación técnica guardada. Estado actualizado a "En Desarrollo".');
        } catch (error) {
            setSystemAlert(error.message || 'No se pudo guardar la preparación técnica.');
        }
    };

    const handleAddActivity = async () => {
        if (!selectedWork) return;
        if (!activityDraft.nombre) {
            setSystemAlert('Selecciona una actividad para agregarla al cronograma.');
            return;
        }
        if (!activityDraft.fechaEnvio) {
            setSystemAlert('La fecha de envío es obligatoria.');
            return;
        }
        if (activityDraft.fechaRecepcion && new Date(activityDraft.fechaRecepcion) < new Date(activityDraft.fechaEnvio)) {
            setSystemAlert('La fecha de recepción no puede ser anterior a la fecha de envío.');
            return;
        }

        try {
            const updated = await api.post(`/design/planner/jobs/${selectedId}/activities`, {
                nombre: activityDraft.nombre,
                fechaEnvio: formatDateOnlyForApi(activityDraft.fechaEnvio),
                fechaRecepcion: formatDateOnlyForApi(activityDraft.fechaRecepcion),
                repeticiones: Number(activityDraft.repeticiones) || 1,
                observaciones: activityDraft.observaciones.trim()
            });

            setWorks((prev) => prev.map((item) => (item.id === selectedId ? parseWorkFromApi(updated) : item)));
            setActivityDraft({
                nombre: '',
                fechaEnvio: null,
                fechaRecepcion: null,
                repeticiones: 1,
                observaciones: ''
            });
            setSystemAlert('Actividad agregada y cronograma recalculado.');
        } catch (error) {
            setSystemAlert(error.message || 'No se pudo agregar la actividad.');
        }
    };

    const toggleActivityDone = async (activityId) => {
        if (!selectedWork) return;
        const activity = selectedWork.actividades.find((item) => item.id === activityId);
        if (!activity) return;

        try {
            const updated = await api.put(`/design/planner/jobs/${selectedId}/activities/${activityId}`, {
                completada: !activity.completada
            });
            setWorks((prev) => prev.map((item) => (item.id === selectedId ? parseWorkFromApi(updated) : item)));
        } catch (error) {
            setSystemAlert(error.message || 'No se pudo actualizar la actividad.');
        }
    };

    const handleApprove = async () => {
        if (!selectedWork) return;
        if (!selectedWork.fechaAprobacion) {
            setSystemAlert('Debes registrar la fecha de aprobación final.');
            return;
        }

        try {
            const updated = await api.put(`/design/planner/jobs/${selectedId}/approve`, {
                fechaAprobacion: formatDateForApi(selectedWork.fechaAprobacion),
                comentariosAprobacion: selectedWork.comentariosAprobacion
            });
            setWorks((prev) => prev.map((item) => (item.id === selectedId ? parseWorkFromApi(updated) : item)));
            setSystemAlert('Aprobación registrada y notificaciones enviadas.');
        } catch (error) {
            setSystemAlert(error.message || 'No se pudo registrar la aprobación.');
        }
    };

    const handleFinish = async () => {
        if (!selectedWork) return;
        if (!selectedWork.fichaAprobada) {
            setSystemAlert('No se puede finalizar sin la aprobación de la ficha técnica.');
            return;
        }

        try {
            const updated = await api.put(`/design/planner/jobs/${selectedId}/finish`);
            setWorks((prev) => prev.map((item) => (item.id === selectedId ? parseWorkFromApi(updated) : item)));
            setSystemAlert('Trabajo finalizado correctamente.');
        } catch (error) {
            setSystemAlert(error.message || 'No se pudo finalizar el trabajo.');
        }
    };

    const renderWorksTable = (rows, emptyMessage) => (
        <Card className="planeador-table-card">
            <Group justify="space-between" mb="sm">
                <Text fw={700}>Mostrando {rows.length} de {works.length} registros</Text>
            </Group>
            {rows.length === 0 ? (
                <Text c="dimmed" ta="center" py="xl">{emptyMessage}</Text>
            ) : (
                <ScrollArea>
                    <Table highlightOnHover className="planeador-table">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Cliente</Table.Th>
                                <Table.Th>Vendedor</Table.Th>
                                <Table.Th>Trabajo</Table.Th>
                                <Table.Th>Diseñador</Table.Th>
                                <Table.Th>Recepción</Table.Th>
                                <Table.Th>Entrega</Table.Th>
                                <Table.Th>Semáforo</Table.Th>
                                <Table.Th>Estado</Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {rows.map((work) => {
                                const semaforo = getSemaforo(work);
                                return (
                                    <Table.Tr key={work.id} onClick={() => openDetail(work.id)} className="planeador-table-row">
                                        <Table.Td>{work.cliente}</Table.Td>
                                        <Table.Td>{work.vendedor}</Table.Td>
                                        <Table.Td>
                                            <Text fw={600}>{work.trabajo}</Text>
                                            <Text size="xs" c="dimmed">{work.id}</Text>
                                        </Table.Td>
                                        <Table.Td>{work.responsable}</Table.Td>
                                        <Table.Td>{formatDate(work.fechaRecepcion)}</Table.Td>
                                        <Table.Td>{formatDate(work.fechaEntrega)}</Table.Td>
                                        <Table.Td>
                                            <span className={`semaforo semaforo-${semaforo}`} title={semaforo} />
                                        </Table.Td>
                                        <Table.Td>
                                            <Badge variant="light" className="planeador-status-badge">{work.estado}</Badge>
                                        </Table.Td>
                                    </Table.Tr>
                                );
                            })}
                        </Table.Tbody>
                    </Table>
                </ScrollArea>
            )}
        </Card>
    );

    const renderKpiCards = (stats) => (
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
            <Card className="planeador-kpi" padding="lg">
                <Text className="planeador-kpi-label">En espera</Text>
                <Title order={3}>{stats.enEspera} Órdenes</Title>
            </Card>
            <Card className="planeador-kpi" padding="lg">
                <Text className="planeador-kpi-label">En diseño</Text>
                <Title order={3}>{stats.enDesarrollo} Proyectos</Title>
            </Card>
            <Card className="planeador-kpi" padding="lg">
                <Text className="planeador-kpi-label">Total</Text>
                <Title order={3}>{stats.total} Trabajos</Title>
            </Card>
            <Card className="planeador-kpi planeador-kpi-critical" padding="lg">
                <Text className="planeador-kpi-label">Crítico (pendientes)</Text>
                <Title order={3}>{stats.criticos} Retrasos</Title>
            </Card>
        </SimpleGrid>
    );

    const renderFilters = () => (
        <Card className="planeador-filters" padding="lg">
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
                <Select
                    label="Estado"
                    placeholder="Todos"
                    data={[
                        { value: 'all', label: 'Todos' },
                        { value: 'Nuevo Trabajo Pendiente', label: 'Nuevo Trabajo Pendiente' },
                        { value: 'En Desarrollo', label: 'En Desarrollo' },
                        { value: 'Aprobación', label: 'Aprobación' },
                        { value: 'Finalizado', label: 'Finalizado' }
                    ]}
                    value={statusFilter}
                    onChange={(value) => setStatusFilter(value || 'all')}
                    clearable={false}
                />
                <TextInput
                    label="Cliente"
                    placeholder="Filtrar cliente"
                    value={clientFilter}
                    onChange={(event) => setClientFilter(event.currentTarget.value)}
                />
                <TextInput
                    label="Vendedor"
                    placeholder="Filtrar vendedor"
                    value={vendedorFilter}
                    onChange={(event) => setVendedorFilter(event.currentTarget.value)}
                />
                <TextInput
                    label="Trabajo"
                    placeholder="Filtrar trabajo"
                    value={trabajoFilter}
                    onChange={(event) => setTrabajoFilter(event.currentTarget.value)}
                />
                <TextInput
                    label="Diseñador"
                    placeholder="Filtrar diseñador"
                    value={designerFilter}
                    onChange={(event) => setDesignerFilter(event.currentTarget.value)}
                />
            </SimpleGrid>
        </Card>
    );

    return (
        <DatesProvider settings={{ locale: 'es', firstDayOfWeek: 1 }}>
        <Box className="planeador-page fade-in">
            <Stack gap="lg">
                <Group justify="space-between" align="end" className="planeador-header">
                    <Box>
                        <Title order={1} className="planeador-title">Planeador de Diseño</Title>
                        <Text className="planeador-subtitle">
                            Gestión centralizada de cola de diseño, seguimiento de aprobaciones y control de entregas.
                        </Text>
                    </Box>
                    <Group>
                        <Button
                            leftSection={<IconFilter size={17} />}
                            variant={filtersOpen || hasActiveFilters ? 'light' : 'default'}
                            color={filtersOpen || hasActiveFilters ? 'indigo' : undefined}
                            onClick={() => setFiltersOpen((open) => !open)}
                        >
                            Filtrar
                        </Button>
                        <Button
                            leftSection={<IconPlus size={17} />}
                            color="indigo"
                            onClick={() => setNewJobOpened(true)}
                        >
                            Añadir Trabajo
                        </Button>
                    </Group>
                </Group>

                {filtersOpen && renderFilters()}

                {loadError && (
                    <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light">
                        {loadError}
                    </Alert>
                )}

                {loading ? (
                    <Text c="dimmed" ta="center" py="xl">Cargando trabajos de diseño...</Text>
                ) : (
                <Tabs
                    value={mainTab}
                    onChange={setMainTab}
                    className="planeador-main-tabs"
                    variant="pills"
                    radius="md"
                >
                    <Tabs.List className="planeador-tabs-list">
                        <Tabs.Tab value="dashboard" leftSection={<IconLayoutDashboard size={16} />}>
                            Dashboard
                        </Tabs.Tab>
                        <Tabs.Tab value="asignados" leftSection={<IconBriefcase size={16} />}>
                            Trabajos Asignados
                        </Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="dashboard" pt="lg">
                        <Stack gap="lg">
                            {renderKpiCards(kpis)}
                            {renderWorksTable(filteredWorks, 'No hay trabajos que coincidan con los filtros.')}
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="asignados" pt="lg">
                        <Stack gap="lg">
                            <Text size="sm" c="dimmed">
                                Trabajos asignados a{' '}
                                <Text span fw={600} c="indigo.3">{currentUserName || 'tu usuario'}</Text>
                            </Text>
                            {renderKpiCards(assignedKpis)}
                            {renderWorksTable(
                                assignedWorks,
                                currentUserName
                                    ? 'No tienes trabajos asignados con los filtros actuales.'
                                    : 'Inicia sesión con un usuario de diseño para ver tus trabajos asignados.'
                            )}
                        </Stack>
                    </Tabs.Panel>
                </Tabs>
                )}
            </Stack>

            <Modal
                opened={newJobOpened}
                onClose={() => {
                    setNewJobOpened(false);
                    resetCreationForm();
                }}
                size="xl"
                title="Nuevo Trabajo"
            >
                <Stack gap="md">
                    <SimpleGrid cols={{ base: 1, md: 2 }}>
                        <Select
                            label="Cliente"
                            placeholder="Selecciona cliente"
                            data={clientOptions}
                            value={creationForm.cliente}
                            searchable
                            clearable
                            onChange={(value) => setCreationForm((prev) => ({ ...prev, cliente: value || '' }))}
                            error={creationErrors.cliente}
                        />
                        <TextInput
                            label="Vendedor"
                            placeholder="Asignar vendedor"
                            value={creationForm.vendedor}
                            onChange={(event) => setCreationForm((prev) => ({ ...prev, vendedor: event.currentTarget.value }))}
                            error={creationErrors.vendedor}
                        />
                    </SimpleGrid>
                    <TextInput
                        label="Nombre del trabajo"
                        placeholder="Nombre del trabajo"
                        value={creationForm.trabajo}
                        onChange={(event) => setCreationForm((prev) => ({ ...prev, trabajo: event.currentTarget.value }))}
                        error={creationErrors.trabajo}
                    />
                    <TextInput
                        label="Encargado responsable"
                        placeholder="Responsable del trabajo"
                        value={creationForm.responsable}
                        onChange={(event) => setCreationForm((prev) => ({ ...prev, responsable: event.currentTarget.value }))}
                        error={creationErrors.responsable}
                    />
                    <PlaneadorDateInput
                        label="Fecha de entrega esperada"
                        value={creationForm.fechaEntrega}
                        onChange={(value) => setCreationForm((prev) => ({ ...prev, fechaEntrega: value }))}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setNewJobOpened(false)}>Cancelar</Button>
                        <Button color="indigo" onClick={handleCreateJob}>Registrar trabajo</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={detailOpened}
                onClose={() => setDetailOpened(false)}
                size="85%"
                title={selectedWork ? `${selectedWork.id} · ${selectedWork.trabajo}` : 'Detalle del trabajo'}
            >
                {selectedWork && (
                    <Stack gap="md">
                        {systemAlert && (
                            <Alert
                                icon={<IconAlertTriangle size={16} />}
                                color="indigo"
                                variant="light"
                            >
                                {systemAlert}
                            </Alert>
                        )}

                        <SimpleGrid cols={{ base: 1, md: 4 }}>
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Estado</Text>
                                <Text fw={700}>{selectedWork.estado}</Text>
                            </Card>
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Avance</Text>
                                <Text fw={700}>{getProgress(selectedWork.actividades)}%</Text>
                                <Progress value={getProgress(selectedWork.actividades)} mt={6} />
                            </Card>
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Entrega</Text>
                                <Text fw={700}>{formatDate(selectedWork.fechaEntrega)}</Text>
                            </Card>
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Ficha técnica</Text>
                                <Badge color={selectedWork.fichaAprobada ? 'green' : 'yellow'}>
                                    {selectedWork.fichaAprobada ? 'Aprobada' : 'Pendiente'}
                                </Badge>
                            </Card>
                        </SimpleGrid>

                        <Tabs defaultValue="tecnica" variant="outline">
                            <Tabs.List>
                                <Tabs.Tab value="tecnica" leftSection={<IconClipboardList size={14} />}>Preparación técnica</Tabs.Tab>
                                <Tabs.Tab value="planeacion" leftSection={<IconTimeline size={14} />}>Planeación</Tabs.Tab>
                                <Tabs.Tab value="aprobacion" leftSection={<IconCheck size={14} />}>Aprobación y cierre</Tabs.Tab>
                            </Tabs.List>

                            <Tabs.Panel value="tecnica" pt="md">
                                <Stack>
                                    <PlaneadorDateInput
                                        label="Fecha de recepción"
                                        value={selectedWork.fechaRecepcion}
                                        onChange={(value) =>
                                            updateSelectedWork((current) => ({ ...current, fechaRecepcion: value }))
                                        }
                                    />
                                    <Textarea
                                        label="Requerimientos técnicos iniciales"
                                        minRows={3}
                                        value={selectedWork.requerimientos}
                                        onChange={(event) =>
                                            updateSelectedWork((current) => ({
                                                ...current,
                                                requerimientos: event.currentTarget.value
                                            }))
                                        }
                                    />
                                    <Button color="indigo" onClick={handleTechnicalSave}>Guardar preparación técnica</Button>
                                    {!hasDesignPermissions && (
                                        <Text size="xs" c="red">
                                            Tu usuario no pertenece al área de diseño: esta fase está restringida.
                                        </Text>
                                    )}
                                </Stack>
                            </Tabs.Panel>

                            <Tabs.Panel value="planeacion" pt="md">
                                <Stack>
                                    <SimpleGrid cols={{ base: 1, md: 2 }}>
                                        <Select
                                            label="Actividad"
                                            data={ACTIVITY_OPTIONS}
                                            value={activityDraft.nombre}
                                            onChange={(value) => setActivityDraft((prev) => ({ ...prev, nombre: value || '' }))}
                                        />
                                        <TextInput
                                            label="Repeticiones"
                                            value={String(activityDraft.repeticiones)}
                                            onChange={(event) => setActivityDraft((prev) => ({ ...prev, repeticiones: event.currentTarget.value }))}
                                        />
                                        <PlaneadorDateInput
                                            label="Fecha de envío"
                                            value={activityDraft.fechaEnvio}
                                            onChange={(value) => setActivityDraft((prev) => ({ ...prev, fechaEnvio: value }))}
                                        />
                                        <PlaneadorDateInput
                                            label="Fecha de recepción"
                                            value={activityDraft.fechaRecepcion}
                                            onChange={(value) => setActivityDraft((prev) => ({ ...prev, fechaRecepcion: value }))}
                                        />
                                    </SimpleGrid>
                                    <Textarea
                                        label="Observaciones"
                                        value={activityDraft.observaciones}
                                        onChange={(event) => setActivityDraft((prev) => ({ ...prev, observaciones: event.currentTarget.value }))}
                                    />
                                    <Group justify="flex-end">
                                        <Button color="indigo" onClick={handleAddActivity}>Agregar actividad</Button>
                                    </Group>

                                    <Table>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Actividad</Table.Th>
                                                <Table.Th>Envío</Table.Th>
                                                <Table.Th>Recepción</Table.Th>
                                                <Table.Th>Repeticiones</Table.Th>
                                                <Table.Th>Estado</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {selectedWork.actividades.map((item) => (
                                                <Table.Tr key={item.id || `${item.nombre}-${item.fechaEnvio}`}>
                                                    <Table.Td>{item.nombre}</Table.Td>
                                                    <Table.Td>{formatDate(item.fechaEnvio)}</Table.Td>
                                                    <Table.Td>{formatDate(item.fechaRecepcion)}</Table.Td>
                                                    <Table.Td>{item.repeticiones}</Table.Td>
                                                    <Table.Td>
                                                        <Button
                                                            size="compact-xs"
                                                            variant={item.completada ? 'light' : 'default'}
                                                            onClick={() => toggleActivityDone(item.id)}
                                                            disabled={!item.id}
                                                        >
                                                            {item.completada ? 'Completada' : 'Marcar completa'}
                                                        </Button>
                                                    </Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </Stack>
                            </Tabs.Panel>

                            <Tabs.Panel value="aprobacion" pt="md">
                                <Stack>
                                    <PlaneadorDateInput
                                        label="Fecha de aprobación final"
                                        value={selectedWork.fechaAprobacion}
                                        onChange={(value) =>
                                            updateSelectedWork((current) => ({ ...current, fechaAprobacion: value }))
                                        }
                                    />
                                    <Textarea
                                        label="Comentarios de aprobación"
                                        value={selectedWork.comentariosAprobacion}
                                        onChange={(event) =>
                                            updateSelectedWork((current) => ({
                                                ...current,
                                                comentariosAprobacion: event.currentTarget.value
                                            }))
                                        }
                                    />
                                    <Group>
                                        <Button color="indigo" onClick={handleApprove}>Registrar aprobación</Button>
                                        <Button variant="light" color="green" onClick={handleFinish}>
                                            Finalizar trabajo
                                        </Button>
                                    </Group>
                                    <Card withBorder>
                                        <Text fw={700} mb="xs">Historial de revisiones</Text>
                                        <Stack gap={4}>
                                            {selectedWork.historial.map((line, idx) => (
                                                <Text size="sm" key={`${line}-${idx}`}>• {line}</Text>
                                            ))}
                                        </Stack>
                                    </Card>
                                </Stack>
                            </Tabs.Panel>
                        </Tabs>
                    </Stack>
                )}
            </Modal>
        </Box>
        </DatesProvider>
    );
}