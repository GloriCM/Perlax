import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ActionIcon,
    Autocomplete,
    Button,
    Card,
    Checkbox,
    Group,
    Modal,
    NumberInput,
    Select,
    SimpleGrid,
    Stack,
    Text,
    Textarea,
    TextInput,
    Title,
    Tooltip,
} from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { useDebouncedValue, useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
    IconBox,
    IconClipboardList,
    IconMessage,
    IconPlus,
    IconSearch,
    IconShoppingCart,
    IconTrash,
} from '@tabler/icons-react';
import '@mantine/dates/styles.css';
import { almacenApi } from '../../../services/almacenApi';
import {
    PAGE_SIZE,
    TIPOS_REQUISICION,
    UNIDADES_MEDIDA,
    calcularImpuestosColombia,
    getTipoRequisicion,
} from '../../../data/almacenConstants';
import { generarOrdenCompraPdf } from '../../../utils/almacenOrdenCompraPdf';
import AlmacenConfirmModal from './components/AlmacenConfirmModal';
import AlmacenEstadoBadge from './components/AlmacenEstadoBadge';
import AlmacenFiltroEstado from './components/AlmacenFiltroEstado';
import './comprasAlmacen.css';

const TAB_META = {
    requisicion: {
        title: 'Requisiciones',
        subtitle: 'Insumos de consumo diario y materiales de almacén.',
        icon: IconClipboardList,
        accent: '#6366f1',
    },
    pedidos: {
        title: 'Gestión de Pedidos',
        subtitle: 'Procese requisiciones pendientes y gestione proveedores.',
        icon: IconShoppingCart,
        accent: '#6366f1',
    },
    recepcion: {
        title: 'Recepción de Mercancía',
        subtitle: 'Registre la llegada de materiales y valide calidad.',
        icon: IconBox,
        accent: '#6366f1',
    },
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

function formatDateTime(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value);
    return d.toLocaleString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatDate(value) {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
    return d.toISOString().slice(0, 10);
}

function toApiDate(value) {
    if (!value) return null;
    const d = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    return d.toISOString();
}

const EMPTY_REQ = {
    tipoRequisicionId: 'consumo_diario',
    fechaSolicitud: new Date(),
    ordenProduccionNumero: '',
    catalogoOpId: null,
    cliente: '',
    referencia: '',
    productoId: null,
    productoNombre: '',
    cantidad: 1,
    unidad: 'unidades',
    fechaRequerida: null,
    observacion: '',
};

const EMPTY_PROVEEDOR_PEDIDO = {
    proveedorCatalogoId: null,
    nombre: '',
    nit: '',
    telefono: '',
    cantidad: 0,
    precioUnitario: 0,
    fechaEntregaEstimada: null,
};

export default function ComprasAlmacenView({ tab = 'requisicion' }) {
    const productosFileRef = useRef(null);
    const proveedoresFileRef = useRef(null);
    const meta = TAB_META[tab] || TAB_META.requisicion;
    const HeaderIcon = meta.icon;
    const [loading, setLoading] = useState(false);
    const [requisiciones, setRequisiciones] = useState([]);
    const [productos, setProductos] = useState([]);
    const [proveedores, setProveedores] = useState([]);

    const [filtroEstado, setFiltroEstado] = useState('Todos');
    const [filtroTipo, setFiltroTipo] = useState('consumo_diario');
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebouncedValue(search, 350);
    const [page, setPage] = useState(1);

    const [reqModal, { open: openReqModal, close: closeReqModal }] = useDisclosure(false);
    const [reqForm, setReqForm] = useState(EMPTY_REQ);
    const [editingReqId, setEditingReqId] = useState(null);

    const [productosModal, { open: openProductosModal, close: closeProductosModal }] = useDisclosure(false);
    const [proveedoresModal, { open: openProveedoresModal, close: closeProveedoresModal }] = useDisclosure(false);
    const [productoForm, setProductoForm] = useState(null);
    const [proveedorForm, setProveedorForm] = useState(null);

    const [pedidoModal, { open: openPedidoModal, close: closePedidoModal }] = useDisclosure(false);
    const [pedidoReq, setPedidoReq] = useState(null);
    const [pedidoForm, setPedidoForm] = useState({
        fechaPedido: new Date(),
        fechaEntregaEstimada: null,
        proveedores: [{ ...EMPTY_PROVEEDOR_PEDIDO }],
    });

    const [recepcionModal, { open: openRecepcionModal, close: closeRecepcionModal }] = useDisclosure(false);
    const [recepcionTarget, setRecepcionTarget] = useState(null);
    const [recepcionForm, setRecepcionForm] = useState({
        pedidoProveedorId: '',
        codigoUsuario: '',
        fechaLlegada: new Date(),
        calidadEsperada: true,
        motivoCalidadNo: '',
        facturaEntregada: true,
        motivoFacturaNo: '',
        cantidadRecibida: 0,
        pedidoCompleto: true,
        motivoCantidadParcial: '',
        nuevaFechaEntrega: null,
    });

    const [confirmState, setConfirmState] = useState({ opened: false, title: '', message: '', onConfirm: null });
    const [opOptions, setOpOptions] = useState([]);
    const [opSearch, setOpSearch] = useState('');

    const refreshRequisiciones = useCallback(async () => {
        setLoading(true);
        try {
            const data = await almacenApi.listRequisiciones({ q: debouncedSearch || undefined });
            setRequisiciones(Array.isArray(data) ? data : []);
        } catch (err) {
            notifyError(err);
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch]);

    const refreshProductos = useCallback(async () => {
        try {
            const data = await almacenApi.listProductos({});
            setProductos(Array.isArray(data) ? data : []);
        } catch (err) {
            notifyError(err);
        }
    }, []);

    const refreshProveedores = useCallback(async () => {
        try {
            const data = await almacenApi.listProveedores({ limit: 500 });
            setProveedores(Array.isArray(data) ? data : []);
        } catch (err) {
            notifyError(err);
        }
    }, []);

    useEffect(() => {
        refreshRequisiciones();
    }, [refreshRequisiciones]);

    useEffect(() => {
        refreshProductos();
        refreshProveedores();
    }, [refreshProductos, refreshProveedores]);

    useEffect(() => {
        if (!opSearch || opSearch.length < 1) {
            setOpOptions([]);
            return;
        }
        let cancelled = false;
        almacenApi.searchOrdenesProduccion({ q: opSearch, limit: 20 })
            .then((data) => {
                if (cancelled) return;
                const opts = (Array.isArray(data) ? data : []).map((op) => ({
                    value: op.otNumero || op.oTNumero || '',
                    label: `${op.otNumero || op.oTNumero || ''} — ${op.cliente || ''} — ${op.productoNombre || ''}`,
                    meta: op,
                }));
                setOpOptions(opts);
            })
            .catch(() => setOpOptions([]));
        return () => { cancelled = true; };
    }, [opSearch]);

    const showTipoFiltro = tab === 'requisicion' || tab === 'pedidos' || tab === 'recepcion';

    const estadoCounts = useMemo(() => {
        let base = [...requisiciones];
        if (showTipoFiltro) base = base.filter((r) => r.tipoRequisicionId === filtroTipo);
        if (tab === 'pedidos') base = base.filter((r) => r.estado !== 'En Almacen');
        if (tab === 'recepcion') base = base.filter((r) => r.estado === 'Pedido' || r.estado === 'Parcial');

        const counts = { Todos: base.length };
        base.forEach((r) => {
            counts[r.estado] = (counts[r.estado] || 0) + 1;
        });
        return counts;
    }, [requisiciones, filtroTipo, tab, showTipoFiltro]);

    const tipoCounts = useMemo(() => {
        const counts = {};
        TIPOS_REQUISICION.forEach((t) => { counts[t.id] = 0; });
        requisiciones.forEach((r) => {
            if (counts[r.tipoRequisicionId] !== undefined) counts[r.tipoRequisicionId] += 1;
        });
        return counts;
    }, [requisiciones]);

    const filteredList = useMemo(() => {
        let list = [...requisiciones];
        if (filtroEstado !== 'Todos') list = list.filter((r) => r.estado === filtroEstado);
        if (showTipoFiltro) list = list.filter((r) => r.tipoRequisicionId === filtroTipo);
        if (tab === 'pedidos') list = list.filter((r) => r.estado !== 'En Almacen');
        if (tab === 'recepcion') {
            list = list.filter((r) => r.estado === 'Pedido' || r.estado === 'Parcial');
        }
        return list;
    }, [requisiciones, filtroEstado, filtroTipo, tab, showTipoFiltro]);

    const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
    const paginatedList = useMemo(() => {
        const start = (page - 1) * PAGE_SIZE;
        return filteredList.slice(start, start + PAGE_SIZE);
    }, [filteredList, page]);

    useEffect(() => {
        setPage(1);
    }, [filtroEstado, filtroTipo, tab, debouncedSearch]);

    const openCreateReq = () => {
        setEditingReqId(null);
        setReqForm({ ...EMPTY_REQ, fechaSolicitud: new Date() });
        openReqModal();
    };

    const openEditReq = async (row) => {
        if (row.estado !== 'Pendiente') {
            notifyError(new Error('Solo se pueden editar requisiciones en estado Pendiente.'));
            return;
        }
        try {
            const detail = await almacenApi.getRequisicion(row.id);
            setEditingReqId(row.id);
            setReqForm({
                tipoRequisicionId: detail.tipoRequisicionId,
                fechaSolicitud: detail.fechaSolicitud ? new Date(detail.fechaSolicitud) : new Date(),
                ordenProduccionNumero: detail.ordenProduccionNumero || '',
                catalogoOpId: detail.catalogoOpId || null,
                cliente: detail.cliente || '',
                referencia: detail.referencia || '',
                productoId: detail.productoId || null,
                productoNombre: detail.productoNombre || '',
                cantidad: detail.cantidad || 1,
                unidad: detail.unidad || 'unidades',
                fechaRequerida: detail.fechaRequerida ? new Date(detail.fechaRequerida) : null,
                observacion: detail.observacion || '',
            });
            openReqModal();
        } catch (err) {
            notifyError(err);
        }
    };

    const saveRequisicion = async () => {
        const body = {
            tipoRequisicionId: reqForm.tipoRequisicionId,
            fechaSolicitud: toApiDate(reqForm.fechaSolicitud),
            ordenProduccionNumero: reqForm.ordenProduccionNumero || null,
            catalogoOpId: reqForm.catalogoOpId || null,
            cliente: reqForm.cliente,
            referencia: reqForm.referencia || null,
            productoId: reqForm.productoId || null,
            productoNombre: reqForm.productoNombre,
            cantidad: Number(reqForm.cantidad),
            unidad: reqForm.unidad,
            fechaRequerida: toApiDate(reqForm.fechaRequerida),
            observacion: reqForm.observacion || null,
        };
        try {
            if (editingReqId) {
                await almacenApi.updateRequisicion(editingReqId, body);
                notifySuccess('Requisición actualizada.');
            } else {
                await almacenApi.createRequisicion(body);
                notifySuccess('Requisición registrada.');
            }
            closeReqModal();
            refreshRequisiciones();
        } catch (err) {
            notifyError(err);
        }
    };

    const deleteRequisicion = (row) => {
        setConfirmState({
            opened: true,
            title: 'Eliminar requisición',
            message: `¿Eliminar ${row.codigo}?`,
            onConfirm: async () => {
                try {
                    await almacenApi.deleteRequisicion(row.id);
                    notifySuccess('Requisición eliminada.');
                    refreshRequisiciones();
                } catch (err) {
                    notifyError(err);
                } finally {
                    setConfirmState((s) => ({ ...s, opened: false }));
                }
            },
        });
    };

    const openProcesarPedido = async (row) => {
        try {
            const detail = await almacenApi.getRequisicion(row.id);
            setPedidoReq(detail);
            const provs = detail.pedido?.proveedores?.length
                ? detail.pedido.proveedores.map((p) => ({
                    proveedorCatalogoId: p.proveedorCatalogoId,
                    nombre: p.nombre,
                    nit: p.nit || '',
                    telefono: p.telefono || '',
                    cantidad: p.cantidad,
                    precioUnitario: p.precioUnitario,
                    fechaEntregaEstimada: p.fechaEntregaEstimada ? new Date(p.fechaEntregaEstimada) : null,
                }))
                : [{
                    ...EMPTY_PROVEEDOR_PEDIDO,
                    cantidad: detail.cantidad,
                }];
            setPedidoForm({
                fechaPedido: detail.pedido?.fechaPedido ? new Date(detail.pedido.fechaPedido) : new Date(),
                fechaEntregaEstimada: detail.pedido?.fechaEntregaEstimada
                    ? new Date(detail.pedido.fechaEntregaEstimada) : null,
                proveedores: provs,
            });
            openPedidoModal();
        } catch (err) {
            notifyError(err);
        }
    };

    const savePedido = async () => {
        if (!pedidoReq) return;
        const body = {
            fechaPedido: toApiDate(pedidoForm.fechaPedido),
            fechaEntregaEstimada: toApiDate(pedidoForm.fechaEntregaEstimada),
            proveedores: pedidoForm.proveedores.map((p) => ({
                proveedorCatalogoId: p.proveedorCatalogoId || null,
                nombre: p.nombre,
                nit: p.nit || null,
                telefono: p.telefono || null,
                cantidad: Number(p.cantidad),
                precioUnitario: Number(p.precioUnitario),
                fechaEntregaEstimada: toApiDate(p.fechaEntregaEstimada),
            })),
        };
        try {
            const updated = await almacenApi.guardarPedido(pedidoReq.id, body);
            notifySuccess('Pedido guardado.');
            closePedidoModal();
            refreshRequisiciones();
            if (updated?.pedido?.proveedores?.[0]?.ordenCompraId) {
                try {
                    const oc = await almacenApi.getOrdenCompra(updated.pedido.proveedores[0].ordenCompraId);
                    await generarOrdenCompraPdf(oc);
                } catch {
                    // PDF opcional
                }
            }
        } catch (err) {
            notifyError(err);
        }
    };

    const marcarPagado = async (reqId, prov) => {
        const formaPago = window.prompt('Forma de pago (credito / efectivo):', 'credito');
        if (!formaPago) return;
        try {
            await almacenApi.patchPagadoProveedor(reqId, prov.id, { pagado: true, formaPago });
            notifySuccess('Pago registrado.');
            refreshRequisiciones();
        } catch (err) {
            notifyError(err);
        }
    };

    const openRecepcion = async (row) => {
        try {
            const detail = await almacenApi.getRequisicion(row.id);
            const pending = (detail.pedido?.proveedores || []).filter((p) => (p.saldoPendiente ?? 0) > 0);
            if (!pending.length) {
                notifyError(new Error('No hay saldo pendiente por recibir.'));
                return;
            }
            setRecepcionTarget(detail);
            setRecepcionForm({
                pedidoProveedorId: pending[0].id,
                codigoUsuario: '',
                fechaLlegada: new Date(),
                calidadEsperada: true,
                motivoCalidadNo: '',
                facturaEntregada: true,
                motivoFacturaNo: '',
                cantidadRecibida: pending[0].saldoPendiente,
                pedidoCompleto: true,
                motivoCantidadParcial: '',
                nuevaFechaEntrega: null,
            });
            openRecepcionModal();
        } catch (err) {
            notifyError(err);
        }
    };

    const saveRecepcion = async () => {
        if (!recepcionTarget) return;
        const body = {
            pedidoProveedorId: recepcionForm.pedidoProveedorId,
            codigoUsuario: recepcionForm.codigoUsuario,
            fechaLlegada: toApiDate(recepcionForm.fechaLlegada),
            calidadEsperada: recepcionForm.calidadEsperada,
            motivoCalidadNo: recepcionForm.motivoCalidadNo || null,
            facturaEntregada: recepcionForm.facturaEntregada,
            motivoFacturaNo: recepcionForm.motivoFacturaNo || null,
            cantidadRecibida: Number(recepcionForm.cantidadRecibida),
            pedidoCompleto: recepcionForm.pedidoCompleto,
            motivoCantidadParcial: recepcionForm.motivoCantidadParcial || null,
            nuevaFechaEntrega: toApiDate(recepcionForm.nuevaFechaEntrega),
        };
        try {
            await almacenApi.registrarRecepcion(recepcionTarget.id, body);
            notifySuccess('Recepción registrada.');
            closeRecepcionModal();
            refreshRequisiciones();
        } catch (err) {
            notifyError(err);
        }
    };

    const saveProducto = async () => {
        if (!productoForm) return;
        const body = {
            nombre: productoForm.nombre,
            tipoRequisicionId: productoForm.tipoRequisicionId,
            descripcion: productoForm.descripcion || null,
            costoEstandar: Number(productoForm.costoEstandar) || 0,
            unidadSugerida: productoForm.unidadSugerida,
        };
        try {
            if (productoForm.id) {
                await almacenApi.updateProducto(productoForm.id, body);
            } else {
                await almacenApi.createProducto(body);
            }
            notifySuccess('Producto guardado.');
            setProductoForm(null);
            refreshProductos();
        } catch (err) {
            notifyError(err);
        }
    };

    const saveProveedor = async () => {
        if (!proveedorForm) return;
        const body = {
            nombre: proveedorForm.nombre,
            nit: proveedorForm.nit || null,
            correo: proveedorForm.correo || null,
            telefonoTrabajo: proveedorForm.telefonoTrabajo || null,
            telefonoMovil: proveedorForm.telefonoMovil || null,
            direccion: proveedorForm.direccion || null,
            categoria: proveedorForm.categoria || null,
            responsableIva: !!proveedorForm.responsableIva,
        };
        try {
            if (proveedorForm.id) {
                await almacenApi.updateProveedor(proveedorForm.id, body);
            } else {
                await almacenApi.createProveedor(body);
            }
            notifySuccess('Proveedor guardado.');
            setProveedorForm(null);
            refreshProveedores();
        } catch (err) {
            notifyError(err);
        }
    };

    const handleImportProductos = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const result = await almacenApi.importProductosExcel(file);
            notifySuccess(`Importados: ${result.insertados} nuevos, ${result.actualizados} actualizados.`);
            refreshProductos();
        } catch (err) {
            notifyError(err);
        }
        e.target.value = '';
    };

    const handleImportProveedores = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            const result = await almacenApi.importProveedoresExcel(file);
            notifySuccess(`Importados: ${result.insertados} nuevos, ${result.actualizados} actualizados.`);
            refreshProveedores();
        } catch (err) {
            notifyError(err);
        }
        e.target.value = '';
    };

    const renderTableRows = () => {
        if (!paginatedList.length) {
            return (
                <tr>
                    <td colSpan={13} className="almacen-empty">No hay registros para mostrar.</td>
                </tr>
            );
        }

        return paginatedList.map((row) => {
            const tipo = getTipoRequisicion(row.tipoRequisicionId);
            const pedidoQty = row.estado !== 'Pendiente' ? row.cantidad : null;
            return (
                <tr key={row.id}>
                    <td className="col-cod">{row.codigo}</td>
                    <td>{formatDateTime(row.fechaSolicitud)}</td>
                    <td className="col-op">{row.ordenProduccionNumero || '—'}</td>
                    <td>{(row.proveedoresNombres || []).join(', ') || '—'}</td>
                    <td>{row.referencia || '—'}</td>
                    <td>{row.productoNombre}</td>
                    <td>
                        <div>Req: {row.cantidad} {row.unidad}</div>
                        {pedidoQty > 0 && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Ped: {pedidoQty} {row.unidad}</div>}
                    </td>
                    <td>
                        {row.totalEstimado != null ? (
                            <>
                                <div className="col-money">{formatMoney(row.totalEstimado)}</div>
                                {row.precioUnitario != null && (
                                    <div className="col-money-sub">{formatMoney(row.precioUnitario)} / {row.unidad}</div>
                                )}
                            </>
                        ) : '—'}
                    </td>
                    <td>{formatDate(row.fechaRequerida)}</td>
                    <td>
                        {row.observacion ? (
                            <span className="almacen-comment-badge">
                                <IconMessage size={14} />
                                {row.observacion.slice(0, 30)}
                            </span>
                        ) : '—'}
                    </td>
                    <td>{row.creadoPorNombre || '—'}</td>
                    <td><AlmacenEstadoBadge estado={row.estado} /></td>
                    <td>
                        <Group gap={4} wrap="nowrap">
                            {tab === 'requisicion' && row.estado === 'Pendiente' && (
                                <>
                                    <Button size="xs" variant="outline" onClick={() => openEditReq(row)}>Editar</Button>
                                    <Button size="xs" variant="outline" color="red" onClick={() => deleteRequisicion(row)}>Borrar</Button>
                                </>
                            )}
                            {tab === 'pedidos' && row.estado === 'Pendiente' && (
                                <Button size="xs" onClick={() => openProcesarPedido(row)}>Procesar pedido</Button>
                            )}
                            {tab === 'pedidos' && row.estado !== 'Pendiente' && (
                                <Button size="xs" variant="outline" onClick={() => openProcesarPedido(row)}>Editar</Button>
                            )}
                            {tab === 'recepcion' && (
                                <Button size="xs" onClick={() => openRecepcion(row)}>Registrar recepción</Button>
                            )}
                        </Group>
                    </td>
                </tr>
            );
        });
    };

    return (
        <div className="fade-in compras-almacen-view" style={{ paddingBottom: 40 }}>
            <Card className="glass-card" mb="xl" style={{ borderLeft: `4px solid ${meta.accent}` }}>
                <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                    <div>
                        <Group gap="xs" mb={4}>
                            <HeaderIcon size={22} color={meta.accent} />
                            <Title order={3} c="white">{meta.title}</Title>
                        </Group>
                        <Text size="sm" c="dimmed">{meta.subtitle}</Text>
                    </div>
                    {tab !== 'indicadores' && (
                        <div className="almacen-actions">
                            {tab === 'requisicion' && (
                                <>
                                    <Button variant="default" onClick={() => productosFileRef.current?.click()}>
                                        Importar productos Excel
                                    </Button>
                                    <Button variant="outline" color="red" onClick={() => setConfirmState({
                                        opened: true,
                                        title: 'Reset pruebas',
                                        message: '¿Eliminar todos los datos de prueba?',
                                        onConfirm: async () => {
                                            try {
                                                await almacenApi.resetPruebas();
                                                notifySuccess('Datos de prueba eliminados.');
                                                refreshRequisiciones();
                                            } catch (err) { notifyError(err); }
                                            finally { setConfirmState((s) => ({ ...s, opened: false })); }
                                        },
                                    })}>
                                        Borrar todo (pruebas)
                                    </Button>
                                    <Button leftSection={<IconPlus size={16} />} color="indigo" onClick={openCreateReq}>
                                        Registrar requisición
                                    </Button>
                                </>
                            )}
                            {tab === 'pedidos' && (
                                <>
                                    <Button variant="default" onClick={() => { openProductosModal(); refreshProductos(); }}>
                                        Ver productos ({productos.length})
                                    </Button>
                                    <Button variant="default" onClick={() => { openProveedoresModal(); refreshProveedores(); }}>
                                        Ver proveedores ({proveedores.length})
                                    </Button>
                                    <Button variant="outline" onClick={() => proveedoresFileRef.current?.click()}>
                                        Importar Excel
                                    </Button>
                                </>
                            )}
                            <TextInput
                                placeholder="Buscar..."
                                value={search}
                                onChange={(e) => setSearch(e.currentTarget.value)}
                                size="sm"
                                leftSection={<IconSearch size={16} />}
                                style={{ width: 220 }}
                            />
                        </div>
                    )}
                </Group>
            </Card>

            <div className="almacen-content">
                <Card className="glass-card almacen-card">
                        {showTipoFiltro && (
                            <div className="almacen-tipo-bar">
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
                        )}

                        <AlmacenFiltroEstado value={filtroEstado} onChange={setFiltroEstado} counts={estadoCounts} />

                        <div className="almacen-table-wrap">
                            <table className="almacen-table">
                                <thead>
                                    <tr>
                                        <th>COD.</th>
                                        <th>FECHA SOL.</th>
                                        <th>ORDEN PROD.</th>
                                        <th>PROVEEDORES</th>
                                        <th>REFERENCIA</th>
                                        <th>PRODUCTO</th>
                                        <th>CANT.</th>
                                        <th>PRECIO / TOT.</th>
                                        <th>FECHA REQ.</th>
                                        <th>COMENTARIOS</th>
                                        <th>INGRESADO POR</th>
                                        <th>ESTADO</th>
                                        <th>ACCIONES</th>
                                    </tr>
                                </thead>
                                <tbody>{loading ? (
                                    <tr><td colSpan={13} className="almacen-empty">Cargando...</td></tr>
                                ) : renderTableRows()}</tbody>
                            </table>
                        </div>

                        <div className="almacen-pagination">
                            <span>
                                Mostrando {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, filteredList.length)} de {filteredList.length}
                                {' — '}Página {page} de {totalPages}
                            </span>
                            <Group gap="xs">
                                <Button size="xs" variant="default" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                                    ← Anterior
                                </Button>
                                <Button size="xs" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                                    Siguiente →
                                </Button>
                            </Group>
                        </div>
                    </Card>

            </div>

            <input ref={productosFileRef} type="file" accept=".xlsx,.xls" hidden onChange={handleImportProductos} />
            <input ref={proveedoresFileRef} type="file" accept=".xlsx,.xls" hidden onChange={handleImportProveedores} />

            {/* Modal requisición */}
            <Modal opened={reqModal} onClose={closeReqModal} title={editingReqId ? 'Editar requisición' : 'Registrar requisición'} size="lg" centered>
                <Stack gap="sm">
                    <Text size="sm" fw={600}>Tipo de requisición</Text>
                    <Group gap="xs">
                        {TIPOS_REQUISICION.map((t) => (
                            <Button
                                key={t.id}
                                size="xs"
                                variant={reqForm.tipoRequisicionId === t.id ? 'filled' : 'outline'}
                                style={reqForm.tipoRequisicionId === t.id ? { background: t.color, borderColor: t.color } : { borderColor: t.color, color: t.color }}
                                onClick={() => setReqForm((f) => ({ ...f, tipoRequisicionId: t.id }))}
                            >
                                {t.label}
                            </Button>
                        ))}
                    </Group>
                    <SimpleGrid cols={2}>
                        <DateInput label="Fecha solicitud" value={reqForm.fechaSolicitud} onChange={(v) => setReqForm((f) => ({ ...f, fechaSolicitud: v }))} />
                        <DateInput label="Fecha requerida" value={reqForm.fechaRequerida} onChange={(v) => setReqForm((f) => ({ ...f, fechaRequerida: v }))} />
                    </SimpleGrid>
                    <Autocomplete
                        label="Orden de producción"
                        placeholder="Buscar OP..."
                        data={opOptions.map((o) => o.label)}
                        value={reqForm.ordenProduccionNumero}
                        onChange={(v) => {
                            setOpSearch(v);
                            setReqForm((f) => ({ ...f, ordenProduccionNumero: v }));
                        }}
                        onOptionSubmit={(label) => {
                            const opt = opOptions.find((o) => o.label === label);
                            if (opt?.meta) {
                                setReqForm((f) => ({
                                    ...f,
                                    ordenProduccionNumero: opt.meta.otNumero || opt.meta.oTNumero || '',
                                    catalogoOpId: opt.meta.id,
                                    cliente: opt.meta.cliente || f.cliente,
                                    referencia: opt.meta.productoNombre || f.referencia,
                                }));
                            }
                        }}
                    />
                    <SimpleGrid cols={2}>
                        <TextInput label="Cliente" value={reqForm.cliente} onChange={(e) => setReqForm((f) => ({ ...f, cliente: e.target.value }))} />
                        <TextInput label="Referencia" value={reqForm.referencia} onChange={(e) => setReqForm((f) => ({ ...f, referencia: e.target.value }))} />
                    </SimpleGrid>
                    <Autocomplete
                        label="Producto / insumo"
                        data={productos.map((p) => p.nombre)}
                        value={reqForm.productoNombre}
                        onChange={(v) => setReqForm((f) => ({ ...f, productoNombre: v }))}
                        onOptionSubmit={(nombre) => {
                            const p = productos.find((x) => x.nombre === nombre);
                            if (p) {
                                setReqForm((f) => ({
                                    ...f,
                                    productoNombre: p.nombre,
                                    productoId: p.id,
                                    unidad: p.unidadSugerida || f.unidad,
                                    tipoRequisicionId: p.tipoRequisicionId || f.tipoRequisicionId,
                                }));
                            }
                        }}
                    />
                    <SimpleGrid cols={2}>
                        <NumberInput label="Cantidad" min={0.01} decimalScale={2} value={reqForm.cantidad} onChange={(v) => setReqForm((f) => ({ ...f, cantidad: v }))} />
                        <Select label="Unidad" data={UNIDADES_MEDIDA} value={reqForm.unidad} onChange={(v) => setReqForm((f) => ({ ...f, unidad: v }))} />
                    </SimpleGrid>
                    <Textarea label="Observación" value={reqForm.observacion} onChange={(e) => setReqForm((f) => ({ ...f, observacion: e.target.value }))} />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={closeReqModal}>Cancelar</Button>
                        <Button onClick={saveRequisicion}>{editingReqId ? 'Guardar' : 'Registrar'}</Button>
                    </Group>
                </Stack>
            </Modal>

            {/* Modal pedido */}
            <Modal opened={pedidoModal} onClose={closePedidoModal} title="Procesar pedido" size="lg" centered>
                {pedidoReq && (
                    <Stack gap="sm">
                        <Text size="sm"><strong>{pedidoReq.codigo}</strong> — {pedidoReq.productoNombre} ({pedidoReq.cantidad} {pedidoReq.unidad})</Text>
                        <SimpleGrid cols={2}>
                            <DateInput label="Fecha pedido" value={pedidoForm.fechaPedido} onChange={(v) => setPedidoForm((f) => ({ ...f, fechaPedido: v }))} />
                            <DateInput label="Entrega estimada" value={pedidoForm.fechaEntregaEstimada} onChange={(v) => setPedidoForm((f) => ({ ...f, fechaEntregaEstimada: v }))} />
                        </SimpleGrid>
                        <Text fw={600} size="sm">Proveedores</Text>
                        {pedidoForm.proveedores.map((prov, idx) => (
                            <div key={idx} className="almacen-proveedor-row">
                                <Autocomplete
                                    label="Proveedor"
                                    data={proveedores.map((p) => p.nombre)}
                                    value={prov.nombre}
                                    onChange={(v) => {
                                        const copy = [...pedidoForm.proveedores];
                                        copy[idx] = { ...copy[idx], nombre: v };
                                        setPedidoForm((f) => ({ ...f, proveedores: copy }));
                                    }}
                                    onOptionSubmit={(nombre) => {
                                        const p = proveedores.find((x) => x.nombre === nombre);
                                        const copy = [...pedidoForm.proveedores];
                                        copy[idx] = {
                                            ...copy[idx],
                                            nombre: p?.nombre || nombre,
                                            proveedorCatalogoId: p?.id || null,
                                            nit: p?.nit || '',
                                            telefono: p?.telefono || p?.telefonoTrabajo || '',
                                        };
                                        setPedidoForm((f) => ({ ...f, proveedores: copy }));
                                    }}
                                />
                                <SimpleGrid cols={3} mt="xs">
                                    <NumberInput label="Cantidad" value={prov.cantidad} onChange={(v) => {
                                        const copy = [...pedidoForm.proveedores];
                                        copy[idx] = { ...copy[idx], cantidad: v };
                                        setPedidoForm((f) => ({ ...f, proveedores: copy }));
                                    }} />
                                    <NumberInput label="Precio unit." value={prov.precioUnitario} onChange={(v) => {
                                        const copy = [...pedidoForm.proveedores];
                                        copy[idx] = { ...copy[idx], precioUnitario: v };
                                        setPedidoForm((f) => ({ ...f, proveedores: copy }));
                                    }} />
                                    <DateInput label="Entrega" value={prov.fechaEntregaEstimada} onChange={(v) => {
                                        const copy = [...pedidoForm.proveedores];
                                        copy[idx] = { ...copy[idx], fechaEntregaEstimada: v };
                                        setPedidoForm((f) => ({ ...f, proveedores: copy }));
                                    }} />
                                </SimpleGrid>
                                {prov.cantidad > 0 && prov.precioUnitario > 0 && (() => {
                                    const p = proveedores.find((x) => x.id === prov.proveedorCatalogoId);
                                    const imp = calcularImpuestosColombia({
                                        subtotal: prov.cantidad * prov.precioUnitario,
                                        categoriaProveedor: p?.categoria,
                                        responsableIva: p?.responsableIva,
                                    });
                                    return (
                                        <Text size="xs" c="dimmed" mt={4}>
                                            Neto estimado: {formatMoney(imp.totalNeto)} (IVA {formatMoney(imp.iva)}, Retefuente {formatMoney(imp.retefuente)})
                                        </Text>
                                    );
                                })()}
                            </div>
                        ))}
                        <Button variant="light" size="xs" onClick={() => setPedidoForm((f) => ({
                            ...f,
                            proveedores: [...f.proveedores, { ...EMPTY_PROVEEDOR_PEDIDO, cantidad: pedidoReq.cantidad / (f.proveedores.length + 1) }],
                        }))}>
                            + Agregar proveedor
                        </Button>
                        {pedidoReq.pedido?.proveedores?.length > 0 && (
                            <Stack gap="xs">
                                <Text size="sm" fw={600}>Pagos</Text>
                                {pedidoReq.pedido.proveedores.map((p) => (
                                    <Group key={p.id} justify="space-between">
                                        <Text size="sm">{p.nombre} — {formatMoney(p.cantidad * p.precioUnitario)}</Text>
                                        {p.pagado ? (
                                            <Text size="xs" c="green">Pagado ({p.formaPago})</Text>
                                        ) : (
                                            <Button size="xs" variant="light" onClick={() => marcarPagado(pedidoReq.id, p)}>
                                                Marcar pago
                                            </Button>
                                        )}
                                    </Group>
                                ))}
                            </Stack>
                        )}
                        <Group justify="flex-end">
                            <Button variant="default" onClick={closePedidoModal}>Cancelar</Button>
                            <Button onClick={savePedido}>Guardar pedido</Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            {/* Modal recepción */}
            <Modal opened={recepcionModal} onClose={closeRecepcionModal} title="Registrar recepción" size="md" centered>
                {recepcionTarget && (
                    <Stack gap="sm">
                        <Select
                            label="Proveedor"
                            data={(recepcionTarget.pedido?.proveedores || [])
                                .filter((p) => (p.saldoPendiente ?? 0) > 0)
                                .map((p) => ({ value: p.id, label: `${p.nombre} (saldo: ${p.saldoPendiente})` }))}
                            value={recepcionForm.pedidoProveedorId}
                            onChange={(v) => {
                                const prov = recepcionTarget.pedido.proveedores.find((p) => p.id === v);
                                setRecepcionForm((f) => ({
                                    ...f,
                                    pedidoProveedorId: v,
                                    cantidadRecibida: prov?.saldoPendiente || 0,
                                }));
                            }}
                        />
                        <TextInput label="Código guía / remisión" value={recepcionForm.codigoUsuario} onChange={(e) => setRecepcionForm((f) => ({ ...f, codigoUsuario: e.target.value }))} required />
                        <DateInput label="Fecha llegada" value={recepcionForm.fechaLlegada} onChange={(v) => setRecepcionForm((f) => ({ ...f, fechaLlegada: v }))} />
                        <NumberInput label="Cantidad recibida" value={recepcionForm.cantidadRecibida} onChange={(v) => setRecepcionForm((f) => ({ ...f, cantidadRecibida: v }))} />
                        <Checkbox label="Calidad esperada" checked={recepcionForm.calidadEsperada} onChange={(e) => setRecepcionForm((f) => ({ ...f, calidadEsperada: e.currentTarget.checked }))} />
                        {!recepcionForm.calidadEsperada && (
                            <TextInput label="Motivo calidad no esperada" value={recepcionForm.motivoCalidadNo} onChange={(e) => setRecepcionForm((f) => ({ ...f, motivoCalidadNo: e.target.value }))} />
                        )}
                        <Checkbox label="Factura entregada" checked={recepcionForm.facturaEntregada} onChange={(e) => setRecepcionForm((f) => ({ ...f, facturaEntregada: e.currentTarget.checked }))} />
                        {!recepcionForm.facturaEntregada && (
                            <TextInput label="Motivo sin factura" value={recepcionForm.motivoFacturaNo} onChange={(e) => setRecepcionForm((f) => ({ ...f, motivoFacturaNo: e.target.value }))} />
                        )}
                        <Checkbox label="Pedido completo" checked={recepcionForm.pedidoCompleto} onChange={(e) => setRecepcionForm((f) => ({ ...f, pedidoCompleto: e.currentTarget.checked }))} />
                        {!recepcionForm.pedidoCompleto && (
                            <>
                                <TextInput label="Motivo recepción parcial" value={recepcionForm.motivoCantidadParcial} onChange={(e) => setRecepcionForm((f) => ({ ...f, motivoCantidadParcial: e.target.value }))} />
                                <DateInput label="Nueva fecha entrega" value={recepcionForm.nuevaFechaEntrega} onChange={(v) => setRecepcionForm((f) => ({ ...f, nuevaFechaEntrega: v }))} />
                            </>
                        )}
                        <Group justify="flex-end">
                            <Button variant="default" onClick={closeRecepcionModal}>Cancelar</Button>
                            <Button onClick={saveRecepcion}>Registrar</Button>
                        </Group>
                    </Stack>
                )}
            </Modal>

            {/* Modal productos */}
            <Modal opened={productosModal} onClose={closeProductosModal} title="Catálogo de productos" size="xl" centered>
                <Group mb="md">
                    <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setProductoForm({
                        nombre: '', tipoRequisicionId: 'consumo_diario', descripcion: '', costoEstandar: 0, unidadSugerida: 'unidades',
                    })}>
                        Nuevo producto
                    </Button>
                    <Button size="xs" variant="outline" onClick={() => productosFileRef.current?.click()}>Importar Excel</Button>
                </Group>
                {productoForm && (
                    <Stack gap="xs" mb="md" p="sm" style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}>
                        <TextInput label="Nombre" value={productoForm.nombre} onChange={(e) => setProductoForm((f) => ({ ...f, nombre: e.target.value }))} />
                        <Select label="Tipo" data={TIPOS_REQUISICION.map((t) => ({ value: t.id, label: t.label }))} value={productoForm.tipoRequisicionId} onChange={(v) => setProductoForm((f) => ({ ...f, tipoRequisicionId: v }))} />
                        <SimpleGrid cols={2}>
                            <NumberInput label="Costo estándar" value={productoForm.costoEstandar} onChange={(v) => setProductoForm((f) => ({ ...f, costoEstandar: v }))} />
                            <Select label="Unidad" data={UNIDADES_MEDIDA} value={productoForm.unidadSugerida} onChange={(v) => setProductoForm((f) => ({ ...f, unidadSugerida: v }))} />
                        </SimpleGrid>
                        <Group>
                            <Button size="xs" onClick={saveProducto}>Guardar</Button>
                            <Button size="xs" variant="default" onClick={() => setProductoForm(null)}>Cancelar</Button>
                        </Group>
                    </Stack>
                )}
                <div className="almacen-table-wrap" style={{ maxHeight: 360, overflow: 'auto' }}>
                    <table className="almacen-table">
                        <thead><tr><th>Nombre</th><th>Tipo</th><th>Unidad</th><th>Costo</th><th /></tr></thead>
                        <tbody>
                            {productos.map((p) => (
                                <tr key={p.id}>
                                    <td>{p.nombre}</td>
                                    <td>{getTipoRequisicion(p.tipoRequisicionId).label}</td>
                                    <td>{p.unidadSugerida}</td>
                                    <td>{formatMoney(p.costoEstandar)}</td>
                                    <td>
                                        <Group gap={4}>
                                            <Button size="xs" variant="subtle" onClick={() => setProductoForm({ ...p })}>Editar</Button>
                                            <ActionIcon color="red" variant="subtle" onClick={() => setConfirmState({
                                                opened: true,
                                                title: 'Eliminar producto',
                                                message: `¿Eliminar ${p.nombre}?`,
                                                onConfirm: async () => {
                                                    try {
                                                        await almacenApi.deleteProducto(p.id);
                                                        notifySuccess('Producto eliminado.');
                                                        refreshProductos();
                                                    } catch (err) { notifyError(err); }
                                                    finally { setConfirmState((s) => ({ ...s, opened: false })); }
                                                },
                                            })}>
                                                <IconTrash size={14} />
                                            </ActionIcon>
                                        </Group>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Modal>

            {/* Modal proveedores */}
            <Modal opened={proveedoresModal} onClose={closeProveedoresModal} title="Catálogo de proveedores" size="xl" centered>
                <Group mb="md">
                    <Button size="xs" leftSection={<IconPlus size={14} />} onClick={() => setProveedorForm({
                        nombre: '', nit: '', correo: '', telefonoTrabajo: '', categoria: 'Declarante', responsableIva: false,
                    })}>
                        Nuevo proveedor
                    </Button>
                </Group>
                {proveedorForm && (
                    <Stack gap="xs" mb="md" p="sm" style={{ border: '1px solid #e2e8f0', borderRadius: 8 }}>
                        <SimpleGrid cols={2}>
                            <TextInput label="Nombre" value={proveedorForm.nombre} onChange={(e) => setProveedorForm((f) => ({ ...f, nombre: e.target.value }))} />
                            <TextInput label="NIT" value={proveedorForm.nit} onChange={(e) => setProveedorForm((f) => ({ ...f, nit: e.target.value }))} />
                        </SimpleGrid>
                        <Select label="Categoría" data={['Declarante', 'No declarante', 'RST', 'Autoretenedor']} value={proveedorForm.categoria} onChange={(v) => setProveedorForm((f) => ({ ...f, categoria: v }))} />
                        <Checkbox label="Responsable IVA" checked={proveedorForm.responsableIva} onChange={(e) => setProveedorForm((f) => ({ ...f, responsableIva: e.currentTarget.checked }))} />
                        <Group>
                            <Button size="xs" onClick={saveProveedor}>Guardar</Button>
                            <Button size="xs" variant="default" onClick={() => setProveedorForm(null)}>Cancelar</Button>
                        </Group>
                    </Stack>
                )}
                <div className="almacen-table-wrap" style={{ maxHeight: 360, overflow: 'auto' }}>
                    <table className="almacen-table">
                        <thead><tr><th>Nombre</th><th>NIT</th><th>Categoría</th><th /></tr></thead>
                        <tbody>
                            {proveedores.map((p) => (
                                <tr key={p.id}>
                                    <td>{p.nombre}</td>
                                    <td>{p.nit || '—'}</td>
                                    <td>{p.categoria || '—'}</td>
                                    <td>
                                        <Button size="xs" variant="subtle" onClick={() => setProveedorForm({ ...p })}>Editar</Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Modal>

            <AlmacenConfirmModal
                opened={confirmState.opened}
                onClose={() => setConfirmState((s) => ({ ...s, opened: false }))}
                onConfirm={confirmState.onConfirm}
                title={confirmState.title}
                message={confirmState.message}
            />
        </div>
    );
}
