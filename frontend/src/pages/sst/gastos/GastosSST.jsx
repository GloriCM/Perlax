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
    IconCash,
    IconTool
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import GastosTabs from '../../../components/GastosTabs';

// ── Mock Data for SST ──────────────────────────────────────
const mockExpensesSST = [
    {
        id: 1,
        category: 'Arreglos locativos (Para riesgo Mecanico, locativo)',
        type: 'Infraestructura Y aseguramiento de la operacion',
        details: [
            { icon: 'settings', text: 'TECHOS Y GOTERAS' },
            { icon: 'calendar', text: '11/3/2026' },
            { icon: 'file', text: 'Factura: 23' },
        ],
        description: 'ARREGLO TE TEJAS DE ETERNIT PLANTA 1 PLANTA 2, LIMPIEZA E IMPERMEABILIZACION DE LA CANAL PLANTA 2 CON REFUERZO DE EMPAMES Y SONDEO DE BAJANTES',
        amount: 5778000,
        budget: 0,
        status: 'gastado',
        borderColor: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.03)'
    },
    {
        id: 2,
        category: 'Plan de Capacitaciones y refigerios',
        type: 'Capacitacion-Asesorias-Auditorias, actividades de bienestar',
        details: [
            { icon: 'settings', text: 'D1' },
            { icon: 'calendar', text: '11/3/2026' },
            { icon: 'file', text: 'Factura: G5H7191923' },
        ],
        description: 'COMPRA DE REFRIGERIO PARA REUNION MES MARZO',
        amount: 32450,
        budget: 0,
        status: 'gastado',
        borderColor: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.03)'
    },
];

const MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const YEARS = ['2024', '2025', '2026', '2027'];

const RUBROS_SST = [
    'Todos los Rubros', 'Infraestructura', 'Capacitaciones', 'EPP',
    'Papeleria', 'Servicios Medicos', 'Otros'
];

// ── Format currency ────────────────────────────────────────
const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
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
        case 'settings': return <IconTool {...props} />;
        case 'file': return <IconFileText {...props} />;
        default: return <IconCash {...props} />;
    }
};

// ── Expense Card ───────────────────────────────────────────
const ExpenseCard = ({ expense, index }) => {
    const excess = expense.amount - expense.budget;

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
                <Group justify="space-between" align="flex-start" mb="xs">
                    <Stack gap={2}>
                        <Text fw={700} size="md" c="white">
                            {expense.category}
                        </Text>
                        <Text size="xs" c="dimmed">
                            {expense.type}
                        </Text>
                    </Stack>
                    <Text
                        fw={700}
                        size="lg"
                        c="#10b981"
                        style={{ fontFamily: 'monospace' }}
                    >
                        {formatCurrency(expense.amount)}
                    </Text>
                </Group>

                <Group gap="md" mb="xs">
                    {expense.details.map((detail, i) => (
                        <Group key={i} gap={4} wrap="nowrap">
                            <DetailIcon type={detail.icon} />
                            <Text size="xs" c="gray.4" style={{ textTransform: 'uppercase' }}>{detail.text}</Text>
                        </Group>
                    ))}
                </Group>

                {expense.description && (
                    <Group gap={4} mb="xs">
                        <IconFileText size={14} stroke={1.5} style={{ opacity: 0.7 }} />
                        <Text size="xs" c="gray.4" style={{ textTransform: 'uppercase' }}>{expense.description}</Text>
                    </Group>
                )}

                <Group justify="space-between" align="center" mt="sm">
                    <Stack gap={0}>
                        <Text size="min-size" style={{ fontSize: '10px' }} c="dimmed">
                            Tipo: Gastado {formatCurrency(expense.amount)} / Presup. {formatCurrency(expense.budget)}
                        </Text>
                        <Text size="min-size" style={{ fontSize: '11px' }} fw={700} c="red.6">
                            Exceso: {formatCurrency(excess)}
                        </Text>
                    </Stack>
                    <Group gap="xs">
                        <Button
                            variant="subtle"
                            color="blue"
                            size="compact-xs"
                            leftSection={<IconPencil size={14} />}
                            styles={{ label: { fontSize: 11 } }}
                        >
                            Editar
                        </Button>
                        <Button
                            variant="subtle"
                            color="gray"
                            size="compact-xs"
                            leftSection={<IconHistory size={14} />}
                            styles={{ label: { fontSize: 11 } }}
                        >
                            Historial
                        </Button>
                        <Button
                            variant="subtle"
                            color="red"
                            size="compact-xs"
                            leftSection={<IconTrash size={14} />}
                            styles={{ label: { fontSize: 11 } }}
                        >
                            Eliminar
                        </Button>
                    </Group>
                </Group>
            </Paper>
        </motion.div>
    );
};

export default function GastosSST() {
    const navigate = useNavigate();
    const [year, setYear] = useState('2026');
    const [month, setMonth] = useState('Marzo');
    const [rubro, setRubro] = useState('Todos los Rubros');
    const [pendientesOnly, setPendientesOnly] = useState(false);

    const totalGastado = mockExpensesSST.reduce((sum, e) => sum + e.amount, 0);
    const totalPresupuesto = 0;
    const totalExceso = totalGastado - totalPresupuesto;

    const summaryCards = [
        { label: 'Presupuesto', value: totalPresupuesto, gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', glow: 'rgba(37, 99, 235, 0.3)' },
        { label: 'Gastado', value: totalGastado, gradient: 'linear-gradient(135deg, #5c1e1e 0%, #dc2626 100%)', glow: 'rgba(220, 38, 38, 0.3)' },
        { label: 'Exceso', value: totalExceso, gradient: 'linear-gradient(135deg, #5c1e1e 0%, #dc2626 100%)', glow: 'rgba(220, 38, 38, 0.3)' },
    ];

    return (
        <Container size="xl" py="xl">
            <style>{`
                .expense-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 8px 25px rgba(0,0,0,0.3);
                }
                .min-size {
                   font-size: 10px;
                }
            `}</style>

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
                        <Title order={4} c="white" ml="xl">Captura de Gastos SST</Title>
                    </Group>
                    <img src="/Nuevo-perla-Sinfondo.png" alt="Perla" style={{ height: 30 }} />
                </Group>
            </Paper>

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
                            styles={{ input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
                        />
                        <Select
                            data={MONTHS}
                            value={month}
                            onChange={setMonth}
                            w={140}
                            size="sm"
                            styles={{ input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
                        />
                    </Group>
                    <Group gap="sm">
                        <Box style={{ position: 'relative' }}>
                             <Select
                                placeholder="Filtrar por: dd/mm/aaaa"
                                w={180}
                                size="sm"
                                styles={{ input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
                                rightSection={<IconCalendar size={16} />}
                             />
                        </Box>
                        <Select
                            data={RUBROS_SST}
                            value={rubro}
                            onChange={setRubro}
                            w={180}
                            size="sm"
                            styles={{ input: { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' } }}
                        />
                        <Button
                            variant="outline"
                            color="orange"
                            size="sm"
                            radius="md"
                            leftSection={<IconSettings size={14} />}
                            styles={{ root: { border: '1px solid rgba(245, 158, 11, 0.3)' } }}
                        >
                            Ver solo Pendientes
                        </Button>
                    </Group>
                </Group>
            </Paper>

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
                            <Group justify="center" align="center" gap={4}>
                                <Text fw={800} size="xl" c="white" style={{ fontFamily: 'monospace', fontSize: '1.4rem' }}>
                                    {formatCurrency(card.value)}
                                </Text>
                            </Group>
                        </Paper>
                    </motion.div>
                ))}
            </SimpleGrid>

            <Button
                fullWidth
                size="lg"
                radius="md"
                mb="lg"
                color="blue"
                leftSection={<IconPlus size={20} />}
                styles={{
                    root: {
                        background: '#2563eb',
                        fontWeight: 700,
                        fontSize: 16,
                        '&:hover': {
                            background: '#1d4ed8',
                        }
                    }
                }}
            >
                + Agregar Gasto
            </Button>

            <Stack gap="md">
                <AnimatePresence>
                    {mockExpensesSST.map((expense, index) => (
                        <ExpenseCard key={expense.id} expense={expense} index={index} />
                    ))}
                </AnimatePresence>
            </Stack>
        </Container>
    );
}
