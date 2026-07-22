import { useEffect, useMemo, useState } from 'react';
import {
    Badge,
    Button,
    Group,
    Paper,
    ScrollArea,
    Select,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { IconFileSpreadsheet, IconPlayerPlay, IconRefresh, IconSearch } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import {
    elapsedSeconds,
    formatDuration,
    isProductionCode,
    summarizeByOp,
    summarizeSession,
    todayKey,
} from './productionExplorerStorage';
import { dailyProductionApi, normalizeActivity, normalizeSession } from './dailyProductionApi';
import { exportDailyReportByMachine, exportDailyReportByOperator } from './reporteDiarioExcelExport';
import './ReporteDiarioExplorer.css';

const STATUS_FILTERS = [
    { value: 'all', label: 'Todas' },
    { value: 'live', label: 'En vivo' },
    { value: 'paused', label: 'Pausadas' },
    { value: 'finished', label: 'Finalizadas' },
];

const statusLabel = {
    live: 'EN VIVO',
    paused: 'PAUSADA',
    finished: 'FINALIZADA',
};

const formatClock = (iso) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString('es-CO', { hour12: false });
};

const formatDayTitle = (date) => {
    if (!date) return '';
    const raw = new Date(date).toLocaleDateString('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
};

const sessionGroupKey = (machineName, operatorName) =>
    `${String(machineName || '').trim()}|${String(operatorName || '').trim()}`;

/** Convierte actividades cargadas en filas compatibles con exportación Excel local. */
function activitiesToExportRows(activities, sessions, dateKey) {
    const sessionById = new Map((sessions || []).map((s) => [s.id, s]));
    return (activities || [])
        .filter((a) => a.endAt || a.status === 'done' || a.status === 'finished')
        .map((a) => {
            const session = sessionById.get(a.sessionId);
            return {
                operatorName: a.operatorName || session?.operatorName || '',
                machineName: a.machineName || session?.machineName || '',
                date: a.date || session?.date || dateKey,
                order: a.productionOrderNumber || '',
                startTime: a.startAt,
                endTime: a.endAt,
                hours: (Number(a.durationSeconds) || 0) / 3600,
                activity: `${a.activityCode || ''} ${a.activityName || ''}`.trim(),
                tiros: a.tiros,
                observations: a.observations || '',
            };
        });
}

/** Agrupa actividades finalizadas en sesiones máquina + operario (modo manual). */
function buildFinishedSessions(apiSessions, finishedActivities) {
    const byId = new Map();

    (apiSessions || []).forEach((s) => {
        byId.set(s.id, {
            ...s,
            status: 'finished',
            activities: [...(s.activities || [])],
        });
    });

    (finishedActivities || []).forEach((a) => {
        const sid = a.sessionId;
        if (sid && byId.has(sid)) {
            const session = byId.get(sid);
            if (!session.activities.some((x) => x.id === a.id)) {
                session.activities.push(a);
            }
            if (!session.machineName) session.machineName = a.machineName;
            if (!session.operatorName) session.operatorName = a.operatorName;
            if (a.startAt && (!session.startedAt || a.startAt < session.startedAt)) {
                session.startedAt = a.startAt;
            }
            if (a.endAt && (!session.endedAt || a.endAt > session.endedAt)) {
                session.endedAt = a.endAt;
            }
            return;
        }

        const key = sid || `grp-${sessionGroupKey(a.machineName, a.operatorName)}`;
        if (!byId.has(key)) {
            byId.set(key, {
                id: key,
                machineId: a.machineId,
                machineName: a.machineName || 'Sin máquina',
                operatorId: a.operatorId,
                operatorName: a.operatorName || 'Sin operario',
                shiftCode: a.shiftCode || 'T1',
                status: 'finished',
                source: a.source || 'reporte-diario',
                startedAt: a.startAt,
                endedAt: a.endAt,
                activities: [],
            });
        }
        const session = byId.get(key);
        if (!session.activities.some((x) => x.id === a.id)) {
            session.activities.push({ ...a, sessionId: key });
        }
        if (a.startAt && (!session.startedAt || a.startAt < session.startedAt)) {
            session.startedAt = a.startAt;
        }
        if (a.endAt && (!session.endedAt || a.endAt > session.endedAt)) {
            session.endedAt = a.endAt;
        }
    });

    return [...byId.values()]
        .filter((s) => (s.activities?.length || 0) > 0)
        .map((s) => ({
            ...s,
            activities: [...s.activities].sort((a, b) =>
                String(b.startAt || '').localeCompare(String(a.startAt || ''))
            ),
        }))
        .sort((a, b) => String(a.machineName || '').localeCompare(String(b.machineName || '')));
}

const tableStyles = {
    th: {
        background: 'rgba(15, 23, 42, 0.95)',
        color: '#94a3b8',
        fontSize: 11,
        fontWeight: 700,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    td: {
        color: '#e2e8f0',
        borderColor: 'rgba(255, 255, 255, 0.06)',
        fontSize: 12,
    },
};

/**
 * Explorador por máquina + operario.
 * - historial: sesiones en vivo y finalizadas (polling).
 * - manual: solo actividades finalizadas agrupadas por máquina/operario.
 */
export default function ReporteDiarioExplorer({
    refreshKey = 0,
    mode = 'historial',
    externalDate,
    onDateChange,
    headerExtra = null,
    hideHeader = false,
    showExport = true,
}) {
    const isManual = mode === 'manual';
    const [internalDate, setInternalDate] = useState(() => new Date());
    const selectedDate = externalDate ?? internalDate;
    const setSelectedDate = onDateChange ?? setInternalDate;

    const [statusFilter, setStatusFilter] = useState(isManual ? 'finished' : 'all');
    const [search, setSearch] = useState('');
    const [machineFilter, setMachineFilter] = useState(null);
    const [operatorFilter, setOperatorFilter] = useState(null);
    const [activityFilter, setActivityFilter] = useState('all');
    const [opFilter, setOpFilter] = useState('all');
    const [selectedSessionId, setSelectedSessionId] = useState(null);
    const [tick, setTick] = useState(0);
    const [sessions, setSessions] = useState([]);
    const [dayActivities, setDayActivities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isManual) return undefined;
        const id = setInterval(() => setTick((t) => t + 1), 4000);
        return () => clearInterval(id);
    }, [isManual]);

    const dateKey = todayKey(selectedDate);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                if (isManual) {
                    const [rawSessions, rawActivities] = await Promise.all([
                        dailyProductionApi.listSessions({ date: selectedDate }),
                        dailyProductionApi.listActivities({ date: selectedDate, finishedOnly: true }),
                    ]);
                    if (cancelled) return;
                    const finished = (Array.isArray(rawActivities) ? rawActivities : [])
                        .map(normalizeActivity)
                        .filter(Boolean);
                    const apiSessions = (Array.isArray(rawSessions) ? rawSessions : [])
                        .map(normalizeSession)
                        .filter(Boolean);
                    const grouped = buildFinishedSessions(apiSessions, finished);
                    setSessions(grouped);
                    setDayActivities(finished);
                } else {
                    const [rawSessions, rawActivities] = await Promise.all([
                        dailyProductionApi.listSessions({ date: selectedDate }),
                        dailyProductionApi.listActivities({ date: selectedDate }),
                    ]);
                    if (cancelled) return;
                    setSessions((Array.isArray(rawSessions) ? rawSessions : []).map(normalizeSession).filter(Boolean));
                    setDayActivities((Array.isArray(rawActivities) ? rawActivities : []).map(normalizeActivity).filter(Boolean));
                }
                setError(null);
            } catch (err) {
                if (!cancelled) {
                    setError(err?.message || 'No se pudo cargar la información del servidor');
                    setSessions([]);
                    setDayActivities([]);
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [dateKey, tick, refreshKey, selectedDate, isManual]);

    const machineFilterOptions = useMemo(
        () => [...new Set(sessions.map((s) => s.machineName).filter(Boolean))].sort(),
        [sessions]
    );
    const operatorFilterOptions = useMemo(
        () => [...new Set(sessions.map((s) => s.operatorName).filter(Boolean))].sort(),
        [sessions]
    );

    const filteredSessions = useMemo(() => {
        const q = search.trim().toLowerCase();
        return sessions.filter((s) => {
            if (!isManual && statusFilter !== 'all' && s.status !== statusFilter) return false;
            if (machineFilter && s.machineName !== machineFilter) return false;
            if (operatorFilter && s.operatorName !== operatorFilter) return false;
            if (!q) return true;
            const acts = s.activities?.length
                ? s.activities
                : dayActivities.filter((a) => a.sessionId === s.id);
            return (
                String(s.machineName || '').toLowerCase().includes(q) ||
                String(s.operatorName || '').toLowerCase().includes(q) ||
                String(s.currentOp || '').toLowerCase().includes(q) ||
                String(s.currentActivityName || '').toLowerCase().includes(q) ||
                acts.some((a) => String(a.productionOrderNumber || '').toLowerCase().includes(q))
            );
        });
    }, [sessions, statusFilter, machineFilter, operatorFilter, search, isManual, dayActivities]);

    const effectiveSessionId = useMemo(() => {
        if (filteredSessions.some((s) => s.id === selectedSessionId)) return selectedSessionId;
        return filteredSessions[0]?.id || null;
    }, [filteredSessions, selectedSessionId]);

    const selectedSession = filteredSessions.find((s) => s.id === effectiveSessionId) || null;
    const sessionActivities = useMemo(() => {
        if (!selectedSession) return [];
        const fromSession = selectedSession.activities || [];
        if (fromSession.length) return fromSession;
        return dayActivities
            .filter((a) => a.sessionId === selectedSession.id)
            .sort((a, b) => String(b.startAt || '').localeCompare(String(a.startAt || '')));
    }, [selectedSession, dayActivities]);

    const activityOptions = useMemo(() => {
        const codes = [...new Set(sessionActivities.map((a) => a.activityCode).filter(Boolean))].sort();
        return [{ value: 'all', label: 'Todas las actividades' }, ...codes.map((c) => ({ value: c, label: c }))];
    }, [sessionActivities]);

    const opOptions = useMemo(() => {
        const ops = [...new Set(sessionActivities.map((a) => a.productionOrderNumber).filter(Boolean))].sort();
        return [{ value: 'all', label: 'Todas las OP' }, ...ops.map((o) => ({ value: o, label: `OP ${o}` }))];
    }, [sessionActivities]);

    const filteredActivities = useMemo(() => {
        return sessionActivities.filter((a) => {
            if (activityFilter !== 'all' && a.activityCode !== activityFilter) return false;
            if (opFilter !== 'all' && a.productionOrderNumber !== opFilter) return false;
            return true;
        });
    }, [sessionActivities, activityFilter, opFilter]);

    const summary = selectedSession
        ? summarizeSession(selectedSession, filteredActivities.length ? filteredActivities : sessionActivities)
        : null;
    const byOp = summarizeByOp(filteredActivities.length ? filteredActivities : sessionActivities);

    const counts = useMemo(() => ({
        all: sessions.length,
        live: sessions.filter((s) => s.status === 'live').length,
        paused: sessions.filter((s) => s.status === 'paused').length,
        finished: sessions.filter((s) => s.status === 'finished').length,
    }), [sessions]);

    const totalFinished = dayActivities.length;

    const handleExport = async (groupBy) => {
        setExporting(true);
        const dateLabel = dateKey;
        const isMachineSheets = groupBy === 'machine-sheets';
        try {
            await dailyProductionApi.exportExcel({ date: selectedDate, groupBy });
            notifications.show({
                title: 'Exportado',
                message: groupBy === 'operator'
                    ? 'Excel por operario descargado (planta + manual).'
                    : isMachineSheets
                        ? 'Excel descargado: una hoja por cada máquina con actividad.'
                        : 'Excel por máquina descargado (planta + manual).',
                color: 'teal',
            });
        } catch (err) {
            if (isMachineSheets) {
                notifications.show({
                    title: 'Exportación no disponible',
                    message: err?.message || 'La exportación por hojas requiere conexión al servidor.',
                    color: 'red',
                });
            } else {
                const rows = activitiesToExportRows(dayActivities, sessions, dateKey);
                if (rows.length > 0) {
                    if (groupBy === 'operator') {
                        exportDailyReportByOperator(rows, { dateLabel });
                    } else {
                        exportDailyReportByMachine(rows, { dateLabel });
                    }
                    notifications.show({
                        title: 'Exportado localmente',
                        message: 'El servidor no respondió; se generó Excel con los datos visibles en pantalla.',
                        color: 'yellow',
                    });
                } else {
                    notifications.show({
                        title: 'Sin datos',
                        message: err?.message || 'No hay actividades para exportar en esta fecha.',
                        color: 'red',
                    });
                }
            }
        } finally {
            setExporting(false);
        }
    };

    return (
        <div className="rd-explorer">
            {!hideHeader && (
                <Group justify="space-between" align="flex-end" mb="md" wrap="wrap">
                    <div>
                        <Title order={4} c="white">
                            {isManual ? 'Procesos finalizados' : 'Historial del día'}
                        </Title>
                        <Text size="sm" className="rd-explorer-subtitle">
                            {formatDayTitle(selectedDate)}
                            {isManual && totalFinished > 0
                                ? ` · ${filteredSessions.length} sesión(es) · ${totalFinished} actividad(es)`
                                : ''}
                        </Text>
                        {error && <Text size="xs" c="red">{error}</Text>}
                    </div>
                    <Group gap="sm">
                        {!isManual && (
                            <DateInput
                                value={selectedDate}
                                onChange={(v) => setSelectedDate(v || new Date())}
                                valueFormat="DD/MM/YYYY"
                            />
                        )}
                        <Button
                            variant="light"
                            leftSection={<IconRefresh size={16} />}
                            loading={loading}
                            onClick={() => setTick((t) => t + 1)}
                        >
                            Actualizar
                        </Button>
                        {showExport && (
                            <>
                                <Button
                                    variant="light"
                                    color="teal"
                                    leftSection={<IconFileSpreadsheet size={16} />}
                                    loading={exporting}
                                    onClick={() => handleExport('operator')}
                                >
                                    Excel por operario
                                </Button>
                                <Button
                                    variant="light"
                                    color="indigo"
                                    leftSection={<IconFileSpreadsheet size={16} />}
                                    loading={exporting}
                                    onClick={() => handleExport('machine')}
                                >
                                    Excel por máquina
                                </Button>
                                <Button
                                    variant="light"
                                    color="violet"
                                    leftSection={<IconFileSpreadsheet size={16} />}
                                    loading={exporting}
                                    onClick={() => handleExport('machine-sheets')}
                                >
                                    Excel hojas por máquina
                                </Button>
                            </>
                        )}
                        {headerExtra}
                    </Group>
                </Group>
            )}

            {!isManual && (
                <Group gap="xs" mb="sm" wrap="wrap">
                    {STATUS_FILTERS.map((f) => (
                        <Button
                            key={f.value}
                            size="xs"
                            variant={statusFilter === f.value ? 'filled' : 'light'}
                            onClick={() => setStatusFilter(f.value)}
                        >
                            {f.label} ({counts[f.value] ?? 0})
                        </Button>
                    ))}
                </Group>
            )}

            <Group grow mb="md" align="flex-end">
                <TextInput
                    leftSection={<IconSearch size={14} />}
                    placeholder="Buscar máquina, operario, OP..."
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                />
                <Select
                    placeholder="Máquina"
                    clearable
                    data={machineFilterOptions}
                    value={machineFilter}
                    onChange={setMachineFilter}
                />
                <Select
                    placeholder="Operario"
                    clearable
                    data={operatorFilterOptions}
                    value={operatorFilter}
                    onChange={setOperatorFilter}
                />
            </Group>

            <div className="rd-explorer-grid">
                <ScrollArea.Autosize mah={520} type="auto" offsetScrollbars className="rd-explorer-list">
                    <Stack gap="sm">
                        <Text size="xs" fw={700} c="white" mb={4}>
                            {isManual ? 'Por máquina y operario' : 'Máquinas en operación'}
                        </Text>
                        {filteredSessions.map((s) => {
                            const acts = s.activities?.length
                                ? s.activities
                                : dayActivities.filter((a) => a.sessionId === s.id);
                            const sum = summarizeSession(s, acts);
                            const active = s.id === effectiveSessionId;
                            const lastAct = acts[0];
                            return (
                                <Paper
                                    key={s.id}
                                    className={`rd-session-card ${active ? 'active' : ''} status-${s.status}`}
                                    p="sm"
                                    withBorder
                                    onClick={() => setSelectedSessionId(s.id)}
                                >
                                    <Group justify="space-between" mb={4}>
                                        <Text fw={700} c="white" size="sm">{s.machineName}</Text>
                                        <Badge
                                            size="sm"
                                            color={s.status === 'live' ? 'green' : s.status === 'paused' ? 'yellow' : 'gray'}
                                        >
                                            {statusLabel[s.status] || s.status}
                                        </Badge>
                                    </Group>
                                    <Text size="xs" className="rd-session-card__meta">{s.operatorName}</Text>
                                    <Text size="xs" className="rd-session-card__meta">
                                        {s.status === 'live' && s.currentActivityCode
                                            ? `Ahora: ${s.currentActivityCode} ${s.currentActivityName || ''} · OP ${s.currentOp || '—'}`
                                            : lastAct
                                                ? `${lastAct.activityCode} ${lastAct.activityName || ''}${lastAct.productionOrderNumber ? ` · OP ${lastAct.productionOrderNumber}` : ''}`
                                                : `Turno ${s.shiftCode} · ${formatClock(s.startedAt)}`}
                                    </Text>
                                    <Group gap="md" mt={6}>
                                        <Text size="xs" className="rd-session-card__stats">{sum.tiros.toLocaleString()} Tiros</Text>
                                        <Text size="xs" className="rd-session-card__stats">{sum.desperdicio.toLocaleString()} Desp</Text>
                                        <Text size="xs" className="rd-session-card__stats">{sum.opsCount} OPs</Text>
                                    </Group>
                                </Paper>
                            );
                        })}
                        {filteredSessions.length === 0 && (
                            <div className="rd-explorer-empty">
                                {loading
                                    ? 'Cargando…'
                                    : isManual
                                        ? 'No hay actividades finalizadas para esta fecha. Use "Nuevo registro" para capturar un reporte.'
                                        : 'No hay sesiones para esta fecha/filtro.'}
                            </div>
                        )}
                    </Stack>
                </ScrollArea.Autosize>

                <Paper className="rd-explorer-detail" p="md" withBorder>
                    {!selectedSession ? (
                        <div className="rd-explorer-empty">
                            Seleccione una máquina/operario para ver el detalle.
                        </div>
                    ) : (
                        <Stack gap="md">
                            <Group justify="space-between" align="flex-start">
                                <div>
                                    <Title order={5} c="white">{selectedSession.machineName}</Title>
                                    <Text size="sm" className="rd-detail-subtitle">
                                        {selectedSession.operatorName} · Turno {selectedSession.shiftCode}
                                    </Text>
                                    <Text size="xs" className="rd-detail-origin">
                                        Origen: {selectedSession.source === 'planta' ? 'planta' : selectedSession.source === 'reporte-diario' ? 'manual' : (selectedSession.source || '—')}
                                    </Text>
                                </div>
                                <Badge
                                    size="lg"
                                    leftSection={selectedSession.status === 'live' ? <IconPlayerPlay size={12} /> : null}
                                    color={selectedSession.status === 'live' ? 'green' : selectedSession.status === 'paused' ? 'yellow' : 'gray'}
                                >
                                    {selectedSession.status === 'live'
                                        ? 'OPERANDO AHORA'
                                        : (statusLabel[selectedSession.status] || selectedSession.status)}
                                </Badge>
                            </Group>

                            {summary && (
                                <Group grow>
                                    <Paper p="sm" withBorder className="rd-kpi">
                                        <Text className="rd-kpi__label">{isManual ? 'Tiempo en máquina' : 'Duración'}</Text>
                                        <Text className="rd-kpi__value">{formatDuration(summary.machineSeconds)}</Text>
                                    </Paper>
                                    <Paper p="sm" withBorder className="rd-kpi">
                                        <Text className="rd-kpi__label">Tiros totales</Text>
                                        <Text className="rd-kpi__value">{summary.tiros.toLocaleString()}</Text>
                                    </Paper>
                                    <Paper p="sm" withBorder className="rd-kpi">
                                        <Text className="rd-kpi__label">Desperdicio</Text>
                                        <Text className="rd-kpi__value">{summary.desperdicio.toLocaleString()}</Text>
                                    </Paper>
                                    <Paper p="sm" withBorder className="rd-kpi">
                                        <Text className="rd-kpi__label">OPs trabajadas</Text>
                                        <Text className="rd-kpi__value">{summary.opsCount}</Text>
                                    </Paper>
                                </Group>
                            )}

                            <Group grow>
                                <Select
                                    label="Actividad"
                                    data={activityOptions}
                                    value={activityFilter}
                                    onChange={(v) => setActivityFilter(v || 'all')}
                                />
                                <Select
                                    label="OP"
                                    data={opOptions}
                                    value={opFilter}
                                    onChange={(v) => setOpFilter(v || 'all')}
                                />
                            </Group>

                            <div>
                                <Text size="sm" fw={700} mb={6} className="rd-section-title">Actividades</Text>
                                <ScrollArea.Autosize mah={280} type="auto" className="rd-explorer-table-wrap">
                                    <Table striped highlightOnHover styles={tableStyles}>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Actividad</Table.Th>
                                                <Table.Th>OP</Table.Th>
                                                <Table.Th>Inicio</Table.Th>
                                                <Table.Th>Fin</Table.Th>
                                                <Table.Th>Duración</Table.Th>
                                                <Table.Th>Tiros</Table.Th>
                                                <Table.Th>Desp</Table.Th>
                                                {isManual && <Table.Th>Origen</Table.Th>}
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {filteredActivities.map((a) => {
                                                const dur = a.durationSeconds != null
                                                    ? a.durationSeconds
                                                    : a.status === 'running'
                                                        ? elapsedSeconds(a.startAt)
                                                        : null;
                                                return (
                                                    <Table.Tr key={a.id}>
                                                        <Table.Td>
                                                            {a.activityCode} {a.activityName}
                                                            {a.subcode ? ` · ${a.subcode}` : ''}
                                                        </Table.Td>
                                                        <Table.Td>{a.productionOrderNumber || '—'}</Table.Td>
                                                        <Table.Td>{formatClock(a.startAt)}</Table.Td>
                                                        <Table.Td>{a.endAt ? formatClock(a.endAt) : '—'}</Table.Td>
                                                        <Table.Td>{formatDuration(dur)}</Table.Td>
                                                        <Table.Td>
                                                            {isProductionCode(a.activityCode)
                                                                ? Number(a.tiros || 0).toLocaleString()
                                                                : '—'}
                                                        </Table.Td>
                                                        <Table.Td>
                                                            {isProductionCode(a.activityCode)
                                                                ? Number(a.desperdicio || 0).toLocaleString()
                                                                : '—'}
                                                        </Table.Td>
                                                        {isManual && (
                                                            <Table.Td>
                                                                <Badge size="sm" variant="light" color={a.source === 'planta' ? 'teal' : 'indigo'}>
                                                                    {a.source === 'planta' ? 'PLANTA' : 'MANUAL'}
                                                                </Badge>
                                                            </Table.Td>
                                                        )}
                                                    </Table.Tr>
                                                );
                                            })}
                                            {filteredActivities.length === 0 && (
                                                <Table.Tr>
                                                    <Table.Td colSpan={isManual ? 8 : 7}>
                                                        <Text c="dimmed" ta="center">Sin actividades</Text>
                                                    </Table.Td>
                                                </Table.Tr>
                                            )}
                                        </Table.Tbody>
                                    </Table>
                                </ScrollArea.Autosize>
                            </div>

                            {byOp.length > 0 && (
                                <div>
                                    <Text size="sm" fw={700} mb={6} className="rd-section-title">Resumen por OP</Text>
                                    <ScrollArea.Autosize mah={160} type="auto" className="rd-explorer-table-wrap">
                                        <Table styles={tableStyles}>
                                            <Table.Thead>
                                                <Table.Tr>
                                                    <Table.Th>OP</Table.Th>
                                                    <Table.Th>Registros</Table.Th>
                                                    <Table.Th>Tiros</Table.Th>
                                                    <Table.Th>Desperdicio</Table.Th>
                                                </Table.Tr>
                                            </Table.Thead>
                                            <Table.Tbody>
                                                {byOp.map((row) => (
                                                    <Table.Tr key={row.op}>
                                                        <Table.Td>OP {row.op}</Table.Td>
                                                        <Table.Td>{row.registros}</Table.Td>
                                                        <Table.Td>{row.tiros.toLocaleString()}</Table.Td>
                                                        <Table.Td>{row.desperdicio.toLocaleString()}</Table.Td>
                                                    </Table.Tr>
                                                ))}
                                            </Table.Tbody>
                                        </Table>
                                    </ScrollArea.Autosize>
                                </div>
                            )}
                        </Stack>
                    )}
                </Paper>
            </div>
        </div>
    );
}
