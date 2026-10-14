import { Button, Group, NumberInput, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { money, numberProps } from './elliotFormat';
import { normalizeLayout } from './budgetLayout';

const GROUP_ORDER = ['Cooperativa', 'Agentes'];
const GROUP_TITLES = {
    Cooperativa: 'Comisiones vendedores cooperativa',
    Agentes: 'Comisiones agentes comerciales'
};

function titleFor(layout, key) {
    if (GROUP_TITLES[key]) return GROUP_TITLES[key];
    for (const section of layout?.variable || []) {
        const sub = (section.subgroups || []).find((g) => g.key === key);
        if (sub?.title) return sub.title;
    }
    return key;
}

function pctLabel(rate) {
    return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 }).format((Number(rate) || 0) * 100)}%`;
}

export default function CostosVariablesPanel({ draft, setDraft, canEdit }) {
    const layout = normalizeLayout(draft.layout);
    const commissions = draft.commissions || [];
    const keys = [...new Set(commissions.map((c) => c.group).filter(Boolean))];
    const groups = [
        ...GROUP_ORDER.filter((key) => keys.includes(key)),
        ...keys.filter((key) => !GROUP_ORDER.includes(key))
    ];

    const rowsOf = (key) => commissions
        .map((row, idx) => ({ ...row, _idx: idx }))
        .filter((row) => row.group === key)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const patchRow = (idx, patch) => {
        setDraft((prev) => {
            const next = [...(prev.commissions || [])];
            next[idx] = { ...next[idx], ...patch };
            return { ...prev, commissions: next };
        });
    };

    const setGroupRate = (key, percent) => {
        const rate = (Number(percent) || 0) / 100;
        setDraft((prev) => ({
            ...prev,
            commissions: (prev.commissions || []).map((row) => (row.group === key ? { ...row, rate } : row))
        }));
    };

    const addPerson = (key, rate) => {
        setDraft((prev) => ({
            ...prev,
            commissions: [
                ...(prev.commissions || []),
                {
                    name: '',
                    group: key,
                    rate: rate || 0,
                    baseAmount: 0,
                    sortOrder: (prev.commissions || []).length + 1
                }
            ]
        }), { immediate: true });
    };

    const removePerson = (idx) => {
        setDraft((prev) => ({
            ...prev,
            commissions: (prev.commissions || []).filter((_, i) => i !== idx)
        }), { immediate: true });
    };

    return (
        <Stack gap="lg">
            <div>
                <Title order={4}>Costos variables</Title>
                <Text size="sm" c="dimmed">
                    Gastos de ventas. La comisión es el porcentaje del grupo sobre la meta.
                </Text>
            </div>

            {groups.length === 0 && (
                <Text c="dimmed" ta="center" py="xl">Sin comisiones.</Text>
            )}

            {groups.map((key) => {
                const rows = rowsOf(key);
                const rate = Number(rows[0]?.rate) || 0;
                const total = rows.reduce((s, row) => s + (Number(row.baseAmount) || 0) * (Number(row.rate) || 0), 0);
                return (
                    <Stack key={key} gap="sm">
                        <Group justify="space-between" align="flex-end">
                            <div>
                                <Text fw={600}>{titleFor(layout, key)}</Text>
                                {canEdit ? (
                                    <NumberInput
                                        label="Porcentaje"
                                        w={140}
                                        min={0}
                                        max={100}
                                        decimalScale={2}
                                        suffix=" %"
                                        value={Math.round(rate * 10000) / 100}
                                        onChange={(v) => setGroupRate(key, v)}
                                    />
                                ) : (
                                    <Text size="sm" c="dimmed">{pctLabel(rate)}</Text>
                                )}
                            </div>
                            {canEdit && (
                                <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => addPerson(key, rate)}>
                                    Agregar persona
                                </Button>
                            )}
                        </Group>
                        <Table striped withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Nombre</Table.Th>
                                    <Table.Th>Comisión</Table.Th>
                                    <Table.Th>Meta</Table.Th>
                                    {canEdit && <Table.Th />}
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {rows.map((row) => (
                                    <Table.Tr key={row._idx}>
                                        <Table.Td>
                                            {canEdit ? (
                                                <TextInput value={row.name || ''} onChange={(e) => patchRow(row._idx, { name: e.currentTarget.value })} />
                                            ) : row.name}
                                        </Table.Td>
                                        <Table.Td>{money((Number(row.baseAmount) || 0) * (Number(row.rate) || 0))}</Table.Td>
                                        <Table.Td>
                                            {canEdit ? (
                                                <NumberInput
                                                    {...numberProps}
                                                    value={row.baseAmount}
                                                    onChange={(v) => patchRow(row._idx, { baseAmount: Number(v) || 0 })}
                                                />
                                            ) : money(row.baseAmount)}
                                        </Table.Td>
                                        {canEdit && (
                                            <Table.Td>
                                                <Button size="compact-xs" color="red" variant="subtle" onClick={() => removePerson(row._idx)}>
                                                    <IconTrash size={14} />
                                                </Button>
                                            </Table.Td>
                                        )}
                                    </Table.Tr>
                                ))}
                                {rows.length === 0 && (
                                    <Table.Tr>
                                        <Table.Td colSpan={canEdit ? 4 : 3}>
                                            <Text c="dimmed" ta="center" py="sm">Sin personas.</Text>
                                        </Table.Td>
                                    </Table.Tr>
                                )}
                                <Table.Tr>
                                    <Table.Td><Text fw={700}>Total</Text></Table.Td>
                                    <Table.Td><Text fw={700}>{money(total)}</Text></Table.Td>
                                    <Table.Td />
                                    {canEdit && <Table.Td />}
                                </Table.Tr>
                            </Table.Tbody>
                        </Table>
                    </Stack>
                );
            })}
        </Stack>
    );
}
