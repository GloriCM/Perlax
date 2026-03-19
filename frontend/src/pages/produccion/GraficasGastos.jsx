import React, { useState } from 'react';
import {
    Container,
    Paper,
    Title,
    Text,
    Group,
    Stack,
    Button,
    Select,
    SimpleGrid,
    Box,
    Progress,
    Tooltip
} from '@mantine/core';
import {
    IconArrowLeft,
    IconFileText,
    IconDownload,
    IconChartBar,
    IconAlertTriangle,
    IconCoin
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GastosTabs from '../../components/GastosTabs';

// ── Format currency ────────────────────────────────────────
const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: value % 1 !== 0 ? 2 : 0,
        maximumFractionDigits: 2
    }).format(value);
};

// ── Mock Data ──────────────────────────────────────────────
const YEARS = ['2024', '2025', '2026', '2027'];
const PERIODOS = ['Todo el Año', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const mockRubros = [
    { name: 'Mantenimiento', spent: 8300600, budget: 0, color: '#ef4444' },
    { name: 'Horas Extras', spent: 2273884.52, budget: 3600000, color: '#3b82f6' },
    { name: 'Prestadores de Servicios', spent: 1129350, budget: 0, color: '#ef4444' },
    { name: 'Recargo', spent: 1066237.95, budget: 0, color: '#ef4444' },
    { name: 'Repuesto', spent: 530000, budget: 7800000, color: '#3b82f6' },
    { name: 'Refrigerios', spent: 0, budget: 1200000, color: '#3b82f6' },
    { name: 'Materia Prima', spent: 0, budget: 0, color: '#6366f1' },
    { name: 'Transporte', spent: 0, budget: 500000, color: '#3b82f6' },
];

const mockSummary = {
    presupuesto: 12600000,
    gastado: 13300072.47,
    registros: 168
};

// ── Rubro Bar ──────────────────────────────────────────────
const RubroBar = ({ rubro, index }) => {
    const hasBudget = rubro.budget > 0;
    const percentage = hasBudget ? Math.min((rubro.spent / rubro.budget) * 100, 100) : (rubro.spent > 0 ? 100 : 0);
    const isOverBudget = hasBudget ? rubro.spent > rubro.budget : rubro.spent > 0;
    const overAmount = isOverBudget ? (hasBudget ? rubro.spent - rubro.budget : rubro.spent) : 0;
    const barColor = isOverBudget && !hasBudget ? '#ef4444' : (isOverBudget ? '#f59e0b' : '#3b82f6');

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06, duration: 0.35 }}
        >
            <Box mb="lg">
                {/* Rubro header */}
                <Group justify="space-between" mb={4}>
                    <Group gap="xs">
                        <Text fw={700} size="sm" c="white" style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'rgba(255,255,255,0.3)' }}>
                            {rubro.name}
                        </Text>
                        <IconCoin size={14} style={{ color: '#d97706' }} />
                    </Group>
                    <Text size="sm" c="gray.4" style={{ fontFamily: 'monospace' }}>
                        {formatCurrency(rubro.spent)} / {rubro.budget > 0 ? formatCurrency(rubro.budget) : '$ 0'}
                    </Text>
                </Group>

                {/* Warning if over budget */}
                {isOverBudget && (
                    <Group gap={4} mb={6}>
                        <IconAlertTriangle size={13} style={{ color: '#f59e0b' }} />
                        <Text size="xs" c="yellow.5" fw={600}>
                            Superó presupuesto por {formatCurrency(overAmount)}
                        </Text>
                    </Group>
                )}

                {/* Progress bar */}
                <Progress
                    value={percentage}
                    color={barColor}
                    size="lg"
                    radius="md"
                    styles={{
                        root: {
                            background: 'rgba(255,255,255,0.06)',
                        },
                        section: {
                            transition: 'width 0.8s ease',
                        }
                    }}
                />
            </Box>
        </motion.div>
    );
};

// ── Main Component ─────────────────────────────────────────
const GraficasGastos = ({ titulo = 'Gastos de Producción', subtitulo = 'Control de Gastos', showTabs = false }) => {
    const navigate = useNavigate();
    const [year, setYear] = useState('2026');
    const [periodo, setPeriodo] = useState('Todo el Año');

    const { presupuesto, gastado, registros } = mockSummary;
    const restante = presupuesto - gastado;
    const ejecucion = presupuesto > 0 ? (gastado / presupuesto) * 100 : 0;
    const isOverBudget = gastado > presupuesto;

    const summaryCards = [
        {
            label: 'Presupuesto', icon: '💰', value: formatCurrency(presupuesto),
            gradient: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)',
            glow: 'rgba(37, 99, 235, 0.25)'
        },
        {
            label: 'Gastado', icon: '💸', value: formatCurrency(gastado),
            gradient: 'linear-gradient(135deg, #1a4a3a 0%, #059669 100%)',
            glow: 'rgba(5, 150, 105, 0.25)'
        },
        {
            label: 'Restante', icon: '📊',
            value: formatCurrency(restante),
            gradient: restante >= 0
                ? 'linear-gradient(135deg, #1a4a3a 0%, #059669 100%)'
                : 'linear-gradient(135deg, #5c1e1e 0%, #dc2626 100%)',
            glow: restante >= 0 ? 'rgba(5, 150, 105, 0.25)' : 'rgba(220, 38, 38, 0.25)'
        },
        {
            label: 'Registros', icon: '📝', value: registros.toString(),
            gradient: 'linear-gradient(135deg, #3b2e5a 0%, #7c3aed 100%)',
            glow: 'rgba(124, 58, 237, 0.25)'
        },
    ];

    return (
        <Container size="xl" py="xl">
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
                <Group justify="space-between" align="center" wrap="wrap">
                    <Group>
                        <Button
                            variant="subtle"
                            color="gray"
                            size="sm"
                            leftSection={<IconArrowLeft size={18} />}
                            onClick={() => navigate('/')}
                            c="dimmed"
                            styles={{ root: { padding: '4px 10px' } }}
                        >
                            Volver al Panel
                        </Button>
                        <div>
                            <Text size="xs" c="dimmed" fw={700} style={{ textTransform: 'uppercase', letterSpacing: '1px' }}>
                                {subtitulo}
                            </Text>
                            <Title order={2} c="white">{titulo}</Title>
                        </div>
                    </Group>

                    <Group gap="sm">
                        <Button
                            color="teal"
                            variant="filled"
                            size="sm"
                            radius="md"
                            leftSection={<IconFileText size={16} />}
                        >
                            Generar Informe
                        </Button>
                        <Button
                            color="red"
                            variant="filled"
                            size="sm"
                            radius="md"
                            leftSection={<IconDownload size={16} />}
                        >
                            Exportar CSV
                        </Button>
                        <Select
                            data={YEARS}
                            value={year}
                            onChange={setYear}
                            w={90}
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
                            data={PERIODOS}
                            value={periodo}
                            onChange={setPeriodo}
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
                </Group>
            </Paper>

            {showTabs && <GastosTabs />}

            {/* Summary Cards */}
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="lg">
                {summaryCards.map((card, i) => (
                    <motion.div
                        key={card.label}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.08, duration: 0.4 }}
                    >
                        <Paper
                            p="md"
                            radius="lg"
                            style={{
                                background: card.gradient,
                                border: '1px solid rgba(255, 255, 255, 0.12)',
                                boxShadow: `0 4px 20px ${card.glow}`,
                                textAlign: 'center',
                            }}
                        >
                            <Group justify="center" gap={6} mb={4}>
                                <Text size="xs">{card.icon}</Text>
                                <Text size="xs" c="rgba(255,255,255,0.7)" fw={600}
                                    style={{ textTransform: 'uppercase', letterSpacing: '0.8px' }}
                                >
                                    {card.label}
                                </Text>
                            </Group>
                            <Text fw={800} size="lg" c="white" style={{ fontFamily: 'monospace' }}>
                                {card.value}
                            </Text>
                        </Paper>
                    </motion.div>
                ))}
            </SimpleGrid>

            {/* Ejecución Anual */}
            <Paper
                p="lg"
                radius="lg"
                mb="lg"
                style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <Group justify="space-between" mb="sm">
                    <Group gap="xs">
                        <IconChartBar size={18} style={{ color: '#6366f1' }} />
                        <Text fw={700} c="white">Ejecución Anual Completo</Text>
                    </Group>
                </Group>

                <Tooltip label={`${ejecucion.toFixed(0)}% ejecutado`} position="top" withArrow>
                    <Progress
                        value={Math.min(ejecucion, 100)}
                        size={28}
                        radius="md"
                        color={isOverBudget ? 'red' : (ejecucion > 80 ? 'orange' : 'blue')}
                        styles={{
                            root: {
                                background: 'rgba(255,255,255,0.06)',
                            },
                            section: {
                                transition: 'width 1s ease',
                            }
                        }}
                    />
                </Tooltip>

                <Text size="sm" c="gray.4" ta="center" mt="sm" style={{ fontFamily: 'monospace' }}>
                    {ejecucion.toFixed(0)}% ejecutado ({formatCurrency(gastado)} / {formatCurrency(presupuesto)})
                </Text>
            </Paper>

            {/* Desempeño por Rubro */}
            <Paper
                p="lg"
                radius="lg"
                style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <Group gap="xs" mb="lg">
                    <IconCoin size={18} style={{ color: '#d97706' }} />
                    <Text fw={700} c="white">Desempeño por Rubro (Anual)</Text>
                </Group>

                <Stack gap={0}>
                    {mockRubros.map((rubro, index) => (
                        <RubroBar key={rubro.name} rubro={rubro} index={index} />
                    ))}
                </Stack>
            </Paper>
        </Container>
    );
};

export default GraficasGastos;
