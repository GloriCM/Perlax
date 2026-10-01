import { Button, Group, NumberInput, SimpleGrid, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { money, numberProps } from './elliotFormat';

export default function MapaCostosPanel({ draft, setDraft, summary, canEdit }) {
    const centers = draft.costCenters || [];
    const mapParams = draft.mapParams || {};
    const results = summary?.costCenters || [];

    const updateCenter = (idx, patch) => {
        setDraft((prev) => {
            const next = [...prev.costCenters];
            next[idx] = { ...next[idx], ...patch };
            return { ...prev, costCenters: next };
        });
    };

    const updateParams = (patch) => {
        setDraft((prev) => ({
            ...prev,
            mapParams: { ...prev.mapParams, ...patch }
        }));
    };

    const addCenter = () => {
        setDraft((prev) => ({
            ...prev,
            costCenters: [
                ...prev.costCenters,
                                {
                                    code: 'NUEVO',
                                    name: 'Nuevo centro',
                                    productiveHours: 100,
                                    prestacionesFactor: 0.5,
                                    extraPersonnel: 0,
                                    sortOrder: prev.costCenters.length + 1
                                }
            ]
        }), { immediate: true });
    };

    const removeCenter = (idx) => {
        setDraft((prev) => ({
            ...prev,
            costCenters: prev.costCenters.filter((_, i) => i !== idx)
        }), { immediate: true });
    };

    return (
        <Stack gap="lg">
            <Group justify="space-between">
                <div>
                    <Title order={4}>Mapa de costos</Title>
                    <Text size="sm" c="dimmed">
                        Costo/hora por centro. Los cambios se guardan solos.
                    </Text>
                </div>
                {canEdit && (
                    <Button size="sm" variant="light" leftSection={<IconPlus size={14} />} onClick={addCenter}>
                        Agregar centro
                    </Button>
                )}
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                <NumberInput
                    label="Factor gastos generales fab."
                    description="Primarios generales ÷ primarios de los centros"
                    decimalScale={6}
                    value={summary?.mapGeneralFactor ?? mapParams.generalMfgFactor}
                    disabled
                />
                <NumberInput
                    label="Factor administración"
                    description="(Admin + ventas) ÷ primarios operativos"
                    decimalScale={6}
                    value={summary?.mapAdminFactor ?? mapParams.adminFactor}
                    disabled
                />
                <NumberInput
                    label="Factor financiero"
                    description="Gastos financieros ÷ (operación + admin + ventas)"
                    decimalScale={6}
                    value={summary?.mapFinancialFactor ?? mapParams.financialFactor}
                    disabled
                />
                <NumberInput
                    label="% utilización"
                    description="La hora real es la hora ideal dividida por este %"
                    decimalScale={4}
                    value={mapParams.utilizationPct}
                    disabled={!canEdit}
                    onChange={(v) => updateParams({ utilizationPct: Number(v) || 0 })}
                />
            </SimpleGrid>

            <Table striped withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Código</Table.Th>
                        <Table.Th>Centro</Table.Th>
                        <Table.Th>Horas productivas</Table.Th>
                        <Table.Th>Factor prestaciones</Table.Th>
                        <Table.Th>Gastos varios</Table.Th>
                        {canEdit && <Table.Th />}
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {centers.map((c, idx) => (
                        <Table.Tr key={idx}>
                            <Table.Td>
                                {canEdit ? (
                                    <TextInput value={c.code} onChange={(e) => updateCenter(idx, { code: e.currentTarget.value })} />
                                ) : (
                                    c.code
                                )}
                            </Table.Td>
                            <Table.Td>
                                {canEdit ? (
                                    <TextInput value={c.name} onChange={(e) => updateCenter(idx, { name: e.currentTarget.value })} />
                                ) : (
                                    c.name
                                )}
                            </Table.Td>
                            <Table.Td>
                                {canEdit ? (
                                    <NumberInput
                                        {...numberProps}
                                        value={c.productiveHours}
                                        onChange={(v) => updateCenter(idx, { productiveHours: Number(v) || 0 })}
                                    />
                                ) : (
                                    c.productiveHours
                                )}
                            </Table.Td>
                            <Table.Td>
                                {canEdit ? (
                                    <NumberInput
                                        min={0}
                                        max={1}
                                        step={0.01}
                                        decimalScale={4}
                                        value={c.prestacionesFactor ?? 0.5}
                                        onChange={(v) => updateCenter(idx, { prestacionesFactor: Number(v) || 0 })}
                                    />
                                ) : (
                                    c.prestacionesFactor
                                )}
                            </Table.Td>
                            <Table.Td>
                                {canEdit ? (
                                    <NumberInput
                                        {...numberProps}
                                        value={c.extraPersonnel || 0}
                                        onChange={(v) => updateCenter(idx, { extraPersonnel: Number(v) || 0 })}
                                    />
                                ) : (
                                    money(c.extraPersonnel)
                                )}
                            </Table.Td>
                            {canEdit && (
                                <Table.Td>
                                    <Button size="compact-xs" color="red" variant="subtle" onClick={() => removeCenter(idx)}>
                                        <IconTrash size={14} />
                                    </Button>
                                </Table.Td>
                            )}
                        </Table.Tr>
                    ))}
                    {centers.length === 0 && (
                        <Table.Tr>
                            <Table.Td colSpan={6}>
                                <Text c="dimmed" ta="center" py="md">Sin centros. Agrega los que uses (Corte, Impresión, etc.).</Text>
                            </Table.Td>
                        </Table.Tr>
                    )}
                </Table.Tbody>
            </Table>

            <Title order={5}>Resultado calculado</Title>
            <Table striped withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Centro</Table.Th>
                        <Table.Th>Costo primario</Table.Th>
                        <Table.Th>$/hora primario</Table.Th>
                        <Table.Th>$/hora cargado</Table.Th>
                        <Table.Th>$/hora ideal</Table.Th>
                        <Table.Th>$/hora real</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {results.map((r) => (
                        <Table.Tr key={r.code}>
                            <Table.Td>{r.name}</Table.Td>
                            <Table.Td>{money(r.primaryCost)}</Table.Td>
                            <Table.Td>{money(r.primaryPerHour)}</Table.Td>
                            <Table.Td>{money(r.loadedPerHour)}</Table.Td>
                            <Table.Td>{money(r.idealPerHour)}</Table.Td>
                            <Table.Td><Text fw={700}>{money(r.realPerHour)}</Text></Table.Td>
                        </Table.Tr>
                    ))}
                    {results.length === 0 && (
                        <Table.Tr>
                            <Table.Td colSpan={6}>
                                <Text c="dimmed" ta="center" py="md">
                                    Asigna personal de producción a un centro (código) y guarda para ver costos/hora.
                                </Text>
                            </Table.Td>
                        </Table.Tr>
                    )}
                </Table.Tbody>
            </Table>
        </Stack>
    );
}
