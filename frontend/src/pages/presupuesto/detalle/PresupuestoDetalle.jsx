import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    Badge,
    Box,
    Button,
    Card,
    Group,
    SimpleGrid,
    Stack,
    Tabs,
    Text,
    Title
} from '@mantine/core';
import {
    IconAlertTriangle,
    IconArrowLeft,
    IconCheck,
    IconLock,
    IconRefresh,
    IconReportMoney
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../../utils/api';
import '../general/Presupuestos.css';
import { money } from './elliotFormat';
import { normalizeLayout } from './budgetLayout';
import CostosFijosPanel from './CostosFijosPanel';
import CostosVariablesPanel from './CostosVariablesPanel';
import ResumenPresupuestoPanel from './ResumenPresupuestoPanel';
import MapaCostosPanel from './MapaCostosPanel';

/** Debounce al teclear; agregar/borrar guarda al instante. */
const AUTOSAVE_MS = 350;

function toDraft(wb) {
    return {
        incomes: (wb.incomes || []).map((x) => ({ ...x })),
        people: (wb.people || []).map((x) => ({ ...x })),
        fixedItems: (wb.fixedItems || []).map((x) => ({ ...x })),
        commissions: (wb.commissions || []).map((x) => ({ ...x })),
        costCenters: (wb.costCenters || []).map((x) => ({ ...x })),
        mapParams: { ...(wb.mapParams || {}) },
        layout: normalizeLayout(wb.layout)
    };
}

function toPayload(d) {
    return {
        incomes: d.incomes || [],
        people: d.people || [],
        fixedItems: d.fixedItems || [],
        commissions: d.commissions || [],
        costCenters: d.costCenters || [],
        mapParams: d.mapParams || {},
        layout: normalizeLayout(d.layout)
    };
}

export default function PresupuestoDetalle() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [workbook, setWorkbook] = useState(null);
    const [draft, setDraft] = useState(null);
    const [error, setError] = useState('');
    const [alert, setAlert] = useState('');
    const [loading, setLoading] = useState(true);
    const [saveStatus, setSaveStatus] = useState('idle');
    const skipAutosave = useRef(true);
    const dirty = useRef(false);
    const saveSeq = useRef(0);
    const draftRef = useRef(null);
    const timerRef = useRef(null);
    const canEditRef = useRef(false);

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const wb = await api.get(`/budgets/${id}/elliot`);
            skipAutosave.current = true;
            dirty.current = false;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            setWorkbook(wb);
            const d = toDraft(wb);
            setDraft(d);
            draftRef.current = d;
            setSaveStatus('idle');
        } catch (e) {
            setError(e.message || 'No se pudo cargar el presupuesto.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [id]);

    const canEdit = workbook?.canEdit;
    canEditRef.current = !!canEdit;

    const persist = useCallback(async () => {
        const d = draftRef.current;
        if (!d || !canEditRef.current) return;
        const seq = ++saveSeq.current;
        setSaveStatus('saving');
        try {
            const wb = await api.put(`/budgets/${id}/elliot`, toPayload(d));
            if (seq !== saveSeq.current) return;
            dirty.current = false;
            setWorkbook(wb);
            setSaveStatus('saved');
        } catch (e) {
            if (seq !== saveSeq.current) return;
            setSaveStatus('error');
            setAlert(e.message || 'No se pudo guardar automáticamente.');
        }
    }, [id]);

    const scheduleSave = useCallback((immediate = false) => {
        if (!canEditRef.current) return;
        dirty.current = true;
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (immediate) {
            setSaveStatus('saving');
            persist();
            return;
        }
        setSaveStatus('saving');
        timerRef.current = setTimeout(() => {
            timerRef.current = null;
            persist();
        }, AUTOSAVE_MS);
    }, [persist]);

    /** updater: function | value. options.immediate = true para alta/baja. */
    const updateDraft = useCallback((updater, options = {}) => {
        const prev = draftRef.current;
        if (!prev) return;
        const next = typeof updater === 'function' ? updater(prev) : updater;
        draftRef.current = next;
        setDraft(next);
        if (skipAutosave.current) return;
        scheduleSave(!!options.immediate);
    }, [scheduleSave]);

    useEffect(() => {
        if (!draft) return;
        if (skipAutosave.current) {
            skipAutosave.current = false;
        }
    }, [draft]);

    useEffect(() => {
        const flush = () => {
            if (!dirty.current || !canEditRef.current) return;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            persist();
        };
        const onVis = () => {
            if (document.visibilityState === 'hidden') flush();
        };
        window.addEventListener('beforeunload', flush);
        document.addEventListener('visibilitychange', onVis);
        return () => {
            window.removeEventListener('beforeunload', flush);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [persist]);

    const runAction = async (fn, okMessage) => {
        try {
            if (dirty.current) await persist();
            await fn();
            await load();
            setAlert(okMessage);
        } catch (e) {
            setAlert(e.message || 'Operación fallida.');
        }
    };

    if (loading) {
        return <Box className="presupuestos-page"><Text c="dimmed">Cargando presupuesto...</Text></Box>;
    }

    if (error || !workbook || !draft) {
        return (
            <Box className="presupuestos-page">
                <Alert color="red" icon={<IconAlertTriangle size={16} />}>{error || 'Presupuesto no encontrado'}</Alert>
                <Button mt="md" variant="default" onClick={() => navigate('/presupuestos')}>Volver</Button>
            </Box>
        );
    }

    const summary = workbook.summary;
    const saveHint =
        !canEdit ? 'Solo lectura'
            : saveStatus === 'saving' ? 'Guardando…'
                : saveStatus === 'saved' ? 'Guardado automáticamente'
                    : saveStatus === 'error' ? 'Error al guardar'
                        : 'Los cambios se guardan solos';

    return (
        <Box className="presupuestos-page fade-in">
            <Stack gap="lg">
                <Group justify="space-between" align="start">
                    <Box>
                        <Button
                            variant="subtle"
                            leftSection={<IconArrowLeft size={16} />}
                            mb="sm"
                            onClick={() => navigate('/presupuestos')}
                        >
                            Volver al listado
                        </Button>
                        <Title order={1} className="presupuestos-title">
                            {workbook.code} · {workbook.company}
                        </Title>
                        <Text className="presupuestos-subtitle">
                            Vigencia {workbook.fiscalYear} · Se guarda solo al editar
                        </Text>
                    </Box>
                    <Group>
                        <Badge
                            size="lg"
                            color={
                                saveStatus === 'error' ? 'red'
                                    : saveStatus === 'saving' ? 'yellow'
                                        : saveStatus === 'saved' ? 'teal'
                                            : 'gray'
                            }
                            variant="light"
                        >
                            {saveHint}
                        </Badge>
                        <Badge size="lg" color={workbook.status === 'Aprobado' ? 'green' : 'yellow'}>
                            {workbook.status}
                        </Badge>
                        {canEdit && (
                            <Button
                                color="green"
                                leftSection={<IconCheck size={16} />}
                                onClick={() => runAction(() => api.post(`/budgets/${id}/approve`, {}), 'Presupuesto aprobado.')}
                            >
                                Aprobar
                            </Button>
                        )}
                        {workbook.status === 'Aprobado' && (
                            <Button
                                color="gray"
                                leftSection={<IconLock size={16} />}
                                onClick={() => runAction(() => api.post(`/budgets/${id}/close`), 'Presupuesto cerrado.')}
                            >
                                Cerrar
                            </Button>
                        )}
                        {(workbook.status === 'Cerrado' || workbook.status === 'Aprobado') && (
                            <Button
                                variant="light"
                                leftSection={<IconRefresh size={16} />}
                                onClick={() => runAction(() => api.post(`/budgets/${id}/reopen`), 'Presupuesto reabierto.')}
                            >
                                Reabrir
                            </Button>
                        )}
                    </Group>
                </Group>

                {alert && (
                    <Alert color="indigo" variant="light" onClose={() => setAlert('')} withCloseButton>
                        {alert}
                    </Alert>
                )}

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                    <Card className="presupuestos-kpi" padding="lg">
                        <Text className="presupuestos-kpi-label">Ingresos</Text>
                        <Title order={4}>{money(summary?.totalIncome)}</Title>
                    </Card>
                    <Card className="presupuestos-kpi" padding="lg">
                        <Text className="presupuestos-kpi-label">Costo producción</Text>
                        <Title order={4}>{money(summary?.productionCost)}</Title>
                    </Card>
                    <Card className="presupuestos-kpi" padding="lg">
                        <Text className="presupuestos-kpi-label">Gastos</Text>
                        <Title order={4}>{money(summary?.totalOperatingExpenses)}</Title>
                    </Card>
                    <Card className="presupuestos-kpi" padding="lg">
                        <Text className="presupuestos-kpi-label">Utilidad</Text>
                        <Title order={4}>{money(summary?.utility)}</Title>
                    </Card>
                </SimpleGrid>

                <Tabs defaultValue="fijos" variant="pills">
                    <Tabs.List className="presupuestos-tabs-list">
                        <Tabs.Tab value="fijos">Costos fijos</Tabs.Tab>
                        <Tabs.Tab value="variables">Costos variables</Tabs.Tab>
                        <Tabs.Tab value="resumen" leftSection={<IconReportMoney size={14} />}>Resumen</Tabs.Tab>
                        <Tabs.Tab value="mapa">Mapa de costos</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="fijos" pt="md">
                        <Card className="presupuestos-card" padding="lg">
                            <CostosFijosPanel
                                workbook={workbook}
                                draft={draft}
                                setDraft={updateDraft}
                                canEdit={canEdit}
                            />
                        </Card>
                    </Tabs.Panel>

                    <Tabs.Panel value="variables" pt="md">
                        <Card className="presupuestos-card" padding="lg">
                            <CostosVariablesPanel
                                draft={draft}
                                setDraft={updateDraft}
                                canEdit={canEdit}
                            />
                        </Card>
                    </Tabs.Panel>

                    <Tabs.Panel value="resumen" pt="md">
                        <ResumenPresupuestoPanel summary={summary} />
                    </Tabs.Panel>

                    <Tabs.Panel value="mapa" pt="md">
                        <Card className="presupuestos-card" padding="lg">
                            <MapaCostosPanel
                                draft={draft}
                                setDraft={updateDraft}
                                summary={summary}
                                canEdit={canEdit}
                            />
                        </Card>
                    </Tabs.Panel>
                </Tabs>
            </Stack>
        </Box>
    );
}
