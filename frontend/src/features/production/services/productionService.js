import api from '../../../services/api';

const productionService = {
    getOrders: async () => {
        const response = await api.get('/production/orders');
        return response.data;
    },

    getOrder: async (id) => {
        const response = await api.get(`/production/orders/${id}`);
        return response.data;
    },

    createOrder: async (orderData) => {
        const response = await api.post('/production/orders', orderData);
        return response.data;
    },

    updateOrder: async (id, orderData) => {
        const response = await api.put(`/production/orders/${id}`, orderData);
        return response.data;
    },

    deleteOrder: async (id) => {
        const response = await api.delete(`/production/orders/${id}`);
        return response.data;
    }
};

export default productionService;
