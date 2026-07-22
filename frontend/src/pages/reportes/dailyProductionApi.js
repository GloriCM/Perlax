import { api, getApiOrigin } from '../../utils/api';

const dateParam = (value) => {
    if (!value) return '';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
};

const qs = (params) => {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        search.set(key, String(value));
    });
    const raw = search.toString();
    return raw ? `?${raw}` : '';
};

async function downloadBinary(endpoint, filename) {
    const userRaw = localStorage.getItem('user');
    let token = null;
    try {
        const user = userRaw ? JSON.parse(userRaw) : null;
        token = user?.token ?? user?.Token ?? null;
    } catch {
        token = null;
    }

    const base = String(import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
        || `${getApiOrigin()}/api`;
    const response = await fetch(`${base}${endpoint}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Error al exportar');
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

export const dailyProductionApi = {
    getCatalogs: () => api.get('/production/daily-reports/catalogs'),

    listMachines: (includeInactive = false) =>
        api.get(`/production/catalogs/machines${qs({ includeInactive })}`),
    createMachine: (body) => api.post('/production/catalogs/machines', body),
    updateMachine: (id, body) => api.put(`/production/catalogs/machines/${id}`, body),
    deleteMachine: (id) => api.delete(`/production/catalogs/machines/${id}`),

    listOperators: (includeInactive = false) =>
        api.get(`/production/catalogs/operators${qs({ includeInactive })}`),
    createOperator: (body) => api.post('/production/catalogs/operators', body),
    updateOperator: (id, body) => api.put(`/production/catalogs/operators/${id}`, body),
    deleteOperator: (id) => api.delete(`/production/catalogs/operators/${id}`),

    listActivityCodes: (includeInactive = false) =>
        api.get(`/production/catalogs/activity-codes${qs({ includeInactive })}`),
    createActivityCode: (body) => api.post('/production/catalogs/activity-codes', body),
    updateActivityCode: (id, body) => api.put(`/production/catalogs/activity-codes/${id}`, body),
    deleteActivityCode: (id) => api.delete(`/production/catalogs/activity-codes/${id}`),

    listDailyReports: ({ from, to, operatorName } = {}) =>
        api.get(`/production/daily-reports${qs({
            from: dateParam(from),
            to: dateParam(to),
            operatorName,
        })}`),

    getDailyReport: (id) => api.get(`/production/daily-reports/${id}`),

    listActivities: ({ date, machineId, operatorId, source, finishedOnly } = {}) =>
        api.get(`/production/daily-reports/activities${qs({
            date: dateParam(date),
            machineId,
            operatorId,
            source,
            finishedOnly: finishedOnly ? 'true' : undefined,
        })}`),

    listSessions: ({ date, status, machineId, operatorId } = {}) =>
        api.get(`/production/sessions${qs({
            date: dateParam(date),
            status,
            machineId,
            operatorId,
        })}`),

    saveManualBatch: (body) => api.post('/production/daily-reports/manual', body),
    saveLegacyReport: (body) => api.post('/production/daily-reports', body),
    updateLegacyReport: (id, body) => api.put(`/production/daily-reports/${id}`, body),

    exportExcel: ({ date, groupBy = 'operator', operatorId, machineId } = {}) =>
        downloadBinary(
            `/production/daily-reports/export${qs({
                date: dateParam(date),
                groupBy,
                operatorId,
                machineId,
            })}`,
            `reporte_${groupBy}_${dateParam(date)}.xlsx`
        ),

    importLocal: (payload) => api.post('/production/daily-reports/import-local', payload),

    // Planta (anónimo + red)
    plantaCatalogs: () => api.get('/planta/floor/catalogs', { skipAuthRedirect: true }),
    plantaSessions: (date) => api.get(`/planta/floor/sessions${qs({ date: dateParam(date) })}`, { skipAuthRedirect: true }),
    plantaStartSession: (body) => api.post('/planta/floor/sessions/start', body, { skipAuthRedirect: true }),
    plantaPause: (id) => api.post(`/planta/floor/sessions/${id}/pause`, {}, { skipAuthRedirect: true }),
    plantaResume: (id) => api.post(`/planta/floor/sessions/${id}/resume`, {}, { skipAuthRedirect: true }),
    plantaFinish: (id) => api.post(`/planta/floor/sessions/${id}/finish`, {}, { skipAuthRedirect: true }),
    plantaStartActivity: (sessionId, body) =>
        api.post(`/planta/floor/sessions/${sessionId}/activities`, body, { skipAuthRedirect: true }),
    plantaFinishActivity: (activityId, body) =>
        api.post(`/planta/floor/activities/${activityId}/finish`, body, { skipAuthRedirect: true }),
};

export function mapCatalogMachines(catalogs) {
    const list = catalogs?.machines || catalogs?.Machines || [];
    return list.map((m) => (typeof m === 'string'
        ? { id: null, code: m, name: m, isActive: true }
        : { id: m.id, code: m.code, name: m.name, isActive: m.isActive !== false }));
}

export function mapCatalogOperators(catalogs) {
    const list = catalogs?.operators || catalogs?.Operators || [];
    return list.map((o) => (typeof o === 'string'
        ? { id: null, code: o, displayName: o, isActive: true }
        : {
            id: o.id,
            code: o.code,
            displayName: o.displayName || o.name,
            documentNumber: o.documentNumber,
            userId: o.userId,
            isActive: o.isActive !== false,
        }));
}

export function mapCatalogProcessCodes(catalogs) {
    const list = catalogs?.processCodes || catalogs?.ProcessCodes || [];
    return list.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        requiresOrder: !!c.requiresOrder,
        allowsProductionQty: !!c.allowsProductionQty,
        isActive: c.isActive !== false,
        subcodes: (c.subcodes || []).map((s) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            requiresObservation: !!s.requiresObservation,
            isActive: s.isActive !== false,
        })),
    }));
}

/** Normaliza sesión API → forma usada por el explorer UI. */
export function normalizeSession(s) {
    if (!s) return null;
    return {
        id: s.id,
        date: typeof s.operationalDate === 'string'
            ? s.operationalDate.slice(0, 10)
            : dateParam(s.operationalDate),
        machineId: s.machineId,
        machineName: s.machineName || s.machineNameSnapshot,
        machineCode: s.machineCode,
        operatorId: s.operatorId,
        operatorName: s.operatorName || s.operatorNameSnapshot,
        operatorCode: s.operatorCode,
        shiftCode: s.shiftCode || s.shiftCodeSnapshot,
        status: s.status,
        source: s.source,
        metaTiros: s.metaTiros,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        pausedAt: s.pausedAt,
        currentActivityId: s.currentActivityId,
        currentActivityCode: s.currentActivityCode,
        currentActivityName: s.currentActivityName,
        currentOp: s.currentOp,
        concurrencyStamp: s.concurrencyStamp,
        activities: (s.activities || []).map(normalizeActivity),
    };
}

export function normalizeActivity(a) {
    if (!a) return null;
    return {
        id: a.id,
        sessionId: a.sessionId,
        date: typeof a.operationalDate === 'string'
            ? a.operationalDate.slice(0, 10)
            : dateParam(a.operationalDate),
        activityCode: a.activityCode || a.activityCodeSnapshot,
        activityName: a.activityName || a.activityNameSnapshot,
        subcode: a.subcode || a.subcodeSnapshot,
        subcodeDetail: a.subcodeDetail || a.subcodeDetailSnapshot,
        productionOrderNumber: a.productionOrderNumber,
        startAt: a.startAt,
        endAt: a.endAt,
        durationSeconds: a.durationSeconds,
        tiros: Number(a.quantityProcessed || a.tiros || 0),
        desperdicio: Number(a.waste || a.desperdicio || 0),
        observations: a.observations || '',
        status: a.status,
        source: a.source,
        machineId: a.machineId,
        machineName: a.machineName,
        operatorId: a.operatorId,
        operatorName: a.operatorName,
        shiftCode: a.shiftCode,
        quantityProcessed: Number(a.quantityProcessed || 0),
        waste: Number(a.waste || 0),
    };
}

export function buildLocalImportPayloadFromStorage() {
    const parse = (key) => {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const sessions = parse('perlax_production_sessions_v1');
    const activities = parse('perlax_production_activities_v1');
    const machinesRaw = parse('perlax_reporte_diario_machines_v1');

    const machines = [
        ...machinesRaw.map((name) => ({ code: '', name: String(name) })),
        ...sessions.map((s) => ({ code: s.machineId || '', name: s.machineName || '' })),
    ];
    const operators = sessions.map((s) => ({
        code: s.operatorId || '',
        displayName: s.operatorName || '',
    }));

    return {
        machines,
        operators,
        sessions: sessions.map((s) => ({
            localId: s.id,
            operationalDate: s.date,
            machineCode: s.machineId || '',
            machineName: s.machineName || '',
            operatorCode: s.operatorId || '',
            operatorName: s.operatorName || '',
            shiftCode: s.shiftCode || 'T1',
            status: s.status || 'finished',
            source: s.source || 'reporte-diario',
            startedAt: s.startedAt,
            endedAt: s.endedAt || null,
            currentActivityCode: s.currentActivityCode || null,
            currentOp: s.currentOp || null,
        })),
        activities: activities.map((a) => ({
            localId: a.id,
            sessionLocalId: a.sessionId,
            operationalDate: a.date,
            activityCode: a.activityCode,
            activityName: a.activityName,
            subcode: a.subcode,
            subcodeDetail: a.subcodeDetail,
            productionOrderNumber: a.productionOrderNumber,
            startAt: a.startAt,
            endAt: a.endAt,
            quantityProcessed: Number(a.tiros || 0),
            waste: Number(a.desperdicio || 0),
            observations: a.observations,
            status: a.status || 'done',
        })),
    };
}
