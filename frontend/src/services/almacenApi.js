import { api } from '../utils/api';

const qs = (params) => {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        search.set(key, String(value));
    });
    const raw = search.toString();
    return raw ? `?${raw}` : '';
};

async function patch(endpoint, data) {
    return api.request(endpoint, {
        method: 'PATCH',
        body: JSON.stringify(data),
    });
}

export const almacenApi = {
    getCatalogos: () => api.get('/almacen/catalogos'),

    listProductos: ({ tipo, q, unidad } = {}) =>
        api.get(`/almacen/productos${qs({ tipo, q, unidad })}`),
    createProducto: (body) => api.post('/almacen/productos', body),
    updateProducto: (id, body) => api.put(`/almacen/productos/${id}`, body),
    deleteProducto: (id) => api.delete(`/almacen/productos/${id}`),
    importProductosExcel: (file) => {
        const fd = new FormData();
        fd.append('file', file);
        return api.postFormData('/almacen/productos/importar-excel', fd);
    },

    listProveedores: ({ q, limit = 50 } = {}) =>
        api.get(`/almacen/proveedores${qs({ q, limit })}`),
    createProveedor: (body) => api.post('/almacen/proveedores', body),
    updateProveedor: (id, body) => api.put(`/almacen/proveedores/${id}`, body),
    deleteProveedor: (id) => api.delete(`/almacen/proveedores/${id}`),
    deleteAllProveedores: () => api.delete('/almacen/proveedores/todos'),
    importProveedoresExcel: (file) => {
        const fd = new FormData();
        fd.append('file', file);
        return api.postFormData('/almacen/proveedores/importar-excel', fd);
    },

    searchOrdenesProduccion: ({ q, limit = 30 } = {}) =>
        api.get(`/almacen/ordenes-produccion${qs({ q, limit })}`),

    listRequisiciones: ({ tipo, estado, q } = {}) =>
        api.get(`/almacen/requisiciones${qs({ tipo, estado, q })}`),
    getRequisicion: (id) => api.get(`/almacen/requisiciones/${id}`),
    createRequisicion: (body) => api.post('/almacen/requisiciones', body),
    updateRequisicion: (id, body) => api.put(`/almacen/requisiciones/${id}`, body),
    deleteRequisicion: (id) => api.delete(`/almacen/requisiciones/${id}`),

    guardarPedido: (id, body) => api.put(`/almacen/requisiciones/${id}/pedido`, body),
    patchPagadoProveedor: (requisicionId, proveedorId, body) =>
        patch(`/almacen/requisiciones/${requisicionId}/pedido/proveedores/${proveedorId}/pagado`, body),
    registrarRecepcion: (id, body) => api.post(`/almacen/requisiciones/${id}/recepciones`, body),
    deletePedido: (id) => api.delete(`/almacen/requisiciones/${id}/pedido`),

    listOrdenesCompra: ({ estado, proveedorCatalogoId, nombreProveedor, nit } = {}) =>
        api.get(`/almacen/ordenes-compra${qs({ estado, proveedorCatalogoId, nombreProveedor, nit })}`),
    getOrdenCompra: (id) => api.get(`/almacen/ordenes-compra/${id}`),
    consolidarOrdenCompra: (body) => api.post('/almacen/ordenes-compra/consolidar', body),
    repararAsignaciones: () => api.post('/almacen/ordenes-compra/reparar-asignaciones', {}),

    resetPruebas: () => api.delete('/almacen/pruebas/reset'),
};
