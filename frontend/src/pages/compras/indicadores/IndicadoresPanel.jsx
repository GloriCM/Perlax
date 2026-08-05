import { useCallback, useEffect, useMemo, useState } from 'react';
import {
    Card,
    Group,
    Loader,
    SimpleGrid,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import {
    IconChartBar,
    IconChartLine,
    IconClock,
    IconCoin,
    IconSearch,
} from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { almacenApi } from '../../../services/almacenApi';
import { TIPOS_REQUISICION } from '../../../data/almacenConstants';
import {
    buildMonthlyGastos,
    buildPricePoints,
    buildPunctualityRows,
    countByTipo,
    filterByPeriod,
    formatDate,
    formatMoney,
    formatMonthLabel,
    priceStatsForProduct,
    uniqueProducts,
} from './indicadoresUtils';
import '../shared/comprasAlmacen.css';
import './IndicadoresPage.css';

const SUB_VIEWS = [
    { id: 'proveedores', label: 'Proveedores', icon: IconClock },
    { id: 'precios', label: 'Historial de precios', icon: IconChartLine },
    { id: 'gastos', label: 'Gastos', icon: IconCoin },
];

const EVAL_FILTERS = [
    { id: 'todos', label: 'Todos' },
    { id: 'a_tiempo', label: 'A tiempo' },
    { id: 'retraso', label: 'Con retraso' },
    { id: 'varios_envios', label: 'Varios envíos' },
];

function notifyError(error) {
    notifications.show({
        title: 'Error',
        message: error?.message || String(error),
        color: 'red',
    });
}

function SimpleTrendChart({ data, valueKey = 'total', height = 200 }) {
    if (!data?.length) {
        return <div className="ind-chart ind-chart--empty">Sin datos para graficar.</div>;
    }

    const values = data.map((d) => Number(d[valueKey]) || 0);
    const max = Math.max(...values, 1);
    const min = Math.min(...values, 0);
    const range = max - min || 1;
    const w = 640;
    const h = height - 32;
    const padX = 12;
    const padY = 12;

    const points = values.map((v, i) => {
        const x = padX + (i / Math.max(values.length - 1, 1)) * (w - padX * 2);
        const y = padY + (1 - (v - min) / range) * (h - padY * 2);
        return `${x},${y}`;
    }).join(' ');

    const areaPoints = `${padX},${h - padY} ${points} ${w - padX},${h - padY}`;

    return (
        <div className="ind-chart">
            <svg viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" className="ind-chart__svg">
                <defs>
                    <linearGradient id="indAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(99,102,241,0.45)" />
                        <stop offset="100%" stopColor="rgba(99,102,241,0.02)" />
                    </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75].map((pct) => (
                    <line
                        key={pct}
                        x1={padX}
                        x2={w - padX}
                        y1={padY + pct * (h - padY * 2)}
                        y2={padY + pct * (h - padY * 2)}
                        stroke="rgba(255,255,255,0.06)"
                        strokeWidth="1"
                    />
                ))}
                <polygon points={areaPoints} fill="url(#indAreaGrad)" />
                <polyline
                    points={points}
                    fill="none"
                    stroke="#818cf8"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                />
            </svg>
            <div className="ind-chart__labels">
                {data.map((d) => (
                    <span key={d.key || d.label}>{d.label}</span>
                ))}
            </div>
        </div>
    );
}

function EvalBadge({ evaluacion, retrasoDias }) {
    if (evaluacion === 'a_tiempo') {
        return <span className="ind-badge ind-badge--ok">A tiempo (mismo día)</span>;
    }
    if (evaluacion === 'varios_envios') {
        return <span className="ind-badge ind-badge--warn">Varios envíos</span>;
    }
    return <span className="ind-badge ind-badge--late">Retraso {retrasoDias} d</span>;
}

export default function IndicadoresPanel() {
    const [subView, setSubView] = useState('proveedores');
    const [filtroTipo, setFiltroTipo] = useState('consumo_diario');
    const [evalFiltro, setEvalFiltro] = useState('todos');
    const [periodo, setPeriodo] = useState('all');
    const [productSearch, setProductSearch] = useState('');
    const [productoKey, setProductoKey] = useState('');

    const [requisiciones, setRequisiciones] = useState([]);
    const [details, setDetails] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadAll = useCallback(async () => {
        setLoading(true);
        try {
            const list = await almacenApi.listRequisiciones({ tipo: filtroTipo });
            const allList = await almacenApi.listRequisiciones({});
            setRequisiciones(Array.isArray(allList) ? allList : []);

            const withPedido = (Array.isArray(list) ? list : []).filter((r) => r.estado !== 'Pendiente');
            if (!withPedido.length) {
                setDetails([]);
                return;
            }
            const full = await Promise.all(withPedido.map((r) => almacenApi.getRequisicion(r.id)));
            setDetails(full);
        } catch (err) {
            notifyError(err);
            setDetails([]);
        } finally {
            setLoading(false);
        }
    }, [filtroTipo]);

    useEffect(() => {
        loadAll();
    }, [loadAll]);

    const tipoCounts = useMemo(() => countByTipo(requisiciones), [requisiciones]);
    const activeTipo = TIPOS_REQUISICION.find((t) => t.id === filtroTipo) || TIPOS_REQUISICION[0];

    const punctualityRows = useMemo(() => buildPunctualityRows(details), [details]);
    const filteredPunctuality = useMemo(() => {
        if (evalFiltro === 'todos') return punctualityRows;
        return punctualityRows.filter((r) => r.evaluacion === evalFiltro);
    }, [punctualityRows, evalFiltro]);

    const evalCounts = useMemo(() => ({
        todos: punctualityRows.length,
        a_tiempo: punctualityRows.filter((r) => r.evaluacion === 'a_tiempo').length,
        retraso: punctualityRows.filter((r) => r.evaluacion === 'retraso').length,
        varios_envios: punctualityRows.filter((r) => r.evaluacion === 'varios_envios').length,
    }), [punctualityRows]);

    const pricePointsAll = useMemo(() => buildPricePoints(details), [details]);
    const productOptions = useMemo(() => uniqueProducts(pricePointsAll), [pricePointsAll]);

    useEffect(() => {
        if (!productOptions.length) {
            setProductoKey('');
            return;
        }
        if (!productoKey || !productOptions.some((p) => p.key === productoKey)) {
            setProductoKey(productOptions[0].key);
        }
    }, [productOptions, productoKey]);

    const filteredProducts = useMemo(() => {
        const q = productSearch.trim().toLowerCase();
        if (!q) return productOptions;
        return productOptions.filter((p) => p.label.toLowerCase().includes(q));
    }, [productOptions, productSearch]);

    const pricePoints = useMemo(() => {
        let pts = pricePointsAll.filter((p) => p.productoKey === productoKey);
        pts = filterByPeriod(pts, periodo, (p) => p.fecha);
        return pts;
    }, [pricePointsAll, productoKey, periodo]);

    const priceStats = useMemo(() => priceStatsForProduct(pricePoints), [pricePoints]);

    const gastosData = useMemo(() => {
        let pts = details;
        if (periodo !== 'all') {
            pts = details.filter((d) => {
                const f = d.pedido?.fechaPedido;
                return f && String(f).slice(0, 7) === periodo;
            });
        }
        return buildMonthlyGastos(pts);
    }, [details, periodo]);

    const gastosTrend = useMemo(() => gastosData.trend, [gastosData]);
    const monthOptions = useMemo(() => {
        const keys = new Set();
        details.forEach((d) => {
            const f = d.pedido?.fechaPedido;
            if (f) keys.add(String(f).slice(0, 7));
        });
        return Array.from(keys).sort().reverse();
    }, [details]);

    const priceTrend = useMemo(() => {
        if (pricePoints.length < 2) return [];
        return pricePoints.map((p, i) => ({
            key: p.id,
            label: formatDate(p.fecha),
            total: p.precio,
        }));
    }, [pricePoints]);

    return (
        <div className="fade-in compras-almacen-view indicadores-page" style={{ paddingBottom: 40 }}>
            <Card className="glass-card" mb="xl" style={{ borderLeft: '4px solid #6366f1' }}>
                <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                    <div>
                        <Group gap="xs" mb={4}>
                            <IconChartBar size={22} color="#6366f1" />
                            <Title order={3} c="white">Indicadores</Title>
                        </Group>
                        <Text size="sm" c="dimmed">
                            Puntualidad, precios y gastos por categoría de insumo.
                        </Text>
                    </div>
                </Group>
            </Card>

            <div className="ind-subtabs">
                {SUB_VIEWS.map(({ id, label, icon: Icon }) => (
                    <button
                        key={id}
                        type="button"
                        className={`ind-subtab ${subView === id ? 'ind-subtab--active' : ''}`}
                        onClick={() => setSubView(id)}
                    >
                        <Icon size={17} />
                        {label}
                    </button>
                ))}
            </div>

            <div className="almacen-tipo-footer ind-tipo-footer">
                {TIPOS_REQUISICION.map((t) => (
                    <button
                        key={t.id}
                        type="button"
                        className={`almacen-tipo-chip ${filtroTipo === t.id ? 'almacen-tipo-chip--active' : ''}`}
                        onClick={() => setFiltroTipo(t.id)}
                    >
                        <span className="almacen-tipo-chip__dot" style={{ background: t.color }} />
                        {t.label}
                        <span className="almacen-tipo-chip__count">{tipoCounts[t.id] || 0}</span>
                    </button>
                ))}
            </div>

            {loading && (
                <Group justify="center" py="xl">
                    <Loader color="indigo" />
                    <Text c="dimmed" size="sm">Cargando indicadores de {activeTipo.label}…</Text>
                </Group>
            )}

            {!loading && subView === 'proveedores' && (
                <Card className="glass-card almacen-card">
                    <div className="ind-section-head">
                        <div>
                            <Title order={4} c="white">Puntualidad de proveedores</Title>
                            <Text size="sm" c="dimmed" mt={4}>
                                Compara la primera y última llegada frente a la fecha requerida — {activeTipo.label}.
                            </Text>
                        </div>
                    </div>

                    <div className="ind-filter-row">
                        <Text size="sm" fw={600} c="dimmed">Filtrar evaluación</Text>
                        <div className="ind-filter-pills">
                            {EVAL_FILTERS.map((f) => (
                                <button
                                    key={f.id}
                                    type="button"
                                    className={`ind-filter-pill ${evalFiltro === f.id ? 'ind-filter-pill--active' : ''}`}
                                    onClick={() => setEvalFiltro(f.id)}
                                >
                                    {f.label}
                                    <span className="ind-filter-pill__count">{evalCounts[f.id] ?? 0}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="almacen-table-wrap">
                        <table className="almacen-table">
                            <thead>
                                <tr>
                                    <th>COD. REQ.</th>
                                    <th>PROVEEDOR</th>
                                    <th>INSUMO</th>
                                    <th>PEDIDO</th>
                                    <th>ENVÍOS</th>
                                    <th>1ª LLEGADA</th>
                                    <th>ÚLT. LLEGADA</th>
                                    <th>DÍAS ENTRE</th>
                                    <th>VS REQUERIDA</th>
                                    <th>PUNTUALIDAD</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredPunctuality.length === 0 ? (
                                    <tr>
                                        <td colSpan={10} className="almacen-empty">
                                            No hay recepciones registradas en esta categoría.
                                        </td>
                                    </tr>
                                ) : filteredPunctuality.map((row) => (
                                    <tr key={row.id}>
                                        <td className="col-cod">{row.codigo}</td>
                                        <td>{row.proveedor}</td>
                                        <td>{row.insumo}</td>
                                        <td>{row.pedidoLabel}</td>
                                        <td>{row.envios}</td>
                                        <td>{formatDate(row.primeraLlegada)}</td>
                                        <td>{formatDate(row.ultimaLlegada)}</td>
                                        <td>{row.diasEntre ?? '—'}</td>
                                        <td>{row.vsRequerida}</td>
                                        <td>
                                            <EvalBadge evaluacion={row.evaluacion} retrasoDias={row.retrasoDias} />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {!loading && subView === 'precios' && (
                <Stack gap="md">
                    <Card className="glass-card almacen-card">
                        <Title order={4} c="white" mb="xs">Historial de precios</Title>
                        <Text size="sm" c="dimmed" mb="md">
                            Cada pedido con precio unitario queda en la curva del producto — {activeTipo.label}.
                        </Text>
                        <TextInput
                            placeholder="Buscar producto..."
                            leftSection={<IconSearch size={16} />}
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.currentTarget.value)}
                            mb="md"
                        />
                        <div className="ind-product-pills">
                            {filteredProducts.length === 0 ? (
                                <Text size="sm" c="dimmed">Sin productos con pedidos en esta categoría.</Text>
                            ) : filteredProducts.map((p) => (
                                <button
                                    key={p.key}
                                    type="button"
                                    className={`ind-product-pill ${productoKey === p.key ? 'ind-product-pill--active' : ''}`}
                                    onClick={() => setProductoKey(p.key)}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </Card>

                    <div className="ind-filter-row ind-filter-row--card">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">Período</Text>
                        <div className="ind-filter-pills">
                            <button
                                type="button"
                                className={`ind-filter-pill ${periodo === 'all' ? 'ind-filter-pill--active' : ''}`}
                                onClick={() => setPeriodo('all')}
                            >
                                Hasta la fecha
                            </button>
                            {monthOptions.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    className={`ind-filter-pill ${periodo === m ? 'ind-filter-pill--active' : ''}`}
                                    onClick={() => setPeriodo(m)}
                                >
                                    {formatMonthLabel(m)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                        <Card className="glass-card ind-kpi-card">
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Último precio</Text>
                            <Text className="ind-kpi-card__value ind-kpi-card__value--green">
                                {priceStats.ultimo != null ? formatMoney(priceStats.ultimo) : '—'}
                            </Text>
                        </Card>
                        <Card className="glass-card ind-kpi-card">
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Vs. pedido anterior</Text>
                            <Text className="ind-kpi-card__value">
                                {priceStats.anterior != null ? formatMoney(priceStats.anterior) : '—'}
                            </Text>
                        </Card>
                        <Card className="glass-card ind-kpi-card">
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Variación histórica</Text>
                            <Text className="ind-kpi-card__value">
                                {priceStats.variacion != null
                                    ? `${priceStats.variacion > 0 ? '+' : ''}${priceStats.variacion.toFixed(1)}%`
                                    : '—'}
                            </Text>
                        </Card>
                    </SimpleGrid>

                    <Card className="glass-card almacen-card">
                        <Text fw={600} c="white" mb="md">Tendencia completa del producto</Text>
                        {priceTrend.length >= 2 ? (
                            <SimpleTrendChart data={priceTrend} valueKey="total" />
                        ) : (
                            <div className="almacen-empty">Se necesitan al menos 2 pedidos para mostrar tendencia.</div>
                        )}
                    </Card>
                </Stack>
            )}

            {!loading && subView === 'gastos' && (
                <Stack gap="md">
                    <Card className="glass-card almacen-card">
                        <Title order={4} c="white" mb="xs">Gastos mes a mes</Title>
                        <Text size="sm" c="dimmed">
                            Suma de pedidos procesados por mes — {activeTipo.label}.
                        </Text>
                    </Card>

                    <div className="ind-filter-row ind-filter-row--card">
                        <Text size="xs" fw={700} c="dimmed" tt="uppercase">Período</Text>
                        <div className="ind-filter-pills">
                            <button
                                type="button"
                                className={`ind-filter-pill ${periodo === 'all' ? 'ind-filter-pill--active' : ''}`}
                                onClick={() => setPeriodo('all')}
                            >
                                Hasta la fecha
                            </button>
                            {monthOptions.map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    className={`ind-filter-pill ${periodo === m ? 'ind-filter-pill--active' : ''}`}
                                    onClick={() => setPeriodo(m)}
                                >
                                    {formatMonthLabel(m)}
                                </button>
                            ))}
                        </div>
                    </div>

                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <Card className="glass-card ind-kpi-card">
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Gasto hasta la fecha</Text>
                            <Text className="ind-kpi-card__value ind-kpi-card__value--accent">
                                {formatMoney(gastosData.totalHastaFecha)}
                            </Text>
                        </Card>
                        <Card className="glass-card ind-kpi-card">
                            <Text size="xs" c="dimmed" tt="uppercase" fw={600}>Meses con pedidos</Text>
                            <Text className="ind-kpi-card__value">{gastosData.mesesConPedidos}</Text>
                        </Card>
                    </SimpleGrid>

                    <Card className="glass-card almacen-card">
                        <Text fw={600} c="white" mb="md">Tendencia mensual (todos los meses)</Text>
                        {gastosTrend.length > 0 ? (
                            <SimpleTrendChart
                                data={gastosTrend.map((m) => ({ key: m.key, label: m.label, total: m.acumulado }))}
                                valueKey="total"
                                height={220}
                            />
                        ) : (
                            <div className="almacen-empty">Sin gastos registrados en esta categoría.</div>
                        )}
                    </Card>
                </Stack>
            )}
        </div>
    );
}
