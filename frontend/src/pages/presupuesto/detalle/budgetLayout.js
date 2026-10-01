/** Layout personalizable de costos fijos / variables. */

export function newId() {
    return crypto.randomUUID().replace(/-/g, '');
}

export function emptyLayout() {
    return { fixed: [], variable: [] };
}

export function normalizeLayout(raw) {
    const base = emptyLayout();
    if (!raw || typeof raw !== 'object') return base;
    return {
        fixed: Array.isArray(raw.fixed) ? raw.fixed.map(normalizeSection) : [],
        variable: Array.isArray(raw.variable) ? raw.variable.map(normalizeSection) : []
    };
}

function normalizeSection(s) {
    return {
        id: s.id || newId(),
        title: s.title || 'Sección',
        kind: s.kind || 'items',
        sortOrder: s.sortOrder || 0,
        subgroups: Array.isArray(s.subgroups) ? s.subgroups.map(normalizeSub) : []
    };
}

function normalizeSub(g) {
    return {
        id: g.id || newId(),
        key: g.key || '',
        title: g.title || g.key || 'Subgrupo',
        mapsTo: g.mapsTo || null,
        sortOrder: g.sortOrder || 0
    };
}

export const SECTION_KIND_OPTIONS_FIXED = [
    { value: 'income', label: 'Lista de ingresos (+ % materia prima)' },
    { value: 'payroll', label: 'Nómina (personas / sueldos)' },
    { value: 'items', label: 'Rubros / montos (con subgrupos)' }
];

export const SECTION_KIND_OPTIONS_VARIABLE = [
    { value: 'commissions', label: 'Comisiones (% × base, con subgrupos)' },
    { value: 'items', label: 'Rubros / montos (con subgrupos)' }
];

export const PAYROLL_MAPS_TO = [
    { value: 'Admin', label: 'Gastos administración' },
    { value: 'Sales', label: 'Gastos ventas' },
    { value: 'Production', label: 'Costo producción (MOD)' },
    { value: 'Cooperative', label: 'Cooperativa' }
];

export function createSection(kind, title) {
    const id = newId();
    const section = {
        id,
        title: title || defaultTitle(kind),
        kind,
        sortOrder: Date.now() % 100000,
        subgroups: []
    };
    if (kind === 'payroll') {
        section.subgroups = [
            { id: newId(), key: 'Admin', title: 'Administración', mapsTo: 'Admin', sortOrder: 1 },
            { id: newId(), key: 'Sales', title: 'Ventas', mapsTo: 'Sales', sortOrder: 2 },
            { id: newId(), key: 'Production', title: 'Producción', mapsTo: 'Production', sortOrder: 3 }
        ];
    }
    if (kind === 'items' || kind === 'commissions') {
        const key = `grupo_${id.slice(0, 6)}`;
        section.subgroups = [
            { id: newId(), key, title: 'General', mapsTo: null, sortOrder: 1 }
        ];
    }
    return section;
}

function defaultTitle(kind) {
    if (kind === 'income') return 'Ingresos';
    if (kind === 'payroll') return 'Nómina';
    if (kind === 'commissions') return 'Comisiones';
    return 'Rubros';
}

export function createSubgroup(prefix = 'grupo') {
    const id = newId();
    return {
        id,
        key: `${prefix}_${id.slice(0, 6)}`,
        title: 'Nuevo subgrupo',
        mapsTo: null,
        sortOrder: Date.now() % 100000
    };
}
