import { api } from '../utils/api';

const dateParam = (value) => {
    if (!value) return '';
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
};

export const schedulingApi = {
    listProcesses: () => api.get('/production/scheduling/processes'),
    listAllProcesses: () => api.get('/production/scheduling/processes/all'),
    createProcess: (body) => api.post('/production/scheduling/processes', body),
    updateProcess: (id, body) => api.put(`/production/scheduling/processes/${id}`, body),
    reorderProcesses: (orderedIds) => api.put('/production/scheduling/processes/reorder', { orderedIds }),
    deleteProcess: (id) => api.delete(`/production/scheduling/processes/${id}`),
    listShifts: () => api.get('/production/scheduling/shifts'),
    createShift: (body) => api.post('/production/scheduling/shifts', body),
    updateShift: (id, body) => api.put(`/production/scheduling/shifts/${id}`, body),
    deleteShift: (id) => api.delete(`/production/scheduling/shifts/${id}`),
    getRoster: ({ weekStart, q } = {}) => {
        const params = new URLSearchParams();
        if (weekStart) params.set('weekStart', dateParam(weekStart));
        if (q) params.set('q', q);
        const qs = params.toString();
        return api.get(`/production/scheduling/roster${qs ? `?${qs}` : ''}`);
    },
    createRosterRow: (body) => api.post('/production/scheduling/roster/rows', body),
    updateRosterRow: (id, body) => api.put(`/production/scheduling/roster/rows/${id}`, body),
    deleteRosterRow: (id) => api.delete(`/production/scheduling/roster/rows/${id}`),
    copyPreviousRoster: (weekStart) => api.post('/production/scheduling/roster/copy-previous', { weekStart }),
    getCoverage: ({ weekStart, q } = {}) => {
        const params = new URLSearchParams();
        if (weekStart) params.set('weekStart', dateParam(weekStart));
        if (q) params.set('q', q);
        const qs = params.toString();
        return api.get(`/production/scheduling/roster/coverage${qs ? `?${qs}` : ''}`);
    },
    createCoverageAssignment: (body) => api.post('/production/scheduling/roster/coverage/assignments', body),
    deleteCoverageAssignment: (id) => api.delete(`/production/scheduling/roster/coverage/assignments/${id}`),
    getAvailableOperators: ({ weekStart, processCode, date } = {}) => {
        const params = new URLSearchParams();
        if (weekStart) params.set('weekStart', dateParam(weekStart));
        if (processCode) params.set('processCode', processCode);
        if (date) params.set('date', dateParam(date));
        return api.get(`/production/scheduling/roster/available-operators?${params.toString()}`);
    },
    getMachineShifts: (machineId) => api.get(`/production/scheduling/machines/${machineId}/shifts`),
    setMachineShifts: (machineId, enabledShiftIds) => api.put(`/production/scheduling/machines/${machineId}/shifts`, { enabledShiftIds }),
    getBillingSummary: ({ year, month } = {}) => {
        const params = new URLSearchParams();
        if (year) params.set('year', String(year));
        if (month) params.set('month', String(month));
        return api.get(`/production/scheduling/billing/summary?${params.toString()}`);
    },
    getBillingMeta: ({ year, month } = {}) => {
        const params = new URLSearchParams();
        if (year) params.set('year', String(year));
        if (month) params.set('month', String(month));
        return api.get(`/production/scheduling/billing/meta?${params.toString()}`);
    },
    setBillingMeta: (body) => api.put('/production/scheduling/billing/meta', body),
    listSchedulingMachines: (processCode) => {
        const params = new URLSearchParams();
        if (processCode) params.set('processCode', processCode);
        const qs = params.toString();
        return api.get(`/production/scheduling/machines${qs ? `?${qs}` : ''}`);
    },
    listOpenOrders: (q) => {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        const qs = params.toString();
        return api.get(`/production/scheduling/open-orders${qs ? `?${qs}` : ''}`);
    },
    getOrderPrefill: (id) => api.get(`/production/scheduling/open-orders/${id}/prefill`),
    getGantt: ({ year, month, q, status } = {}) => {
        const params = new URLSearchParams();
        if (year) params.set('year', String(year));
        if (month) params.set('month', String(month));
        if (q) params.set('q', q);
        if (status) params.set('status', status);
        const qs = params.toString();
        return api.get(`/production/scheduling/gantt${qs ? `?${qs}` : ''}`);
    },
    getList: ({ year, month, q, status } = {}) => {
        const params = new URLSearchParams();
        if (year) params.set('year', String(year));
        if (month) params.set('month', String(month));
        if (q) params.set('q', q);
        if (status) params.set('status', status);
        const qs = params.toString();
        return api.get(`/production/scheduling/list${qs ? `?${qs}` : ''}`);
    },
    getCurrentForMachine: ({ machineId, date }) => {
        const params = new URLSearchParams();
        params.set('machineId', machineId);
        if (date) params.set('date', date);
        return api.get(`/production/scheduling/current?${params.toString()}`);
    },
    createBlock: (body) => api.post('/production/scheduling/blocks', body),
    updateBlock: (id, body) => api.put(`/production/scheduling/blocks/${id}`, body),
    deleteBlock: (id) => api.delete(`/production/scheduling/blocks/${id}`),
    programOrder: (body) => api.post('/production/scheduling/program', body),
    deleteProgram: (manufacturingOrderId) => api.delete(`/production/scheduling/program/${manufacturingOrderId}`),
};

export const STATUS_FILTERS = [
    { value: '', label: 'Todos' },
    { value: 'Programado', label: 'Programado' },
    { value: 'EnProceso', label: 'En ejecucion' },
    { value: 'Hecho', label: 'Finalizado' },
    { value: 'Cancelado', label: 'Cancelado' },
];