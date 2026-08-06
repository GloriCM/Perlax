import { api } from '../utils/api';

export const manufacturingOrdersApi = {
    listPendingOpening: () => api.get('/production/manufacturing-orders/pending-opening'),
    listOpened: () => api.get('/production/manufacturing-orders/opened'),
    getById: (id) => api.get(`/production/manufacturing-orders/${id}`),
    updatePending: (id, body) => api.request(`/production/manufacturing-orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(body),
    }),
    open: (id, body) => api.request(`/production/manufacturing-orders/${id}/open`, {
        method: 'PUT',
        body: JSON.stringify(body),
    }),
};

export function calcQuantityToProduce(quantityOrdered, receiptPercentage) {
    const qty = Number(quantityOrdered || 0);
    const pct = Number(receiptPercentage || 0);
    if (qty <= 0) return 0;
    return Math.ceil(qty * (1 + pct / 100));
}