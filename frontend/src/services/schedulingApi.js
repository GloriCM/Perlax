import { api } from '../utils/api';

export const schedulingApi = {
    listProcesses: () => api.get('/production/scheduling/processes'),
    listOpenOrders: (q) => {
        const params = new URLSearchParams();
        if (q) params.set('q', q);
        const qs = params.toString();
        return api.get(`/production/scheduling/open-orders${qs ? `?${qs}` : ''}`);
    },
    getGantt: ({ year, month, q } = {}) => {
        const params = new URLSearchParams();
        if (year) params.set('year', String(year));
        if (month) params.set('month', String(month));
        if (q) params.set('q', q);
        const qs = params.toString();
        return api.get(`/production/scheduling/gantt${qs ? `?${qs}` : ''}`);
    },
    createBlock: (body) => api.post('/production/scheduling/blocks', body),
    updateBlock: (id, body) => api.put(`/production/scheduling/blocks/${id}`, body),
    deleteBlock: (id) => api.delete(`/production/scheduling/blocks/${id}`),
};