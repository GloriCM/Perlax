import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Title,
    Text,
    Group,
    Stack,
    Button,
    Badge,
    Select,
    Switch,
    ActionIcon,
    Box,
    SimpleGrid,
    Tooltip,
    ScrollArea,
    Modal,
    TextInput,
    Textarea,
    NumberInput
} from '@mantine/core';
import {
    IconArrowLeft,
    IconPlus,
    IconPencil,
    IconHistory,
    IconTrash,
    IconCheck,
    IconCalendar,
    IconUser,
    IconClock,
    IconSettings,
    IconFileText,
    IconCash
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import GastosTabs from '../../../components/GastosTabs';
import { notifications } from '@mantine/notifications';
import { api } from '../../../utils/api';
import { toTitleCase, toTitleCaseSaved } from './gastosText';

// ── Mock Data ──────────────────────────────────────────────
const mockExpenses = [
    {
        id: 1,
        category: 'Troqueles',
        type: 'Jeisson Cuervo',
        registeredBy: 'juan',
        details: [
            { icon: 'file', text: 'NIT: 94071111' },
            { icon: 'file', text: 'Factura:' },
            { icon: 'calendar', text: '16/3/2026' },
            { icon: 'clock', text: 'Nuevo' },
        ],
        op: 'OP: OP_12460_7481',
        baseAmount: 0,
        ivaAmount: 0,
        amount: 0,
        status: 'pendiente',
        borderColor: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.03)'
    },
    {
        id: 2,
        category: 'Troqueles',
        type: 'Jeisson Cuervo',
        registeredBy: 'karen',
        details: [
            { icon: 'file', text: 'NIT: 94071111' },
            { icon: 'file', text: 'Factura:' },
            { icon: 'calendar', text: '13/3/2026' },
            { icon: 'clock', text: 'Nuevo' },
        ],
        baseAmount: 0,
        ivaAmount: 0,
        amount: 0,
        status: 'pendiente',
        borderColor: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.03)',
        op: 'TROQUEL LA CHULA X 18-PARA LAS TRES CAJAS'
    },
];

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const YEARS = ['2024', '2025', '2026', '2027'];

const DEFAULT_RUBROS = [
    'Todos los Rubros', 'Horas Extras', 'Recargo', 'Repuesto', 'Materia Prima',
    'Servicios', 'Transporte', 'Papeleria', 'Otros'
];

const emptyExpenseForm = {
    category: '',
    type: '',
    registeredBy: '',
    invoice: '',
    op: '',
    description: '',
    baseAmount: 0,
    ivaAmount: 0,
    status: 'pendiente',
};

const emptyOvertimeForm = {
    personnelId: '',
    date: '',
    startTime: '',
    endTime: '',
    op: '',
    note: '',
};

const normalizeRubroName = (value) => String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const IVA_RATE = 0.19;

const computeIva = (base) => Math.round(Number(base || 0) * IVA_RATE);

const isOvertimeOrSurchargeRubro = (category) => {
    const name = normalizeRubroName(category);
    return name.includes('hora extra') || name.includes('horas extra') || name.includes('recargo');
};

const loadHourTypeCatalog = () => {
    const extras = (() => {
        try { return JSON.parse(localStorage.getItem('perlax-tipos-hora') || 'null'); } catch { return null; }
    })();
    const recargos = (() => {
        try { return JSON.parse(localStorage.getItem('perlax-tipos-recargo') || 'null'); } catch { return null; }
    })();
    const list = [];
    (Array.isArray(extras) ? extras : [
        { name: 'Extra Diurna', factor: 1.25 },
        { name: 'Dominical o Festivo', factor: 1.8 },
        { name: 'hora extra nocturna', factor: 1.7 },
    ]).forEach((t) => list.push({ name: t.name, factor: Number(t.factor) }));
    (Array.isArray(recargos) ? recargos : [
        { name: 'Recargo Nocturno', factor: 0.35 },
    ]).forEach((t) => list.push({ name: t.name, factor: Number(t.factor) }));
    return list.filter((t) => t.name && t.factor > 0);
};

// ── Format currency ────────────────────────────────────────
const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
        maximumFractionDigits: 2
    }).format(value);
};

const getExpenseAmounts = (expense) => {
    const isOvertime = Boolean(expense?.overtimeGroupId || expense?.overtimeInput)
        || isOvertimeOrSurchargeRubro(expense?.category);
    const explicitTotal = expense?.amount ?? expense?.totalAmount ?? expense?.precioTotal;
    const fallbackTotal = Number(explicitTotal ?? 0);
    const base = Number(expense?.baseAmount ?? expense?.precioBase ?? expense?.subtotal ?? fallbackTotal);
    if (isOvertime) {
        return { base, iva: 0, total: base };
    }
    const iva = computeIva(base);
    return { base, iva, total: base + iva };
};

const buildStorageKey = (title) => `perlax-gastos-${String(title || 'general')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`;

const buildExpenseFromForm = (form, existingExpense) => {
    const baseAmount = Number(form.baseAmount || 0);
    const ivaAmount = computeIva(baseAmount);
    const amount = baseAmount + ivaAmount;
    const invoiceText = form.invoice?.trim();

    return {
        ...(existingExpense || {}),
        id: existingExpense?.id || Date.now(),
        category: toTitleCaseSaved(form.category) || 'Otros',
        type: toTitleCaseSaved(form.type) || 'Sin Proveedor',
        registeredBy: form.registeredBy?.trim() || 'Sistema',
        details: [
            invoiceText ? { icon: 'file', text: `Factura: ${invoiceText}` } : null,
            { icon: 'calendar', text: new Date().toLocaleDateString('es-CO') },
            { icon: 'clock', text: existingExpense ? 'Editado' : 'Nuevo' },
        ].filter(Boolean),
        op: form.op?.trim(),
        description: form.description?.trim(),
        baseAmount,
        ivaAmount,
        amount,
        status: form.status || 'pendiente',
        borderColor: form.status === 'gastado' ? '#10b981' : '#f59e0b',
        bgColor: form.status === 'gastado' ? 'rgba(16, 185, 129, 0.03)' : 'rgba(245, 158, 11, 0.03)',
    };
};

// ── Detail icon resolver ───────────────────────────────────
const DetailIcon = ({ type }) => {
    const size = 14;
    const props = { size, stroke: 1.5, style: { opacity: 0.7 } };
    switch (type) {
        case 'user': return <IconUser {...props} />;
        case 'calendar': return <IconCalendar {...props} />;
        case 'clock': return <IconClock {...props} />;
        case 'settings': return <IconSettings {...props} />;
        case 'file': return <IconFileText {...props} />;
        default: return <IconCash {...props} />;
    }
};

// ── Expense Card ───────────────────────────────────────────
const ExpenseCard = ({ expense, index, onEdit, onDelete }) => {
    const isPending = expense.status === 'pendiente';
    const amounts = getExpenseAmounts(expense);
    const hideIva = Boolean(expense.overtimeGroupId || expense.overtimeInput)
        || isOvertimeOrSurchargeRubro(expense.category);

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05, duration: 0.3 }}
        >
            <Paper
                p="md"
                radius="md"
                style={{
                    background: expense.bgColor || 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid rgba(255, 255, 255, 0.08)`,
                    borderLeft: `4px solid ${expense.borderColor}`,
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                }}
                className="expense-card"
            >
                {/* Top row: Category + Status + Amount */}
                <Group justify="space-between" align="flex-start" mb="xs">
                    <Group gap="sm">
                        {expense.category && (
                            <Text fw={700} size="md" c="white">
                                {toTitleCase(expense.category)}
                            </Text>
                        )}
                        {isPending && (
                            <Badge color="orange" variant="filled" size="sm">
                                Pendiente
                            </Badge>
                        )}
                    </Group>
                    <Stack gap={2} align="flex-end">
                        {!hideIva && (
                            <>
                                <Text size="xs" c="dimmed">Base: {formatCurrency(amounts.base)}</Text>
                                <Text size="xs" c="dimmed">IVA: {formatCurrency(amounts.iva)}</Text>
                            </>
                        )}
                        <Text
                            fw={700}
                            size="lg"
                            c={isPending ? '#ef4444' : '#10b981'}
                            style={{ fontFamily: 'monospace' }}
                        >
                            Total: {formatCurrency(amounts.total)}
                        </Text>
                    </Stack>
                </Group>

                {/* Deadline warning */}
                {expense.deadline && (
                    <Text size="xs" c="red.4" mb="xs" fw={600}>
                        Legalizar antes de: {expense.deadline}
                    </Text>
                )}

                {/* Type + Registered by */}
                {(expense.type || expense.registeredBy) && (
                    <Text size="sm" c="gray.4" mb="xs">
                        {toTitleCase(expense.type)}{expense.type && expense.registeredBy ? ' - ' : ''}
                        {expense.registeredBy && `Registrado por: ${expense.registeredBy}`}
                    </Text>
                )}

                {/* Detail chips */}
                {expense.details && expense.details.length > 0 && (
                    <Group gap="md" mb="xs">
                        {expense.details.map((detail, i) => (
                            <Group key={i} gap={4} wrap="nowrap">
                                <DetailIcon type={detail.icon} />
                                <Text size="xs" c="gray.4">{detail.text}</Text>
                            </Group>
                        ))}
                    </Group>
                )}

                {/* OP Reference */}
                {expense.op && (
                    <Group gap={4} mb="xs">
                        <IconFileText size={14} stroke={1.5} style={{ opacity: 0.7 }} />
                        <Text size="xs" c="gray.4" fs="italic">{expense.op}</Text>
                    </Group>
                )}

                {/* Action buttons */}
                <Group justify="flex-end" gap="lg" mt="sm">
                    {isPending && (
                        <Button
                            variant="filled"
                            color="teal"
                            size="xs"
                            radius="md"
                            leftSection={<IconCheck size={14} />}
                        >
                            Legalizar
                        </Button>
                    )}
                    <Button
                        variant="subtle"
                        color="blue"
                        size="xs"
                        leftSection={<IconPencil size={14} />}
                        onClick={() => onEdit(expense)}
                    >
                        Editar
                    </Button>
                    <Button
                        variant="subtle"
                        color="gray"
                        size="xs"
                        leftSection={<IconHistory size={14} />}
                    >
                        Historial
                    </Button>
                    <Button
                        variant="subtle"
                        color="red"
                        size="xs"
                        leftSection={<IconTrash size={14} />}
                        onClick={() => onDelete(expense.id)}
                    >
                        Eliminar
                    </Button>
                </Group>
            </Paper>
        </motion.div>
    );
};

// ── Main Component ─────────────────────────────────────────
const GastosProduccion = ({
    titulo = 'Gastos de Producción',
    showTabs = false,
    pathPrefix = '/planeacion/gastos',
    rubros = DEFAULT_RUBROS,
    initialExpenses = mockExpenses,
    presupuestoInicial = 2100000,
    personnelRoles = ['Operario', 'Auxiliar'],
}) => {
    const navigate = useNavigate();
    const [year, setYear] = useState('2026');
    const [month, setMonth] = useState('Marzo');
    const [rubro, setRubro] = useState('Todos los Rubros');
    const [pendientesOnly, setPendientesOnly] = useState(false);
    const [expenses, setExpenses] = useState([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState(null);
    const [form, setForm] = useState(emptyExpenseForm);
    const [overtimeForm, setOvertimeForm] = useState(emptyOvertimeForm);
    const [personnel, setPersonnel] = useState([]);
    const [openOps, setOpenOps] = useState([]);
    const [overtimePreview, setOvertimePreview] = useState(null);
    const [calculating, setCalculating] = useState(false);
    const storageKey = buildStorageKey(titulo);
    const overtimeMode = (personnelRoles || []).length > 0 && isOvertimeOrSurchargeRubro(form.category);
    const rolesKey = (personnelRoles || []).join(',');
    const isProductionOvertime = (personnelRoles || []).some((role) =>
        ['Operario', 'Auxiliar'].includes(role));

    const presupuesto = presupuestoInicial;
    const gastado = expenses.reduce((sum, e) => sum + getExpenseAmounts(e).total, 0);
    const restante = presupuesto - gastado;

    useEffect(() => {
        const stored = localStorage.getItem(storageKey);
        if (!stored) {
            setExpenses(initialExpenses);
            return;
        }

        try {
            setExpenses(JSON.parse(stored));
        } catch {
            setExpenses(initialExpenses);
        }
    }, [storageKey, initialExpenses]);

    useEffect(() => {
        if (!modalOpen || !overtimeMode) return;
        let cancelled = false;
        (async () => {
            try {
                const qs = rolesKey ? `?roles=${encodeURIComponent(rolesKey)}` : '';
                const people = await api.get(`/users/personnel${qs}`);
                let ops = [];
                if (isProductionOvertime) {
                    ops = await api.get('/production/scheduling/open-orders');
                }
                if (cancelled) return;
                setPersonnel(Array.isArray(people) ? people : []);
                setOpenOps(Array.isArray(ops) ? ops : []);
            } catch {
                if (!cancelled) {
                    setPersonnel([]);
                    setOpenOps([]);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [modalOpen, overtimeMode, rolesKey, isProductionOvertime]);

    useEffect(() => {
        if (!modalOpen || !overtimeMode) {
            setOvertimePreview(null);
            return;
        }
        const { personnelId, date, startTime, endTime } = overtimeForm;
        if (!personnelId || !date || !startTime || !endTime) {
            setOvertimePreview(null);
            return;
        }
        const person = personnel.find((p) => String(p.id) === String(personnelId));
        if (!person?.salary) {
            setOvertimePreview(null);
            return;
        }
        let cancelled = false;
        const timer = setTimeout(async () => {
            setCalculating(true);
            try {
                const result = await api.post('/production/overtime/calculate', {
                    userId: person.id,
                    salary: Number(person.salary),
                    date,
                    startTime,
                    endTime,
                    role: person.role,
                    opNumber: overtimeForm.op || null,
                    note: overtimeForm.note || null,
                    hourTypes: loadHourTypeCatalog(),
                });
                if (!cancelled) setOvertimePreview(result);
            } catch (err) {
                if (!cancelled) {
                    setOvertimePreview(null);
                    notifications.show({
                        title: 'No se pudo calcular',
                        message: err?.message || 'Revise el intervalo y el salario.',
                        color: 'red',
                    });
                }
            } finally {
                if (!cancelled) setCalculating(false);
            }
        }, 250);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [modalOpen, overtimeMode, overtimeForm.personnelId, overtimeForm.date, overtimeForm.startTime, overtimeForm.endTime, overtimeForm.op, overtimeForm.note, personnel]);

    const persistExpenses = (nextExpenses) => {
        setExpenses(nextExpenses);
        localStorage.setItem(storageKey, JSON.stringify(nextExpenses));
    };

    const openAddModal = () => {
        const firstRubro = rubros.find((item) => item !== 'Todos los Rubros') || 'Otros';
        setEditingExpense(null);
        setForm({ ...emptyExpenseForm, category: rubro !== 'Todos los Rubros' ? rubro : firstRubro });
        setOvertimeForm(emptyOvertimeForm);
        setOvertimePreview(null);
        setModalOpen(true);
    };

    const openEditModal = (expense) => {
        const amounts = getExpenseAmounts(expense);
        const invoiceDetail = expense.details?.find((detail) => detail.text?.toLowerCase().startsWith('factura:'));

        setEditingExpense(expense);
        setForm({
            category: expense.category || '',
            type: expense.type || '',
            registeredBy: expense.registeredBy || '',
            invoice: invoiceDetail?.text?.replace(/^Factura:\s*/i, '') || '',
            op: expense.op || '',
            description: expense.description || '',
            baseAmount: amounts.base,
            ivaAmount: amounts.iva,
            status: expense.status || 'pendiente',
        });
        setOvertimeForm(expense.overtimeInput
            ? { ...emptyOvertimeForm, ...expense.overtimeInput }
            : emptyOvertimeForm);
        setOvertimePreview(null);
        setModalOpen(true);
    };

    const handleSaveExpense = async () => {
        if (overtimeMode) {
            const person = personnel.find((p) => String(p.id) === String(overtimeForm.personnelId));
            if (!person) {
                notifications.show({ title: 'Personal requerido', message: 'Seleccione la persona.', color: 'yellow' });
                return;
            }
            if (!person.salary) {
                notifications.show({ title: 'Sin salario', message: 'El usuario no tiene salario en su ficha.', color: 'yellow' });
                return;
            }
            if (!overtimeForm.date || !overtimeForm.startTime || !overtimeForm.endTime) {
                notifications.show({ title: 'Intervalo requerido', message: 'Indique fecha, hora inicio y hora fin.', color: 'yellow' });
                return;
            }
            if (isProductionOvertime && !overtimeForm.op?.trim()) {
                notifications.show({ title: 'OP requerida', message: 'La OP es obligatoria en horas extras de producción.', color: 'yellow' });
                return;
            }
            if (!isProductionOvertime && !overtimeForm.note?.trim()) {
                notifications.show({ title: 'Nota requerida', message: 'Indique en la nota qué estuvo haciendo.', color: 'yellow' });
                return;
            }
            try {
                setCalculating(true);
                const result = await api.post('/production/overtime/calculate', {
                    userId: person.id,
                    salary: Number(person.salary),
                    date: overtimeForm.date,
                    startTime: overtimeForm.startTime,
                    endTime: overtimeForm.endTime,
                    role: person.role,
                    opNumber: isProductionOvertime ? overtimeForm.op : null,
                    note: overtimeForm.note || null,
                    note: overtimeForm.note || null,
                    hourTypes: loadHourTypeCatalog(),
                });
                const paid = (result.segments || []).filter((s) => s.createsExpense);
                if (paid.length === 0) {
                    notifications.show({
                        title: 'Sin extras ni recargos',
                        message: 'El intervalo quedó dentro de la jornada ordinaria.',
                        color: 'blue',
                    });
                    return;
                }
                const groupId = editingExpense?.overtimeGroupId || `ot-${Date.now()}`;
                const withoutGroup = expenses.filter((e) => e.overtimeGroupId !== groupId && e.id !== editingExpense?.id);
                const inputSnapshot = { ...overtimeForm, displayName: person.displayName };
                const newRows = paid.map((segment, index) => {
                    const category = segment.category || (segment.isHe ? 'Horas Extras' : 'Recargo');
                    return {
                        id: `${groupId}-${index}`,
                        overtimeGroupId: groupId,
                        overtimeInput: inputSnapshot,
                        category,
                        type: person.displayName,
                        registeredBy: 'Sistema',
                        details: [
                            { icon: 'calendar', text: overtimeForm.date.split('-').reverse().join('/') },
                            { icon: 'clock', text: `${segment.label} · ${segment.hours} h` },
                            result.shiftLabel ? { icon: 'clock', text: `Turno ${result.shiftLabel}` } : null,
                        ].filter(Boolean),
                        op: isProductionOvertime ? overtimeForm.op : undefined,
                        description: overtimeForm.note || `${segment.label} ${overtimeForm.startTime}-${overtimeForm.endTime}`,
                        baseAmount: Number(segment.amount || 0),
                        ivaAmount: 0,
                        amount: Number(segment.amount || 0),
                        status: 'pendiente',
                        borderColor: '#f59e0b',
                        bgColor: 'rgba(245, 158, 11, 0.03)',
                    };
                });
                persistExpenses([...newRows, ...withoutGroup]);
                setModalOpen(false);
                setEditingExpense(null);
                setForm(emptyExpenseForm);
                setOvertimeForm(emptyOvertimeForm);
            } catch (err) {
                notifications.show({
                    title: 'No se pudo guardar',
                    message: err?.message || 'El backend no pudo recalcular el desglose.',
                    color: 'red',
                });
            } finally {
                setCalculating(false);
            }
            return;
        }

        const nextExpense = buildExpenseFromForm(form, editingExpense);
        const nextExpenses = editingExpense
            ? expenses.map((expense) => expense.id === editingExpense.id ? nextExpense : expense)
            : [nextExpense, ...expenses];

        persistExpenses(nextExpenses);
        setModalOpen(false);
        setEditingExpense(null);
        setForm(emptyExpenseForm);
    };

    const handleDeleteExpense = (expenseId) => {
        persistExpenses(expenses.filter((expense) => expense.id !== expenseId));
    };

    const filteredExpenses = expenses.filter(e => {
        if (pendientesOnly && e.status !== 'pendiente') return false;
        if (rubro !== 'Todos los Rubros' && toTitleCase(e.category) !== toTitleCase(rubro)) return false;
        return true;
    });

    const summaryCards = [
        { label: 'Presupuesto', value: presupuesto, gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', glow: 'rgba(37, 99, 235, 0.3)' },
        { label: 'Gastado', value: gastado, gradient: 'linear-gradient(135deg, #5c1e1e 0%, #dc2626 100%)', glow: 'rgba(220, 38, 38, 0.3)' },
        { label: 'Exceso', value: gastado, gradient: 'linear-gradient(135deg, #5c1e1e 0%, #dc2626 100%)', glow: 'rgba(220, 38, 38, 0.3)' },
    ];

    return (
        <Container size="xl" py="xl">
            <style>{`
                .expense-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                }
            `}</style>

            {/* Header */}
            <Paper
                p="lg"
                radius="lg"
                mb="lg"
                style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <Group justify="space-between" align="center">
                    <Group>
                        <Button
                            variant="filled"
                            color="gray.8"
                            size="compact-xs"
                            leftSection={<IconArrowLeft size={14} />}
                            onClick={() => navigate('/')}
                            fw={700}
                        >
                            Volver al Panel
                        </Button>
                        <Title order={4} c="white" ml="xl">{titulo}</Title>
                    </Group>
                    <img src="/Nuevo-perla-Sinfondo.png" alt="Perla" style={{ height: 30 }} />
                </Group>
            </Paper>

            {showTabs && <GastosTabs pathPrefix={pathPrefix} />}

            {/* Filters Row */}
            <Paper
                p="md"
                radius="lg"
                mb="lg"
                style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <Group justify="space-between" wrap="wrap">
                    <Group gap="sm">
                        <Select
                            data={YEARS}
                            value={year}
                            onChange={setYear}
                            w={100}
                            size="sm"
                            styles={{
                                input: {
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                },
                            }}
                        />
                        <Select
                            data={MONTHS}
                            value={month}
                            onChange={setMonth}
                            w={140}
                            size="sm"
                            styles={{
                                input: {
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                },
                            }}
                        />
                    </Group>
                    <Group gap="sm">
                        <Select
                            data={rubros}
                            value={rubro}
                            onChange={setRubro}
                            w={180}
                            size="sm"
                            styles={{
                                input: {
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    color: 'white',
                                },
                            }}
                        />
                        <Switch
                            label="Ver solo Pendientes"
                            checked={pendientesOnly}
                            onChange={(e) => setPendientesOnly(e.currentTarget.checked)}
                            color="orange"
                            size="sm"
                            styles={{
                                label: { color: '#94a3b8', fontSize: 13 },
                            }}
                        />
                    </Group>
                </Group>
            </Paper>

            {/* Summary Cards */}
            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="lg">
                {summaryCards.map((card, i) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.4 }}
                    >
                        <Paper
                            p="lg"
                            radius="lg"
                            style={{
                                background: card.gradient,
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                boxShadow: `0 4px 20px ${card.glow}`,
                                textAlign: 'center',
                            }}
                        >
                            <Text size="xs" c="rgba(255,255,255,0.7)" fw={600} mb={4}
                                style={{ textTransform: 'uppercase', letterSpacing: '1px' }}
                            >
                                {card.label}
                            </Text>
                            <Text fw={800} size="xl" c="white" style={{ fontFamily: 'monospace', fontSize: '1.4rem' }}>
                                {formatCurrency(card.value)}
                            </Text>
                        </Paper>
                    </motion.div>
                ))}
            </SimpleGrid>

            {/* Add Expense Button */}
            <Button
                fullWidth
                size="lg"
                radius="md"
                mb="lg"
                color="teal"
                leftSection={<IconPlus size={20} />}
                onClick={openAddModal}
                styles={{
                    root: {
                        background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                        fontWeight: 700,
                        fontSize: 16,
                        letterSpacing: '0.5px',
                        boxShadow: '0 4px 15px rgba(20, 184, 166, 0.3)',
                        '&:hover': {
                            background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                        }
                    }
                }}
            >
                Agregar Gasto
            </Button>

            {/* Expense Cards */}
            <Stack gap="md">
                <AnimatePresence>
                    {filteredExpenses.map((expense, index) => (
                        <ExpenseCard
                            key={expense.id}
                            expense={expense}
                            index={index}
                            onEdit={openEditModal}
                            onDelete={handleDeleteExpense}
                        />
                    ))}
                </AnimatePresence>

                {filteredExpenses.length === 0 && (
                    <Paper
                        p="xl"
                        radius="md"
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            textAlign: 'center',
                        }}
                    >
                        <Text c="dimmed" size="lg">No se encontraron gastos con los filtros seleccionados.</Text>
                    </Paper>
                )}
            </Stack>

            <Modal
                opened={modalOpen}
                onClose={() => setModalOpen(false)}
                title={editingExpense ? 'Editar gasto' : 'Registrar gasto'}
                size="lg"
                centered
            >
                <Stack>
                    <Select
                        label="Rubro"
                        data={rubros.filter((item) => item !== 'Todos los Rubros').map((item) => toTitleCase(item))}
                        value={form.category}
                        onChange={(value) => {
                            setForm((prev) => ({ ...prev, category: value || '' }));
                            setOvertimePreview(null);
                        }}
                        required
                    />
                    {overtimeMode ? (
                        <>
                            <Select
                                label="Personal"
                                placeholder="Seleccione la persona"
                                searchable
                                required
                                data={personnel.map((p) => ({
                                    value: String(p.id),
                                    label: `${p.displayName}${p.salary ? ` · ${formatCurrency(p.salary)}` : ' · sin salario'}`,
                                }))}
                                value={overtimeForm.personnelId}
                                onChange={(value) => setOvertimeForm((prev) => ({ ...prev, personnelId: value || '' }))}
                            />
                            <TextInput
                                label="Fecha de la hora extra"
                                type="date"
                                required
                                value={overtimeForm.date}
                                onChange={(event) => setOvertimeForm((prev) => ({ ...prev, date: event.currentTarget.value }))}
                            />
                            <SimpleGrid cols={{ base: 1, sm: 2 }}>
                                <TextInput
                                    label="Hora inicio del turno"
                                    type="time"
                                    required
                                    value={overtimeForm.startTime}
                                    onChange={(event) => setOvertimeForm((prev) => ({ ...prev, startTime: event.currentTarget.value }))}
                                />
                                <TextInput
                                    label="Hora fin del turno"
                                    type="time"
                                    required
                                    value={overtimeForm.endTime}
                                    onChange={(event) => setOvertimeForm((prev) => ({ ...prev, endTime: event.currentTarget.value }))}
                                />
                            </SimpleGrid>
                            {isProductionOvertime && (
                                <Select
                                    label="OP"
                                    placeholder="Seleccione la OP"
                                    searchable
                                    required
                                    data={openOps.map((op) => ({
                                        value: op.opNumber || op.otNumber || op.id,
                                        label: [op.opNumber, op.clientName, op.productName].filter(Boolean).join(' · '),
                                    }))}
                                    value={overtimeForm.op}
                                    onChange={(value) => setOvertimeForm((prev) => ({ ...prev, op: value || '' }))}
                                />
                            )}
                            <Textarea
                                label="Nota"
                                description={isProductionOvertime ? 'Opcional' : 'Obligatoria: qué estuvo haciendo'}
                                placeholder={isProductionOvertime ? '' : 'Describa la actividad realizada'}
                                required={!isProductionOvertime}
                                value={overtimeForm.note}
                                onChange={(event) => setOvertimeForm((prev) => ({ ...prev, note: event.currentTarget.value }))}
                                minRows={2}
                            />
                            {calculating && <Text size="sm" c="dimmed">Calculando desglose…</Text>}
                            {overtimePreview && (
                                <Paper p="sm" radius="md" withBorder>
                                    <Text size="sm" fw={700} mb={4}>
                                        Valor hora: {formatCurrency(overtimePreview.hourValue)} (salario ÷ {overtimePreview.divisor})
                                    </Text>
                                    {overtimePreview.shiftLabel && (
                                        <Text size="xs" c="dimmed" mb="xs">
                                            Turno {overtimePreview.fromRoster ? 'jornada' : 'horarios'}: {overtimePreview.shiftLabel}
                                        </Text>
                                    )}
                                    <Stack gap={4}>
                                        {(overtimePreview.segments || []).map((segment, index) => (
                                            <Group key={`${segment.start}-${index}`} justify="space-between">
                                                <Text size="xs" c={segment.createsExpense ? 'gray.3' : 'dimmed'}>
                                                    {segment.label} · {segment.hours} h
                                                    {segment.createsExpense ? ` × ${segment.factor}` : ''}
                                                </Text>
                                                <Text size="xs" fw={600}>
                                                    {segment.createsExpense ? formatCurrency(segment.amount) : '—'}
                                                </Text>
                                            </Group>
                                        ))}
                                    </Stack>
                                    <Text size="sm" fw={800} mt="sm">
                                        Costo: {formatCurrency(overtimePreview.totalAmount)}
                                    </Text>
                                </Paper>
                            )}
                        </>
                    ) : (
                        <>
                    <TextInput
                        label="Proveedor / Tipo"
                        value={form.type}
                        onChange={(event) => setForm((prev) => ({ ...prev, type: toTitleCase(event.currentTarget.value) }))}
                    />
                    <TextInput
                        label="Registrado por"
                        value={form.registeredBy}
                        onChange={(event) => setForm((prev) => ({ ...prev, registeredBy: event.currentTarget.value }))}
                    />
                    <TextInput
                        label="Factura"
                        value={form.invoice}
                        onChange={(event) => setForm((prev) => ({ ...prev, invoice: event.currentTarget.value }))}
                    />
                    <TextInput
                        label="OP / Referencia"
                        value={form.op}
                        onChange={(event) => setForm((prev) => ({ ...prev, op: event.currentTarget.value }))}
                    />
                    <SimpleGrid cols={{ base: 1, sm: 3 }}>
                        <NumberInput
                            label="Base"
                            value={form.baseAmount}
                            onChange={(value) => setForm((prev) => ({ ...prev, baseAmount: Number(value || 0) }))}
                            min={0}
                            decimalScale={0}
                            thousandSeparator="."
                            decimalSeparator=","
                        />
                        <NumberInput
                            label="IVA (19%)"
                            value={computeIva(form.baseAmount)}
                            readOnly
                            thousandSeparator="."
                            decimalSeparator=","
                        />
                        <NumberInput
                            label="Total"
                            value={Number(form.baseAmount || 0) + computeIva(form.baseAmount)}
                            readOnly
                            thousandSeparator="."
                            decimalSeparator=","
                        />
                    </SimpleGrid>
                    <Select
                        label="Estado"
                        data={[
                            { value: 'pendiente', label: 'Pendiente' },
                            { value: 'gastado', label: 'Gastado' },
                        ]}
                        value={form.status}
                        onChange={(value) => setForm((prev) => ({ ...prev, status: value || 'pendiente' }))}
                    />
                    <Textarea
                        label="Descripción"
                        value={form.description}
                        onChange={(event) => setForm((prev) => ({ ...prev, description: event.currentTarget.value }))}
                        minRows={3}
                    />
                        </>
                    )}
                    <Group justify="flex-end">
                        <Button variant="subtle" color="gray" onClick={() => setModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button onClick={handleSaveExpense} loading={calculating}>
                            Guardar
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
};

export default GastosProduccion;
