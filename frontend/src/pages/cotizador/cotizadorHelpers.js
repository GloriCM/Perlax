import { api } from '../../utils/api';

export const DEFAULT_QTY = [5000, 10000, 20000, 50000, 100000];

export const STEPS_CAJA = [1, 2, 3, 4, 6, 7, 8, 9, 10];
export const STEPS_BOLSA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const STEP_LABELS = {
    1: 'Datos generales',
    2: 'Medidas y material',
    3: 'Impresión',
    4: 'Micro y cordón',
    5: 'Refuerzo',
    6: 'Troquel',
    7: 'Cantidad',
    8: 'Servicios',
    9: 'Flete',
    10: 'Resumen',
};

export const BARNIZ_OPTIONS = [
    { value: 'uv', label: 'UV', factor: 0.04 },
    { value: 'aqueo', label: 'Aqueo', factor: 0.03 },
    { value: 'otro', label: 'Otro', factor: 0.04 },
];

export const FREIGHT_OPTIONS = [
    { value: 'SinFlete', label: 'Sin flete' },
    { value: 'Local', label: 'Local' },
    { value: 'Nacional', label: 'Nacional' },
];

export const SERVICIO_OPTIONS = [
    { key: 'conversion', label: 'Conversión' },
    { key: 'corte1', label: 'Corte 1' },
    { key: 'corte2', label: 'Corte 2' },
    { key: 'impresion', label: 'Impresión' },
    { key: 'corrugado', label: 'Corrugado' },
    { key: 'laminado', label: 'Laminado' },
    { key: 'troquelado', label: 'Troquelado' },
    { key: 'pegado', label: 'Pegado' },
];

export function createInitialForm(user) {
    return {
        productType: 'Caja',
        clientName: '',
        workName: '',
        partName: '',
        sellerName: user?.username || user?.Username || '',
        largoMm: '',
        anchoMm: '',
        cabida: '',
        materialId: null,
        materialName: '',
        precioMaterialM2: '',
        impresoraMachineId: null,
        impresoraName: '',
        numeroPlanchas: 4,
        nombrePlancha: '',
        precioPlancha: 0,
        cubrimiento: 80,
        vecesImprimir: 1,
        tipoBarniz: '',
        factorBarniz: 0.04,
        terminadoNombre: '',
        precioTerminadoM2: 0,
        microId: null,
        microName: '',
        precioMicroM2: 0,
        tipoCordon: '',
        largoCordon: 0,
        precioCordon: 0,
        numeroRefuerzos: 0,
        anchoVentanilla: 0,
        largoVentanilla: 0,
        precioTroquel: 0,
        quantities: [...DEFAULT_QTY],
        primaryQtyIndex: 0,
        contratoServicios: 0,
        freightType: 'Local',
        servicios: {
            conversion: false,
            corte1: false,
            corte2: false,
            impresion: true,
            corrugado: false,
            laminado: false,
            troquelado: false,
            pegado: false,
        },
    };
}

export const toInputNumber = (value) =>
    value === '' || value === null || value === undefined ? '' : value;

export function formatMoney(value) {
    const n = Number(value);
    if (!Number.isFinite(n)) return '—';
    return n.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export async function fetchMaterialOptions() {
    try {
        const rows = await api.get('/production/cotizador/materials');
        if (Array.isArray(rows) && rows.length > 0) {
            return rows.map((m) => ({
                id: String(m.id),
                name: m.name,
                pricePerM2: Number(m.pricePerM2) || 0,
            }));
        }
    } catch (err) {
        console.warn('Materiales API no disponibles', err);
    }
    return [];
}

export async function fetchMachineOptions() {
    try {
        const rows = await api.get('/production/cotizador/machines');
        if (Array.isArray(rows)) {
            return rows.map((m) => ({
                id: String(m.id),
                name: m.name,
            }));
        }
    } catch (err) {
        console.warn('Máquinas API no disponibles', err);
    }
    return [];
}

export async function fetchPlanchaOptions() {
    try {
        const rows = await api.get('/production/cotizador/planchas');
        if (Array.isArray(rows)) {
            return rows.map((p) => ({
                id: String(p.id),
                name: p.name,
                price: Number(p.price) || 0,
            }));
        }
    } catch (err) {
        console.warn('Planchas API no disponibles', err);
    }
    return [];
}

export async function fetchMicroOptions() {
    try {
        const rows = await api.get('/production/cotizador/micro-flauta');
        if (Array.isArray(rows)) {
            return rows.map((m) => ({
                id: String(m.id),
                name: m.name,
                pricePerM2: Number(m.pricePerM2) || 0,
            }));
        }
    } catch (err) {
        console.warn('Micro/flauta API no disponibles', err);
    }
    return [];
}

export function buildCalculatePayload(form, isBolsa) {
    return {
        productType: form.productType,
        largoPliego: Number(form.largoMm) / 1000,
        anchoPliego: Number(form.anchoMm) / 1000,
        cabida: Number(form.cabida),
        precioMaterialM2: Number(form.precioMaterialM2),
        numeroPlanchas: Number(form.numeroPlanchas),
        precioPlancha: Number(form.precioPlancha),
        cubrimientoPct: Number(form.cubrimiento),
        vecesImprimir: Number(form.vecesImprimir),
        factorBarniz: Number(form.factorBarniz),
        precioTerminadoM2: Number(form.precioTerminadoM2),
        precioMicroM2: Number(form.precioMicroM2),
        largoCordonCm: isBolsa ? Number(form.largoCordon) : 0,
        precioCordonManija: isBolsa ? Number(form.precioCordon) : 0,
        numeroRefuerzos: isBolsa ? Number(form.numeroRefuerzos) : 0,
        anchoVentanillaCm: isBolsa ? Number(form.anchoVentanilla) : 0,
        largoVentanillaCm: isBolsa ? Number(form.largoVentanilla) : 0,
        precioTroquel: Number(form.precioTroquel),
        quantities: form.quantities,
        primaryQuantityIndex: form.primaryQtyIndex,
        contratoServicios: Number(form.contratoServicios),
        freightType: form.freightType,
        servicios: form.servicios,
        impresoraMachineId: form.impresoraMachineId || null,
    };
}

export function getPrimaryResult(calcResult) {
    if (!calcResult?.results?.length) return null;
    return calcResult.results.find((r) => r.isPrimary) || calcResult.results[0];
}

export function breakdownRows(breakdown) {
    if (!breakdown) return [];
    return [
        { label: 'Material', value: breakdown.material },
        { label: 'Tinta', value: breakdown.tinta },
        { label: 'Planchas', value: breakdown.planchas },
        { label: 'Barniz', value: breakdown.barniz },
        { label: 'Terminado', value: breakdown.terminado },
        { label: 'Micro/Flauta', value: breakdown.microFlauta },
        { label: 'Cordón', value: breakdown.cordon },
        { label: 'Refuerzo', value: breakdown.refuerzo },
        { label: 'Ventanilla', value: breakdown.ventanilla },
        { label: 'Troquel', value: breakdown.troquel },
        { label: 'Subtotal materia prima', value: breakdown.subtotalMateriaPrima },
        { label: 'Desperdicio (3%)', value: breakdown.desperdicio },
        { label: 'Conversión', value: breakdown.conversion },
        { label: 'Corte 1', value: breakdown.corte1 },
        { label: 'Corte 2', value: breakdown.corte2 },
        { label: 'Impresión (servicio)', value: breakdown.impresion },
        { label: 'Corrugado', value: breakdown.corrugado },
        { label: 'Laminado', value: breakdown.laminado },
        { label: 'Troquelado', value: breakdown.troquelado },
        { label: 'Pegado', value: breakdown.pegado },
        { label: 'Subtotal servicios', value: breakdown.subtotalServicios },
        { label: 'Contrato servicios', value: breakdown.contratoServicios },
        { label: 'Flete', value: breakdown.flete },
    ];
}
