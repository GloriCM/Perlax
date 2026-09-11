import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../../../utils/api';
import { isAdmin, getCurrentUser, getUserDisplayName, isAssignedToCurrentUser } from '../../../utils/permissions';
import {
    Alert,
    Badge,
    Box,
    Button,
    Card,
    Checkbox,
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
import { notifications } from '@mantine/notifications';
import {
    IconAlertTriangle,
    IconBriefcase,
    IconCheck,
    IconChevronLeft,
    IconChevronRight,
    IconFilter,
    IconLayoutDashboard,
    IconPlus,
    IconTrash
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

const VENDEDORES_STORAGE_KEY = 'perlax-diseno-vendedores-v2';

function emptyProceso() {
    return {
        planchas: { aplica: false, fechaEnvio: null, fechaRecibido: null, repeticion: null },
        troquel: { aplica: false, fechaEnvio: null, fechaRecibido: null },
        muestra: { aplica: false, fechaEnvioImpDigi: null, fechaRecibidoImpDigi: null, fechaEntrega: null },
        presentacion: { aplica: false, fechaEntrega: null },
        arteYFicha: { aplica: false, fechaEntrega: null },
        expertis: { aplica: false, encontradoEnPlataforma: false, fecha: null },
        fechaAprobacion: null,
        pendientes: ''
    };
}

function parseDateValue(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeProceso(raw) {
    const base = emptyProceso();
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
        planchas: {
            ...base.planchas,
            ...(src.planchas || {}),
            fechaEnvio: parseDateValue(src.planchas?.fechaEnvio),
            fechaRecibido: parseDateValue(src.planchas?.fechaRecibido),
            repeticion: src.planchas?.repeticion === true || src.planchas?.repeticion === 'si' || src.planchas?.repeticion === 'Sí'
                ? true
                : src.planchas?.repeticion === false || src.planchas?.repeticion === 'no' || src.planchas?.repeticion === 'No'
                    ? false
                    : null
        },
        troquel: {
            ...base.troquel,
            ...(src.troquel || {}),
            fechaEnvio: parseDateValue(src.troquel?.fechaEnvio),
            fechaRecibido: parseDateValue(src.troquel?.fechaRecibido)
        },
        muestra: {
            ...base.muestra,
            ...(src.muestra || {}),
            fechaEnvioImpDigi: parseDateValue(src.muestra?.fechaEnvioImpDigi),
            fechaRecibidoImpDigi: parseDateValue(src.muestra?.fechaRecibidoImpDigi),
            fechaEntrega: parseDateValue(src.muestra?.fechaEntrega)
        },
        presentacion: {
            ...base.presentacion,
            ...(src.presentacion || {}),
            fechaEntrega: parseDateValue(src.presentacion?.fechaEntrega)
        },
        arteYFicha: {
            ...base.arteYFicha,
            ...(src.arteYFicha || {}),
            fechaEntrega: parseDateValue(src.arteYFicha?.fechaEntrega)
        },
        expertis: {
            ...base.expertis,
            ...(src.expertis || {}),
            encontradoEnPlataforma: !!(src.expertis?.encontradoEnPlataforma),
            fecha: parseDateValue(src.expertis?.fecha)
        },
        fechaAprobacion: parseDateValue(src.fechaAprobacion),
        pendientes: src.pendientes || ''
    };
}

function serializeProceso(proceso) {
    const toDate = (value) => formatDateOnlyForApi(value);
    return {
        planchas: {
            aplica: !!proceso.planchas?.aplica,
            fechaEnvio: toDate(proceso.planchas?.fechaEnvio),
            fechaRecibido: toDate(proceso.planchas?.fechaRecibido),
            repeticion: proceso.planchas?.repeticion
        },
        troquel: {
            aplica: !!proceso.troquel?.aplica,
            fechaEnvio: toDate(proceso.troquel?.fechaEnvio),
            fechaRecibido: toDate(proceso.troquel?.fechaRecibido)
        },
        muestra: {
            aplica: !!proceso.muestra?.aplica,
            fechaEnvioImpDigi: toDate(proceso.muestra?.fechaEnvioImpDigi),
            fechaRecibidoImpDigi: toDate(proceso.muestra?.fechaRecibidoImpDigi),
            fechaEntrega: toDate(proceso.muestra?.fechaEntrega)
        },
        presentacion: {
            aplica: !!proceso.presentacion?.aplica,
            fechaEntrega: toDate(proceso.presentacion?.fechaEntrega)
        },
        arteYFicha: {
            aplica: !!proceso.arteYFicha?.aplica,
            fechaEntrega: toDate(proceso.arteYFicha?.fechaEntrega)
        },
        expertis: {
            aplica: !!proceso.expertis?.aplica,
            encontradoEnPlataforma: !!proceso.expertis?.encontradoEnPlataforma,
            fecha: toDate(proceso.expertis?.fecha)
        },
        fechaAprobacion: toDate(proceso.fechaAprobacion),
        pendientes: proceso.pendientes || ''
    };
}

function parseWorkFromApi(work) {
    return {
        ...work,
        createdAt: work.createdAt ? new Date(work.createdAt) : null,
        fechaRecepcion: work.fechaRecepcion ? new Date(work.fechaRecepcion) : null,
        fechaEntrega: work.fechaEntrega ? new Date(work.fechaEntrega) : null,
        fechaAprobacion: work.fechaAprobacion ? new Date(work.fechaAprobacion) : null,
        proceso: normalizeProceso(work.proceso),
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

function formatDateTime(dateValue) {
    if (!dateValue) return '-';
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return '-';
    return date.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function isProcessStepComplete(key, step) {
    if (!step?.aplica) return false;
    if (key === 'planchas' || key === 'troquel') return !!(step.fechaEnvio || step.fechaRecibido);
    if (key === 'muestra') return !!(step.fechaEnvioImpDigi || step.fechaRecibidoImpDigi || step.fechaEntrega);
    if (key === 'presentacion' || key === 'arteYFicha') return !!step.fechaEntrega;
    if (key === 'expertis') return !!(step.encontradoEnPlataforma || step.fecha);
    return false;
}

function getProgress(work) {
    const proceso = work?.proceso || emptyProceso();
    const keys = ['planchas', 'troquel', 'muestra', 'presentacion', 'arteYFicha', 'expertis'];
    const applied = keys.filter((key) => proceso[key]?.aplica);
    if (applied.length === 0 && !proceso.fechaAprobacion) return 0;
    const completed = applied.filter((key) => isProcessStepComplete(key, proceso[key])).length;
    const total = applied.length + 1;
    const done = completed + (proceso.fechaAprobacion ? 1 : 0);
    return Math.round((done / total) * 100);
}

function ProcesoStepCard({ title, aplica, disabled, onAplicaChange, children }) {
    return (
        <Card className="detail-mini-card proceso-step-card" padding="md">
            <Checkbox
                label={`Aplica: ${title}`}
                checked={!!aplica}
                disabled={disabled}
                onChange={(event) => onAplicaChange(event.currentTarget.checked)}
            />
            {aplica ? <Box mt="sm">{children}</Box> : (
                <Text size="xs" c="dimmed" mt={8}>No aplica</Text>
            )}
        </Card>
    );
}

function daysSinceReception(work) {
    if (!work?.fechaRecepcion) return null;
    const reception = new Date(work.fechaRecepcion);
    if (Number.isNaN(reception.getTime())) return null;
    const start = new Date(reception.getFullYear(), reception.getMonth(), reception.getDate());
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.floor((today.getTime() - start.getTime()) / 86_400_000);
}

function stepHasNovedad(step) {
    if (!step || typeof step !== 'object') return false;
    if (step.aplica) return true;
    return Object.entries(step).some(([key, value]) => {
        if (key === 'aplica') return false;
        if (value == null) return false;
        if (typeof value === 'boolean') return value;
        return String(value).trim().length > 0;
    });
}

/** Hay novedad en el proceso si marcó algún paso, fechas o pendientes. */
function hasProcesoNovedades(work) {
    const proceso = work?.proceso || emptyProceso();
    const keys = ['planchas', 'troquel', 'muestra', 'presentacion', 'arteYFicha', 'expertis'];
    if (keys.some((key) => stepHasNovedad(proceso[key]))) return true;
    return String(proceso.pendientes || '').trim().length > 0;
}

/** Crítico: +15 días desde fecha de recepción, sin fecha de aprobación. */
function isCritico(work) {
    if (!work) return false;
    if (work.proceso?.fechaAprobacion) return false;
    const days = daysSinceReception(work);
    return days != null && days >= 15;
}

/**
 * Semáforo:
 * - verde: tiene fecha de aprobación
 * - rojo: crítico (+15 días desde recepción)
 * - amarillo: ya tiene novedades en el proceso
 * - naranja: aún sin novedades en el proceso
 */
function getSemaforo(work) {
    if (work?.proceso?.fechaAprobacion) return 'verde';
    if (isCritico(work)) return 'rojo';
    if (hasProcesoNovedades(work)) return 'amarillo';
    return 'naranja';
}

const SEMAFORO_LABEL = {
    verde: 'Aprobado',
    rojo: 'Crítico (+15 días)',
    amarillo: 'Con novedades',
    naranja: 'Sin novedades'
};

function isDesignAreaUser(user) {
    const area = normalizeText(user?.area || user?.Area);
    return area.includes('dise');
}

function canUserSeeAllDesignJobs(user) {
    // Solo admin ve todos. Resto: únicamente los asignados a su usuario.
    return isAdmin(user);
}

function createInitialForm() {
    return {
        cliente: '',
        vendedor: '',
        trabajo: '',
        accion: '',
        responsable: '',
        fechaRecepcion: null
    };
}

function uniqueSorted(values) {
    const seen = new Set();
    const result = [];
    for (const raw of values) {
        const value = String(raw || '').trim();
        if (!value) continue;
        const key = normalizeText(value);
        if (seen.has(key)) continue;
        seen.add(key);
        result.push(value);
    }
    return result.sort((a, b) => a.localeCompare(b, 'es'));
}

function loadStoredVendedores() {
    try {
        const raw = JSON.parse(localStorage.getItem(VENDEDORES_STORAGE_KEY) || '[]');
        return uniqueSorted(Array.isArray(raw) ? raw : []);
    } catch {
        return [];
    }
}

function saveStoredVendedores(values) {
    const next = uniqueSorted(values);
    localStorage.setItem(VENDEDORES_STORAGE_KEY, JSON.stringify(next));
    return next;
}

export default function PlaneadorDiseno() {
    const [searchParams, setSearchParams] = useSearchParams();
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
    const [savingProceso, setSavingProceso] = useState(false);
    const [deletingJob, setDeletingJob] = useState(false);
    const [adminToolsOpen, setAdminToolsOpen] = useState(false);
    const [designerOptions, setDesignerOptions] = useState([]);
    const [openOps, setOpenOps] = useState([]);
    const [vendedorCatalog, setVendedorCatalog] = useState(() => loadStoredVendedores());
    const [addingVendedor, setAddingVendedor] = useState(false);
    const [newVendedorName, setNewVendedorName] = useState('');

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

    useEffect(() => {
        if (!newJobOpened) return undefined;
        let cancelled = false;
        (async () => {
            try {
                const [designers, ops] = await Promise.all([
                    api.get('/users/designers'),
                    api.get('/production/scheduling/open-orders'),
                ]);
                if (cancelled) return;
                setDesignerOptions(
                    (Array.isArray(designers) ? designers : [])
                        .map((u) => {
                            const username = (u.username || u.Username || '').trim();
                            const display = (u.displayName || u.DisplayName || username).trim();
                            if (!username && !display) return null;
                            const value = username || display;
                            const label = display && username && normalizeText(display) !== normalizeText(username)
                                ? `${display} (${username})`
                                : (display || username);
                            return { value, label };
                        })
                        .filter(Boolean)
                );
                setOpenOps(Array.isArray(ops) ? ops : []);
            } catch {
                if (!cancelled) {
                    setDesignerOptions([]);
                    setOpenOps([]);
                }
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [newJobOpened]);

    const currentUser = useMemo(() => getCurrentUser() || {}, []);
    const canSeeAllJobs = canUserSeeAllDesignJobs(currentUser);
    const currentUserName = useMemo(() => getUserDisplayName(currentUser), [currentUser]);

    const scopedWorks = useMemo(() => works, [works]);

    const selectedWork = useMemo(
        () => scopedWorks.find((item) => item.id === selectedId) || null,
        [scopedWorks, selectedId]
    );

    const filteredWorks = useMemo(() => {
        const matches = (value, filter) => {
            if (!filter.trim()) return true;
            return normalizeText(value).includes(normalizeText(filter));
        };

        return scopedWorks.filter((item) => {
            if (!canSeeAllJobs && !isAssignedToCurrentUser(item.responsable, currentUser)) return false;
            if (statusFilter !== 'all' && item.estado !== statusFilter) return false;
            if (!matches(item.cliente, clientFilter)) return false;
            if (!matches(item.vendedor, vendedorFilter)) return false;
            if (!matches(item.trabajo, trabajoFilter)) return false;
            if (canSeeAllJobs && !matches(item.responsable, designerFilter)) return false;
            return true;
        });
    }, [scopedWorks, statusFilter, clientFilter, vendedorFilter, trabajoFilter, designerFilter, canSeeAllJobs, currentUser]);

    const hasActiveFilters = statusFilter !== 'all'
        || clientFilter.trim()
        || vendedorFilter.trim()
        || trabajoFilter.trim()
        || designerFilter.trim();

    const assignedWorks = useMemo(() => {
        return filteredWorks.filter((item) => isAssignedToCurrentUser(item.responsable, currentUser));
    }, [filteredWorks, currentUser]);

    const assignedKpis = useMemo(() => {
        const total = assignedWorks.length;
        const enEspera = assignedWorks.filter((w) => w.estado === 'Nuevo Trabajo Pendiente').length;
        const enDesarrollo = assignedWorks.filter((w) => w.estado === 'En Desarrollo').length;
        const criticos = assignedWorks.filter((w) => isCritico(w)).length;
        return { total, enEspera, enDesarrollo, criticos };
    }, [assignedWorks]);

    const kpis = useMemo(() => {
        const source = canSeeAllJobs
            ? works
            : works.filter((w) => isAssignedToCurrentUser(w.responsable, currentUser));
        const total = source.length;
        const enEspera = source.filter((w) => w.estado === 'Nuevo Trabajo Pendiente').length;
        const enDesarrollo = source.filter((w) => w.estado === 'En Desarrollo').length;
        const criticos = source.filter((w) => isCritico(w)).length;
        return { total, enEspera, enDesarrollo, criticos };
    }, [works, canSeeAllJobs, currentUser]);

    const clientOptions = useMemo(() => {
        const fromJobs = works.map((w) => w.cliente);
        const fromOps = openOps.map((op) => op.clientName);
        return uniqueSorted([...fromJobs, ...fromOps]).map((cliente) => ({
            value: cliente,
            label: cliente
        }));
    }, [works, openOps]);

    const vendedorOptions = useMemo(
        () => uniqueSorted(vendedorCatalog).map((name) => ({ value: name, label: name })),
        [vendedorCatalog]
    );

    const hasDesignPermissions = isDesignAreaUser(currentUser);
    const canEditSelectedProceso = !!(
        selectedWork
        && hasDesignPermissions
        && (!canSeeAllJobs || isAssignedToCurrentUser(selectedWork.responsable, currentUser))
    );

    const resetCreationForm = () => {
        setCreationForm(createInitialForm());
        setCreationErrors({});
        setAddingVendedor(false);
        setNewVendedorName('');
    };

    const handleAddVendedor = () => {
        const name = newVendedorName.trim();
        if (!name) return;
        const next = saveStoredVendedores([...vendedorCatalog, name]);
        setVendedorCatalog(next);
        setCreationForm((prev) => ({ ...prev, vendedor: name }));
        setCreationErrors((prev) => ({ ...prev, vendedor: undefined }));
        setNewVendedorName('');
        setAddingVendedor(false);
    };

    const handleCreateJob = async () => {
        const errors = {};
        if (!creationForm.cliente.trim()) errors.cliente = 'El cliente es obligatorio.';
        if (!creationForm.vendedor.trim()) errors.vendedor = 'El vendedor es obligatorio.';
        if (!creationForm.trabajo.trim()) errors.trabajo = 'El trabajo es obligatorio.';
        if (!creationForm.accion.trim()) errors.accion = 'La acción es obligatoria.';
        if (!creationForm.responsable.trim()) errors.responsable = 'El encargado responsable es obligatorio.';
        if (!creationForm.fechaRecepcion) errors.fechaRecepcion = 'La fecha de recepción es obligatoria.';
        setCreationErrors(errors);
        if (Object.keys(errors).length > 0) return;

        try {
            const created = await api.post('/design/planner/jobs', {
                cliente: creationForm.cliente.trim(),
                vendedor: creationForm.vendedor.trim(),
                trabajo: creationForm.trabajo.trim(),
                accion: creationForm.accion.trim(),
                responsable: creationForm.responsable.trim(),
                fechaRecepcion: formatDateForApi(creationForm.fechaRecepcion)
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
        setAdminToolsOpen(false);
    };

    // Deep-link desde Planes de Diseño: /diseno/planeador?job=PJ-2026-00X
    useEffect(() => {
        if (loading) return;
        const jobId = String(searchParams.get('job') || '').trim();
        if (!jobId) return;
        const exists = works.some((w) => String(w.id) === jobId);
        if (!exists) {
            setSystemAlert(`No se encontró el trabajo ${jobId} en tus asignaciones.`);
            return;
        }
        openDetail(jobId);
        const next = new URLSearchParams(searchParams);
        next.delete('job');
        setSearchParams(next, { replace: true });
    }, [loading, works, searchParams, setSearchParams]);

    const updateSelectedWork = (updater) => {
        setWorks((prev) => prev.map((item) => (item.id === selectedId ? updater(item) : item)));
    };

    const updateProceso = (updater) => {
        updateSelectedWork((current) => ({
            ...current,
            proceso: updater(current.proceso || emptyProceso())
        }));
    };

    const patchStep = (key, patch) => {
        updateProceso((current) => ({
            ...current,
            [key]: { ...(current[key] || {}), ...patch }
        }));
    };

    const handleSaveProceso = async () => {
        if (!canEditSelectedProceso) {
            setSystemAlert('Solo el diseñador asignado puede actualizar el proceso.');
            notifications.show({
                title: 'Sin permiso',
                message: 'Solo el diseñador asignado puede actualizar el proceso.',
                color: 'yellow'
            });
            return;
        }
        if (!selectedWork) return;
        const jobLabel = `${selectedWork.id} · ${selectedWork.trabajo}`;
        try {
            setSavingProceso(true);
            const updated = await api.put(`/design/planner/jobs/${selectedId}/proceso`, {
                procesoJson: JSON.stringify(serializeProceso(selectedWork.proceso || emptyProceso()))
            });
            setWorks((prev) => prev.map((item) => (item.id === selectedId ? parseWorkFromApi(updated) : item)));
            setSystemAlert('');
            notifications.show({
                id: `proceso-saved-${selectedId}`,
                title: 'Proceso guardado',
                message: `${jobLabel} se actualizó correctamente.`,
                color: 'green',
                icon: <IconCheck size={18} />,
                autoClose: 4000
            });
            setDetailOpened(false);
            setSelectedId('');
        } catch (error) {
            const message = error.message || 'No se pudo guardar el proceso.';
            setSystemAlert(message);
            notifications.show({
                title: 'Error al guardar',
                message,
                color: 'red',
                autoClose: 6000
            });
        } finally {
            setSavingProceso(false);
        }
    };

    const handleDeleteJob = async () => {
        if (!canSeeAllJobs || !selectedWork?.id) return;
        const jobId = selectedWork.id;
        const ok = window.confirm(
            `¿Eliminar permanentemente ${jobId} · ${selectedWork.trabajo}?\n\nEsta acción no se puede deshacer.`
        );
        if (!ok) return;
        const typed = window.prompt(`Para confirmar, escribe el código del trabajo:\n${jobId}`);
        if (String(typed || '').trim().toUpperCase() !== String(jobId).trim().toUpperCase()) {
            notifications.show({
                title: 'Eliminación cancelada',
                message: 'El código no coincide.',
                color: 'yellow'
            });
            return;
        }
        try {
            setDeletingJob(true);
            await api.delete(`/design/planner/jobs/${encodeURIComponent(jobId)}`);
            setWorks((prev) => prev.filter((item) => item.id !== jobId));
            setDetailOpened(false);
            setSelectedId('');
            setAdminToolsOpen(false);
            notifications.show({
                title: 'Trabajo eliminado',
                message: `${jobId} se eliminó correctamente.`,
                color: 'green',
                icon: <IconCheck size={18} />,
                autoClose: 4000
            });
        } catch (error) {
            notifications.show({
                title: 'No se pudo eliminar',
                message: error.message || 'Error al eliminar el trabajo.',
                color: 'red',
                autoClose: 6000
            });
        } finally {
            setDeletingJob(false);
        }
    };

    const renderWorksTable = (rows, emptyMessage) => (
        <Card className="planeador-table-card">
            <Group justify="space-between" mb="sm">
                <Text fw={700}>Mostrando {rows.length} de {(canSeeAllJobs ? scopedWorks : filteredWorks).length} registros</Text>
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
                                <Table.Th>Acción</Table.Th>
                                <Table.Th>Diseñador</Table.Th>
                                <Table.Th>Montado por</Table.Th>
                                <Table.Th>Fecha montaje</Table.Th>
                                <Table.Th>Recepción</Table.Th>
                                <Table.Th>Aprobación</Table.Th>
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
                                        <Table.Td>
                                            <Text size="sm" lineClamp={2}>{work.accion || '-'}</Text>
                                        </Table.Td>
                                        <Table.Td>{work.responsable}</Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{work.createdBy || '—'}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text size="sm">{formatDateTime(work.createdAt)}</Text>
                                        </Table.Td>
                                        <Table.Td>{formatDate(work.fechaRecepcion)}</Table.Td>
                                        <Table.Td>{formatDate(work.proceso?.fechaAprobacion)}</Table.Td>
                                        <Table.Td>
                                            <span
                                                className={`semaforo semaforo-${semaforo}`}
                                                title={SEMAFORO_LABEL[semaforo] || semaforo}
                                            />
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
                <Text className="planeador-kpi-label">Crítico (+15 días)</Text>
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
                {canSeeAllJobs && (
                <TextInput
                    label="Diseñador"
                    placeholder="Filtrar diseñador"
                    value={designerFilter}
                    onChange={(event) => setDesignerFilter(event.currentTarget.value)}
                />
                )}
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
                            {canSeeAllJobs
                                ? 'Registra el trabajo, asígnalo a Diseño y consulta el proceso. Después de asignar, solo Diseño actualiza fechas.'
                                : 'Tus trabajos asignados: marca qué aplica y registra las fechas del proceso.'}
                        </Text>
                        <Text size="sm" c="dimmed" mt={6}>
                            {canSeeAllJobs
                                ? 'Vista de administrador: todos los trabajos.'
                                : `Vista de diseño: solo asignados a ${currentUserName || 'tu usuario'}.`}
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
                        {canSeeAllJobs && (
                        <Button
                            leftSection={<IconPlus size={17} />}
                            color="indigo"
                            onClick={() => setNewJobOpened(true)}
                        >
                            Añadir Trabajo
                        </Button>
                        )}
                    </Group>
                </Group>

                {filtersOpen && renderFilters()}

                {loadError && (
                    <Alert icon={<IconAlertTriangle size={16} />} color="red" variant="light">
                        {loadError}
                    </Alert>
                )}
                {systemAlert && !detailOpened && (
                    <Alert icon={<IconAlertTriangle size={16} />} color="indigo" variant="light">
                        {systemAlert}
                    </Alert>
                )}

                {loading ? (
                    <Text c="dimmed" ta="center" py="xl">Cargando trabajos de diseño...</Text>
                ) : canSeeAllJobs ? (
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
                ) : (
                    <Stack gap="lg">
                        <Text size="sm" c="dimmed">
                            Trabajos asignados a{' '}
                            <Text span fw={600} c="indigo.3">{currentUserName || 'tu usuario'}</Text>
                        </Text>
                        {renderKpiCards(kpis)}
                        {renderWorksTable(
                            filteredWorks,
                            'No tienes trabajos asignados.'
                        )}
                    </Stack>
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
                        <Stack gap={6}>
                            <Select
                                label="Vendedor"
                                placeholder="Selecciona vendedor"
                                searchable
                                clearable
                                nothingFoundMessage="No hay vendedores. Añade uno con el botón."
                                data={vendedorOptions}
                                value={creationForm.vendedor || null}
                                onChange={(value) => setCreationForm((prev) => ({ ...prev, vendedor: value || '' }))}
                                error={creationErrors.vendedor}
                            />
                            {addingVendedor ? (
                                <Group gap="xs" align="flex-end" wrap="nowrap">
                                    <TextInput
                                        placeholder="Nombre del vendedor"
                                        value={newVendedorName}
                                        onChange={(event) => setNewVendedorName(event.currentTarget.value)}
                                        onKeyDown={(event) => {
                                            if (event.key === 'Enter') {
                                                event.preventDefault();
                                                handleAddVendedor();
                                            }
                                        }}
                                        style={{ flex: 1 }}
                                    />
                                    <Button color="indigo" onClick={handleAddVendedor}>Guardar</Button>
                                    <Button
                                        variant="default"
                                        onClick={() => {
                                            setAddingVendedor(false);
                                            setNewVendedorName('');
                                        }}
                                    >
                                        Cancelar
                                    </Button>
                                </Group>
                            ) : (
                                <Button
                                    variant="subtle"
                                    size="compact-sm"
                                    leftSection={<IconPlus size={14} />}
                                    onClick={() => setAddingVendedor(true)}
                                >
                                    Añadir vendedor
                                </Button>
                            )}
                        </Stack>
                    </SimpleGrid>
                    <TextInput
                        label="Trabajo"
                        placeholder="Nombre del trabajo"
                        value={creationForm.trabajo}
                        onChange={(event) => setCreationForm((prev) => ({ ...prev, trabajo: event.currentTarget.value }))}
                        error={creationErrors.trabajo}
                    />
                    <Textarea
                        label="Acción"
                        placeholder="Describe lo que necesita el encargado de diseño"
                        minRows={3}
                        value={creationForm.accion}
                        onChange={(event) => setCreationForm((prev) => ({ ...prev, accion: event.currentTarget.value }))}
                        error={creationErrors.accion}
                    />
                    <Select
                        label="Encargado responsable"
                        placeholder="Usuario de Diseño"
                        searchable
                        clearable
                        nothingFoundMessage="No hay usuarios del área Diseño"
                        data={designerOptions}
                        value={creationForm.responsable || null}
                        onChange={(value) => setCreationForm((prev) => ({ ...prev, responsable: value || '' }))}
                        error={creationErrors.responsable}
                    />
                    <PlaneadorDateInput
                        label="Fecha de Recepción"
                        value={creationForm.fechaRecepcion}
                        onChange={(value) => setCreationForm((prev) => ({ ...prev, fechaRecepcion: value }))}
                        error={creationErrors.fechaRecepcion}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setNewJobOpened(false)}>Cancelar</Button>
                        <Button color="indigo" onClick={handleCreateJob}>Registrar trabajo</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal
                opened={detailOpened}
                onClose={() => {
                    setDetailOpened(false);
                    setAdminToolsOpen(false);
                }}
                size="85%"
                title={selectedWork ? `${selectedWork.id} · ${selectedWork.trabajo}` : 'Detalle del trabajo'}
            >
                {selectedWork && (
                    <Stack gap="md">
                        {systemAlert && (
                            <Alert
                                icon={<IconAlertTriangle size={16} />}
                                color="red"
                                variant="light"
                            >
                                {systemAlert}
                            </Alert>
                        )}

                        <Alert color={canEditSelectedProceso ? 'indigo' : 'gray'} variant="light">
                            {canEditSelectedProceso
                                ? 'Marca qué aplica en este trabajo y registra las fechas del proceso. El vendedor solo podrá consultar lo que guardes.'
                                : 'Consulta del proceso. Solo el diseñador asignado puede actualizar estas fechas.'}
                        </Alert>

                        <SimpleGrid cols={{ base: 1, md: 4 }}>
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Cliente</Text>
                                <Text fw={700}>{selectedWork.cliente}</Text>
                            </Card>
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Vendedor</Text>
                                <Text fw={700}>{selectedWork.vendedor}</Text>
                            </Card>
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Encargado</Text>
                                <Text fw={700}>{selectedWork.responsable}</Text>
                            </Card>
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Fecha de Recepción</Text>
                                <Text fw={700}>{formatDate(selectedWork.fechaRecepcion)}</Text>
                            </Card>
                        </SimpleGrid>

                        <SimpleGrid cols={{ base: 1, md: 2 }}>
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Montado por</Text>
                                <Text fw={700}>{selectedWork.createdBy || '—'}</Text>
                            </Card>
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Fecha y hora de montaje</Text>
                                <Text fw={700}>{formatDateTime(selectedWork.createdAt)}</Text>
                            </Card>
                        </SimpleGrid>

                        <SimpleGrid cols={{ base: 1, md: 3 }}>
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Estado</Text>
                                <Text fw={700}>{selectedWork.estado}</Text>
                            </Card>
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Avance</Text>
                                <Text fw={700}>{getProgress(selectedWork)}%</Text>
                                <Progress value={getProgress(selectedWork)} mt={6} />
                            </Card>
                            <Card className="detail-mini-card">
                                <Text size="xs" c="dimmed">Acción solicitada</Text>
                                <Text fw={600}>{selectedWork.accion || '-'}</Text>
                            </Card>
                        </SimpleGrid>

                        <Text fw={700}>Proceso de diseño</Text>
                        <SimpleGrid cols={{ base: 1, md: 2 }}>
                            <ProcesoStepCard
                                title="Planchas"
                                aplica={!!selectedWork.proceso?.planchas?.aplica}
                                disabled={!canEditSelectedProceso}
                                onAplicaChange={(aplica) => patchStep('planchas', { aplica })}
                            >
                                <SimpleGrid cols={{ base: 1, sm: 3 }}>
                                    <PlaneadorDateInput
                                        label="Fecha de Envío"
                                        value={selectedWork.proceso?.planchas?.fechaEnvio}
                                        disabled={!canEditSelectedProceso}
                                        onChange={(value) => patchStep('planchas', { fechaEnvio: value })}
                                    />
                                    <PlaneadorDateInput
                                        label="Fecha de Recibido"
                                        value={selectedWork.proceso?.planchas?.fechaRecibido}
                                        disabled={!canEditSelectedProceso}
                                        onChange={(value) => patchStep('planchas', { fechaRecibido: value })}
                                    />
                                    <Select
                                        label="Repetición"
                                        placeholder="Selecciona"
                                        data={[
                                            { value: 'si', label: 'Sí' },
                                            { value: 'no', label: 'No' }
                                        ]}
                                        value={selectedWork.proceso?.planchas?.repeticion === true
                                            ? 'si'
                                            : selectedWork.proceso?.planchas?.repeticion === false
                                                ? 'no'
                                                : null}
                                        disabled={!canEditSelectedProceso}
                                        onChange={(value) => patchStep('planchas', {
                                            repeticion: value === 'si' ? true : value === 'no' ? false : null
                                        })}
                                    />
                                </SimpleGrid>
                            </ProcesoStepCard>

                            <ProcesoStepCard
                                title="Troquel"
                                aplica={!!selectedWork.proceso?.troquel?.aplica}
                                disabled={!canEditSelectedProceso}
                                onAplicaChange={(aplica) => patchStep('troquel', { aplica })}
                            >
                                <SimpleGrid cols={{ base: 1, sm: 2 }}>
                                    <PlaneadorDateInput
                                        label="Fecha de Envío"
                                        value={selectedWork.proceso?.troquel?.fechaEnvio}
                                        disabled={!canEditSelectedProceso}
                                        onChange={(value) => patchStep('troquel', { fechaEnvio: value })}
                                    />
                                    <PlaneadorDateInput
                                        label="Fecha de Recibido"
                                        value={selectedWork.proceso?.troquel?.fechaRecibido}
                                        disabled={!canEditSelectedProceso}
                                        onChange={(value) => patchStep('troquel', { fechaRecibido: value })}
                                    />
                                </SimpleGrid>
                            </ProcesoStepCard>

                            <ProcesoStepCard
                                title="Muestra"
                                aplica={!!selectedWork.proceso?.muestra?.aplica}
                                disabled={!canEditSelectedProceso}
                                onAplicaChange={(aplica) => patchStep('muestra', { aplica })}
                            >
                                <SimpleGrid cols={{ base: 1, sm: 3 }}>
                                    <PlaneadorDateInput
                                        label="Fecha de Envío IMP.DIGI"
                                        value={selectedWork.proceso?.muestra?.fechaEnvioImpDigi}
                                        disabled={!canEditSelectedProceso}
                                        onChange={(value) => patchStep('muestra', { fechaEnvioImpDigi: value })}
                                    />
                                    <PlaneadorDateInput
                                        label="Fecha de Recibido IMP.DIGI"
                                        value={selectedWork.proceso?.muestra?.fechaRecibidoImpDigi}
                                        disabled={!canEditSelectedProceso}
                                        onChange={(value) => patchStep('muestra', { fechaRecibidoImpDigi: value })}
                                    />
                                    <PlaneadorDateInput
                                        label="Fecha de Entrega"
                                        value={selectedWork.proceso?.muestra?.fechaEntrega}
                                        disabled={!canEditSelectedProceso}
                                        onChange={(value) => patchStep('muestra', { fechaEntrega: value })}
                                    />
                                </SimpleGrid>
                            </ProcesoStepCard>

                            <ProcesoStepCard
                                title="Presentación"
                                aplica={!!selectedWork.proceso?.presentacion?.aplica}
                                disabled={!canEditSelectedProceso}
                                onAplicaChange={(aplica) => patchStep('presentacion', { aplica })}
                            >
                                <PlaneadorDateInput
                                    label="Fecha de Entrega"
                                    value={selectedWork.proceso?.presentacion?.fechaEntrega}
                                    disabled={!canEditSelectedProceso}
                                    onChange={(value) => patchStep('presentacion', { fechaEntrega: value })}
                                />
                            </ProcesoStepCard>

                            <ProcesoStepCard
                                title="Arte y Ficha"
                                aplica={!!selectedWork.proceso?.arteYFicha?.aplica}
                                disabled={!canEditSelectedProceso}
                                onAplicaChange={(aplica) => patchStep('arteYFicha', { aplica })}
                            >
                                <PlaneadorDateInput
                                    label="Fecha de Entrega"
                                    value={selectedWork.proceso?.arteYFicha?.fechaEntrega}
                                    disabled={!canEditSelectedProceso}
                                    onChange={(value) => patchStep('arteYFicha', { fechaEntrega: value })}
                                />
                            </ProcesoStepCard>

                            <ProcesoStepCard
                                title="Expertis"
                                aplica={!!selectedWork.proceso?.expertis?.aplica}
                                disabled={!canEditSelectedProceso}
                                onAplicaChange={(aplica) => patchStep('expertis', { aplica })}
                            >
                                <Stack gap="sm">
                                    <Checkbox
                                        label="Se encuentra en la plataforma Expertis"
                                        checked={!!selectedWork.proceso?.expertis?.encontradoEnPlataforma}
                                        disabled={!canEditSelectedProceso}
                                        onChange={(event) => patchStep('expertis', {
                                            encontradoEnPlataforma: event.currentTarget.checked
                                        })}
                                    />
                                    <PlaneadorDateInput
                                        label="Fecha en Expertis"
                                        value={selectedWork.proceso?.expertis?.fecha}
                                        disabled={!canEditSelectedProceso}
                                        onChange={(value) => patchStep('expertis', { fecha: value })}
                                    />
                                </Stack>
                            </ProcesoStepCard>
                        </SimpleGrid>

                        <SimpleGrid cols={{ base: 1, md: 2 }}>
                            <Card className="detail-mini-card" padding="md">
                                <PlaneadorDateInput
                                    label="Fecha de Aprobación"
                                    value={selectedWork.proceso?.fechaAprobacion}
                                    disabled={!canEditSelectedProceso}
                                    onChange={(value) => updateProceso((current) => ({ ...current, fechaAprobacion: value }))}
                                />
                            </Card>
                            <Card className="detail-mini-card" padding="md">
                                <Textarea
                                    label="Pendientes"
                                    minRows={3}
                                    value={selectedWork.proceso?.pendientes || ''}
                                    disabled={!canEditSelectedProceso}
                                    onChange={(event) => updateProceso((current) => ({
                                        ...current,
                                        pendientes: event.currentTarget.value
                                    }))}
                                />
                            </Card>
                        </SimpleGrid>

                        <Group justify="space-between" align="center" wrap="wrap">
                            {canSeeAllJobs ? (
                                <Box>
                                    {!adminToolsOpen ? (
                                        <Text
                                            size="xs"
                                            c="dimmed"
                                            style={{ opacity: 0.28, cursor: 'pointer', userSelect: 'none' }}
                                            onClick={() => setAdminToolsOpen(true)}
                                            title="Herramientas admin"
                                        >
                                            ···
                                        </Text>
                                    ) : (
                                        <Button
                                            variant="subtle"
                                            color="red"
                                            size="compact-xs"
                                            leftSection={<IconTrash size={14} />}
                                            loading={deletingJob}
                                            onClick={handleDeleteJob}
                                            style={{ opacity: 0.85 }}
                                        >
                                            Eliminar trabajo
                                        </Button>
                                    )}
                                </Box>
                            ) : (
                                <span />
                            )}
                            {canEditSelectedProceso ? (
                                <Group justify="flex-end" gap="sm">
                                    <Button variant="default" disabled={savingProceso || deletingJob} onClick={() => setDetailOpened(false)}>
                                        Cancelar
                                    </Button>
                                    <Button
                                        color="teal"
                                        loading={savingProceso}
                                        disabled={deletingJob}
                                        leftSection={!savingProceso ? <IconCheck size={16} /> : undefined}
                                        onClick={handleSaveProceso}
                                    >
                                        {savingProceso ? 'Guardando…' : 'Guardar proceso'}
                                    </Button>
                                </Group>
                            ) : (
                                <Button variant="default" onClick={() => setDetailOpened(false)}>
                                    Cerrar
                                </Button>
                            )}
                        </Group>

                    </Stack>
                )}
            </Modal>
        </Box>
        </DatesProvider>
    );
}