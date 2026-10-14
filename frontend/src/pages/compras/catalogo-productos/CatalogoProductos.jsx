import { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActionIcon,
    Button,
    Card,
    Group,
    Modal,
    NumberInput,
    Select,
    Stack,
    Text,
    TextInput,
    Title,
} from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconPackage, IconPlus, IconSearch, IconTrash } from '@tabler/icons-react';
import { almacenApi } from '../../../services/almacenApi';
import { api } from '../../../utils/api';
import { TIPOS_REQUISICION, UNIDADES_MEDIDA, getTipoRequisicion } from '../../../data/almacenConstants';
import AlmacenConfirmModal from '../shared/components/AlmacenConfirmModal';
import '../shared/comprasAlmacen.css';

const PAGE_SIZE = 25;

const EMPTY_FORM = {
    nombre: '',
    tipoRequisicionId: 'consumo_diario',
    descripcion: '',
    costoEstandar: 0,
    unidadSugerida: 'unidades',
};

function notifySuccess(message) {
    notifications.show({ title: 'Éxito', message, color: 'green' });
}

function notifyError(error) {
    notifications.show({
        title: 'Error',
        message: error?.message || String(error),
        color: 'red',
    });
}

function formatMoney(value) {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Number(value) || 0);
}

function formatQty(value) {
    return new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 2,
    }).format(Number(value) || 0);
}

function stockKey(name) {
    return String(name || '').trim().toLowerCase();
}

export default function CatalogoProductos() {
    const fileRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [productos, setProductos] = useState([]);
    const [stockRows, setStockRows] = useState([]);
    const [search, setSearch] = useState('');
    const [tipo, setTipo] = useState('todos');
    const [unidad, setUnidad] = useState('todas');
    const [page, setPage] = useState(1);
    const [form, setForm] = useState(null);
    const [confirm, setConfirm] = useState({ opened: false, producto: null });

    const load = async () => {
        setLoading(true);
        try {
            const [data, stock] = await Promise.all([
                almacenApi.listProductos({}),
                api.get('/production/inventory/stock').catch(() => null),
            ]);
            setProductos(Array.isArray(data) ? data : []);
            if (Array.isArray(stock)) setStockRows(stock);
            else notifyError(new Error('No se pudo cargar la cantidad en stock.'));
        } catch (err) {
            notifyError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const stockOf = (producto) => {
        const name = stockKey(producto.nombre);
        const id = String(producto.id || '').toLowerCase();
        return stockRows.reduce((sum, row) => {
            const sameId = row.productId && String(row.productId).toLowerCase() === id;
            const sameName = stockKey(row.productName) === name;
            if (!sameId && !sameName) return sum;
            return sum + (Number(row.available) || 0);
        }, 0);
    };

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return productos.filter((p) => {
            if (tipo !== 'todos' && p.tipoRequisicionId !== tipo) return false;
            if (unidad !== 'todas' && p.unidadSugerida !== unidad) return false;
            if (!q) return true;
            const blob = `${p.nombre || ''} ${p.descripcion || ''}`.toLowerCase();
            return blob.includes(q);
        });
    }, [productos, search, tipo, unidad]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const slice = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

    const save = async () => {
        if (!form) return;
        if (!String(form.nombre || '').trim()) {
            notifyError(new Error('El nombre del producto es obligatorio.'));
            return;
        }
        const body = {
            nombre: form.nombre,
            tipoRequisicionId: form.tipoRequisicionId,
            descripcion: form.descripcion || null,
            costoEstandar: Number(form.costoEstandar) || 0,
            unidadSugerida: form.unidadSugerida || 'unidades',
        };
        try {
            if (form.id) await almacenApi.updateProducto(form.id, body);
            else await almacenApi.createProducto(body);
            notifySuccess('Producto guardado.');
            setForm(null);
            await load();
        } catch (err) {
            notifyError(err);
        }
    };

    const remove = async () => {
        const producto = confirm.producto;
        if (!producto) return;
        try {
            await almacenApi.deleteProducto(producto.id);
            notifySuccess('Producto eliminado.');
            setConfirm({ opened: false, producto: null });
            await load();
        } catch (err) {
            notifyError(err);
            setConfirm({ opened: false, producto: null });
        }
    };

    const importExcel = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const result = await almacenApi.importProductosExcel(file);
            notifySuccess(`Importados: ${result.insertados} nuevos, ${result.actualizados} actualizados.`);
            await load();
        } catch (err) {
            notifyError(err);
        }
        e.target.value = '';
    };

    return (
        <div className="fade-in compras-almacen-view" style={{ paddingBottom: 40 }}>
            <Card className="glass-card" mb="xl" style={{ borderLeft: '4px solid #6366f1' }}>
                <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                    <div>
                        <Group gap="xs" mb={4}>
                            <IconPackage size={22} color="#6366f1" />
                            <Title order={3} c="white">Inventario de Productos</Title>
                        </Group>
                        <Text size="sm" c="dimmed">
                            Insumos y materiales de bodega, con la cantidad disponible en stock.
                        </Text>
                    </div>
                    <div className="almacen-actions">
                        <Button variant="default" onClick={() => fileRef.current?.click()}>
                            Importar Excel
                        </Button>
                        <Button leftSection={<IconPlus size={16} />} color="indigo" onClick={() => setForm({ ...EMPTY_FORM })}>
                            Nuevo producto
                        </Button>
                    </div>
                </Group>
            </Card>

            <Card className="glass-card almacen-card">
                <div className="almacen-tipo-bar">
                    <button
                        type="button"
                        className={`almacen-tipo-chip ${tipo === 'todos' ? 'almacen-tipo-chip--active' : ''}`}
                        onClick={() => { setTipo('todos'); setPage(1); }}
                    >
                        Todos
                        <span className="almacen-tipo-chip__count">{productos.length}</span>
                    </button>
                    {TIPOS_REQUISICION.map((t) => (
                        <button
                            key={t.id}
                            type="button"
                            className={`almacen-tipo-chip ${tipo === t.id ? 'almacen-tipo-chip--active' : ''}`}
                            onClick={() => { setTipo(t.id); setPage(1); }}
                        >
                            <span className="almacen-tipo-chip__dot" style={{ background: t.color }} />
                            {t.label}
                            <span className="almacen-tipo-chip__count">
                                {productos.filter((p) => p.tipoRequisicionId === t.id).length}
                            </span>
                        </button>
                    ))}
                </div>

                <Group px="md" pb="sm" gap="sm" wrap="wrap">
                    <TextInput
                        placeholder="Buscar producto..."
                        value={search}
                        onChange={(e) => { setSearch(e.currentTarget.value); setPage(1); }}
                        leftSection={<IconSearch size={16} />}
                        style={{ width: 280 }}
                    />
                    <Select
                        placeholder="Unidad"
                        data={[{ value: 'todas', label: 'Todas las unidades' }, ...UNIDADES_MEDIDA.map((u) => ({ value: u, label: u }))]}
                        value={unidad}
                        onChange={(v) => { setUnidad(v || 'todas'); setPage(1); }}
                        allowDeselect={false}
                        w={200}
                    />
                    <Text size="sm" c="dimmed">{filtered.length} productos</Text>
                </Group>

                <div className="almacen-table-wrap">
                    <table className="almacen-table">
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Categoría</th>
                                <th>Unidad</th>
                                <th>En stock</th>
                                <th>Costo estimado</th>
                                <th>Descripción</th>
                                <th />
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={7} className="almacen-empty">Cargando...</td></tr>
                            ) : slice.length === 0 ? (
                                <tr><td colSpan={7} className="almacen-empty">No hay productos para mostrar.</td></tr>
                            ) : slice.map((p) => {
                                const enStock = stockOf(p);
                                return (
                                <tr key={p.id}>
                                    <td>{p.nombre}</td>
                                    <td>{getTipoRequisicion(p.tipoRequisicionId).label}</td>
                                    <td>{p.unidadSugerida}</td>
                                    <td className="col-money" style={{ color: enStock > 0 ? undefined : 'rgba(255,255,255,0.45)' }}>
                                        {formatQty(enStock)}
                                    </td>
                                    <td className="col-money">{formatMoney(p.costoEstandar)}</td>
                                    <td>{p.descripcion || '—'}</td>
                                    <td>
                                        <Group gap={4} wrap="nowrap">
                                            <Button size="xs" variant="subtle" onClick={() => setForm({ ...p })}>Editar</Button>
                                            <ActionIcon
                                                color="red"
                                                variant="subtle"
                                                aria-label="Eliminar"
                                                onClick={() => setConfirm({ opened: true, producto: p })}
                                            >
                                                <IconTrash size={14} />
                                            </ActionIcon>
                                        </Group>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="almacen-pagination">
                    <span>
                        {filtered.length === 0
                            ? 'Sin resultados'
                            : `Mostrando ${(safePage - 1) * PAGE_SIZE + 1}-${Math.min(safePage * PAGE_SIZE, filtered.length)} de ${filtered.length}`}
                        {' — '}Página {safePage} de {totalPages}
                    </span>
                    <Group gap="xs">
                        <Button size="xs" variant="default" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                            ← Anterior
                        </Button>
                        <Button size="xs" disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)}>
                            Siguiente →
                        </Button>
                    </Group>
                </div>
            </Card>

            <input ref={fileRef} type="file" accept=".xlsx,.xls" hidden onChange={importExcel} />

            <Modal
                opened={!!form}
                onClose={() => setForm(null)}
                title={form?.id ? 'Editar producto' : 'Nuevo producto'}
                size="md"
                centered
            >
                {form && (
                    <Stack gap="sm">
                        <TextInput
                            label="Nombre"
                            required
                            placeholder="Nombre del producto"
                            value={form.nombre}
                            onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                        />
                        <TextInput
                            label="Descripción"
                            placeholder="Descripción opcional"
                            value={form.descripcion || ''}
                            onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                        />
                        <div>
                            <Text size="sm" fw={500} mb={6}>Categoría</Text>
                            <Group gap="xs">
                                {TIPOS_REQUISICION.map((t) => (
                                    <Button
                                        key={t.id}
                                        size="compact-xs"
                                        variant={form.tipoRequisicionId === t.id ? 'filled' : 'outline'}
                                        style={
                                            form.tipoRequisicionId === t.id
                                                ? { background: t.color, borderColor: t.color }
                                                : { borderColor: t.color, color: t.color }
                                        }
                                        onClick={() => setForm((f) => ({ ...f, tipoRequisicionId: t.id }))}
                                    >
                                        {t.label}
                                    </Button>
                                ))}
                            </Group>
                        </div>
                        <div>
                            <Text size="sm" fw={500} mb={6}>Unidad</Text>
                            <Group gap="xs">
                                {UNIDADES_MEDIDA.map((u) => (
                                    <Button
                                        key={u}
                                        size="compact-xs"
                                        variant={form.unidadSugerida === u ? 'filled' : 'light'}
                                        onClick={() => setForm((f) => ({ ...f, unidadSugerida: u }))}
                                    >
                                        {u}
                                    </Button>
                                ))}
                            </Group>
                        </div>
                        <NumberInput
                            label="Costo estimado (COP)"
                            value={form.costoEstandar}
                            onChange={(v) => setForm((f) => ({ ...f, costoEstandar: v }))}
                            min={0}
                            thousandSeparator="."
                            decimalSeparator=","
                        />
                        <Group justify="flex-end">
                            <Button variant="default" onClick={() => setForm(null)}>Cancelar</Button>
                            <Button onClick={save}>Guardar</Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            <AlmacenConfirmModal
                opened={confirm.opened}
                onClose={() => setConfirm({ opened: false, producto: null })}
                title="Eliminar producto"
                message={`¿Eliminar ${confirm.producto?.nombre || 'este producto'}?`}
                confirmLabel="Eliminar"
                onConfirm={remove}
            />
        </div>
    );
}
