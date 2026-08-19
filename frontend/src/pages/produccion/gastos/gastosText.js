/** Primera letra de cada palabra en mayúscula; no recorta espacios al escribir. */
export function toTitleCase(value) {
    return String(value ?? '')
        .split(/(\s+)/)
        .map((part) => {
            if (!part || /^\s+$/.test(part)) return part;
            const lower = part.toLocaleLowerCase('es-CO');
            return lower.charAt(0).toLocaleUpperCase('es-CO') + lower.slice(1);
        })
        .join('');
}

/** Misma regla, compactando espacios, para guardar o mostrar. */
export function toTitleCaseSaved(value) {
    return toTitleCase(value).replace(/\s+/g, ' ').trim();
}

export function toTitleCaseList(values) {
    return (values || []).map((item) => toTitleCaseSaved(item));
}

export function normalizeProveedorRubros(proveedor) {
    if (Array.isArray(proveedor?.rubros) && proveedor.rubros.length > 0) {
        return [...new Set(proveedor.rubros.map((item) => toTitleCaseSaved(item)).filter(Boolean))];
    }
    if (proveedor?.rubro) return [toTitleCaseSaved(proveedor.rubro)];
    return [];
}

export function proveedorBelongsToRubro(proveedor, rubro) {
    const wanted = toTitleCaseSaved(rubro).toLocaleLowerCase('es-CO');
    if (!wanted) return true;
    return normalizeProveedorRubros(proveedor).some((item) => item.toLocaleLowerCase('es-CO') === wanted);
}

export function formatRubrosLabel(proveedor) {
    return normalizeProveedorRubros(proveedor).join(' · ');
}

export function isPrestadoresDeServicio(name) {
    return /prestador/i.test(String(name ?? ''));
}

export function includesPrestadores(rubros) {
    return (rubros || []).some(isPrestadoresDeServicio);
}

export function onlyPrestadores(rubros) {
    const list = (rubros || []).filter(Boolean);
    return list.length > 0 && list.every(isPrestadoresDeServicio);
}

function digitsOnly(value, max) {
    return String(value ?? '').replace(/\D/g, '').slice(0, max);
}

/** NIT colombiano: 9 dígitos + DV → 900.123.456-7 */
export function formatNit(value) {
    const d = digitsOnly(value, 10);
    if (d.length <= 3) return d;
    if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
    if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

export function isCompleteNit(value) {
    return digitsOnly(value, 10).length === 10;
}

/** C.C. con separador de miles: 1.234.567 */
export function formatCc(value) {
    const d = digitsOnly(value, 10);
    if (!d) return '';
    return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function isCompleteCc(value) {
    const len = digitsOnly(value, 10).length;
    return len >= 6 && len <= 10;
}
