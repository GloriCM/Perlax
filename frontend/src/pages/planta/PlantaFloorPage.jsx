import { useCallback, useEffect, useMemo, useState } from 'react';
import { IconCheck, IconPlayerPause, IconPlayerPlay, IconPlayerStop } from '@tabler/icons-react';
import { api } from '../../utils/api';
import {
    elapsedSeconds,
    formatDuration,
    isProductionCode,
} from '../reportes/productionExplorerStorage';
import {
    dailyProductionApi,
    mapCatalogMachines,
    mapCatalogOperators,
    mapCatalogProcessCodes,
    normalizeActivity,
    normalizeSession,
} from '../reportes/dailyProductionApi';
import './PlantaFloorPage.css';

const WASTE_CODES = [
    { code: '01', name: 'Desperdicio por errores operativos (fallos humanos o de configuración de la máquina)' },
    { code: '02', name: 'Desperdicio durante la configuración o pruebas iniciales de la máquina' },
    { code: '03', name: 'Desperdicios por cortes inexactos o mal aprovechamiento del material' },
    { code: '04', name: 'Desperdicios por material en malas condiciones (por almacenamiento o recepción inadecuada)' },
    { code: '05', name: 'Desperdicios por errores en la planificación de la producción (sobrestock o trabajo incorrecto)' },
    { code: '06', name: 'Desperdicios por órdenes de producción con especificaciones incorrectas' },
    { code: '07', name: 'Desperdicios por mala manipulación de materiales o productos en proceso (daños, caídas, dobleces)' },
    { code: '08', name: 'Desperdicios por errores en el diseño o arte' },
    { code: '09', name: 'Desperdicios por pruebas y/o revisiones de impresión o troquelado' },
    { code: '10', name: 'Desperdicios por troquel y/o plancha en malas condiciones' },
    { code: '11', name: 'Desperdicios por despiece' },
    { code: '12', name: 'Desperdicios por fallos o falta de mantenimiento en las máquinas' },
    { code: '13', name: 'Desperdicios por condiciones ambientales inadecuadas (temperatura, polvo, humedad)' },
    { code: '14', name: 'Desperdicios por insumos defectuosos o en mal estado' },
    { code: '15', name: 'Otros desperdicios' },
];

function isPlantaFeatureEnabled() {
    const flag = String(import.meta.env.VITE_PLANTA_ENABLED ?? '').trim().toLowerCase();
    if (flag === 'true') return true;
    if (flag === 'false') return false;
    return Boolean(import.meta.env.DEV);
}

const DEFAULT_OP = '460';

const SIDEBAR_WIDTH_KEY = 'planta-floor-sidebar-width';
const SIDEBAR_MIN_WIDTH = 200;
const SIDEBAR_MAX_WIDTH = 380;
const SIDEBAR_DEFAULT_WIDTH = 280;

function readSidebarWidth() {
    try {
        const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
        const parsed = saved ? Number.parseInt(saved, 10) : SIDEBAR_DEFAULT_WIDTH;
        if (!Number.isFinite(parsed)) return SIDEBAR_DEFAULT_WIDTH;
        return Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, parsed));
    } catch {
        return SIDEBAR_DEFAULT_WIDTH;
    }
}

function requiresOpEntry(code) {
    return code === '01' || code === '02';
}

/** OP obligatoria solo en 01 y 02; el resto usa DEFAULT_OP automáticamente. */
function resolveOpNumber(code, opNumber) {
    if (requiresOpEntry(code)) return opNumber.trim();
    return DEFAULT_OP;
}

function subcodeNeedsObservations(sub) {
    if (!sub) return false;
    if (sub.requiresObservation === true) return true;
    return /otro/i.test(String(sub.name || sub.subcodeDetail || ''));
}

function activityNeedsObservations(activity, codes) {
    if (!activity) return false;
    if (activity.subRequiresObservation) return true;
    if (subcodeNeedsObservations({ name: activity.subcodeDetail })) return true;
    const code = (codes || []).find((c) => c.code === activity.activityCode);
    const sub = (code?.subcodes || []).find((s) => s.code === activity.subcode);
    return subcodeNeedsObservations(sub);
}

function formatClock(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });
}

function formatDateShort(iso) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CO');
}

export default function PlantaFloorPage() {
    const featureOn = isPlantaFeatureEnabled();
    const [access, setAccess] = useState(featureOn ? 'loading' : 'disabled');
    const [accessMessage, setAccessMessage] = useState('');
    const [machines, setMachines] = useState([]);
    const [operators, setOperators] = useState([]);
    const [processCodes, setProcessCodes] = useState([]);
    const [shifts, setShifts] = useState([{ code: 'T1', name: 'Turno 1 (06:00-14:00)' }, { code: 'T2', name: 'Turno 2 (14:00-22:00)' }, { code: 'T3', name: 'Turno 3 (22:00-06:00)' }]);
    const [wasteReasons, setWasteReasons] = useState([]);
    const [history, setHistory] = useState([]);

    const [machineId, setMachineId] = useState('');
    const [shiftCode, setShiftCode] = useState('T1');
    const [operatorId, setOperatorId] = useState('');
    const [opNumber, setOpNumber] = useState('');
    const [sessionId, setSessionId] = useState(null);
    const [sessionConcurrencyStamp, setSessionConcurrencyStamp] = useState(null);

    const [selectedCode, setSelectedCode] = useState(null);
    const [pendingActivity, setPendingActivity] = useState(null);
    const [subcodeModal, setSubcodeModal] = useState(null);
    const [historyModal, setHistoryModal] = useState(false);
    const [wasteModal, setWasteModal] = useState(false);
    const [running, setRunning] = useState(null);
    const [paused, setPaused] = useState(false);
    const [tick, setTick] = useState(0);
    const [tirosDraft, setTirosDraft] = useState('0');
    const [tirosTotal, setTirosTotal] = useState(0);
    const [wasteTotal, setWasteTotal] = useState(0);
    const [wasteEntries, setWasteEntries] = useState([]);
    const [stopping, setStopping] = useState(false);
    const [wasteCode, setWasteCode] = useState('');
    const [wasteQty, setWasteQty] = useState('');
    const [observations, setObservations] = useState('');
    const [warn, setWarn] = useState('');
    const [historyTick, setHistoryTick] = useState(0);
    const [sidebarWidth, setSidebarWidth] = useState(readSidebarWidth);

    useEffect(() => {
        try {
            localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth));
        } catch {
            /* almacenamiento no disponible */
        }
    }, [sidebarWidth]);

    const onSidebarResizeStart = useCallback((event) => {
        event.preventDefault();
        const startX = event.clientX;
        const startWidth = sidebarWidth;

        const onMove = (moveEvent) => {
            const delta = moveEvent.clientX - startX;
            const next = Math.min(
                SIDEBAR_MAX_WIDTH,
                Math.max(SIDEBAR_MIN_WIDTH, startWidth + delta),
            );
            setSidebarWidth(next);
        };

        const onUp = () => {
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };

        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';
        document.addEventListener('pointermove', onMove);
        document.addEventListener('pointerup', onUp);
    }, [sidebarWidth]);

    const onSidebarResizeReset = useCallback(() => {
        setSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
    }, []);

    useEffect(() => {
        if (!featureOn) return undefined;
        let cancelled = false;
        (async () => {
            try {
                await api.get('/planta/access', { skipAuthRedirect: true });
                if (!cancelled) setAccess('ok');
                try {
                    const catalogs = await dailyProductionApi.plantaCatalogs();
                    if (cancelled) return;
                    setMachines(mapCatalogMachines(catalogs));
                    const seenOperatorIds = new Set();
                    setOperators(
                        mapCatalogOperators(catalogs)
                            .filter((o) => o.id && o.userId && o.isActive !== false)
                            .filter((o) => {
                                if (seenOperatorIds.has(o.id)) return false;
                                seenOperatorIds.add(o.id);
                                return true;
                            })
                            .map((o) => ({ id: o.id, name: o.displayName, code: o.code, userId: o.userId }))
                            .sort((a, b) => a.name.localeCompare(b.name, 'es')),
                    );
                    setProcessCodes(mapCatalogProcessCodes(catalogs));
                    setShifts((catalogs.shifts || []).map((s) => ({ code: s.code, name: s.name })));
                    setWasteReasons(catalogs.wasteReasons || []);
                } catch {
                    /* catálogos opcionales tras access */
                }
            } catch (err) {
                if (cancelled) return;
                const msg = String(err?.message || '');
                if (import.meta.env.DEV && /Failed to fetch|NetworkError|fetch/i.test(msg)) {
                    setAccess('ok');
                    setWarn('API planta no disponible: modo local (solo desarrollo).');
                    return;
                }
                setAccess('denied');
                setAccessMessage(msg || 'Acceso solo desde la red interna de la empresa.');
            }
        })();
        return () => { cancelled = true; };
    }, [featureOn]);

    useEffect(() => {
        if (!running || paused) return undefined;
        const id = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(id);
    }, [running, paused]);

    const machine = machines.find((m) => String(m.id) === String(machineId));
    const operator = operators.find((o) => String(o.id) === String(operatorId));
    const baseReady = Boolean(machine && operator);

    const enrichActivity = (act) => {
        const normalized = normalizeActivity(act);
        if (!normalized) return null;
        const code = processCodes.find((c) => c.code === normalized.activityCode);
        const sub = (code?.subcodes || []).find((s) => s.code === normalized.subcode);
        return {
            ...normalized,
            subRequiresObservation: sub?.requiresObservation === true,
        };
    };

    useEffect(() => {
        if (!sessionId) {
            setHistory([]);
            return undefined;
        }
        let cancelled = false;
        (async () => {
            try {
                const sessions = await dailyProductionApi.plantaSessions(new Date());
                const session = (Array.isArray(sessions) ? sessions : []).map(normalizeSession).find((s) => s.id === sessionId);
                if (cancelled || !session) return;
                const done = (session.activities || []).filter((a) => a.status === 'done').map(normalizeActivity);
                setHistory(done);
                setSessionConcurrencyStamp(session.concurrencyStamp ?? null);
                const runningAct = (session.activities || []).find((a) => a.status === 'running');
                if (runningAct) {
                    if (!running || running.id !== runningAct.id) {
                        setRunning(enrichActivity(runningAct));
                    }
                    setPaused(session.status === 'paused');
                } else if (running && !stopping) {
                    setRunning(null);
                    setPaused(false);
                }
            } catch {
                /* ignore poll errors */
            }
        })();
        return () => { cancelled = true; };
    }, [sessionId, historyTick]);

    const timerLabel = useMemo(() => {
        if (!running) return '00:00:00';
        void tick;
        if (paused && running._pausedAt != null) {
            return formatDuration(running._pausedElapsed || 0);
        }
        return formatDuration(elapsedSeconds(running.startAt));
    }, [running, paused, tick]);

    const dayTotals = useMemo(() => {
        let tiros = 0;
        let desperdicio = 0;
        history.forEach((a) => {
            if (isProductionCode(a.activityCode)) {
                tiros += Number(a.tiros || 0);
                desperdicio += Number(a.desperdicio || 0);
            }
        });
        if (running && isProductionCode(running.activityCode)) {
            tiros += Number(tirosTotal || 0);
            desperdicio += Number(wasteTotal || 0);
        }
        return { tiros, desperdicio };
    }, [history, running, tirosTotal, wasteTotal]);

    const detailedHistory = useMemo(() => {
        const items = running ? [running, ...history] : [...history];
        return items.sort((a, b) => String(b.startAt).localeCompare(String(a.startAt)));
    }, [history, running, historyTick, tick]);

    const showRegistroProduccion = selectedCode === '02'
        || pendingActivity?.activityCode === '02'
        || running?.activityCode === '02';

    const productionStarted = Boolean(running && isProductionCode(running.activityCode));

    const findActiveSession = async (machineRef, operatorRef) => {
        if (!machineRef?.id || !operatorRef?.id) return null;
        try {
            const sessions = await dailyProductionApi.plantaSessions(new Date());
            const match = (Array.isArray(sessions) ? sessions : [])
                .map(normalizeSession)
                .find((s) =>
                    String(s.machineId) === String(machineRef.id)
                    && String(s.operatorId) === String(operatorRef.id)
                    && (s.status === 'live' || s.status === 'paused'));
            return match || null;
        } catch {
            return null;
        }
    };

    const findOperatorActiveSession = async (operatorRef) => {
        if (!operatorRef?.id) return null;
        try {
            const sessions = await dailyProductionApi.plantaSessions(new Date());
            return (Array.isArray(sessions) ? sessions : [])
                .map(normalizeSession)
                .find((s) =>
                    String(s.operatorId) === String(operatorRef.id)
                    && (s.status === 'live' || s.status === 'paused')) || null;
        } catch {
            return null;
        }
    };

    const attachSession = (session) => {
        if (!session?.id) return null;
        setSessionId(session.id);
        setSessionConcurrencyStamp(session.concurrencyStamp ?? null);
        const runningAct = (session.activities || []).find((a) => a.status === 'running');
        if (runningAct) {
            const enriched = enrichActivity(runningAct);
            setRunning(enriched);
            setPaused(session.status === 'paused');
            if (enriched?.activityCode) setSelectedCode(enriched.activityCode);
            if (enriched && !requiresOpEntry(enriched.activityCode)) {
                setOpNumber(DEFAULT_OP);
            } else if (enriched?.productionOrderNumber) {
                setOpNumber(enriched.productionOrderNumber);
            }
        }
        setHistoryTick((t) => t + 1);
        return session;
    };

    useEffect(() => {
        setSessionId(null);
        setSessionConcurrencyStamp(null);
        setRunning(null);
        setPaused(false);
        setPendingActivity(null);
        setSelectedCode(null);
        setHistory([]);
    }, [machineId, operatorId]);

    useEffect(() => {
        if (!baseReady || sessionId) return undefined;
        let cancelled = false;
        (async () => {
            const existing = await findActiveSession(machine, operator);
            if (cancelled || !existing) return;
            attachSession(existing);
        })();
        return () => { cancelled = true; };
    }, [baseReady, machineId, operatorId, sessionId]);

    const ensureSession = async () => {
        if (!baseReady) {
            setWarn('Seleccione máquina, horario y operario antes de continuar.');
            return null;
        }
        setWarn('');
        try {
            const existingForId = sessionId
                ? await findActiveSession(machine, operator)
                : null;
            if (sessionId && existingForId?.id === sessionId) {
                return existingForId;
            }
            if (sessionId) {
                return { id: sessionId, activities: running ? [running] : [] };
            }
            const existing = await findActiveSession(machine, operator);
            if (existing) {
                attachSession(existing);
                return existing;
            }
            const session = await dailyProductionApi.plantaStartSession({
                machineId: machine.id,
                operatorId: operator.id,
                shiftCode,
                idempotencyKey: `planta-${machine.id}-${operator.id}-${new Date().toISOString().slice(0, 10)}`,
            });
            const normalized = normalizeSession(session);
            attachSession(normalized);
            return normalized;
        } catch (err) {
            const msg = err?.message || '';
            const existing = await findActiveSession(machine, operator);
            if (existing) {
                attachSession(existing);
                return existing;
            }
            const other = await findOperatorActiveSession(operator);
            if (other && machine && String(other.machineId) !== String(machine.id)) {
                setWarn(
                    `El operario tiene sesión activa en "${other.machineName}". `
                    + 'Seleccione esa máquina o detenga la actividad en curso allí.',
                );
                return null;
            }
            if (/sesión activa|trabajando en/i.test(msg)) {
                setWarn(msg);
                return null;
            }
            setWarn(msg || 'No se pudo abrir la sesión.');
            return null;
        }
    };

    const selectPendingActivity = (codeItem, sub = null) => {
        if (running && !paused) {
            setWarn('Detenga o pause la actividad en curso antes de cambiar de código.');
            return;
        }
        if (running && paused) {
            setWarn('Detenga la actividad en pausa antes de seleccionar otra.');
            return;
        }
        if (requiresOpEntry(codeItem.code) && !opNumber.trim()) {
            setWarn('Las actividades 01 y 02 requieren Orden de Producción.');
            return;
        }
        if (!requiresOpEntry(codeItem.code)) {
            setOpNumber(DEFAULT_OP);
        }
        setSelectedCode(codeItem.code);
        setPendingActivity({
            activityCode: codeItem.code,
            activityName: codeItem.name,
            subcode: sub?.code || null,
            subcodeDetail: sub?.name || null,
            subRequiresObservation: sub?.requiresObservation === true,
        });
        setWarn('');
    };

    const onSelectCode = (codeItem) => {
        if (!baseReady) {
            setWarn('Seleccione máquina, horario y operario antes de continuar.');
            return;
        }
        if (requiresOpEntry(codeItem.code) && !opNumber.trim()) {
            setWarn('Las actividades 01 y 02 requieren Orden de Producción.');
            return;
        }
        if ((codeItem.subcodes || []).length > 0) {
            setSubcodeModal(codeItem);
            return;
        }
        selectPendingActivity(codeItem);
    };

    const onPlay = async () => {
        if (paused && running && sessionId) {
            try {
                const session = await dailyProductionApi.plantaResume(sessionId);
                setSessionConcurrencyStamp(session?.concurrencyStamp ?? null);
                const elapsed = running._pausedElapsed || elapsedSeconds(running.startAt);
                const resumedStart = new Date(Date.now() - elapsed * 1000).toISOString();
                setRunning({ ...running, startAt: resumedStart, _pausedAt: null, _pausedElapsed: null });
                setPaused(false);
                setWarn('');
            } catch (err) {
                setWarn(err?.message || 'No se pudo reanudar');
            }
            return;
        }
        if (running) return;

        if (!pendingActivity) {
            setWarn('Seleccione una actividad y luego pulse Iniciar.');
            return;
        }
        if (requiresOpEntry(pendingActivity.activityCode) && !opNumber.trim()) {
            setWarn('Las actividades 01 y 02 requieren Orden de Producción.');
            return;
        }
        if (activityNeedsObservations(pendingActivity, processCodes) && !observations.trim()) {
            setWarn('Este subcódigo (Otro) requiere observaciones antes de iniciar.');
            return;
        }

        const resolvedOp = resolveOpNumber(pendingActivity.activityCode, opNumber);

        const session = await ensureSession();
        if (!session) return;

        const runningOnServer = (session.activities || []).find((a) => a.status === 'running');
        if (runningOnServer) {
            const normalized = enrichActivity(runningOnServer);
            setRunning(normalized);
            setPaused(session.status === 'paused');
            if (normalized?.activityCode) setSelectedCode(normalized.activityCode);
            setWarn('Hay una actividad en curso. Deténgala con el botón Detener antes de iniciar otra.');
            return;
        }

        // Si la sesión quedó pausada en el servidor, reanudar antes de la nueva actividad.
        if (session.status === 'paused' && session.id) {
            try {
                await dailyProductionApi.plantaResume(session.id);
            } catch {
                /* StartActivity también reanuda en backend */
            }
        }

        const code = processCodes.find((c) => c.code === pendingActivity.activityCode);
        if (!code?.id) {
            setWarn('Código de actividad no encontrado en el servidor.');
            return;
        }
        const sub = (code.subcodes || []).find((s) => s.code === pendingActivity.subcode);

        try {
            const activity = await dailyProductionApi.plantaStartActivity(session.id, {
                activityCodeId: code.id,
                subcodeId: sub?.id || null,
                productionOrderNumber: resolvedOp || null,
                observations: observations.trim() || null,
                idempotencyKey: `act-${session.id}-${code.code}-${Date.now()}`,
            });
            setSessionId(session.id);
            setRunning(enrichActivity(activity));
            setPaused(false);
            setTirosDraft('0');
            setTirosTotal(0);
            setWasteTotal(0);
            setWasteEntries([]);
            setHistoryTick((n) => n + 1);
            setWarn('');
        } catch (err) {
            setWarn(err?.message || 'No se pudo iniciar la actividad');
        }
    };

    const onPause = async () => {
        if (!running || paused || !sessionId) return;
        const elapsed = elapsedSeconds(running.startAt);
        try {
            const session = await dailyProductionApi.plantaPause(sessionId);
            setSessionConcurrencyStamp(session?.concurrencyStamp ?? null);
            setRunning({ ...running, _pausedAt: Date.now(), _pausedElapsed: elapsed });
            setPaused(true);
        } catch (err) {
            setWarn(err?.message || 'No se pudo pausar');
        }
    };

    const buildObservationsPayload = () => {
        const parts = [];
        if (observations.trim()) parts.push(observations.trim());
        if (wasteEntries.length > 0) {
            parts.push(
                wasteEntries
                    .map((w) => `Desperdicio ${w.code}: ${w.name} × ${w.qty}`)
                    .join(' | '),
            );
        }
        return parts.join(' | ');
    };

    const finishRunningActivity = async (activityRef, stamp) => {
        const wastePayload = wasteEntries.map((w) => {
            const reason = wasteReasons.find((r) => r.code === w.code);
            return {
                wasteReasonId: reason?.id || null,
                reasonCode: w.code,
                reasonName: w.name,
                quantity: w.qty,
                observations: null,
            };
        });
        const body = {
            quantityProcessed: isProductionCode(activityRef.activityCode) ? tirosTotal : 0,
            waste: isProductionCode(activityRef.activityCode) ? wasteTotal : 0,
            observations: buildObservationsPayload(),
            wasteEntries: wastePayload,
        };
        if (stamp != null) body.concurrencyStamp = stamp;
        return dailyProductionApi.plantaFinishActivity(activityRef.id, body);
    };

    const onStop = async () => {
        if (!running || stopping) return;
        if (activityNeedsObservations(running, processCodes) && !observations.trim()) {
            setWarn('Este subcódigo (Otro) requiere observaciones antes de detener.');
            return;
        }
        if (isProductionCode(running.activityCode) && tirosTotal <= 0) {
            setWarn('Las actividades de producción requieren registrar tiros antes de detener.');
            return;
        }
        if (isProductionCode(running.activityCode) && tirosTotal > 0 && wasteTotal > tirosTotal) {
            setWarn('El desperdicio no puede superar los tiros.');
            return;
        }
        setStopping(true);
        const activityRef = running;
        try {
            let finished;
            try {
                finished = await finishRunningActivity(activityRef, sessionConcurrencyStamp);
            } catch (err) {
                const msg = err?.message || '';
                const isConflict = /actualizada por otra|modificada por otro|conflict/i.test(msg);
                if (!isConflict) throw err;

                const sessions = await dailyProductionApi.plantaSessions(new Date());
                const session = (Array.isArray(sessions) ? sessions : [])
                    .map(normalizeSession)
                    .find((s) => s.id === sessionId);
                const serverAct = (session?.activities || []).find((a) => a.id === activityRef.id);
                if (serverAct?.status === 'done') {
                    finished = serverAct;
                } else {
                    const freshStamp = session?.concurrencyStamp ?? null;
                    setSessionConcurrencyStamp(freshStamp);
                    finished = await finishRunningActivity(activityRef, freshStamp);
                }
            }
            const finishedNorm = normalizeActivity(finished);
            setHistory((prev) => {
                const without = prev.filter((a) => a.id !== finishedNorm.id);
                return [finishedNorm, ...without];
            });
            setRunning(null);
            setPaused(false);
            setPendingActivity(null);
            setSelectedCode(null);
            setTirosDraft('0');
            setTirosTotal(0);
            setWasteTotal(0);
            setWasteEntries([]);
            setObservations('');
            setHistoryTick((n) => n + 1);
            setWarn('');
        } catch (err) {
            setWarn(err?.message || 'No se pudo detener la actividad');
        } finally {
            setStopping(false);
        }
    };

    const onAddTiros = () => {
        if (!productionStarted) return;
        const n = Math.max(0, Number(tirosDraft || 0));
        if (!n) {
            setWarn('Ingrese una cantidad de tiros mayor a 0.');
            return;
        }
        setTirosTotal((prev) => prev + n);
        setTirosDraft('0');
        setWarn('');
    };

    const onConfirmWaste = () => {
        if (!productionStarted) return;
        const qty = Math.max(0, Number(wasteQty || 0));
        const item = (wasteReasons.length ? wasteReasons : WASTE_CODES).find((w) => w.code === wasteCode);
        if (!item) {
            setWarn('Seleccione un motivo / código de desperdicio.');
            return;
        }
        if (!qty) {
            setWarn('Ingrese la cantidad de desperdicio.');
            return;
        }
        setWasteEntries((prev) => [...prev, { code: item.code, name: item.name, qty }]);
        setWasteTotal((prev) => prev + qty);
        setWasteCode('');
        setWasteQty('');
        setWasteModal(false);
        setWarn('');
    };

    const canPlay = !running || paused;
    const canPause = Boolean(running && !paused);
    const canStop = Boolean(running) && !stopping;

    const activeActivityCode = running?.activityCode || pendingActivity?.activityCode || selectedCode;
    const opAutoFilled = Boolean(activeActivityCode && !requiresOpEntry(activeActivityCode));
    const observationsRequired = Boolean(
        (pendingActivity && activityNeedsObservations(pendingActivity, processCodes))
        || (running && activityNeedsObservations(running, processCodes)),
    );

    const activityDuration = (a) => {
        if (a.status === 'running') {
            if (paused && a._pausedElapsed != null) return a._pausedElapsed;
            return elapsedSeconds(a.startAt);
        }
        return a.durationSeconds || 0;
    };

    const activityEndClock = (a) => {
        if (a.status === 'running') return formatClock(new Date().toISOString());
        return formatClock(a.endAt);
    };

    const activityTiros = (a) => {
        if (a.status === 'running' && a.id === running?.id && isProductionCode(a.activityCode)) {
            return tirosTotal;
        }
        return Number(a.tiros || 0);
    };

    const activityDesperdicio = (a) => {
        if (a.status === 'running' && a.id === running?.id && isProductionCode(a.activityCode)) {
            return wasteTotal;
        }
        return Number(a.desperdicio || 0);
    };

    const activityObservations = (a) => {
        const parts = [];
        if (a.subcode) {
            parts.push(`Subcodigo ${a.activityCode}: ${a.subcode}${a.subcodeDetail ? ` - ${a.subcodeDetail}` : ''}`);
        }
        if (a.status === 'running' && a.id === running?.id) {
            if (observations.trim()) parts.push(observations.trim());
            if (wasteEntries.length > 0) {
                parts.push(wasteEntries.map((w) => `Desperdicio ${w.code}: ${w.name} × ${w.qty}`).join(' | '));
            }
        } else if (a.observations) {
            parts.push(a.observations);
        }
        return parts.join(' | ');
    };

    if (!featureOn || access === 'disabled') {
        return (
            <div className="planta-floor__gate">
                <div>
                    <h1>Vista de planta no disponible</h1>
                    <p>Este módulo solo se habilita en la red interna (VITE_PLANTA_ENABLED / Planta:Enabled).</p>
                </div>
            </div>
        );
    }

    if (access === 'loading') {
        return (
            <div className="planta-floor__gate">
                <p>Verificando acceso de red…</p>
            </div>
        );
    }

    if (access === 'denied') {
        return (
            <div className="planta-floor__gate">
                <div>
                    <h1>Acceso denegado</h1>
                    <p>{accessMessage || 'Acceso solo desde la red interna de la empresa.'}</p>
                    <p style={{ color: '#94a3b8', fontSize: 14 }}>Sin login: el bloqueo es por red interna.</p>
                </div>
            </div>
        );
    }

    const activityTitle = running
        ? running.activityName
        : pendingActivity
            ? pendingActivity.activityName
            : '—';

    const previewHistory = detailedHistory.slice(0, 8);

    return (
        <div className="planta-floor">
            <div
                className="planta-floor__sidebar-wrap"
                style={{ width: sidebarWidth }}
            >
                <aside className="planta-floor__sidebar">
                <div className="planta-floor__brand">
                    <img src="/empresa-logo.jpeg" alt="Aleph Impresores" />
                </div>

                <div className="planta-floor__field">
                    <label>MÁQUINA</label>
                    <select
                        value={machineId}
                        onChange={(e) => setMachineId(e.target.value)}
                        disabled={Boolean(running)}
                    >
                        <option value="">Seleccionar máquina</option>
                        {machines.map((m) => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>

                <div className="planta-floor__field">
                    <label>HORARIO</label>
                    <select
                        value={shiftCode}
                        onChange={(e) => setShiftCode(e.target.value)}
                        disabled={Boolean(running)}
                    >
                        {shifts.map((s) => (
                            <option key={s.code} value={s.code}>{s.name}</option>
                        ))}
                    </select>
                </div>

                <div className="planta-floor__field">
                    <label>OPERARIO</label>
                    <select
                        value={operatorId}
                        onChange={(e) => setOperatorId(e.target.value)}
                        disabled={Boolean(running)}
                    >
                        <option value="">Seleccionar operario</option>
                        {operators.map((o) => (
                            <option key={o.id} value={o.id}>{o.name}</option>
                        ))}
                    </select>
                    {operators.length === 0 && (
                        <p className="planta-floor__hint">
                            No hay operarios. Créelos en Configuración → Usuarios con rol &quot;Operario (planta)&quot;.
                        </p>
                    )}
                </div>

                <div className="planta-floor__field">
                    <label>ORDEN DE PRODUCCIÓN</label>
                    <input
                        value={opAutoFilled ? DEFAULT_OP : opNumber}
                        onChange={(e) => setOpNumber(e.target.value.replace(/[^\d]/g, ''))}
                        placeholder="Números"
                        disabled={Boolean(running) || opAutoFilled}
                    />
                </div>

                <div className="planta-floor__field">
                    <label>OBSERVACIONES{observationsRequired ? ' *' : ''}</label>
                    <textarea
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                        placeholder={observationsRequired
                            ? 'Obligatorias para subcódigos Otro…'
                            : 'Notas de la actividad…'}
                        rows={4}
                    />
                    {observationsRequired && (
                        <p className="planta-floor__hint">Obligatorias para subcódigos Otro.</p>
                    )}
                </div>
                </aside>
                <button
                    type="button"
                    className="planta-floor__sidebar-resizer"
                    onPointerDown={onSidebarResizeStart}
                    onDoubleClick={onSidebarResizeReset}
                    aria-label="Arrastrar para cambiar ancho del panel. Doble clic para restaurar."
                />
            </div>

            <main className="planta-floor__main">
                {warn && (
                    <div className="planta-floor__alert" role="alert">
                        {warn}
                    </div>
                )}

                <section className="planta-floor__banner">
                    <div className="planta-floor__banner-main">
                        <p className="planta-floor__timer">{timerLabel}</p>
                        <div className="planta-floor__banner-activity">
                            <div className="planta-floor__banner-kicker">Tiempo en Curso</div>
                            <div className="planta-floor__activity-label">ACTIVIDAD ACTUAL</div>
                            <p className="planta-floor__activity-name">{activityTitle}</p>
                        </div>
                    </div>
                    <div className="planta-floor__controls">
                        <button
                            type="button"
                            className="planta-floor__btn planta-floor__btn--play"
                            onClick={onPlay}
                            disabled={!canPlay}
                            aria-label={paused ? 'Reanudar' : 'Iniciar'}
                            title={paused ? 'Reanudar' : 'Iniciar'}
                        >
                            <IconPlayerPlay size={26} stroke={2.2} />
                        </button>
                        <button
                            type="button"
                            className={`planta-floor__btn planta-floor__btn--pause${paused ? ' is-active' : ''}`}
                            onClick={onPause}
                            disabled={!canPause}
                            aria-label="Pausar"
                            title="Pausar"
                        >
                            <IconPlayerPause size={26} stroke={2.2} />
                        </button>
                        <button
                            type="button"
                            className="planta-floor__btn planta-floor__btn--stop"
                            onClick={onStop}
                            disabled={!canStop}
                            aria-label="Detener"
                            title="Detener"
                        >
                            <IconPlayerStop size={26} stroke={2.2} />
                        </button>
                    </div>
                </section>

                <div className="planta-floor__grid">
                    <div className="planta-floor__col planta-floor__col--left">
                        <section className="planta-floor__card planta-floor__card--activities">
                            <h2>Seleccionar Actividad</h2>
                            <div className="planta-floor__codes">
                                {processCodes.map((code) => {
                                    const selected = selectedCode === code.code || running?.activityCode === code.code;
                                    return (
                                        <button
                                            type="button"
                                            key={code.code}
                                            data-code={code.code}
                                            className={`planta-floor__code${selected ? ' is-selected' : ''}`}
                                            onClick={() => onSelectCode(code)}
                                        >
                                            <strong>{code.code}</strong>
                                            <span>{code.name}</span>
                                            {selected && <IconCheck className="planta-floor__code-check" size={14} stroke={2.5} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </section>

                        {showRegistroProduccion && (
                            <section className="planta-floor__card planta-floor__registro">
                                <h2 className="planta-floor__registro-title">REGISTRO DE PRODUCCIÓN</h2>
                                <label className="planta-floor__registro-label">Tiros</label>
                                <div className="planta-floor__tiros-row">
                                    <input
                                        type="number"
                                        min={0}
                                        value={tirosDraft}
                                        onChange={(e) => setTirosDraft(e.target.value)}
                                        disabled={!productionStarted}
                                    />
                                    <button
                                        type="button"
                                        className="planta-floor__btn-add"
                                        onClick={onAddTiros}
                                        disabled={!productionStarted}
                                    >
                                        Agregar
                                    </button>
                                </div>
                                <p className="planta-floor__registro-hint">
                                    Acumulado actividad: {tirosTotal.toLocaleString()} tiros · {wasteTotal.toLocaleString()} desperdicio
                                </p>
                                <button
                                    type="button"
                                    className="planta-floor__btn-waste"
                                    onClick={() => {
                                        setWarn('');
                                        setWasteModal(true);
                                    }}
                                    disabled={!productionStarted}
                                >
                                    AGREGAR DESPERDICIO
                                </button>
                            </section>
                        )}
                    </div>

                    <div className="planta-floor__col planta-floor__col--right">
                        <section className="planta-floor__card planta-floor__card--history">
                            <div className="planta-floor__card-head">
                                <h2>Historial de Actividades</h2>
                                <button
                                    type="button"
                                    className="planta-floor__btn-history"
                                    onClick={() => setHistoryModal(true)}
                                >
                                    Ver Historial
                                </button>
                            </div>
                            {previewHistory.length === 0 ? (
                                <div className="planta-floor__history-empty">
                                    No hay registros de actividades. Los registros aparecerán aquí cuando detenga el cronómetro.
                                </div>
                            ) : (
                                <div className="planta-floor__history-list">
                                    {previewHistory.map((a) => (
                                        <div key={a.id} className="planta-floor__history-row">
                                            <span className="planta-floor__history-time">{formatClock(a.startAt)}</span>
                                            <div className="planta-floor__history-row-main">
                                                <span className="planta-floor__history-badge" data-code={a.activityCode}>{a.activityCode}</span>
                                                <div className="planta-floor__history-body">
                                                    <strong>{a.activityName}</strong>
                                                    {a.subcode && (
                                                        <em>
                                                            Subcodigo {a.activityCode}: {a.subcode}
                                                            {a.subcodeDetail ? ` - ${a.subcodeDetail}` : ''}
                                                        </em>
                                                    )}
                                                    {isProductionCode(a.activityCode) && (
                                                        <span className="planta-floor__history-metrics">
                                                            <span className="planta-floor__history-tiros">
                                                                Tiros: {activityTiros(a).toLocaleString()}
                                                            </span>
                                                            <span className="planta-floor__history-waste">
                                                                Desperdicio: {activityDesperdicio(a).toLocaleString()}
                                                            </span>
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <span className="planta-floor__history-dur">
                                                {formatDuration(activityDuration(a))}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>

                        <section className="planta-floor__card planta-floor__card--day">
                            <h2>Producción del Día</h2>
                            <div className="planta-floor__bottom">
                                <div className="planta-floor__metric planta-floor__metric--tiros">
                                    <strong>{dayTotals.tiros.toLocaleString()}</strong>
                                    <span>Tiros</span>
                                </div>
                                <div className="planta-floor__metric planta-floor__metric--waste">
                                    <strong>{dayTotals.desperdicio.toLocaleString()}</strong>
                                    <span>Desperdicio</span>
                                </div>
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {subcodeModal && (
                <div className="planta-floor__modal-backdrop" role="presentation" onClick={() => setSubcodeModal(null)}>
                    <div
                        className="planta-floor__modal"
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header>Seleccione subcódigo para {subcodeModal.code}</header>
                        <div className="planta-floor__modal-list">
                            {(subcodeModal.subcodes || []).map((sub) => (
                                <button
                                    type="button"
                                    key={sub.code}
                                    className="planta-floor__modal-item"
                                    onClick={() => {
                                        setSubcodeModal(null);
                                        selectPendingActivity(subcodeModal, sub);
                                    }}
                                >
                                    <span>{sub.code}</span>
                                    <span className="planta-floor__modal-item__name">
                                        {sub.name}
                                        {subcodeNeedsObservations(sub) && (
                                            <em className="planta-floor__modal-item__req"> — requiere observaciones</em>
                                        )}
                                    </span>
                                </button>
                            ))}
                        </div>
                        <footer>
                            <button type="button" onClick={() => setSubcodeModal(null)}>Cerrar</button>
                        </footer>
                    </div>
                </div>
            )}

            {historyModal && (
                <div className="planta-floor__modal-backdrop" role="presentation" onClick={() => setHistoryModal(false)}>
                    <div
                        className="planta-floor__modal planta-floor__modal--wide"
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="planta-floor__modal-top">
                            <header>Historial Detallado</header>
                            <button type="button" className="planta-floor__btn-history" onClick={() => setHistoryModal(false)}>
                                Cerrar
                            </button>
                        </div>
                        <div className="planta-floor__modal-list">
                            {detailedHistory.length === 0 ? (
                                <div className="planta-floor__history-empty">Sin registros aún.</div>
                            ) : (
                                detailedHistory.map((a) => {
                                    const obsText = activityObservations(a);
                                    return (
                                    <article key={a.id} className="planta-floor__detail-card">
                                        <div className="planta-floor__detail-meta">
                                            <span>
                                                {formatDateShort(a.startAt)} | {formatClock(a.startAt)} - {activityEndClock(a)}
                                            </span>
                                            <span>{formatDuration(activityDuration(a))}</span>
                                        </div>
                                        <div className="planta-floor__detail-machine">{machine?.name || '—'}</div>
                                        {a.productionOrderNumber && (
                                            <span className="planta-floor__op-tag">OP: {a.productionOrderNumber}</span>
                                        )}
                                        <div className="planta-floor__detail-name">{a.activityName}</div>
                                        {isProductionCode(a.activityCode) && (
                                            <div className="planta-floor__detail-metrics">
                                                <span>Tiros <b className="is-tiros">{activityTiros(a).toLocaleString()}</b></span>
                                                <span>Desperdicio <b className="is-waste">{activityDesperdicio(a).toLocaleString()}</b></span>
                                            </div>
                                        )}
                                        {obsText && (
                                            <div className="planta-floor__detail-obs">
                                                <strong>Observaciones:</strong>
                                                <p>{obsText}</p>
                                            </div>
                                        )}
                                    </article>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            )}

            {wasteModal && (
                <div className="planta-floor__modal-backdrop" role="presentation" onClick={() => setWasteModal(false)}>
                    <div
                        className="planta-floor__modal"
                        role="dialog"
                        aria-modal="true"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <header className="planta-floor__modal-center">Agregar Desperdicio</header>
                        <div className="planta-floor__waste-form">
                            <label>Motivo / Código:</label>
                            <select value={wasteCode} onChange={(e) => setWasteCode(e.target.value)}>
                                <option value="">Seleccione…</option>
                                {(wasteReasons.length ? wasteReasons : WASTE_CODES).map((w) => (
                                    <option key={w.code} value={w.code}>
                                        {w.code} - {w.name}
                                    </option>
                                ))}
                            </select>
                            <label>Cantidad:</label>
                            <input
                                type="number"
                                min={0}
                                value={wasteQty}
                                onChange={(e) => setWasteQty(e.target.value)}
                                placeholder="Ingrese cantidad..."
                            />
                        </div>
                        <div className="planta-floor__waste-actions">
                            <button type="button" className="planta-floor__waste-cancel" onClick={() => setWasteModal(false)}>
                                Cancelar
                            </button>
                            <button type="button" className="planta-floor__waste-confirm" onClick={onConfirmWaste}>
                                Agregar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
