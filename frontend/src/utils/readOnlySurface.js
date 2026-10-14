const WRITE_BUTTON = /(guardar|crear|eliminar|borrar|nuevo|nueva|agregar|añadir|registrar|actualizar|enviar|confirmar|anular|aprobar|rechazar|editar|modificar|subir|importar|duplicar|copiar|quitar|remover|finalizar|asignar|convertir|reabrir|generar|cerrar|descargar para cliente)/i;
const KEEP_BUTTON = /(buscar|filtrar|aplicar|ver\b|detalle|consultar|imprimir|descargar|exportar|cancelar|volver|atrás|atras|limpiar|siguiente|anterior|sin aplicar)/i;
const WRITE_ICON = /trash|pencil|edit|plus|device-floppy|trash-x|square-plus|file-plus/;
const KEEP_ICON = /eye|search|filter|chevron|arrow|x\b|download|printer/;

function controlLabel(el) {
    return `${el.getAttribute('aria-label') || ''} ${el.getAttribute('title') || ''} ${el.textContent || ''}`
        .replace(/\s+/g, ' ')
        .trim();
}

function iconClass(el) {
    const svg = el.querySelector('svg');
    return `${svg?.getAttribute('class') || ''} ${el.className || ''}`;
}

function isKeepZone(el) {
    return Boolean(el.closest('[data-keep-interactive], .planeador-filters, .almacen-filtro-estado, [class*="filtro"]'));
}

function hideControl(el) {
    if (el.dataset.readonlyHidden === '1') return;
    el.dataset.readonlyHidden = '1';
    el.dataset.readonlyDisplay = el.style.display || '';
    el.style.display = 'none';
}

function lockField(el) {
    if (el.dataset.readonlyLocked === '1' || el.disabled) return;
    el.dataset.readonlyLocked = '1';
    el.disabled = true;
}

/**
 * Bloquea campos y oculta acciones que cambian datos.
 * Filtros, búsqueda y botones de consulta siguen activos.
 */
export function applyReadOnlySurface(root) {
    if (!root) return;
    const nodes = root.querySelectorAll('button, a[role="button"], input, textarea, select, [contenteditable="true"]');
    nodes.forEach((el) => {
        if (el.closest('.readonly-banner')) return;
        if (el.closest('.mantine-Modal-header, .mantine-CloseButton-root')) return;
        if (el.getAttribute('role') === 'tab' || el.closest('[role="tablist"]')) return;

        const tag = el.tagName;
        const label = controlLabel(el);
        const icons = iconClass(el);
        const keepZone = isKeepZone(el);

        if (/NumberInput-control|Stepper-/.test(String(el.className || ''))) {
            if (!keepZone) hideControl(el);
            return;
        }

        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable) {
            if (keepZone) return;
            const placeholder = (el.getAttribute('placeholder') || '').toLowerCase();
            const type = (el.getAttribute('type') || '').toLowerCase();
            if (type === 'search' || /buscar|filtrar/.test(placeholder) || /buscar|filtrar/.test(label.toLowerCase())) return;
            lockField(el);
            return;
        }

        if (KEEP_BUTTON.test(label) && !WRITE_BUTTON.test(label)) return;
        if (KEEP_ICON.test(icons) && !WRITE_ICON.test(icons) && label.length < 2) return;
        const writes = WRITE_BUTTON.test(label) || (WRITE_ICON.test(icons) && !KEEP_ICON.test(icons));
        if (writes) hideControl(el);
    });
}
