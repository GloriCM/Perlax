/** Tipos de requisición (4 categorías con color) — alineado con AlmacenCatalog backend */
export const TIPOS_REQUISICION = [
    { id: 'consumo_diario', label: 'Insumos de Consumo Diario', color: '#22c55e' },
    { id: 'cajas_empaque', label: 'Cajas y Empaque', color: '#3b82f6' },
    { id: 'gomas_adhesivos', label: 'Gomas y Adhesivos', color: '#eab308' },
    { id: 'pantone', label: 'Tinta', color: '#a855f7' },
];

export const UNIDADES_MEDIDA = ['kg', 'unidades', 'metros', 'litros', 'rollos', 'cajas', 'galones'];

export const ESTADOS_REQUISICION = ['Pendiente', 'Pedido', 'Parcial', 'En Almacen'];

export const ESTADO_BADGE_COLORS = {
    Pendiente: { bg: '#fef3c7', text: '#b45309', border: '#fcd34d' },
    Pedido: { bg: '#dbeafe', text: '#1d4ed8', border: '#93c5fd' },
    Parcial: { bg: '#fce7f3', text: '#be185d', border: '#f9a8d4' },
    'En Almacen': { bg: '#dcfce7', text: '#15803d', border: '#86efac' },
};

export const ESTADO_FILTER_COLORS = {
    Todos: { bg: '#1e3a5f', text: '#fff' },
    Pendiente: { bg: '#fef3c7', text: '#b45309', count: '#ef4444' },
    Pedido: { bg: '#fee2e2', text: '#dc2626', count: '#ef4444' },
    Parcial: { bg: '#f3f4f6', text: '#6b7280', count: '#9ca3af' },
    'En Almacen': { bg: '#dcfce7', text: '#15803d', count: '#22c55e' },
};

export const FORMAS_PAGO = [
    { value: 'credito', label: 'Crédito' },
    { value: 'efectivo', label: 'Efectivo' },
];

export const CATEGORIAS_PROVEEDOR_EMPRESA = ['Declarante', 'No declarante', 'RST', 'Autoretenedor'];
export const CATEGORIAS_PROVEEDOR_PERSONA = ['No responsable IVA', 'Responsable IVA'];

/** Reglas fiscales Colombia para órdenes de compra */
export const FISCAL_COLOMBIA = {
    iva: 0.19,
    retefuente: {
        bienes: 0.025,
        servicios: 0.04,
        honorarios: 0.11,
    },
    /** ReteICA típica Bogotá: 9.66 x 1000 */
    reteica: 0.00966,
    /** ReteIVA para proveedor régimen RST: 15% del IVA causado */
    reteivaRst: 0.15,
    umbralReteica: 0,
};

export function getTipoRequisicion(id) {
    return TIPOS_REQUISICION.find((t) => t.id === id) || TIPOS_REQUISICION[0];
}

export function calcularImpuestosColombia({
    subtotal = 0,
    categoriaProveedor = '',
    responsableIva = false,
    tipoRetefuente = 'bienes',
} = {}) {
    const base = Math.max(0, Number(subtotal) || 0);
    const cat = String(categoriaProveedor || '').trim();
    const esRst = cat.toUpperCase() === 'RST';

    const iva = responsableIva ? 0 : base * FISCAL_COLOMBIA.iva;
    const tasaRetefuente = FISCAL_COLOMBIA.retefuente[tipoRetefuente] ?? FISCAL_COLOMBIA.retefuente.bienes;
    const retefuente = cat === 'No declarante' ? 0 : base * tasaRetefuente;
    const reteica = base >= FISCAL_COLOMBIA.umbralReteica ? base * FISCAL_COLOMBIA.reteica : 0;
    const reteiva = esRst ? iva * FISCAL_COLOMBIA.reteivaRst : 0;
    const totalNeto = base + iva - retefuente - reteica - reteiva;

    return {
        base,
        iva,
        retefuente,
        reteica,
        reteiva,
        totalNeto,
        desglose: [
            { label: 'Subtotal', value: base },
            { label: 'IVA (19%)', value: iva },
            { label: 'Retefuente', value: -retefuente },
            { label: 'ReteICA', value: -reteica },
            ...(reteiva ? [{ label: 'ReteIVA (RST)', value: -reteiva }] : []),
            { label: 'Total neto', value: totalNeto },
        ],
    };
}

export const PAGE_SIZE = 10;
