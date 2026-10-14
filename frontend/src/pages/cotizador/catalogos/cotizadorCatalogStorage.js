/**
 * Catálogos del cotizador (precios y factores que alimentan el cálculo).
 * Persistidos en PostgreSQL vía /api/production/cotizador/catalogs/*
 */

export const LINKT_CATALOGS = [
    {
        value: 'materiales',
        label: 'Materiales (papel / cartón)',
        apiPath: 'materials',
        fields: [
            { key: 'nombre', label: 'Nombre', type: 'text', required: true },
            { key: 'precio_m2', label: 'Precio por m²', type: 'number', required: true },
        ],
        allowImport: true,
    },
    {
        value: 'maquinas',
        label: 'Máquinas / servicios',
        apiPath: 'machines',
        fields: [
            { key: 'nombre', label: 'Nombre', type: 'text', required: true },
            {
                key: 'rol',
                label: 'Rol de servicio',
                type: 'select',
                required: true,
                options: [
                    { value: 'Conversion', label: 'Conversión' },
                    { value: 'Corte', label: 'Corte' },
                    { value: 'Impresora', label: 'Impresión' },
                    { value: 'Corrugado', label: 'Corrugado' },
                    { value: 'Laminado', label: 'Laminado' },
                    { value: 'Troquelado', label: 'Troquelado' },
                    { value: 'Pegado', label: 'Pegado' },
                ],
            },
            { key: 'tiempo_de_seteo', label: 'Tiempo de seteo (h)', type: 'number', required: true },
            { key: 'tiros_por_hora', label: 'Tiros por hora', type: 'number', required: true },
            { key: 'tarifa_por_hora', label: 'Tarifa por hora', type: 'number', required: true },
        ],
        allowImport: true,
    },
    {
        value: 'barnices',
        label: 'Barnices',
        apiPath: 'barnices',
        fields: [
            { key: 'nombre', label: 'Nombre', type: 'text', required: true },
            { key: 'factor', label: 'Factor', type: 'number', required: true },
        ],
    },
    {
        value: 'terminados',
        label: 'Terminados / laminados',
        apiPath: 'terminados',
        fields: [
            { key: 'nombre', label: 'Nombre', type: 'text', required: true },
            { key: 'precio_m2', label: 'Precio por m²', type: 'number', required: true },
        ],
    },
    {
        value: 'micro_flauta',
        label: 'Micro / flauta',
        apiPath: 'micro-flauta',
        fields: [
            { key: 'nombre', label: 'Nombre', type: 'text', required: true },
            { key: 'precio_m2', label: 'Precio por m²', type: 'number', required: true },
        ],
    },
    {
        value: 'cordones',
        label: 'Cordones / cintas',
        apiPath: 'cordones',
        fields: [
            { key: 'nombre', label: 'Nombre', type: 'text', required: true },
            { key: 'precio_manija', label: 'Precio por manija', type: 'number', required: true },
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
    {
        value: 'factores',
        label: 'Factores (tinta, ventanilla, flete…)',
        apiPath: 'factors',
        fields: [
            { key: 'nombre', label: 'Clave', type: 'text', required: true, readOnlyOnEdit: true },
            { key: 'valor', label: 'Valor', type: 'number', required: true },
        ],
        allowCreate: true,
        allowDelete: false,
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
    if (n.includes('guillot') || n.includes('corte')) return 'Corte';
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
                rol: row.serviceRole || inferMachineServiceRole(row.name),
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
        case 'barnices':
            return {
                nombre: row.name ?? '',
                factor: row.factor ?? 0,
            };
        case 'terminados':
            return {
                nombre: row.name ?? '',
                precio_m2: row.pricePerM2 ?? 0,
            };
        case 'cordones':
            return {
                nombre: row.name ?? '',
                precio_manija: row.pricePerManija ?? 0,
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
                serviceRole: String(form.rol || '').trim() || inferMachineServiceRole(form.nombre),
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
        case 'barnices':
            return {
                name: String(form.nombre || '').trim(),
                factor: Number(form.factor) || 0,
                isActive: true,
            };
        case 'terminados':
            return {
                name: String(form.nombre || '').trim(),
                pricePerM2: Number(form.precio_m2) || 0,
                isActive: true,
            };
        case 'cordones':
            return {
                name: String(form.nombre || '').trim(),
                pricePerManija: Number(form.precio_manija) || 0,
                isActive: true,
            };
        default:
            return {};
    }
}

export function emptyForm(catalogKey) {
    const config = getCatalogConfig(catalogKey);
    return Object.fromEntries(
        config.fields.map((field) => {
            if (field.type === 'number') return [field.key, ''];
            if (field.type === 'select') return [field.key, field.options?.[0]?.value || ''];
            return [field.key, ''];
        }),
    );
}

/** Compatibilidad: ya no se usa localStorage para catálogos operativos. */
export function loadCotizadorCatalogStore() {
    return { schemas: {}, records: {} };
}

export function saveCotizadorCatalogStore() {
    // no-op
}
