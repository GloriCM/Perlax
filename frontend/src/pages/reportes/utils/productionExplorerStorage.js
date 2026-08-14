/**
 * Modelo multi-operario (estilo Aleph):
 * - Una SESIÓN = 1 máquina + 1 operario + 1 fecha (+ horario).
 * - Varias sesiones pueden estar EN VIVO a la vez (un operario por máquina).
 * - ACTIVIDADES pertenecen a una sesión (código, subcódigo, OP, tiros, desperdicio).
 * Hasta la unión con Aleph, todo vive en localStorage; luego se mapea 1:1 al API.
 */

const SESSIONS_KEY = 'perlax_production_sessions_v1';
const ACTIVITIES_KEY = 'perlax_production_activities_v1';

export const PROCESS_CODES = [
    { code: '01', name: 'Puesta a Punto', subcodes: [] },
    { code: '02', name: 'Produccion', subcodes: [] },
    {
        code: '03',
        name: 'Reparacion',
        subcodes: [
            { code: '301', name: 'Daño electrico' },
            { code: '302', name: 'Daño mecanico' },
            { code: '303', name: 'Daño electroMecanico' },
            { code: '399', name: 'Otro (especificar en observaciones)' },
        ],
    },
    { code: '04', name: 'Descanso', subcodes: [] },
    { code: '10', name: 'Mantenimiento y Aseo', subcodes: [] },
    {
        code: '13',
        name: 'Falta de Trabajo',
        subcodes: [
            { code: '1301', name: 'Esperando material' },
            { code: '1302', name: 'Esperando OP' },
            { code: '1303', name: 'Sin programacion' },
            { code: '1399', name: 'Otro (especificar en observaciones)' },
        ],
    },
    {
        code: '14',
        name: 'Otros Tiempos',
        subcodes: [
            { code: '1401', name: 'Cambio de bateria' },
            { code: '1402', name: 'Calibracion de franjas' },
            { code: '1403', name: 'Reunion programada' },
            { code: '1404', name: 'Lavada de baterias' },
            { code: '1499', name: 'Otro (especificar en observaciones)' },
        ],
    },
    {
        code: '08',
        name: 'Otro Tiempo Muerto',
        subcodes: [
            { code: '801', name: 'Cambio de mantilla' },
            { code: '802', name: 'Esperando repuesto/Mecanico/Tecnico' },
            { code: '803', name: 'Material Defectuoso' },
            { code: '804', name: 'Problemas de humedad' },
            { code: '805', name: 'Problemas de Registro' },
            { code: '806', name: 'Sin fluido electrico' },
            { code: '807', name: 'Tinta no conforme' },
            { code: '808', name: 'Cambio de cuchilla' },
            { code: '809', name: 'Limpieza de cilindros' },
            { code: '810', name: 'Hoja en bateria' },
            { code: '899', name: 'Otro (especificar en observaciones)' },
        ],
    },
];

export const SHIFTS = [
    { code: 'T1', name: 'Turno 1 (06:00-14:00)' },
    { code: 'T2', name: 'Turno 2 (14:00-22:00)' },
    { code: 'T3', name: 'Turno 3 (22:00-06:00)' },
];

/** Tiros y desperdicio solo aplican al codigo 02 Produccion. */
export function isProductionCode(codeOrLabel) {
    const s = String(codeOrLabel || '').trim();
    if (!s) return false;
    return s === '02' || s.startsWith('02 ') || s.startsWith('02\t');
}

const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const todayKey = (d = new Date()) => {
    const date = d instanceof Date ? d : new Date(d);
    if (Number.isNaN(date.getTime())) {
        const now = new Date();
        const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 10);
    }
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
};

const parseJson = (key, fallback) => {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
};

const saveJson = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
};

const seedIfEmpty = () => {
    // No-op: los datos demo ya no se siembran. Use import-local hacia el backend.
};

export function getSessions() {
    return parseJson(SESSIONS_KEY, []);
}

export function getActivities() {
    return parseJson(ACTIVITIES_KEY, []);
}

export function saveSessions(list) {
    saveJson(SESSIONS_KEY, list);
}

export function saveActivities(list) {
    saveJson(ACTIVITIES_KEY, list);
}

export function getSessionsForDate(dateStr) {
    return getSessions().filter((s) => s.date === dateStr);
}

export function getActivitiesForSession(sessionId) {
    return getActivities()
        .filter((a) => a.sessionId === sessionId)
        .sort((a, b) => String(b.startAt).localeCompare(String(a.startAt)));
}

export function getActivitiesForDate(dateStr) {
    return getActivities().filter((a) => a.date === dateStr);
}

export function formatDuration(seconds) {
    if (seconds == null || Number.isNaN(seconds)) return '—';
    const s = Math.max(0, Math.floor(seconds));
    const hh = String(Math.floor(s / 3600)).padStart(2, '0');
    const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
}

export function elapsedSeconds(isoStart, isoEnd = null) {
    if (!isoStart) return 0;
    const start = new Date(isoStart).getTime();
    const end = isoEnd ? new Date(isoEnd).getTime() : Date.now();
    if (!Number.isFinite(start) || end < start) return 0;
    return Math.floor((end - start) / 1000);
}

export function summarizeSession(session, activities) {
    const all = activities || [];
    const list = all.some((a) => a.sessionId === session.id)
        ? all.filter((a) => a.sessionId === session.id)
        : all;
    const productionList = list.filter((a) => isProductionCode(a.activityCode));
    const tiros = productionList.reduce((acc, a) => acc + Number(a.tiros || 0), 0);
    const desperdicio = productionList.reduce((acc, a) => acc + Number(a.desperdicio || 0), 0);
    const ops = new Set(list.map((a) => a.productionOrderNumber).filter(Boolean));
    const machineSeconds = elapsedSeconds(session.startedAt, session.endedAt || null);
    const wastePct = tiros > 0 ? (desperdicio / tiros) * 100 : 0;
    const meta = Number(session.metaTiros || 0);
    const rendimiento = meta > 0 ? (tiros / meta) * 100 : 0;

    return {
        tiros,
        desperdicio,
        opsCount: ops.size,
        ops: [...ops],
        machineSeconds,
        wastePct,
        rendimiento,
        meta,
        registros: list.length,
    };
}

export function summarizeByOp(activities) {
    const map = new Map();
    activities.forEach((a) => {
        const op = a.productionOrderNumber || '—';
        if (!map.has(op)) {
            map.set(op, { op, registros: 0, tiros: 0, desperdicio: 0 });
        }
        const row = map.get(op);
        row.registros += 1;
        if (isProductionCode(a.activityCode)) {
            row.tiros += Number(a.tiros || 0);
            row.desperdicio += Number(a.desperdicio || 0);
        }
    });
    return [...map.values()].sort((a, b) => String(a.op).localeCompare(String(b.op), undefined, { numeric: true }));
}

export function createSession({
    date,
    machineId,
    machineName,
    operatorId,
    operatorName,
    shiftCode = 'T1',
}) {
    const sessions = getSessions();
    const conflict = sessions.find(
        (s) =>
            s.date === date
            && s.status !== 'finished'
            && (s.machineId === machineId || s.operatorId === operatorId)
    );
    if (conflict) {
        throw new Error(
            conflict.machineId === machineId
                ? `La máquina ${machineName} ya tiene una sesión activa.`
                : `El operario ${operatorName} ya tiene una sesión activa.`
        );
    }

    const session = {
        id: uid(),
        date,
        machineId,
        machineName,
        operatorId,
        operatorName,
        shiftCode,
        status: 'live',
        metaTiros: 0,
        startedAt: new Date().toISOString(),
        currentActivityCode: null,
        currentActivityName: null,
        currentOp: null,
        source: 'planta',
    };
    saveSessions([session, ...sessions]);
    return session;
}

export function upsertActivity(activity) {
    const list = getActivities();
    const idx = list.findIndex((a) => a.id === activity.id);
    if (idx >= 0) {
        list[idx] = activity;
    } else {
        list.unshift({ ...activity, id: activity.id || uid() });
    }
    saveActivities(list);
    return list.find((a) => a.id === (activity.id || list[0].id));
}

/**
 * Importa un Reporte Diario a sesiones multi-operario.
 * Regla: 1 sesión por (fecha + operario + máquina). Así N operadores conviven sin pisarse.
 */
export function syncFromDailyReport({ processDate, operatorName, shiftCode = 'T1', processes = [] }) {
    const date = typeof processDate === 'string'
        ? processDate.slice(0, 10)
        : todayKey(processDate instanceof Date ? processDate : new Date());
    const operator = String(operatorName || '').trim();
    if (!operator || !processes.length) return;

    const operatorId = `op-${operator.toLowerCase().replace(/\s+/g, '-')}`;
    let sessions = getSessions();
    let activities = getActivities().filter(
        (a) => !(a.date === date && a.source === 'reporte-diario' && a.operatorName === operator)
    );

    const byMachine = new Map();
    processes.forEach((proc) => {
        const machineName = String(proc.machineName || 'Sin máquina').trim();
        if (!byMachine.has(machineName)) byMachine.set(machineName, []);
        byMachine.get(machineName).push(proc);
    });

    byMachine.forEach((rows, machineName) => {
        const machineId = `m-${machineName.toLowerCase().replace(/\s+/g, '-')}`;
        let session = sessions.find(
            (s) =>
                s.date === date
                && s.operatorId === operatorId
                && s.machineId === machineId
        );
        if (!session) {
            session = {
                id: uid(),
                date,
                machineId,
                machineName,
                operatorId,
                operatorName: operator,
                shiftCode,
                status: 'finished',
                metaTiros: 0,
                startedAt: rows[0]?.startAt || new Date().toISOString(),
                endedAt: rows[rows.length - 1]?.endAt || null,
                currentActivityCode: null,
                currentActivityName: null,
                currentOp: null,
                source: 'reporte-diario',
            };
            sessions = [session, ...sessions];
        } else {
            session = {
                ...session,
                shiftCode: shiftCode || session.shiftCode,
                endedAt: rows[rows.length - 1]?.endAt || session.endedAt,
                status: 'finished',
                source: 'reporte-diario',
            };
            sessions = sessions.map((s) => (s.id === session.id ? session : s));
        }

        rows.forEach((proc) => {
            const label = String(proc.processCode || '');
            const parent = PROCESS_CODES.find((c) => label.startsWith(c.code) || label.includes(` ${c.name}`));
            const activityCode = parent?.code || label.split(/\s+/)[0] || '';
            const activityName = parent?.name || label.replace(activityCode, '').trim() || activityCode;
            let subcode = null;
            let subcodeDetail = null;
            if (parent) {
                const matchSub = (parent.subcodes || []).find(
                    (sub) => label.includes(sub.code) || label.startsWith(sub.code)
                );
                if (matchSub) {
                    subcode = matchSub.code;
                    subcodeDetail = matchSub.name;
                }
            }

            activities.unshift({
                id: uid(),
                sessionId: session.id,
                date,
                operatorName: operator,
                activityCode,
                activityName,
                subcode,
                subcodeDetail,
                productionOrderNumber: String(proc.productionOrderNumber || ''),
                startAt: proc.startAt,
                endAt: proc.endAt,
                durationSeconds: elapsedSeconds(proc.startAt, proc.endAt),
                tiros: isProductionCode(activityCode) || isProductionCode(proc.processCode)
                    ? Number(proc.quantityProcessed || 0)
                    : 0,
                desperdicio: isProductionCode(activityCode) || isProductionCode(proc.processCode)
                    ? Number(proc.desperdicio || proc.waste || 0)
                    : 0,
                observations: proc.observations || '',
                status: 'done',
                source: 'reporte-diario',
            });
        });
    });

    saveSessions(sessions);
    saveActivities(activities);
}

export const FLOOR_MACHINES = [
    { id: '1a', name: '1A CONVERTIDORA' },
    { id: '6sm', name: '6 SpeedMaster' },
    { id: '10a', name: '10A Colaminadora Carton' },
];

export const FLOOR_OPERATORS = [
    { id: 'op-bedoya', name: 'Bedoya Maria Fernanda' },
    { id: 'op-enrique', name: 'Enrique Muñoz Hector Hilde' },
    { id: 'op-obando', name: 'Obando Higuita Jose Luis' },
    { id: 'op-josue', name: 'Josue lopez' },
];

/**
 * Obtiene o crea la sesión de planta (1 máquina + 1 operario + fecha).
 * Si ya hay sesión live del mismo par, la reutiliza.
 */
export function getOrCreateFloorSession({
    machineId,
    machineName,
    operatorId,
    operatorName,
    shiftCode = 'T1',
}) {
    const date = todayKey();
    const sessions = getSessions();
    const existing = sessions.find(
        (s) =>
            s.date === date
            && s.machineId === machineId
            && s.operatorId === operatorId
            && s.status !== 'finished'
    );
    if (existing) {
        if (existing.shiftCode !== shiftCode) {
            const updated = { ...existing, shiftCode, source: 'planta' };
            saveSessions(sessions.map((s) => (s.id === existing.id ? updated : s)));
            return updated;
        }
        return existing;
    }

    return createSession({
        date,
        machineId,
        machineName,
        operatorId,
        operatorName,
        shiftCode,
    });
}

export function updateSessionCurrent(sessionId, patch) {
    const sessions = getSessions().map((s) =>
        s.id === sessionId ? { ...s, ...patch, source: s.source || 'planta' } : s
    );
    saveSessions(sessions);
    return sessions.find((s) => s.id === sessionId);
}

/** Inicia actividad en curso (Play). Cierra cualquier running previa de la sesión. */
export function startFloorActivity({
    sessionId,
    activityCode,
    activityName,
    subcode = null,
    subcodeDetail = null,
    productionOrderNumber = '',
}) {
    const date = todayKey();
    const now = new Date().toISOString();
    let activities = getActivities();

    activities = activities.map((a) => {
        if (a.sessionId === sessionId && a.status === 'running') {
            return {
                ...a,
                endAt: now,
                durationSeconds: elapsedSeconds(a.startAt, now),
                status: 'done',
            };
        }
        return a;
    });

    const activity = {
        id: uid(),
        sessionId,
        date,
        activityCode,
        activityName,
        subcode,
        subcodeDetail,
        productionOrderNumber: String(productionOrderNumber || ''),
        startAt: now,
        endAt: null,
        durationSeconds: null,
        tiros: 0,
        desperdicio: 0,
        observations: '',
        status: 'running',
        source: 'planta',
    };
    activities.unshift(activity);
    saveActivities(activities);
    updateSessionCurrent(sessionId, {
        status: 'live',
        currentActivityCode: activityCode,
        currentActivityName: activityName,
        currentOp: productionOrderNumber || null,
    });
    return activity;
}

export function pauseFloorSession(sessionId) {
    updateSessionCurrent(sessionId, { status: 'paused' });
}

export function resumeFloorSession(sessionId) {
    updateSessionCurrent(sessionId, { status: 'live' });
}

/** Stop: cierra la actividad en curso y limpia current de la sesión. */
export function stopFloorActivity(sessionId, { tiros = 0, desperdicio = 0, observations = '' } = {}) {
    const now = new Date().toISOString();
    let stopped = null;
    const activities = getActivities().map((a) => {
        if (a.sessionId === sessionId && a.status === 'running') {
            const prod = isProductionCode(a.activityCode);
            stopped = {
                ...a,
                endAt: now,
                durationSeconds: elapsedSeconds(a.startAt, now),
                tiros: prod ? Number(tiros || 0) : 0,
                desperdicio: prod ? Number(desperdicio || 0) : 0,
                observations: observations || a.observations || '',
                status: 'done',
                source: 'planta',
            };
            return stopped;
        }
        return a;
    });
    saveActivities(activities);
    updateSessionCurrent(sessionId, {
        currentActivityCode: null,
        currentActivityName: null,
        currentOp: null,
        status: 'live',
    });
    return stopped;
}

export function getRunningActivity(sessionId) {
    return getActivities().find((a) => a.sessionId === sessionId && a.status === 'running') || null;
}

export { todayKey, uid };
