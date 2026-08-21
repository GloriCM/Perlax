import { TIPOS_REQUISICION } from '../../../data/almacenConstants';

export function formatMoney(value) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}

export function formatDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function formatMonthLabel(key) {
    if (!key) return '—';
    const [year, month] = key.split('-');
    const d = new Date(Number(year), Number(month) - 1, 1);
    if (Number.isNaN(d.getTime())) return key;
    return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
}

function toDate(value) {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
}

export function daysBetween(from, to) {
    const a = toDate(from);
    const b = toDate(to);
    if (!a || !b) return null;
    const ms = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0);
    return Math.round(ms / (1000 * 60 * 60 * 24));
}

export function countByTipo(requisiciones) {
    const counts = {};
    TIPOS_REQUISICION.forEach((t) => { counts[t.id] = 0; });
    (requisiciones || []).forEach((r) => {
        if (r.estado === 'Pendiente') return;
        if (counts[r.tipoRequisicionId] !== undefined) counts[r.tipoRequisicionId] += 1;
    });
    return counts;
}

/** Filas de puntualidad por proveedor y requisición */
export function buildPunctualityRows(details) {
    const rows = [];

    (details || []).forEach((req) => {
        const proveedores = req.pedido?.proveedores || [];
        proveedores.forEach((prov) => {
            const recepciones = (req.recepciones || []).filter(
                (r) => r.pedidoProveedorId === prov.id,
            );
            if (!recepciones.length) return;

            const llegadas = recepciones
                .map((r) => toDate(r.fechaLlegada))
                .filter(Boolean)
                .sort((a, b) => a - b);

            const primera = llegadas[0];
            const ultima = llegadas[llegadas.length - 1];
            const diasEntre = llegadas.length > 1 ? daysBetween(primera, ultima) : null;
            const reqDate = toDate(req.fechaRequerida);
            const retrasoDias = reqDate && primera ? Math.max(0, daysBetween(reqDate, primera)) : 0;

            let evaluacion = 'a_tiempo';
            if (recepciones.length > 1) evaluacion = 'varios_envios';
            else if (retrasoDias > 0) evaluacion = 'retraso';

            let vsRequerida = '—';
            if (reqDate && primera) {
                if (retrasoDias === 0) {
                    vsRequerida = `Mismo día req. ${formatDate(req.fechaRequerida)}`;
                } else {
                    vsRequerida = `Retraso ${retrasoDias} d vs req. ${formatDate(req.fechaRequerida)}`;
                }
            }

            rows.push({
                id: `${req.id}-${prov.id}`,
                codigo: req.codigo,
                proveedor: prov.nombre,
                insumo: req.productoNombre,
                pedidoLabel: `${prov.cantidad ?? req.cantidad} ${req.unidad}`,
                envios: recepciones.length,
                primeraLlegada: primera,
                ultimaLlegada: ultima,
                diasEntre,
                vsRequerida,
                evaluacion,
                retrasoDias,
            });
        });
    });

    return rows.sort((a, b) => b.primeraLlegada - a.primeraLlegada);
}

/** Puntos de precio por pedido */
export function buildPricePoints(details) {
    const points = [];

    (details || []).forEach((req) => {
        if (!req.pedido) return;
        const precio = req.pedido.precioUnitario ?? req.precioUnitario;
        if (precio == null) return;
        const fecha = toDate(req.pedido.fechaPedido);
        if (!fecha) return;

        points.push({
            id: req.id,
            codigo: req.codigo,
            producto: req.productoNombre,
            productoKey: (req.productoNombre || '').trim().toLowerCase(),
            fecha,
            precio: Number(precio),
            unidad: req.unidad,
        });
    });

    return points.sort((a, b) => a.fecha - b.fecha);
}

export function buildMonthlyGastos(details) {
    const byMonth = {};

    (details || []).forEach((req) => {
        if (!req.pedido?.fechaPedido) return;
        const key = String(req.pedido.fechaPedido).slice(0, 7);
        const total = Number(req.totalEstimado)
            ?? Number(req.pedido.precioUnitario || 0) * Number(req.cantidad || 0);
        if (!total) return;
        byMonth[key] = (byMonth[key] || 0) + total;
    });

    const months = Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, total]) => ({
            key,
            label: formatMonthLabel(key),
            total,
        }));

    let acumulado = 0;
    const trend = months.map((m) => {
        acumulado += m.total;
        return { ...m, acumulado };
    });

    const totalHastaFecha = months.reduce((s, m) => s + m.total, 0);

    return {
        months,
        trend,
        totalHastaFecha,
        mesesConPedidos: months.length,
    };
}

export function filterByPeriod(items, periodKey, dateAccessor) {
    if (!periodKey || periodKey === 'all') return items;
    return items.filter((item) => {
        const d = dateAccessor(item);
        if (!d) return false;
        return d.toISOString().slice(0, 7) === periodKey;
    });
}

export function uniqueProducts(pricePoints) {
    const map = new Map();
    pricePoints.forEach((p) => {
        if (!map.has(p.productoKey)) map.set(p.productoKey, p.producto);
    });
    return Array.from(map.entries()).map(([key, label]) => ({ key, label }));
}

export function priceStatsForProduct(points) {
    if (!points.length) {
        return { ultimo: null, anterior: null, variacion: null };
    }
    const sorted = [...points].sort((a, b) => b.fecha - a.fecha);
    const ultimo = sorted[0]?.precio ?? null;
    const anterior = sorted[1]?.precio ?? null;
    let variacion = null;
    if (ultimo != null && anterior != null && anterior !== 0) {
        variacion = ((ultimo - anterior) / anterior) * 100;
    }
    return { ultimo, anterior, variacion };
}
