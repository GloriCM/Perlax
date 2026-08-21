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

export const YEAR_OPTIONS = ['2024', '2025', '2026', '2027'].map((y) => ({
    value: y,
    label: y
}));

export function createEmptyBudgetData(rubros, getInitialValue = () => 0) {
    const data = {};
    rubros.forEach((rubro) => {
        data[rubro] = {};
        MONTHS.forEach((month) => {
            data[rubro][month] = getInitialValue(rubro, month);
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
