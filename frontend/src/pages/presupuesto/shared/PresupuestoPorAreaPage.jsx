import { useMemo, useState } from 'react';
import {
    Box,
    Button,
    Card,
    Group,
    NumberInput,
    SegmentedControl,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Text,
    Title
} from '@mantine/core';
import { IconDeviceFloppy } from '@tabler/icons-react';
import {
    MONTHS,
    QUARTERS,
    YEAR_OPTIONS,
    createEmptyBudgetData,
    formatMoney,
    formatMoneyCurrency
} from './presupuestoConstants';
import './PresupuestoPorArea.css';

function sumMonths(data, rubro, months) {
    return months.reduce((acc, month) => acc + (data[rubro]?.[month] || 0), 0);
}

function sumAllRubros(data, rubros, month) {
    return rubros.reduce((acc, rubro) => acc + (data[rubro]?.[month] || 0), 0);
}

function sumAll(data, rubros) {
    return rubros.reduce((acc, rubro) => acc + sumMonths(data, rubro, MONTHS), 0);
}

export default function PresupuestoPorAreaPage({
    title,
    icon: AreaIcon,
    rubros,
    rowLabel = 'Rubro',
    getInitialValue
}) {
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [view, setView] = useState('q1');
    const [data, setData] = useState(() => createEmptyBudgetData(rubros, getInitialValue));
    const [dirty, setDirty] = useState(false);

    const totalAnnual = useMemo(() => sumAll(data, rubros), [data, rubros]);

    const quarterOptions = useMemo(
        () => [
            ...QUARTERS.map((q) => ({ value: q.id, label: q.label })),
            { value: 'annual', label: 'Resumen anual' }
        ],
        []
    );

    const activeQuarter = QUARTERS.find((q) => q.id === view);
    const visibleMonths = activeQuarter?.months ?? MONTHS;

    const quarterTotal = useMemo(() => {
        if (!activeQuarter) return 0;
        return rubros.reduce(
            (acc, rubro) => acc + sumMonths(data, rubro, activeQuarter.months),
            0
        );
    }, [activeQuarter, data, rubros]);

    const handleValueChange = (rubro, month, value) => {
        const numValue = typeof value === 'number' && !Number.isNaN(value) ? Math.max(0, value) : 0;
        setData((prev) => ({
            ...prev,
            [rubro]: {
                ...prev[rubro],
                [month]: numValue
            }
        }));
        setDirty(true);
    };

    const handleSave = () => {
        setDirty(false);
    };

    const numberInputProps = {
        min: 0,
        hideControls: true,
        thousandSeparator: '.',
        decimalSeparator: ',',
        allowDecimal: false,
        size: 'sm',
        styles: {
            input: {
                textAlign: 'right',
                fontVariantNumeric: 'tabular-nums',
                background: 'rgba(15, 23, 42, 0.45)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
                minWidth: 108
            }
        }
    };

    const renderQuarterTable = () => (
        <Table.ScrollContainer minWidth={720} type="native" className="presupuesto-area-scroll">
            <Table
                striped
                highlightOnHover
                withTableBorder
                withColumnBorders
                verticalSpacing="sm"
                horizontalSpacing="md"
                className="presupuesto-area-table"
            >
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th className="presupuesto-area-sticky-col presupuesto-area-rubro-head">
                            {rowLabel}
                        </Table.Th>
                        {visibleMonths.map((month) => (
                            <Table.Th key={month} className="presupuesto-area-month-head">
                                {month}
                            </Table.Th>
                        ))}
                        <Table.Th className="presupuesto-area-subtotal-head">Subtotal trim.</Table.Th>
                        <Table.Th className="presupuesto-area-total-head">Total anual</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rubros.map((rubro) => (
                        <Table.Tr key={rubro}>
                            <Table.Td className="presupuesto-area-sticky-col presupuesto-area-rubro-cell">
                                <Text size="sm" fw={500} lineClamp={2}>
                                    {rubro}
                                </Text>
                            </Table.Td>
                            {visibleMonths.map((month) => (
                                <Table.Td key={`${rubro}-${month}`} className="presupuesto-area-input-cell">
                                    <NumberInput
                                        {...numberInputProps}
                                        value={data[rubro][month]}
                                        onChange={(val) => handleValueChange(rubro, month, val)}
                                        aria-label={`${rubro} ${month}`}
                                    />
                                </Table.Td>
                            ))}
                            <Table.Td className="presupuesto-area-subtotal-cell">
                                {formatMoney(sumMonths(data, rubro, visibleMonths))}
                            </Table.Td>
                            <Table.Td className="presupuesto-area-total-cell">
                                {formatMoney(sumMonths(data, rubro, MONTHS))}
                            </Table.Td>
                        </Table.Tr>
                    ))}
                    <Table.Tr className="presupuesto-area-footer-row">
                        <Table.Td className="presupuesto-area-sticky-col presupuesto-area-rubro-cell">
                            <Text size="sm" fw={700}>
                                Total mensual
                            </Text>
                        </Table.Td>
                        {visibleMonths.map((month) => (
                            <Table.Td key={`total-${month}`} className="presupuesto-area-subtotal-cell">
                                <Text size="sm" fw={600}>
                                    {formatMoney(sumAllRubros(data, rubros, month))}
                                </Text>
                            </Table.Td>
                        ))}
                        <Table.Td className="presupuesto-area-subtotal-cell">
                            <Text size="sm" fw={700}>
                                {formatMoney(quarterTotal)}
                            </Text>
                        </Table.Td>
                        <Table.Td className="presupuesto-area-total-cell">
                            <Text size="sm" fw={700}>
                                {formatMoney(totalAnnual)}
                            </Text>
                        </Table.Td>
                    </Table.Tr>
                </Table.Tbody>
            </Table>
        </Table.ScrollContainer>
    );

    const renderAnnualSummary = () => (
        <Table.ScrollContainer minWidth={640} type="native" className="presupuesto-area-scroll">
            <Table
                striped
                highlightOnHover
                withTableBorder
                withColumnBorders
                verticalSpacing="sm"
                horizontalSpacing="md"
                className="presupuesto-area-table"
            >
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th className="presupuesto-area-sticky-col presupuesto-area-rubro-head">
                            {rowLabel}
                        </Table.Th>
                        {QUARTERS.map((q) => (
                            <Table.Th key={q.id} className="presupuesto-area-month-head">
                                {q.label}
                            </Table.Th>
                        ))}
                        <Table.Th className="presupuesto-area-total-head">Total anual</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rubros.map((rubro) => (
                        <Table.Tr key={rubro}>
                            <Table.Td className="presupuesto-area-sticky-col presupuesto-area-rubro-cell">
                                <Text size="sm" fw={500} lineClamp={2}>
                                    {rubro}
                                </Text>
                            </Table.Td>
                            {QUARTERS.map((q) => (
                                <Table.Td key={`${rubro}-${q.id}`} className="presupuesto-area-subtotal-cell">
                                    {formatMoney(sumMonths(data, rubro, q.months))}
                                </Table.Td>
                            ))}
                            <Table.Td className="presupuesto-area-total-cell">
                                {formatMoney(sumMonths(data, rubro, MONTHS))}
                            </Table.Td>
                        </Table.Tr>
                    ))}
                    <Table.Tr className="presupuesto-area-footer-row">
                        <Table.Td className="presupuesto-area-sticky-col presupuesto-area-rubro-cell">
                            <Text size="sm" fw={700}>
                                Total por trimestre
                            </Text>
                        </Table.Td>
                        {QUARTERS.map((q) => (
                            <Table.Td key={`total-${q.id}`} className="presupuesto-area-subtotal-cell">
                                <Text size="sm" fw={700}>
                                    {formatMoney(
                                        rubros.reduce(
                                            (acc, rubro) => acc + sumMonths(data, rubro, q.months),
                                            0
                                        )
                                    )}
                                </Text>
                            </Table.Td>
                        ))}
                        <Table.Td className="presupuesto-area-total-cell">
                            <Text size="sm" fw={700}>
                                {formatMoney(totalAnnual)}
                            </Text>
                        </Table.Td>
                    </Table.Tr>
                </Table.Tbody>
            </Table>
        </Table.ScrollContainer>
    );

    return (
        <Box className="presupuesto-area-page fade-in">
            <Stack gap="lg">
                <Group justify="space-between" align="flex-start" wrap="wrap" gap="md">
                    <Group gap="sm" align="center">
                        {AreaIcon && <AreaIcon size={28} stroke={1.5} className="presupuesto-area-icon" />}
                        <div>
                            <Title order={2} className="presupuesto-area-title">
                                Presupuesto {title}
                            </Title>
                            <Text size="sm" c="dimmed">
                                Captura mensual por rubro · vista por trimestre
                            </Text>
                        </div>
                    </Group>
                    <Select
                        label="Año fiscal"
                        data={YEAR_OPTIONS}
                        value={year}
                        onChange={(v) => v && setYear(v)}
                        w={120}
                        classNames={{ input: 'presupuesto-area-year-input' }}
                    />
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md">
                    <Card padding="lg" radius="md" className="presupuesto-area-kpi">
                        <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={4}>
                            Total anual {year}
                        </Text>
                        <Text size="xl" fw={800} className="presupuesto-area-kpi-value">
                            {formatMoneyCurrency(totalAnnual)}
                        </Text>
                    </Card>
                    {view !== 'annual' && activeQuarter && (
                        <Card padding="lg" radius="md" className="presupuesto-area-kpi">
                            <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={4}>
                                {activeQuarter.label}
                            </Text>
                            <Text size="xl" fw={800} className="presupuesto-area-kpi-accent">
                                {formatMoneyCurrency(quarterTotal)}
                            </Text>
                        </Card>
                    )}
                    <Card padding="lg" radius="md" className="presupuesto-area-kpi">
                        <Text size="xs" tt="uppercase" fw={700} c="dimmed" mb={4}>
                            Rubros
                        </Text>
                        <Text size="xl" fw={800} c="#f8fafc">
                            {rubros.length}
                        </Text>
                    </Card>
                </SimpleGrid>

                <Card padding="lg" radius="md" className="presupuesto-area-card">
                    <Stack gap="md">
                        <Group justify="space-between" align="center" wrap="wrap" gap="sm">
                            <Text fw={600} size="sm" c="dimmed">
                                {view === 'annual'
                                    ? 'Consolidado por trimestre'
                                    : `Edición ${activeQuarter?.label ?? ''}`}
                            </Text>
                            <SegmentedControl
                                value={view}
                                onChange={setView}
                                data={quarterOptions}
                                className="presupuesto-area-segment"
                            />
                        </Group>
                        {view === 'annual' ? renderAnnualSummary() : renderQuarterTable()}
                    </Stack>
                </Card>

                <Group justify="flex-end">
                    <Button
                        leftSection={<IconDeviceFloppy size={18} />}
                        onClick={handleSave}
                        disabled={!dirty}
                        className="presupuesto-area-save"
                    >
                        Guardar cambios
                    </Button>
                </Group>
            </Stack>
        </Box>
    );
}
