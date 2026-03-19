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
import GastosTabs from '../../../components/GastosTabs';

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
const PERIODOS = ['Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre', 'Enero', 'Febrero'];

const mockRubros = [
    { name: 'Clises', spent: 64000, budget: 0, color: '#ef4444' },
    { name: 'Impresiones Digitales', spent: 0, budget: 0, color: '#3b82f6' },
    { name: 'Marcos', spent: 0, budget: 0, color: '#3b82f6' },
    { name: 'Positivos', spent: 0, budget: 0, color: '#3b82f6' },
    { name: 'Pruebas de Color', spent: 0, budget: 0, color: '#3b82f6' },
];

const mockSummary = {
    presupuesto: 0,
    gastado: 1961527,
    registros: 26
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
            <Box mb="sm">
                {/* Rubro header */}
                <Group justify="space-between" mb={2}>
                    <Group gap="xs">
                        <Text fw={700} size="xs" c="indigo.4" style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                            {rubro.name}
                        </Text>
                        <IconCoin size={12} style={{ color: '#d97706' }} />
                    </Group>
                    <Text size="xs" fw={700} c="teal.5" style={{ fontFamily: 'monospace' }}>
                        {formatCurrency(rubro.spent)} / {rubro.budget > 0 ? formatCurrency(rubro.budget) : '$ 0'}
                    </Text>
                </Group>

                {/* Warning if over budget */}
                {isOverBudget && (
                    <Group gap={4} mb={2}>
                        <IconAlertTriangle size={12} style={{ color: '#f59e0b' }} />
                        <Text size="10px" c="yellow.6" fw={700}>
                            ⚠️ Superó presupuesto
                        </Text>
                    </Group>
                )}

                {/* Progress bar */}
                <Progress
                    value={percentage}
                    color={barColor}
                    size="6px"
                    radius="md"
                    styles={{
                        root: { background: 'rgba(255,255,255,0.06)' },
                        section: { transition: 'width 0.8s ease' }
                    }}
                />
            </Box>
        </motion.div>
    );
};

// ── Main Component ─────────────────────────────────────────
const GraficasDiseno = () => {
    const navigate = useNavigate();
    const [year, setYear] = useState('2026');
    const [periodo, setPeriodo] = useState('Marzo');

    const { presupuesto, gastado, registros } = mockSummary;
    const restante = presupuesto - gastado;
    const ejecucion = presupuesto > 0 ? (gastado / presupuesto) * 100 : (gastado > 0 ? 100 : 0);
    // Large number from screenshot: 196152700%
    const ejecucionText = presupuesto === 0 && gastado > 0 ? (gastado * 100).toString() + '%' : ejecucion.toFixed(0) + '%';

    const summaryCards = [
        {
            label: 'Presupuesto', value: formatCurrency(presupuesto),
            bgColor: '#eef2ff', textColor: '#374151', labelColor: '#6b7280'
        },
        {
            label: 'Gastado', value: formatCurrency(gastado),
            bgColor: '#f0fdf4', textColor: '#15803d', labelColor: '#166534'
        },
        {
            label: 'Restante',
            value: formatCurrency(restante),
            bgColor: '#fff7ed', textColor: '#b45309', labelColor: '#9a3412'
        },
        {
            label: 'Registros', value: registros.toString(),
            bgColor: '#f8fafc', textColor: '#334155', labelColor: '#64748b'
        },
    ];

    return (
        <Container size="xl" py="lg">
            {/* Header */}
            <Paper
                p="xs"
                radius="lg"
                mb="sm"
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
                        <Title order={4} c="white" ml="xl">Gastos de Diseño</Title>
                    </Group>
                    <img src="/Nuevo-perla-Sinfondo.png" alt="Perla" style={{ height: 30 }} />
                </Group>
            </Paper>



            {/* Title and Buttons */}
            <Group justify="space-between" align="center" mb="md">
                <Group gap="xs">
                    <IconChartBar size={20} color="white" />
                    <Title order={5} c="white">Análisis de Gastos Diseño</Title>
                </Group>
                <Group gap="sm">
                    <Button
                        color="teal"
                        variant="filled"
                        size="xs"
                        radius="md"
                        leftSection={<IconFileText size={16} />}
                        fw={700}
                    >
                        Generar Informe
                    </Button>
                    <Button
                        color="blue"
                        variant="filled"
                        size="xs"
                        radius="md"
                        leftSection={<IconDownload size={16} />}
                        fw={700}
                    >
                        Exportar CSV
                    </Button>
                    <Select
                        data={YEARS}
                        value={year}
                        onChange={setYear}
                        w={80}
                        size="xs"
                        styles={{ input: { background: 'white', color: 'black' } }}
                    />
                    <Select
                        data={PERIODOS}
                        value={periodo}
                        onChange={setPeriodo}
                        w={100}
                        size="xs"
                        styles={{ input: { background: 'white', color: 'black' } }}
                    />
                </Group>
            </Group>

            {/* Summary Cards */}
            <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md" mb="md">
                {summaryCards.map((card, i) => (
                    <Paper
                        key={card.label}
                        p="xs"
                        radius="md"
                        style={{
                            background: card.bgColor,
                            textAlign: 'center',
                        }}
                    >
                        <Text size="10px" c={card.labelColor} fw={700} mb={2}
                            style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
                        >
                            {card.label}
                        </Text>
                        <Text fw={800} size="md" c={card.textColor} style={{ fontFamily: 'monospace' }}>
                            {card.value}
                        </Text>
                    </Paper>
                ))}
            </SimpleGrid>

            {/* Ejecución del Mes */}
            <Paper
                p="md"
                radius="lg"
                mb="md"
                style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <Group gap="xs" mb="sm">
                    <IconFileText size={18} color="white" />
                    <Text fw={700} c="white" size="sm">Ejecución del Mes</Text>
                </Group>

                <Progress
                    value={100}
                    size="xl"
                    radius="md"
                    color="red"
                    styles={{
                        root: { background: 'rgba(255,255,255,0.06)' },
                    }}
                />

                <Text size="10px" c="gray.5" ta="right" mt={4}>
                    {ejecucionText} ejecutado
                </Text>
            </Paper>

            {/* Desempeño por Rubro */}
            <Paper
                p="md"
                radius="lg"
                style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
            >
                <Group gap="xs" mb="lg">
                    <IconCoin size={18} style={{ color: '#d97706' }} />
                    <Text fw={700} c="white" size="sm">Desempeño por Rubro</Text>
                </Group>

                <Stack gap="md">
                    {mockRubros.map((rubro, index) => (
                        <RubroBar key={rubro.name} rubro={rubro} index={index} />
                    ))}
                </Stack>
            </Paper>
        </Container>
    );
};

export default GraficasDiseno;
