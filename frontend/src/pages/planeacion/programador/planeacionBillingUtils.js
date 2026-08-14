export function formatBillingMoney(value) {
    const num = Number(value) || 0;
    return num.toLocaleString('es-CO', { maximumFractionDigits: 0 });
}

export function formatBillingDelta(value) {
    const num = Number(value) || 0;
    const prefix = num >= 0 ? '+ ' : '- ';
    return `${prefix}$ ${formatBillingMoney(Math.abs(num))}`;
}
