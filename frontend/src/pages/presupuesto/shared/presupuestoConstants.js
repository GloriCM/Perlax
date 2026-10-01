export const MONTHS = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const QUARTERS = [
    { id: 'q1', label: 'Ene - Mar', months: ['Ene', 'Feb', 'Mar'] },
    { id: 'q2', label: 'Abr - Jun', months: ['Abr', 'May', 'Jun'] },
    { id: 'q3', label: 'Jul - Sep', months: ['Jul', 'Ago', 'Sep'] },
    { id: 'q4', label: 'Oct - Dic', months: ['Oct', 'Nov', 'Dic'] }
];

export function buildYearOptions(centerYear = new Date().getFullYear()) {
    const years = [];
    for (let y = centerYear - 2; y <= centerYear + 2; y += 1) {
        years.push({ value: String(y), label: String(y) });
    }
    return years;
}

/** @deprecated use buildYearOptions() */
export const YEAR_OPTIONS = buildYearOptions();

const STORAGE_PREFIX = 'perlax.presupuesto.area';

export function areaStorageKey(areaKey, year) {
    return `${STORAGE_PREFIX}.${String(areaKey).toLowerCase()}.${year}`;
}

export function loadAreaBudget(areaKey, year) {
    try {
        const raw = localStorage.getItem(areaStorageKey(areaKey, year));
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
        return null;
    }
}

export function saveAreaBudget(areaKey, year, data) {
    localStorage.setItem(areaStorageKey(areaKey, year), JSON.stringify(data));
}

export function createEmptyBudgetData(rubros, getInitialValue = () => 0) {
    const data = {};
    rubros.forEach((rubro) => {
        data[rubro] = {};
        MONTHS.forEach((month) => {
            data[rubro][month] = getInitialValue(rubro, month) || 0;
        });
    });
    return data;
}

export function formatMoney(value) {
    return new Intl.NumberFormat('es-CO', {
        style: 'decimal',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value || 0);
}

export function formatMoneyCurrency(value) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(value || 0);
}
