import { api, getApiOrigin } from '../../utils/api';

export const DEFAULT_QTY = [5000, 10000, 20000, 50000, 100000];

export const STEPS_CAJA = [1, 2, 3, 4, 6, 7, 8, 9, 10];
export const STEPS_BOLSA = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

export const STEP_LABELS = {
    1: 'Datos generales',
    2: 'Medidas y material',
    3: 'Impresión / barniz / terminado',
    4: 'Micro y cordón',
    5: 'Refuerzo / ventanilla',
    6: 'Troquel y películas',
    7: 'Cantidad',
    8: 'Servicios y contrato',
    9: 'Flete y plazo',
    10: 'Resumen',
};

/** Destino de flete: local, nacional o sin flete. */
export const FREIGHT_OPTIONS = [
    { value: 'SinFlete', label: 'Sin flete' },
    { value: 'Local', label: 'Local (l)' },
    { value: 'Nacional', label: 'Nacional (n)' },
];

export const PLAZO_PAGO_OPTIONS = [
    { value: '0', label: 'Contado / 0 días' },
    { value: '30', label: '30 días' },
    { value: '60', label: '60 días' },
    { value: '90', label: '90 días' },
];

export const SERVICIO_OPTIONS = [
    { key: 'conversion', label: 'Conversión' },
    { key: 'corte', label: 'Corte' },
    { key: 'impresion', label: 'Impresión' },
    { key: 'corrugado', label: 'Corrugado' },
    { key: 'laminado', label: 'Laminado' },
    { key: 'troquelado', label: 'Troquelado' },
    { key: 'pegado', label: 'Pegado' },
];

/** Campos técnicos por pieza. */
export const PIECE_FIELD_KEYS = [
    'partName',
    'largoMm', 'anchoMm', 'cabida',
    'materialId', 'materialName', 'precioMaterialM2',
    'numeroPlanchas', 'nombrePlancha', 'precioPlancha',
    'cubrimiento', 'vecesImprimir',
    'tipoBarniz', 'factorBarniz',
    'terminadoNombre', 'precioTerminadoM2',
    'microId', 'microName', 'precioMicroM2',
    'tipoCordon', 'largoCordon', 'precioCordon',
    'numeroRefuerzos', 'anchoVentanilla', 'largoVentanilla',
    'precioTroquel', 'usaPeliculas',
];

export function createEmptyPiece(partName = 'Pieza 1') {
    return {
        partName,
        largoMm: '',
        anchoMm: '',
        cabida: '',
        materialId: null,
        materialName: '',
        precioMaterialM2: '',
        numeroPlanchas: 4,
        nombrePlancha: '',
        precioPlancha: 0,
        cubrimiento: 80,
        vecesImprimir: 1,
        tipoBarniz: '',
        factorBarniz: 0,
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
        usaPeliculas: false,
    };
}

export function createInitialForm(user) {
    const piece = createEmptyPiece('Pieza 1');
    return {
        productType: 'Caja',
        clientName: '',
        workName: '',
        sellerName: user?.username || user?.Username || '',
        customerId: null,
        ...piece,
        pieces: [piece],
        activePieceIndex: 0,
        quantities: [...DEFAULT_QTY],
        primaryQtyIndex: 0,
        contratoServicios: 0,
        freightType: 'Local',
        fleteManual: '',
        plazoPagoDias: 0,
        servicios: {
            conversion: false,
            corte: false,
            impresion: true,
            corrugado: false,
            laminado: false,
            troquelado: false,
            pegado: false,
        },
    };
}

function isBlankPieceValue(value) {
    return value === '' || value === null || value === undefined;
}

/** Un 0 o un vacío del input no debe borrar un largo, precio o cabida ya escritos. */
const NUMERIC_KEEP_KEYS = new Set([
    'largoMm', 'anchoMm', 'cabida', 'precioMaterialM2',
    'numeroPlanchas', 'precioPlancha', 'cubrimiento', 'precioTroquel',
    'precioTerminadoM2', 'vecesImprimir', 'factorBarniz', 'precioMicroM2',
]);

function keepExistingPieceValue(key, incoming, existing) {
    if (NUMERIC_KEEP_KEYS.has(key)) {
        const incomingN = parseLocaleNumber(incoming);
        const existingN = parseLocaleNumber(existing);
        // Texto a medias ("0," ) se conserva para poder seguir escribiendo.
        if (typeof incoming === 'string' && /[.,]$/.test(incoming.trim())) return false;
        if (!(incomingN > 0) && existingN > 0) return true;
        return false;
    }
    if ((key === 'materialId' || key === 'materialName') && isBlankPieceValue(incoming) && !isBlankPieceValue(existing)) {
        return true;
    }
    return isBlankPieceValue(incoming) && !isBlankPieceValue(existing);
}

/** Persiste campos de pieza activa en pieces[activePieceIndex]. No pisa un dato ya escrito con vacío ni con 0. */
export function syncActivePieceIntoList(form) {
    const source = form && typeof form === 'object' ? form : {};
    const pieces = Array.isArray(source.pieces) && source.pieces.length > 0
        ? source.pieces.filter((p) => p && typeof p === 'object').map((p) => ({ ...p }))
        : [createEmptyPiece(source.partName || 'Pieza 1')];
    if (pieces.length === 0) pieces.push(createEmptyPiece(source.partName || 'Pieza 1'));
    const idx = Math.min(Math.max(0, source.activePieceIndex || 0), pieces.length - 1);
    const snapshot = {};
    const rootPatch = {};
    for (const key of PIECE_FIELD_KEYS) {
        const incoming = source[key];
        const existing = pieces[idx][key];
        if (keepExistingPieceValue(key, incoming, existing)) {
            snapshot[key] = existing;
            rootPatch[key] = existing;
        } else if (!isBlankPieceValue(incoming)) {
            snapshot[key] = incoming;
        } else {
            snapshot[key] = existing;
        }
    }
    pieces[idx] = { ...pieces[idx], ...snapshot };
    return { ...source, ...rootPatch, pieces, activePieceIndex: idx };
}

function fillPieceNumbers(target, backup) {
    const next = { ...(target || {}) };
    if (!backup) return next;
    for (const key of NUMERIC_KEEP_KEYS) {
        if (!(parseLocaleNumber(next[key]) > 0) && parseLocaleNumber(backup[key]) > 0) {
            next[key] = backup[key];
        }
    }
    if (isBlankPieceValue(next.materialId) && !isBlankPieceValue(backup.materialId)) next.materialId = backup.materialId;
    if (isBlankPieceValue(next.materialName) && !isBlankPieceValue(backup.materialName)) next.materialName = backup.materialName;
    if (isBlankPieceValue(next.partName) && !isBlankPieceValue(backup.partName)) next.partName = backup.partName;
    return next;
}

/** Recupera medidas ya escritas si un render posterior las dejó en blanco. */
export function restoreQuoteInputs(form, backup) {
    const synced = syncActivePieceIntoList(form);
    if (!backup) return synced;
    const pieces = (synced.pieces || []).map((p, i) => fillPieceNumbers(p, backup.pieces?.[i]));
    const root = fillPieceNumbers(synced, backup);
    const servicios = { ...(backup.servicios || {}), ...(synced.servicios || {}) };
    const backupOn = backup.servicios && Object.values(backup.servicios).some(Boolean);
    const currentOn = Object.values(synced.servicios || {}).some(Boolean);
    return syncActivePieceIntoList({
        ...synced,
        ...root,
        pieces,
        servicios: currentOn ? synced.servicios : (backupOn ? backup.servicios : servicios),
    });
}

function firstPositive(values) {
    for (const value of values) {
        const n = parseLocaleNumber(value);
        if (n > 0) return n;
    }
    return 0;
}

/** Primer dato que impide calcular, con el paso donde se escribe. */
export function findQuoteGaps(form) {
    const synced = syncActivePieceIntoList(form);
    const pieces = synced.pieces?.length ? synced.pieces : [synced];
    const multi = pieces.length > 1;
    const measureProblems = [];
    pieces.forEach((p, i) => {
        const fallback = !multi || i === (synced.activePieceIndex || 0) ? synced : p;
        const name = multi ? (p.partName || `Pieza ${i + 1}`) : '';
        const tag = name ? ` de ${name}` : '';
        const largo = firstPositive([p?.largoMm, p?.largoPliego, fallback?.largoMm, fallback?.largoPliego]);
        const ancho = firstPositive([p?.anchoMm, p?.anchoPliego, fallback?.anchoMm, fallback?.anchoPliego]);
        const cabida = firstPositive([p?.cabida, fallback?.cabida]);
        if (!(largo > 0)) measureProblems.push(`el largo${tag}`);
        if (!(ancho > 0)) measureProblems.push(`el ancho${tag}`);
        if (!(cabida > 0)) measureProblems.push(`la cabida${tag}`);
    });
    const materialName = String(
        synced.materialName || synced.materialId || pieces.find((p) => p?.materialName || p?.materialId)?.materialName || '',
    ).trim();
    const materialPrice = firstPositive([
        synced.precioMaterialM2,
        ...pieces.map((p) => p?.precioMaterialM2),
    ]);
    const materialMissing = !materialName || !(materialPrice > 0);
    if (measureProblems.length > 0 || materialMissing) {
        const bits = [...measureProblems];
        if (materialMissing) bits.push('el material y su precio por m²');
        return {
            stepId: 2,
            message: `En Medidas y material falta ${bits.join(', ')}.`,
        };
    }
    if (!(parseLocaleNumber(synced.numeroPlanchas) > 0) || !(parseLocaleNumber(synced.precioPlancha) > 0) || !(parseLocaleNumber(synced.cubrimiento) > 0)) {
        const bits = [];
        if (!(parseLocaleNumber(synced.numeroPlanchas) > 0)) bits.push('el número de planchas');
        if (!(parseLocaleNumber(synced.precioPlancha) > 0)) bits.push('el precio de la plancha');
        if (!(parseLocaleNumber(synced.cubrimiento) > 0)) bits.push('el cubrimiento');
        return {
            stepId: 3,
            message: `En Impresión falta ${bits.join(', ')}.`,
        };
    }
    const quantities = Array.isArray(synced.quantities) ? synced.quantities : [];
    if (!quantities.some((q) => Number(q) > 0)) {
        return { stepId: 7, message: 'En Cantidad escriba al menos una cantidad mayor que cero.' };
    }
    const s = synced.servicios || {};
    const hasProcess = Boolean(
        s.conversion || s.corte || s.corte1 || s.corte2 || s.impresion || s.corrugado || s.laminado || s.troquelado || s.pegado,
    );
    if (!hasProcess) {
        return {
            stepId: 8,
            message: 'En Servicios y contrato marque al menos un proceso de máquina, por ejemplo Impresión.',
        };
    }
    return null;
}

/** Carga fields de pieces[index] al form raíz. */
export function activatePiece(form, index) {
    const synced = syncActivePieceIntoList(form);
    const idx = Math.min(Math.max(0, index), synced.pieces.length - 1);
    const piece = synced.pieces[idx];
    return { ...synced, ...piece, activePieceIndex: idx };
}

export function addPiece(form, partName) {
    const synced = syncActivePieceIntoList(form);
    const name = partName || `Pieza ${synced.pieces.length + 1}`;
    const prev = synced.pieces[synced.activePieceIndex] || {};
    const piece = {
        ...createEmptyPiece(name),
        ...prev,
        partName: name,
        largoMm: '',
        anchoMm: '',
        cabida: '',
    };
    const next = [...synced.pieces, piece];
    return activatePiece({ ...synced, pieces: next }, next.length - 1);
}

export function removeActivePiece(form) {
    const synced = syncActivePieceIntoList(form);
    if (synced.pieces.length <= 1) return synced;
    const next = synced.pieces.filter((_, i) => i !== synced.activePieceIndex);
    return activatePiece({ ...synced, pieces: next }, Math.min(synced.activePieceIndex, next.length - 1));
}

export function normalizeLoadedForm(parsed, user) {
    const base = createInitialForm(user);
    const merged = { ...base, ...parsed };
    if (!Array.isArray(merged.quantities) || merged.quantities.length === 0) {
        merged.quantities = [...DEFAULT_QTY];
    }
    if (!merged.servicios || typeof merged.servicios !== 'object' || Array.isArray(merged.servicios)) {
        merged.servicios = { ...base.servicios };
    }
    if (isBlankPieceValue(merged.largoMm) && !isBlankPieceValue(merged.largoPliego)) merged.largoMm = merged.largoPliego;
    if (isBlankPieceValue(merged.anchoMm) && !isBlankPieceValue(merged.anchoPliego)) merged.anchoMm = merged.anchoPliego;
    if (!Array.isArray(merged.pieces) || merged.pieces.length === 0) {
        const piece = createEmptyPiece(merged.partName || 'Pieza 1');
        for (const key of PIECE_FIELD_KEYS) {
            if (merged[key] !== undefined) piece[key] = merged[key];
        }
        merged.pieces = [piece];
        merged.activePieceIndex = 0;
    } else {
        merged.pieces = merged.pieces.filter((p) => p && typeof p === 'object');
        if (merged.pieces.length === 0) merged.pieces = [createEmptyPiece(merged.partName || 'Pieza 1')];
    }
    // Legado: Corte 1 / Corte 2 → un solo Corte
    if (merged.servicios && typeof merged.servicios === 'object') {
        const s = { ...merged.servicios };
        if (s.corte1 || s.corte2) s.corte = Boolean(s.corte || s.corte1 || s.corte2);
        delete s.corte1;
        delete s.corte2;
        merged.servicios = { ...base.servicios, ...s };
    }
    return activatePiece(merged, merged.activePieceIndex || 0);
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

export async function fetchBarnizOptions() {
    try {
        const rows = await api.get('/production/cotizador/barnices');
        if (Array.isArray(rows) && rows.length > 0) {
            return rows.map((b) => ({
                id: String(b.id),
                name: b.name,
                factor: Number(b.factor) || 0,
            }));
        }
    } catch (err) {
        console.warn('Barnices API no disponibles', err);
    }
    return [];
}

export async function fetchTerminadoOptions() {
    try {
        const rows = await api.get('/production/cotizador/terminados');
        if (Array.isArray(rows)) {
            return rows.map((t) => ({
                id: String(t.id),
                name: t.name,
                pricePerM2: Number(t.pricePerM2) || 0,
            }));
        }
    } catch (err) {
        console.warn('Terminados API no disponibles', err);
    }
    return [];
}

export async function fetchCordonOptions() {
    try {
        const rows = await api.get('/production/cotizador/cordones');
        if (Array.isArray(rows)) {
            return rows.map((c) => ({
                id: String(c.id),
                name: c.name,
                pricePerManija: Number(c.pricePerManija) || 0,
            }));
        }
    } catch (err) {
        console.warn('Cordones API no disponibles', err);
    }
    return [];
}

/** Factores de flete del catálogo (BX$4 / BY$4 / BZ$4). */
export async function fetchFreightFactors() {
    const defaults = { relativo: 0.35, local: 96.3, nacional: 428 };
    try {
        const rows = await api.get('/production/cotizador/catalogs/factors');
        if (!Array.isArray(rows)) return defaults;
        const byKey = Object.fromEntries(
            rows.map((f) => [String(f.key || f.Key || '').toUpperCase(), Number(f.value ?? f.Value) || 0]),
        );
        return {
            relativo: byKey.FLETE_RELATIVO || defaults.relativo,
            local: byKey.FLETE_LOCAL || defaults.local,
            nacional: byKey.FLETE_NACIONAL || defaults.nacional,
        };
    } catch (err) {
        console.warn('Factores de flete no disponibles', err);
        return defaults;
    }
}

/**
 * Vista previa del flete unitario.
 * área = (largo_m × ancho_m) / cabida
 * base = área × relativo; Local = base × local; Nacional = base × nacional
 */
export function previewFreightForPiece(piece, freightType, factors) {
    const largoM = pliegoToMeters(piece?.largoMm || piece?.largoPliego);
    const anchoM = pliegoToMeters(piece?.anchoMm || piece?.anchoPliego);
    const cabida = parseLocaleNumber(piece?.cabida);
    const area = cabida > 0 ? (largoM * anchoM) / cabida : 0;
    const relativo = Number(factors?.relativo) || 0.35;
    const multLocal = Number(factors?.local) || 96.3;
    const multNacional = Number(factors?.nacional) || 428;
    const bx = area * relativo;
    const by = bx * multLocal;
    const bz = bx * multNacional;
    const type = freightType || 'SinFlete';
    let selected = 0;
    if (type === 'Local') selected = by;
    else if (type === 'Nacional') selected = bz;
    return {
        area,
        relativo,
        multLocal,
        multNacional,
        bx,
        by,
        bz,
        selected,
        type,
    };
}

export function openCotizacionPdf(quoteId, type = 'propuesta', tier = 'Al3') {
    if (!quoteId) return;
    let token = null;
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        token = user?.Token || user?.token || null;
    } catch {
        token = null;
    }
    const qs = new URLSearchParams();
    if (token) qs.set('access_token', token);
    if (type === 'propuesta' && tier) qs.set('tier', tier);
    if (type === 'propuesta' && typeof window !== 'undefined' && window.location?.origin)
        qs.set('assetBase', window.location.origin);
    const q = qs.toString();
    const url = `${getApiOrigin()}/api/production/cotizador/${quoteId}/pdf/${type}${q ? `?${q}` : ''}`;
    const win = window.open(url, '_blank');
    if (!win) {
        // Popup bloqueado: abrir en la misma pestaña
        window.location.assign(url);
    }
}

/** Acepta 0.35, 0,35, "$ 1.900" o "1.900,50" (es-CO). */
export function parseLocaleNumber(value) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (value === '' || value === null || value === undefined) return 0;
    let s = String(value).trim().toLowerCase();
    s = s.replace(/\s/g, '').replace(/\$/g, '').replace(/m²|m2|mm|cm/g, '');
    s = s.replace(/[‚，]/g, ',');
    if (s.endsWith('m')) s = s.slice(0, -1);
    if (!s || s === '-' || s === ',' || s === '.') return 0;
    const lastComma = s.lastIndexOf(',');
    const lastDot = s.lastIndexOf('.');
    if (lastComma >= 0 && lastDot >= 0) {
        if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
        else s = s.replace(/,/g, '');
    } else if (lastComma >= 0) {
        s = s.replace(',', '.');
    } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
        s = s.replace(/\./g, '');
    }
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
}

/**
 * El largo y el ancho van en metros (ej. 0.35 × 0.40).
 * Si el usuario escribe mm típicos de pliego (>= 50), se convierten a m.
 * Nunca dividir 0.35 otra vez por 1000 (eso dejaba Material en $0).
 */
export function pliegoToMeters(value) {
    const v = parseLocaleNumber(value);
    if (v <= 0) return 0;
    if (v >= 50) return v / 1000;
    return v;
}

function pickPieceField(piece, fallback, key) {
    const raw = piece?.[key];
    if (raw === '' || raw === null || raw === undefined) return fallback?.[key];
    // 0 en pieza vacía no debe tapar el valor de la raíz del form (precio/medidas).
    if (raw === 0 || raw === '0') {
        const fb = fallback?.[key];
        if (fb !== '' && fb !== null && fb !== undefined && fb !== 0 && fb !== '0') return fb;
    }
    return raw;
}

function pieceToPartPayload(piece, isBolsa, fallback = null) {
    const largoMm = pickPieceField(piece, fallback, 'largoMm');
    const anchoMm = pickPieceField(piece, fallback, 'anchoMm');
    const cabida = pickPieceField(piece, fallback, 'cabida');
    const precioMaterialM2 = pickPieceField(piece, fallback, 'precioMaterialM2');
    return {
        partName: piece?.partName || fallback?.partName || 'Pieza',
        largoPliego: pliegoToMeters(largoMm),
        anchoPliego: pliegoToMeters(anchoMm),
        cabida: parseLocaleNumber(cabida),
        precioMaterialM2: parseLocaleNumber(precioMaterialM2),
        materialName: piece?.materialName || fallback?.materialName || null,
        numeroPlanchas: parseLocaleNumber(pickPieceField(piece, fallback, 'numeroPlanchas')),
        precioPlancha: parseLocaleNumber(pickPieceField(piece, fallback, 'precioPlancha')),
        cubrimientoPct: parseLocaleNumber(pickPieceField(piece, fallback, 'cubrimiento')),
        vecesImprimir: parseLocaleNumber(pickPieceField(piece, fallback, 'vecesImprimir')) || 1,
        factorBarniz: (piece?.tipoBarniz || fallback?.tipoBarniz)
            ? parseLocaleNumber(pickPieceField(piece, fallback, 'factorBarniz'))
            : 0,
        precioTerminadoM2: parseLocaleNumber(pickPieceField(piece, fallback, 'precioTerminadoM2')),
        terminadoNombre: piece?.terminadoNombre || fallback?.terminadoNombre || null,
        precioMicroM2: parseLocaleNumber(pickPieceField(piece, fallback, 'precioMicroM2')),
        microName: piece?.microName || fallback?.microName || null,
        largoCordonCm: isBolsa ? parseLocaleNumber(pickPieceField(piece, fallback, 'largoCordon')) : 0,
        precioCordonManija: isBolsa ? parseLocaleNumber(pickPieceField(piece, fallback, 'precioCordon')) : 0,
        tipoCordon: piece?.tipoCordon || fallback?.tipoCordon || null,
        numeroRefuerzos: isBolsa ? parseLocaleNumber(pickPieceField(piece, fallback, 'numeroRefuerzos')) : 0,
        anchoVentanillaCm: isBolsa ? parseLocaleNumber(pickPieceField(piece, fallback, 'anchoVentanilla')) : 0,
        largoVentanillaCm: isBolsa ? parseLocaleNumber(pickPieceField(piece, fallback, 'largoVentanilla')) : 0,
        precioTroquel: parseLocaleNumber(pickPieceField(piece, fallback, 'precioTroquel')),
        usaPeliculas: Boolean(piece?.usaPeliculas ?? fallback?.usaPeliculas),
        impresoraMachineId: null,
    };
}

export function buildCalculatePayload(form, isBolsa) {
    const synced = syncActivePieceIntoList(form);
    // Raíz del form = pieza activa; cubre borradores viejos donde pieces[] quedó vacío.
    const multi = (synced.pieces || []).length > 1;
    const rootFallback = multi ? null : synced;
    const rootPart = pieceToPartPayload(synced, isBolsa, synced);
    let parts = (synced.pieces || []).map((p) => pieceToPartPayload(p, isBolsa, rootFallback));
    if (parts.length <= 1) {
        // Una sola pieza: la raíz del formulario es la que el usuario acaba de escribir.
        parts = [rootPart];
    } else {
        const keep = (pieceValue, rootValue) => (Number(pieceValue) > 0 ? pieceValue : rootValue);
        parts = parts.map((p) => ({
            ...p,
            precioMaterialM2: keep(p.precioMaterialM2, rootPart.precioMaterialM2),
            numeroPlanchas: keep(p.numeroPlanchas, rootPart.numeroPlanchas),
            precioPlancha: keep(p.precioPlancha, rootPart.precioPlancha),
            cubrimientoPct: keep(p.cubrimientoPct, rootPart.cubrimientoPct),
            precioTroquel: keep(p.precioTroquel, rootPart.precioTroquel),
        }));
    }
    const first = parts[0] || rootPart;
    return {
        productType: form.productType,
        largoPliego: first.largoPliego,
        largoMm: first.largoPliego,
        anchoPliego: first.anchoPliego,
        anchoMm: first.anchoPliego,
        cabida: first.cabida,
        precioMaterialM2: first.precioMaterialM2,
        numeroPlanchas: first.numeroPlanchas,
        precioPlancha: first.precioPlancha,
        cubrimientoPct: first.cubrimientoPct,
        cubrimiento: first.cubrimientoPct,
        vecesImprimir: first.vecesImprimir,
        factorBarniz: first.factorBarniz,
        precioTerminadoM2: first.precioTerminadoM2,
        precioMicroM2: first.precioMicroM2,
        largoCordonCm: first.largoCordonCm,
        precioCordonManija: first.precioCordonManija,
        numeroRefuerzos: first.numeroRefuerzos,
        anchoVentanillaCm: first.anchoVentanillaCm,
        largoVentanillaCm: first.largoVentanillaCm,
        precioTroquel: first.precioTroquel,
        usaPeliculas: first.usaPeliculas,
        plazoPagoDias: Number(form.plazoPagoDias) || 0,
        quantities: form.quantities,
        primaryQuantityIndex: form.primaryQtyIndex,
        contratoServicios: parseLocaleNumber(form.contratoServicios),
        freightType: form.freightType,
        fleteManual: String(form.fleteManual ?? '').trim() === '' ? null : parseLocaleNumber(form.fleteManual),
        servicios: form.servicios,
        impresoraMachineId: null,
        parts,
    };
}

export function getPrimaryResult(calcResult) {
    if (!calcResult?.results?.length) return null;
    return calcResult.results.find((r) => r.isPrimary) || calcResult.results[0];
}

export function breakdownRows(breakdown) {
    if (!breakdown) return [];
    const ajuste = Number(breakdown.ajustePlazoPago) || 0;
    return [
        {
            label: 'Área por unidad (m²)',
            value: breakdown.areaPorUnidad,
        },
        { label: 'Material', value: breakdown.material },
        { label: 'Tinta', value: breakdown.tinta },
        { label: 'Planchas', value: breakdown.planchas },
        { label: 'Barniz', value: breakdown.barniz },
        { label: 'Terminado', value: breakdown.terminado },
        { label: 'Micro/Flauta', value: breakdown.microFlauta },
        { label: 'Cordón', value: breakdown.cordon },
        { label: 'Refuerzo', value: breakdown.refuerzo },
        { label: 'Ventanilla', value: breakdown.ventanilla },
        { label: 'Películas', value: breakdown.peliculas },
        { label: 'Troquel', value: breakdown.troquel },
        { label: 'Subtotal materia prima', value: breakdown.subtotalMateriaPrima },
        { label: 'Desperdicio (3%)', value: breakdown.desperdicio },
        { label: 'Conversión', value: breakdown.conversion },
        { label: 'Corte', value: breakdown.corte },
        { label: 'Impresión (servicio)', value: breakdown.impresion },
        { label: 'Corrugado', value: breakdown.corrugado },
        { label: 'Laminado', value: breakdown.laminado },
        { label: 'Troquelado', value: breakdown.troquelado },
        { label: 'Pegado', value: breakdown.pegado },
        { label: 'Subtotal servicios', value: breakdown.subtotalServicios },
        { label: 'Contrato servicios', value: breakdown.contratoServicios },
        { label: 'Flete', value: breakdown.flete },
        {
            label: `Ajuste plazo pago (${(ajuste * 100).toFixed(2)} pts)`,
            value: null,
            display: `${(ajuste * 100).toFixed(2)}% del margen (no es $/u)`,
        },
    ];
}
