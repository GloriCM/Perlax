/**
 * Catálogos del cotizador — mismos campos que Cotizador-Link-t (cotizador-app).
 * Los registros se persisten en PostgreSQL vía /api/production/cotizador/catalogs/*
 */

export const LINKT_CATALOGS = [
    {
        value: 'maquinas',
        label: 'Maquinas',
        apiPath: 'machines',
        fields: [
            { key: 'nombre', label: 'Nombre', type: 'text', required: true },
            { key: 'tiempo_de_seteo', label: 'Tiempo de seteo', type: 'number', required: true },
            { key: 'tiros_por_hora', label: 'Tiros por hora', type: 'number', required: true },
            { key: 'tarifa_por_hora', label: 'Tarifa por hora', type: 'number', required: true },
        ],
    },
    {
        value: 'materiales',
        label: 'Materiales',
        apiPath: 'materials',
        fields: [
            { key: 'nombre', label: 'Nombre', type: 'text', required: true },
            { key: 'precio_m2', label: 'Precio por m2', type: 'number', required: true },
        ],
    },
    {
        value: 'factores',
        label: 'Factores',
        apiPath: 'factors',
        fields: [
            { key: 'nombre', label: 'Nombre', type: 'text', required: true, readOnlyOnEdit: true },
            { key: 'valor', label: 'Valor', type: 'number', required: true },
        ],
        allowCreate: true,
        allowDelete: false,
    },
    {
        value: 'micro_flauta',
        label: 'Micro flauta',
        apiPath: 'micro-flauta',
        fields: [
            { key: 'nombre', label: 'Nombre', type: 'text', required: true },
            { key: 'precio_m2', label: 'Precio por m2', type: 'number', required: true },
        ],
    },
    {
        value: 'planchas',
        label: 'Planchas',
        apiPath: 'planchas',
        fields: [
            { key: 'nombre', label: 'Nombre', type: 'text', required: true },
            { key: 'precio', label: 'Precio', type: 'number', required: true },
        ],
    },
];

/** @deprecated Use LINKT_CATALOGS */
export const COTIZADOR_CATALOGS = LINKT_CATALOGS.map(({ value, label }) => ({ value, label }));

export function getCatalogConfig(catalogKey) {
    return LINKT_CATALOGS.find((item) => item.value === catalogKey) || LINKT_CATALOGS[0];
}

export function getCatalogLabel(catalogKey) {
    return getCatalogConfig(catalogKey).label;
}

export function inferMachineServiceRole(nombre) {
    const n = String(nombre || '').toLowerCase();
    if (n.includes('convertid')) return 'Conversion';
    if (n.includes('guillot')) return 'Corte';
    if (n.includes('impres')) return 'Impresora';
    if (n.includes('corrug')) return 'Corrugado';
    if (n.includes('lamin')) return 'Laminado';
    if (n.includes('troquel')) return 'Troquelado';
    if (n.includes('pegad')) return 'Pegado';
    return 'Impresora';
}

export function rowToForm(catalogKey, row) {
    switch (catalogKey) {
        case 'maquinas':
            return {
                nombre: row.name ?? '',
                tiempo_de_seteo: row.setupTimeHours ?? 0,
                tiros_por_hora: row.shotsPerHour ?? 0,
                tarifa_por_hora: row.hourlyRate ?? 0,
            };
        case 'materiales':
            return {
                nombre: row.name ?? '',
                precio_m2: row.pricePerM2 ?? 0,
            };
        case 'factores':
            return {
                nombre: row.key ?? '',
                valor: row.value ?? 0,
            };
        case 'micro_flauta':
            return {
                nombre: row.name ?? '',
                precio_m2: row.pricePerM2 ?? 0,
            };
        case 'planchas':
            return {
                nombre: row.name ?? '',
                precio: row.price ?? 0,
            };
        default:
            return {};
    }
}

export function formToPayload(catalogKey, form) {
    switch (catalogKey) {
        case 'maquinas':
            return {
                name: String(form.nombre || '').trim(),
                serviceRole: inferMachineServiceRole(form.nombre),
                setupTimeHours: Number(form.tiempo_de_seteo) || 0,
                shotsPerHour: Number(form.tiros_por_hora) || 0,
                hourlyRate: Number(form.tarifa_por_hora) || 0,
                isActive: true,
            };
        case 'materiales':
            return {
                name: String(form.nombre || '').trim(),
                pricePerM2: Number(form.precio_m2) || 0,
                isActive: true,
            };
        case 'factores':
            return {
                key: String(form.nombre || '').trim(),
                label: String(form.nombre || '').trim(),
                value: Number(form.valor) || 0,
            };
        case 'micro_flauta':
            return {
                name: String(form.nombre || '').trim(),
                pricePerM2: Number(form.precio_m2) || 0,
                isActive: true,
            };
        case 'planchas':
            return {
                name: String(form.nombre || '').trim(),
                price: Number(form.precio) || 0,
                isActive: true,
            };
        default:
            return {};
    }
}

export function emptyForm(catalogKey) {
    const config = getCatalogConfig(catalogKey);
    return Object.fromEntries(config.fields.map((field) => [field.key, field.type === 'number' ? '' : '']));
}

/** Compatibilidad: ya no se usa localStorage para catálogos operativos. */
export function loadCotizadorCatalogStore() {
    return { schemas: {}, records: {} };
}

export function saveCotizadorCatalogStore() {
    // no-op
}
