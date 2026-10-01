import { Card, SimpleGrid, Stack, Table, Text, Title } from '@mantine/core';
import { money, pct, SECTION_LABELS } from './elliotFormat';
import { PRESTACION_LABELS } from './elliotPayroll';

function PayrollDetailCard({ title, block, goesTo, cooperativeLabor, cooperativePrestaciones }) {
    if (!block && cooperativeLabor == null) return null;

    const lines = PRESTACION_LABELS.map(({ key, label }) => ({
        label,
        amount: block?.[key] || 0
    }));

    const prestaciones = (block?.prestaciones
        ?? lines.reduce((s, l) => s + (Number(l.amount) || 0), 0))
        + (cooperativePrestaciones || 0);

    const totalNomina = (block?.total || 0) + (cooperativeLabor || 0);

    return (
        <Card className="presupuestos-card" padding="md">
            <Text fw={600} mb={4}>{title}</Text>
            <Text size="xs" c="dimmed" mb="sm">Entra en: {goesTo}</Text>
            <Stack gap={4}>
                {block && (
                    <>
                        <Text size="sm">Sueldos {money(block.salary)}</Text>
                        <Text size="sm">Subsidio transporte {money(block.transport)}</Text>
                        {lines.map((l) => (
                            <Text key={l.label} size="sm">{l.label} {money(l.amount)}</Text>
                        ))}
                        {block.auxilios > 0 && <Text size="sm">Auxilios {money(block.auxilios)}</Text>}
                    </>
                )}
                {cooperativePrestaciones > 0 && (
                    <Text size="sm">Prestaciones cooperativa {money(cooperativePrestaciones)}</Text>
                )}
                {cooperativeLabor > 0 && (
                    <Text size="sm">Total cooperativa {money(cooperativeLabor)}</Text>
                )}
                <Text size="sm" fw={600} mt={4}>Total prestaciones {money(prestaciones)}</Text>
                <Text size="sm" fw={700}>Total nómina {money(totalNomina)}</Text>
            </Stack>
        </Card>
    );
}

export default function ResumenPresupuestoPanel({ summary }) {
    if (!summary) {
        return <Text c="dimmed">Sin resumen calculado aún.</Text>;
    }

    const rows = summary.summaryRows || [];
    const people = summary.peoplePayroll || [];

    const totalPrestaciones = (summary.adminPayroll?.prestaciones || 0)
        + (summary.salesPayroll?.prestaciones || 0)
        + (summary.productionPayroll?.prestaciones || 0)
        + (summary.cooperativePrestaciones || 0);

    return (
        <Stack gap="lg">
            <div>
                <Title order={4}>Resumen presupuestal</Title>
                <Text size="sm" c="dimmed">
                    Calculado automáticamente desde costos fijos y variables (prestaciones, MP, utilidad).
                </Text>
            </div>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }}>
                <Card className="presupuestos-kpi" padding="lg">
                    <Text className="presupuestos-kpi-label">Ingresos</Text>
                    <Title order={4}>{money(summary.totalIncome)}</Title>
                </Card>
                <Card className="presupuestos-kpi" padding="lg">
                    <Text className="presupuestos-kpi-label">Costo producción</Text>
                    <Title order={4}>{money(summary.productionCost)}</Title>
                </Card>
                <Card className="presupuestos-kpi" padding="lg">
                    <Text className="presupuestos-kpi-label">Gastos</Text>
                    <Title order={4}>{money(summary.totalOperatingExpenses)}</Title>
                </Card>
                <Card className="presupuestos-kpi" padding="lg">
                    <Text className="presupuestos-kpi-label">Total prestaciones</Text>
                    <Title order={4}>{money(totalPrestaciones)}</Title>
                </Card>
                <Card className="presupuestos-kpi" padding="lg">
                    <Text className="presupuestos-kpi-label">Utilidad</Text>
                    <Title order={4}>{money(summary.utility)}</Title>
                </Card>
            </SimpleGrid>

            <Card className="presupuestos-card" padding="lg">
                <Table>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Concepto</Table.Th>
                            <Table.Th>Monto</Table.Th>
                            <Table.Th>% ingresos</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows.map((r) => (
                            <Table.Tr key={r.label} style={{ fontWeight: r.kind === 'result' || r.kind === 'subtotal' ? 700 : 400 }}>
                                <Table.Td>{r.label}</Table.Td>
                                <Table.Td>{money(r.amount)}</Table.Td>
                                <Table.Td>{pct(r.percentOfIncome)}</Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Card>

            <div>
                <Title order={5} mb={4}>Prestaciones y nómina por área</Title>
                <Text size="sm" c="dimmed" mb="sm">
                    Total prestaciones: {money(totalPrestaciones)}. Se dividen según el área de cada persona
                    (admin → gastos administrativos, ventas → gastos de ventas, MOD/coop → costo mano de obra).
                </Text>
                <SimpleGrid cols={{ base: 1, md: 3 }}>
                    <PayrollDetailCard
                        title="Nómina administración"
                        block={summary.adminPayroll}
                        goesTo="Gastos administrativos"
                    />
                    <PayrollDetailCard
                        title="Nómina ventas"
                        block={summary.salesPayroll}
                        goesTo="Gastos de ventas"
                    />
                    <PayrollDetailCard
                        title="MOD / producción"
                        block={summary.productionPayroll}
                        goesTo="Costo mano de obra"
                        cooperativeLabor={summary.cooperativeLabor}
                        cooperativePrestaciones={summary.cooperativePrestaciones}
                    />
                </SimpleGrid>
                {(summary.cooperativeLabor || 0) > 0 && (
                    <Text size="sm" mt="sm" c="dimmed">
                        La cooperativa se suma al costo de mano de obra junto con la MOD.
                    </Text>
                )}
            </div>

            {people.length > 0 && (
                <Card className="presupuestos-card" padding="lg">
                    <Title order={5} mb="xs">Prestaciones por persona</Title>
                    <Text size="sm" c="dimmed" mb="md">
                        Cada concepto usa las mismas fórmulas del Excel. El total de prestaciones es la suma de esas columnas.
                    </Text>
                    <Table.ScrollContainer minWidth={980}>
                        <Table striped withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Persona</Table.Th>
                                    <Table.Th>Área</Table.Th>
                                    <Table.Th>Sueldo</Table.Th>
                                    <Table.Th>Subsidio</Table.Th>
                                    {PRESTACION_LABELS.map((c) => (
                                        <Table.Th key={c.key}>{c.label}</Table.Th>
                                    ))}
                                    <Table.Th>Prestaciones</Table.Th>
                                    <Table.Th>Total</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {people.map((p, idx) => (
                                    <Table.Tr key={`${p.section}-${p.name}-${idx}`}>
                                        <Table.Td>
                                            <Text size="sm">{p.name || '—'}</Text>
                                            {p.role && <Text size="xs" c="dimmed">{p.role}</Text>}
                                        </Table.Td>
                                        <Table.Td>{SECTION_LABELS[p.section] || p.section}</Table.Td>
                                        <Table.Td>{money(p.salary)}</Table.Td>
                                        <Table.Td>{money(p.transport)}</Table.Td>
                                        {PRESTACION_LABELS.map((c) => (
                                            <Table.Td key={c.key}>{money(p[c.key])}</Table.Td>
                                        ))}
                                        <Table.Td>
                                            <Text fw={600} size="sm">{money(p.prestaciones)}</Text>
                                        </Table.Td>
                                        <Table.Td>
                                            <Text fw={700} size="sm">{money(p.total)}</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Table.ScrollContainer>
                </Card>
            )}
        </Stack>
    );
}
