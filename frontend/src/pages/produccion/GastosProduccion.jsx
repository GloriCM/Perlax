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
    ScrollArea
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
import GastosTabs from '../../components/GastosTabs';

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

const RUBROS = [
    'Todos los Rubros', 'Horas Extras', 'Repuesto', 'Materia Prima',
    'Servicios', 'Transporte', 'Papeleria', 'Otros'
];

// ── Format currency ────────────────────────────────────────
const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
        maximumFractionDigits: 2
    }).format(value);
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
const ExpenseCard = ({ expense, index }) => {
    const isPending = expense.status === 'pendiente';

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
                                {expense.category}
                            </Text>
                        )}
                        {isPending && (
                            <Badge color="orange" variant="filled" size="sm">
                                Pendiente
                            </Badge>
                        )}
                    </Group>
                    <Text
                        fw={700}
                        size="lg"
                        c={isPending ? '#ef4444' : '#10b981'}
                        style={{ fontFamily: 'monospace' }}
                    >
                        {formatCurrency(expense.amount)}
                    </Text>
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
                        {expense.type}{expense.type && expense.registeredBy ? ' - ' : ''}
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
                    >
                        Eliminar
                    </Button>
                </Group>
            </Paper>
        </motion.div>
    );
};

// ── Main Component ─────────────────────────────────────────
const GastosProduccion = ({ titulo = 'Gastos de Producción', showTabs = false, pathPrefix = '/planeacion/gastos' }) => {
    const navigate = useNavigate();
    const [year, setYear] = useState('2026');
    const [month, setMonth] = useState('Marzo');
    const [rubro, setRubro] = useState('Todos los Rubros');
    const [pendientesOnly, setPendientesOnly] = useState(false);
    const [expenses, setExpenses] = useState([]);

    const presupuesto = 2100000;
    const gastado = expenses.reduce((sum, e) => sum + e.amount, 0);
    const restante = presupuesto - gastado;

    useEffect(() => {
        // In real app: fetch from API
        setExpenses(mockExpenses);
    }, [year, month]);

    const filteredExpenses = expenses.filter(e => {
        if (pendientesOnly && e.status !== 'pendiente') return false;
        if (rubro !== 'Todos los Rubros' && e.category !== rubro) return false;
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
                            data={RUBROS}
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
                + Agregar Gasto
            </Button>

            {/* Expense Cards */}
            <Stack gap="md">
                <AnimatePresence>
                    {filteredExpenses.map((expense, index) => (
                        <ExpenseCard key={expense.id} expense={expense} index={index} />
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
        </Container>
    );
};

export default GastosProduccion;
