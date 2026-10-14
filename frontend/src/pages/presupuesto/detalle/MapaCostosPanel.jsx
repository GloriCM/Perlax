import { Button, Card, Group, NumberInput, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { money, numberProps } from './elliotFormat';

const MACHINE_HINT = {
    CORTE: 'M# 01, 02ab',
    IMPRESION: 'M# 03, 04, 05, 06, 18',
    TROQUEL: 'M# 07, 08, 10, 11, 12, 13, 17',
    LAMINADO: 'M# 10, 11',
    CORRUGADO: 'M# 13a, 13b',
    PEGA: 'M# 14',
    UV: 'UV',
    TALLER: 'Pega'
};

const MACHINE_VALUES = [
    ['M#01', 'Convertidora', 40000],
    ['M#02 A', 'Guillotina', 20000],
    ['M#02 B', 'Guillotina', 30000],
    ['M#03', 'Sordz 71', 80000],
    ['M#04', 'Sordz 76', 80000],
    ['M#05', 'Sordz 71', 80000],
    ['M#06', 'Speedmaster', 300000],
    ['M#07', 'SBD', 35000],
    ['M#08', 'SBD', 35000],
    ['M#09', 'Corrugadora', 60000],
    ['M#10', 'Corrugadora', 80000],
    ['M#11', 'Laminadora', 12000],
    ['M#12', 'Polygraph (2t)', 20000],
    ['M#13', 'Royo 800', 150000],
    ['M#14', 'Pegadora', 20000]
];

const INDIRECT_GROUPS = new Set([
    'CostosIndirectos', 'MantenimientoMaquinas', 'FletesIndirectos',
    'DepreciacionIndirecta', 'ServiciosIndirectos', 'DiversosIndirectos'
]);

function pct0(v) {
    return `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format((Number(v) || 0) * 100)}%`;
}

function sum(list, pick) {
    return list.reduce((s, item) => s + (Number(pick(item)) || 0), 0);
}

function buildLocalization(draft, summary) {
    const people = (draft.people || []).filter((p) => p.section === 'Production');
    const centers = [...(draft.costCenters || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const codes = new Set(centers.map((c) => (c.code || '').toUpperCase()));
    const items = draft.fixedItems || [];
    const salaryOf = (list) => sum(list, (p) => (Number(p.salary) || 0) + (Number(p.transportSubsidy) || 0));
    const ofCenter = (code) => people.filter((p) => (p.costCenterCode || '').toUpperCase() === (code || '').toUpperCase());
    const generalesPeople = people.filter((p) => !p.costCenterCode || !codes.has(p.costCenterCode.toUpperCase()));

    const salGen = salaryOf(generalesPeople);
    const salC = centers.map((c) => salaryOf(ofCenter(c.code)));
    const factor = (c) => (Number(c.prestacionesFactor) > 0 ? Number(c.prestacionesFactor) : 0.5);
    const prestGen = salGen * 0.5;
    const prestC = centers.map((c, i) => salC[i] * factor(c));
    const variosC = centers.map((c) => Number(c.extraPersonnel) || 0);
    const mo = (sal, prest, varios) => sal + prest + varios;
    const moGen = mo(salGen, prestGen, 0);
    const moC = centers.map((_, i) => mo(salC[i], prestC[i], variosC[i]));
    const moSub = moC.reduce((a, b) => a + b, 0);

    const indirectItems = items.filter((i) => INDIRECT_GROUPS.has(i.group));
    const indirect = sum(indirectItems, (i) => i.amount);
    const internacional = sum(
        indirectItems.filter((i) => (i.concept || '').toLowerCase().includes('internacional')),
        (i) => i.amount
    );
    const cif = indirect - internacional;
    const otrosContratos = sum(
        items.filter((i) => i.group === 'ContratosServicios' && !(i.concept || '').includes('%')),
        (i) => i.amount
    );
    const admin = (Number(summary?.totalAdminExpenses) || 0) + (Number(summary?.totalSalesExpenses) || 0);
    const finan = Number(summary?.financialExpenses) || 0;

    const primaryC = moC;
    const primaryGen = moGen + cif + otrosContratos;
    const primarySub = primaryC.reduce((a, b) => a + b, 0);
    const primaryGrand = primaryGen + primarySub + admin + finan;
    const gg = primarySub === 0 ? 0 : primaryGen / primarySub;
    const operational = primarySub + primaryGen;
    const adminFactor = operational === 0 ? 0 : admin / operational;
    const finFactor = (operational + admin) === 0 ? 0 : finan / (operational + admin);
    const util = Number(draft.mapParams?.utilizationPct) > 0 ? Number(draft.mapParams.utilizationPct) : 0.7;
    const hours = centers.map((c) => Number(c.productiveHours) || 0);
    const perHour = (amount, h) => (h ? amount / h : 0);
    const pph = primaryC.map((amount, i) => perHour(amount, hours[i]));
    const ggHour = pph.map((v) => v * gg);
    const totalHour = pph.map((v, i) => v + ggHour[i]);
    const adminHour = totalHour.map((v) => v * adminFactor);
    const plusAdmin = totalHour.map((v, i) => v + adminHour[i]);
    const finHour = plusAdmin.map((v) => v * finFactor);
    const ideal = plusAdmin.map((v, i) => v + finHour[i]);
    const real = ideal.map((v) => (util ? v / util : 0));
    const totalHoraCentro = totalHour.map((v) => (util ? v / util : 0));
    const month = real.map((v, i) => v * hours[i]);

    const n = centers.length;
    const zeros = () => Array(n).fill(0);
    const emptyHours = () => Array(n).fill(null);
    const moneyRow = (label, gen, centerVals, sub, adm, fin, grand, strong = false) => ({
        label, strong, kind: 'money',
        cells: [gen, ...centerVals, sub, adm, fin, grand]
    });
    const hourRow = (label, centerVals, tail, strong = false) => ({
        label, strong, kind: 'hour',
        cells: [null, ...centerVals, ...tail]
    });

    const rows = [
        moneyRow('Salarios', salGen, salC, salC.reduce((a, b) => a + b, 0), 0, 0, salGen + salC.reduce((a, b) => a + b, 0)),
        moneyRow('Prestaciones', prestGen, prestC, prestC.reduce((a, b) => a + b, 0), 0, 0, prestGen + prestC.reduce((a, b) => a + b, 0)),
        moneyRow('Aportes', 0, zeros(), 0, 0, 0, 0),
        moneyRow('Gastos varios', 0, variosC, variosC.reduce((a, b) => a + b, 0), 0, 0, variosC.reduce((a, b) => a + b, 0)),
        moneyRow('Subtotal mano de obra', moGen, moC, moSub, 0, 0, moGen + moSub, true),
        moneyRow('Otros C.I.F.', cif, zeros(), 0, 0, 0, cif),
        moneyRow('Subtotal C.I.F.', cif, zeros(), 0, 0, 0, cif, true),
        moneyRow('Otros gastos', otrosContratos, zeros(), 0, admin, finan, otrosContratos + admin + finan),
        moneyRow('Costos primarios', primaryGen, primaryC, primarySub, admin, finan, primaryGrand, true),
        {
            label: 'Horas productivas',
            kind: 'hours',
            cells: [null, ...hours, null, null, null, null]
        },
        hourRow('Costos primarios / hora', pph, [primarySub, null, null, null]),
        hourRow(`Prorrateo gastos generales (${pct0(gg)})`, ggHour, [primaryGen, null, null, null]),
        hourRow('Costo total / hora', totalHour, [operational, null, null, null], true),
        hourRow(`Prorrateo administración (${pct0(adminFactor)})`, adminHour, [null, admin, null, null]),
        hourRow('Costo + administración / hora', plusAdmin, [null, null, null, operational + admin]),
        hourRow(`Costo financiero / hora (${pct0(finFactor)})`, finHour, [null, null, finan, null]),
        hourRow('Costo hora ideal', ideal, [null, null, null, primaryGrand], true),
        {
            label: 'Utilización',
            kind: 'pct',
            cells: [null, ...centers.map(() => util), null, null, null, null]
        },
        hourRow('Costo hora real', real, emptyHours().slice(0, 4), true),
        hourRow('Costo total / hora centro', totalHoraCentro, emptyHours().slice(0, 4), true),
        {
            label: 'Costo mes (hora real × horas)',
            strong: true,
            kind: 'money',
            cells: [null, ...month, month.reduce((a, b) => a + b, 0), null, null, month.reduce((a, b) => a + b, 0)]
        }
    ];

    return {
        costoTotal: primaryGrand,
        hourCenters: centers.map((c, i) => ({
            name: c.name || c.code,
            hours: hours[i],
            totalHour: totalHour[i],
            totalHoraCentro: totalHoraCentro[i],
            real: real[i],
            month: month[i]
        })),
        headers: [
            { title: 'Gastos generales', hint: 'Fabricación' },
            ...centers.map((c) => ({ title: c.name || c.code, hint: MACHINE_HINT[(c.code || '').toUpperCase()] || '' })),
            { title: 'Subtotal', hint: 'Centros' },
            { title: 'Administración', hint: '' },
            { title: 'Financieros', hint: '' },
            { title: 'Gran total', hint: '' }
        ],
        rows
    };
}

function MapTable({ headers, rows }) {
    const showCell = (row, value) => {
        if (value == null || value === '') return '';
        if (row.kind === 'pct') return pct0(value);
        if (row.kind === 'hours') return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);
        return money(value);
    };

    return (
        <div className="mapa-scroll">
            <Table striped withTableBorder className="mapa-table">
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Concepto</Table.Th>
                        {headers.map((h, idx) => (
                            <Table.Th key={`${h.title}-${idx}`}>
                                <Text size="sm" fw={700}>{h.title}</Text>
                                {h.hint && <Text size="xs" c="dimmed">{h.hint}</Text>}
                            </Table.Th>
                        ))}
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.map((row) => (
                        <Table.Tr key={row.label}>
                            <Table.Td><Text size="sm" fw={row.strong ? 700 : 400}>{row.label}</Text></Table.Td>
                            {row.cells.map((value, idx) => (
                                <Table.Td key={`${row.label}-${idx}`}>
                                    <Text size="sm" fw={row.strong || idx === row.cells.length - 1 ? 700 : 400}>{showCell(row, value)}</Text>
                                </Table.Td>
                            ))}
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </div>
    );
}

export default function MapaCostosPanel({ draft, setDraft, summary, canEdit }) {
    const centers = draft.costCenters || [];

    const updateCenter = (idx, patch) => {
        setDraft((prev) => {
            const next = [...prev.costCenters];
            next[idx] = { ...next[idx], ...patch };
            return { ...prev, costCenters: next };
        });
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

    const map = buildLocalization(draft, summary);

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

            <Table striped withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Código</Table.Th>
                        <Table.Th>Centro</Table.Th>
                        <Table.Th>Horas productivas</Table.Th>
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
                            <Table.Td colSpan={5}>
                                <Text c="dimmed" ta="center" py="md">Sin centros. Agrega los que uses (Corte, Impresión, etc.).</Text>
                            </Table.Td>
                        </Table.Tr>
                    )}
                </Table.Tbody>
            </Table>

            <Card className="presupuestos-kpi" padding="lg">
                <Text className="presupuestos-kpi-label">Costo total</Text>
                <Title order={2}>{money(map.costoTotal)}</Title>
            </Card>

            <div>
                <Title order={5}>Costo total por hora</Title>
                <Text size="sm" c="dimmed" mb="sm">
                    Cada centro con sus horas, el costo total de la hora y la hora real.
                </Text>
                <Table striped withTableBorder>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Centro</Table.Th>
                            <Table.Th>Horas</Table.Th>
                            <Table.Th>Costo total / hora centro</Table.Th>
                            <Table.Th>Hora real</Table.Th>
                            <Table.Th>Costo del mes</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {map.hourCenters.map((c) => (
                            <Table.Tr key={c.name}>
                                <Table.Td>{c.name}</Table.Td>
                                <Table.Td>{new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(c.hours)}</Table.Td>
                                <Table.Td><Text fw={700}>{money(c.totalHoraCentro)}</Text></Table.Td>
                                <Table.Td>{money(c.real)}</Table.Td>
                                <Table.Td>{money(c.month)}</Table.Td>
                            </Table.Tr>
                        ))}
                        <Table.Tr>
                            <Table.Td colSpan={4}><Text fw={700}>Costo total del mes</Text></Table.Td>
                            <Table.Td><Text fw={700}>{money(map.hourCenters.reduce((s, c) => s + c.month, 0))}</Text></Table.Td>
                        </Table.Tr>
                    </Table.Tbody>
                </Table>
            </div>

            <div>
                <Title order={5}>Localización de costos</Title>
                <Text size="sm" c="dimmed" mb="sm">
                    Montos por centro. La última columna, gran total, permanece visible al desplazar.
                </Text>
                <MapTable headers={map.headers} rows={map.rows.slice(0, 9)} />
            </div>

            <div>
                <Title order={5}>Costo por hora</Title>
                <MapTable headers={map.headers} rows={map.rows.slice(9)} />
            </div>

            <Title order={5}>Valor comercial de máquinas</Title>
            <Text size="sm" c="dimmed">Cifras de la hoja, en miles.</Text>
            <Table striped withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Máquina</Table.Th>
                        <Table.Th>Nombre</Table.Th>
                        <Table.Th>Valor</Table.Th>
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {MACHINE_VALUES.map(([code, name, value]) => (
                        <Table.Tr key={code}>
                            <Table.Td>{code}</Table.Td>
                            <Table.Td>{name}</Table.Td>
                            <Table.Td>{money(value)}</Table.Td>
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
        </Stack>
    );
}
