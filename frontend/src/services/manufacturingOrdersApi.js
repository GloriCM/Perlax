import { api } from '../utils/api';

export const manufacturingOrdersApi = {
    listPendingOpening: () => api.get('/production/manufacturing-orders/pending-opening'),
    listOpened: () => api.get('/production/manufacturing-orders/opened'),
    listStatusBoard: ({ status, q } = {}) => {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (q) params.set('q', q);
        const qs = params.toString();
        return api.get(`/production/manufacturing-orders/status-board${qs ? `?${qs}` : ''}`);
    },
    getById: (id) => api.get(`/production/manufacturing-orders/${id}`),
    updatePending: (id, body) => api.request(`/production/manufacturing-orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    }),
    open: (id, body) => api.request(`/production/manufacturing-orders/${id}/open`, {
        method: 'PUT',
        body: JSON.stringify(body),
    }),
    close: (id) => api.request(`/production/manufacturing-orders/${id}/close`, {
        method: 'PUT',
        body: JSON.stringify({}),
    }),
};

export function calcQuantityToProduce(quantityOrdered, receiptPercentage) {
    const qty = Number(quantityOrdered || 0);
    const pct = Number(receiptPercentage || 0);
    if (qty <= 0) return 0;
    return Math.ceil(qty * (1 + pct / 100));
}