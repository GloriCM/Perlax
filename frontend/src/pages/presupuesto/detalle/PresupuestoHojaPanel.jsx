import { Fragment } from 'react';
import { Accordion, Button, Group, NumberInput, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { money, numberProps } from './elliotFormat';
import { normalizeLayout } from './budgetLayout';

const RATES = {
    cesantiaPrima: 0.0833,
    interesCesantia: 0.12,
    vacaciones: 0.0416,
    arl: 0.025,
    salud: 0.085,
    pension: 0.12,
    caja: 0.04,
    cooperativa: 0.52
};

const ADMIN_GROUPS = [
    'Honorarios', 'Impuestos', 'Arrendamientos', 'Contribuciones', 'ServiciosAdmin',
    'GastosLegales', 'MantenimientoAdmin', 'Adecuacion', 'ViajesAdmin',
    'DepreciacionAdmin', 'Diferidos', 'DiversosAdmin'
];
const SALES_GROUPS = ['ArrendamientosVentas', 'ServiciosVentas', 'ViajesVentas', 'DiversosVentas'];

function round2(n) {
    return Math.round((Number(n) || 0) * 100) / 100;
}

function sumGroup(items, group) {
    return round2((items || []).filter((i) => i.group === group).reduce((s, i) => s + (Number(i.amount) || 0), 0));
}

function rowsOf(items, group) {
    return (items || [])
        .map((item, idx) => ({ ...item, _idx: idx }))
        .filter((i) => i.group === group)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

function payrollBlock(people, section, auxilios) {
    const list = (people || []).filter((p) => p.section === section);
    const salary = round2(list.reduce((s, p) => s + (Number(p.salary) || 0), 0));
    const transport = round2(list.reduce((s, p) => s + (Number(p.transportSubsidy) || 0), 0));
    const cesantia = round2((salary + transport) * RATES.cesantiaPrima);
    const interesCesantia = round2(cesantia * RATES.interesCesantia);
    const prima = round2((salary + transport) * RATES.cesantiaPrima);
    const vacaciones = round2(salary * RATES.vacaciones);
    const arl = round2(salary * RATES.arl);
    const salud = round2(salary * RATES.salud);
    const pension = round2(salary * RATES.pension);
    const caja = round2((salary + vacaciones) * RATES.caja);
    const prestaciones = round2(cesantia + interesCesantia + prima + vacaciones + arl + salud + pension + caja);
    const aux = round2(auxilios);
    return {
        salary, transport, cesantia, interesCesantia, prima, vacaciones,
        arl, salud, pension, caja, prestaciones, auxilios: aux,
        total: round2(salary + transport + prestaciones + aux)
    };
}

function sectionWithKey(layout, key) {
    return (layout?.fixed || []).find((s) => (s.subgroups || []).some((g) => g.key === key));
}

function subgroupTitle(layout, key, fallback) {
    const section = sectionWithKey(layout, key);
    return section?.subgroups?.find((g) => g.key === key)?.title || fallback;
}

function RubroTable({ title, rows, canEdit, onChange, onAdd, onRemove }) {
    const subtotal = round2(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0));
    return (
        <Stack gap="sm">
            <Group justify="space-between">
                <Text fw={600}>{title}</Text>
                {canEdit && (
                    <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={onAdd}>
                        Agregar línea
                    </Button>
                )}
            </Group>
            <Table striped withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Concepto</Table.Th>
                        <Table.Th>Valor</Table.Th>
                        {canEdit && <Table.Th />}
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.map((row) => (
                        <Table.Tr key={row._idx}>
                            <Table.Td>
                                {canEdit ? (
                                    <TextInput
                                        value={row.concept || ''}
                                        onChange={(e) => onChange(row._idx, { concept: e.currentTarget.value })}
                                    />
                                ) : row.concept}
                            </Table.Td>
                            <Table.Td>
                                {canEdit ? (
                                    <NumberInput
                                        {...numberProps}
                                        value={row.amount}
                                        onChange={(v) => onChange(row._idx, { amount: Number(v) || 0 })}
                                    />
                                ) : money(row.amount)}
                            </Table.Td>
                            {canEdit && (
                                <Table.Td>
                                    <Button size="compact-xs" color="red" variant="subtle" onClick={() => onRemove(row._idx)}>
                                        <IconTrash size={14} />
                                    </Button>
                                </Table.Td>
                            )}
                        </Table.Tr>
                    ))}
                    {rows.length === 0 && (
                        <Table.Tr>
                            <Table.Td colSpan={canEdit ? 3 : 2}>
                                <Text c="dimmed" ta="center" py="sm">Sin líneas.</Text>
                            </Table.Td>
                        </Table.Tr>
                    )}
                </Table.Tbody>
            </Table>
            <Text size="sm" c="dimmed">Subtotal: {money(subtotal)}</Text>
        </Stack>
    );
}

function isAtencion(concept) {
    const text = (concept || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return text.includes('atencion') && text.includes('recreacion');
}

function PersonalTable({ title, block, items, canEdit, onChange, onAdd, onRemove }) {
    const before = [
        ['Sueldos', block.salary],
        ['Subsidio transporte', block.transport],
        ['Cesantía', block.cesantia],
        ['Interés s/cesantía', block.interesCesantia],
        ['Prima', block.prima],
        ['Vacaciones', block.vacaciones]
    ];
    const after = [
        ['A.R.P.', block.arl],
        ['Aportes salud', block.salud],
        ['Aportes pensión', block.pension],
        ['Caja compensación', block.caja]
    ];
    const resto = (items || []).filter((row) => !isAtencion(row.concept));
    const hasAuxilio = resto.some((row) => {
        const text = (row.concept || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
        return text.includes('auxilio');
    });
    const ordered = [...(items || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    const editableRow = (row) => (
        <Table.Tr key={row._idx}>
            <Table.Td>
                {canEdit ? (
                    <TextInput value={row.concept || ''} onChange={(e) => onChange(row._idx, { concept: e.currentTarget.value })} />
                ) : row.concept}
            </Table.Td>
            <Table.Td>
                {canEdit ? (
                    <NumberInput {...numberProps} value={row.amount} onChange={(v) => onChange(row._idx, { amount: Number(v) || 0 })} />
                ) : money(row.amount)}
            </Table.Td>
            {canEdit && (
                <Table.Td>
                    <Button size="compact-xs" color="red" variant="subtle" onClick={() => onRemove(row._idx)}>
                        <IconTrash size={14} />
                    </Button>
                </Table.Td>
            )}
        </Table.Tr>
    );

    return (
        <Stack gap="xs">
            <Group justify="space-between">
                <Text fw={600}>{title}</Text>
                {canEdit && (
                    <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={onAdd}>
                        Agregar línea
                    </Button>
                )}
            </Group>
            <Text size="xs" c="dimmed">
                Cesantía, prima, salud y pensión salen de los sueldos en Costos fijos. Auxilios, atención y recreación y el resto van en esta misma tabla.
            </Text>
            <Table striped withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Concepto</Table.Th>
                        <Table.Th>Valor</Table.Th>
                        {canEdit && <Table.Th />}
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {before.map(([label, amount]) => (
                        <Table.Tr key={label}>
                            <Table.Td>{label}</Table.Td>
                            <Table.Td>{money(amount)}</Table.Td>
                            {canEdit && <Table.Td />}
                        </Table.Tr>
                    ))}
                    {ordered.map((row, index) => (
                        <Fragment key={row._idx}>
                            {index === ordered.findIndex((r) => isAtencion(r.concept)) && !hasAuxilio && (
                                <Table.Tr>
                                    <Table.Td>Auxilios</Table.Td>
                                    <Table.Td>{money(0)}</Table.Td>
                                    {canEdit && <Table.Td />}
                                </Table.Tr>
                            )}
                            {editableRow(row)}
                        </Fragment>
                    ))}
                    {ordered.length === 0 && (
                        <Table.Tr>
                            <Table.Td>Auxilios</Table.Td>
                            <Table.Td>{money(0)}</Table.Td>
                            {canEdit && <Table.Td />}
                        </Table.Tr>
                    )}
                    {after.map(([label, amount]) => (
                        <Table.Tr key={label}>
                            <Table.Td>{label}</Table.Td>
                            <Table.Td>{money(amount)}</Table.Td>
                            {canEdit && <Table.Td />}
                        </Table.Tr>
                    ))}
                    <Table.Tr>
                        <Table.Td><Text fw={700}>Total {title.toLowerCase()}</Text></Table.Td>
                        <Table.Td><Text fw={700}>{money(block.total)}</Text></Table.Td>
                        {canEdit && <Table.Td />}
                    </Table.Tr>
                </Table.Tbody>
            </Table>
        </Stack>
    );
}

function AccordionLabel({ title, amount }) {
    return (
        <Group justify="space-between" wrap="nowrap" pr="sm">
            <Text fw={600}>{title}</Text>
            <Text fw={600}>{money(amount)}</Text>
        </Group>
    );
}

export default function PresupuestoHojaPanel({ draft, setDraft, canEdit, company, year }) {
    const incomes = draft.incomes || [];
    const people = draft.people || [];
    const fixedItems = draft.fixedItems || [];
    const layout = normalizeLayout(draft.layout);

    const totalIncome = round2(incomes.reduce((s, r) => s + (Number(r.amount) || 0), 0));
    const materialLines = incomes.map((row, idx) => ({
        idx,
        name: row.name || row.code || 'Ingreso',
        pct: Number(row.materialPct) || 0,
        amount: round2((Number(row.amount) || 0) * (Number(row.materialPct) || 0))
    }));
    const materialCost = round2(materialLines.reduce((s, r) => s + r.amount, 0));
    const grossProfit = round2(totalIncome - materialCost);

    const adminPayroll = payrollBlock(people, 'Admin', sumGroup(fixedItems, 'AuxiliosAdmin'));
    const salesPayroll = payrollBlock(people, 'Sales', sumGroup(fixedItems, 'AuxiliosVentas'));
    const productionPayroll = payrollBlock(people, 'Production', sumGroup(fixedItems, 'AuxiliosProduccion'));

    const coopPeople = people.filter((p) => p.section === 'Cooperative');
    const coopSalary = round2(coopPeople.reduce((s, p) => s + (Number(p.salary) || 0), 0));
    const coopTransport = round2(coopPeople.reduce((s, p) => s + (Number(p.transportSubsidy) || 0), 0));
    const coopPrestaciones = round2(coopSalary * RATES.cooperativa);
    const coopTotal = round2(coopSalary + coopTransport + coopPrestaciones + sumGroup(fixedItems, 'AdmonCooperativa'));

    const groupsTotal = (keys) => round2(keys.reduce((s, key) => s + sumGroup(fixedItems, key), 0));
    const adminGroupsTotal = groupsTotal(ADMIN_GROUPS);
    const totalAdmin = round2(adminPayroll.total + adminGroupsTotal);
    const totalSales = round2(salesPayroll.total + groupsTotal(SALES_GROUPS));
    const financial = sumGroup(fixedItems, 'Financieros');
    const INDIRECT_KEYS = ['CostosIndirectos', 'MantenimientoMaquinas', 'FletesIndirectos', 'DepreciacionIndirecta', 'ServiciosIndirectos', 'DiversosIndirectos'];
    const indirect = round2(INDIRECT_KEYS.reduce((s, key) => s + sumGroup(fixedItems, key), 0));
    const contratos = sumGroup(fixedItems, 'ContratosServicios');
    const directLabor = round2(productionPayroll.total + coopTotal);
    const productionCost = round2(materialCost + directLabor + indirect + contratos);
    const totalExpenses = round2(totalAdmin + totalSales + financial);
    const utility = round2(totalIncome - productionCost - totalExpenses);

    const patchIncome = (idx, patch) => {
        setDraft((prev) => {
            const next = [...(prev.incomes || [])];
            next[idx] = { ...next[idx], ...patch };
            return { ...prev, incomes: next };
        });
    };

    const addIncome = () => {
        setDraft((prev) => ({
            ...prev,
            incomes: [
                ...(prev.incomes || []),
                { code: '', name: '', amount: 0, materialPct: 0.45, sortOrder: (prev.incomes || []).length + 1 }
            ]
        }), { immediate: true });
    };

    const removeIncome = (idx) => {
        setDraft((prev) => ({
            ...prev,
            incomes: (prev.incomes || []).filter((_, i) => i !== idx)
        }), { immediate: true });
    };

    const patchItem = (idx, patch) => {
        setDraft((prev) => {
            const next = [...(prev.fixedItems || [])];
            next[idx] = { ...next[idx], ...patch };
            return { ...prev, fixedItems: next };
        });
    };

    const addItem = (group) => {
        setDraft((prev) => ({
            ...prev,
            fixedItems: [
                ...(prev.fixedItems || []),
                { group, concept: '', amount: 0, sortOrder: (prev.fixedItems || []).length + 1 }
            ]
        }), { immediate: true });
    };

    const removeItem = (idx) => {
        setDraft((prev) => ({
            ...prev,
            fixedItems: (prev.fixedItems || []).filter((_, i) => i !== idx)
        }), { immediate: true });
    };

    const rubro = (key, fallback) => (
        <RubroTable
            key={key}
            title={subgroupTitle(layout, key, fallback)}
            rows={rowsOf(fixedItems, key)}
            canEdit={canEdit}
            onChange={patchItem}
            onAdd={() => addItem(key)}
            onRemove={removeItem}
        />
    );

    const recap = [
        ['Ingresos', totalIncome, false],
        ['Costo materia prima', materialCost, false],
        ['Costo mano de obra', directLabor, false],
        ['Costos indirectos', indirect, false],
        ['Contratos servicios', contratos, false],
        ['Costo producción', productionCost, true],
        ['Gastos administrativos', totalAdmin, false],
        ['Gastos de ventas', totalSales, false],
        ['Gastos financieros', financial, false],
        ['Total gastos', totalExpenses, true],
        ['Utilidad', utility, true]
    ];

    const indirectKeys = INDIRECT_KEYS.filter((key) => rowsOf(fixedItems, key).length > 0);

    return (
        <Stack gap="lg">
            <div>
                <Title order={4}>Presupuesto</Title>
                <Text size="sm" c="dimmed">
                    {company || 'Empresa'}{year ? ` · ${year}` : ''}. Ingresos y rubros de esta hoja se editan aquí. La nómina de personas está en Costos fijos.
                </Text>
            </div>

            <Accordion multiple defaultValue={['ingresos', 'mp', 'admin', 'ventas', 'fin', 'prod', 'cierre']}>
                <Accordion.Item value="ingresos">
                    <Accordion.Control>
                        <AccordionLabel title="Ingresos" amount={totalIncome} />
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Stack gap="sm">
                            <Group justify="flex-end">
                                {canEdit && (
                                    <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={addIncome}>
                                        Agregar línea
                                    </Button>
                                )}
                            </Group>
                            <Table striped withTableBorder>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Nombre</Table.Th>
                                        <Table.Th>Monto</Table.Th>
                                        <Table.Th>Materia prima</Table.Th>
                                        {canEdit && <Table.Th />}
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {incomes.map((row, idx) => (
                                        <Table.Tr key={row.id || idx}>
                                            <Table.Td>
                                                {canEdit ? (
                                                    <TextInput
                                                        value={row.name || ''}
                                                        onChange={(e) => patchIncome(idx, { name: e.currentTarget.value })}
                                                    />
                                                ) : (row.name || row.code)}
                                            </Table.Td>
                                            <Table.Td>
                                                {canEdit ? (
                                                    <NumberInput
                                                        {...numberProps}
                                                        value={row.amount}
                                                        onChange={(v) => patchIncome(idx, { amount: Number(v) || 0 })}
                                                    />
                                                ) : money(row.amount)}
                                            </Table.Td>
                                            <Table.Td>
                                                {canEdit ? (
                                                    <NumberInput
                                                        min={0}
                                                        max={1}
                                                        step={0.01}
                                                        decimalScale={4}
                                                        hideControls
                                                        value={row.materialPct}
                                                        onChange={(v) => patchIncome(idx, { materialPct: Number(v) || 0 })}
                                                    />
                                                ) : row.materialPct}
                                            </Table.Td>
                                            {canEdit && (
                                                <Table.Td>
                                                    <Button size="compact-xs" color="red" variant="subtle" onClick={() => removeIncome(idx)}>
                                                        <IconTrash size={14} />
                                                    </Button>
                                                </Table.Td>
                                            )}
                                        </Table.Tr>
                                    ))}
                                    {incomes.length === 0 && (
                                        <Table.Tr>
                                            <Table.Td colSpan={canEdit ? 4 : 3}>
                                                <Text c="dimmed" ta="center" py="sm">Sin líneas de ingreso.</Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                            <Text size="xs" c="dimmed">Materia prima: 0,45 equivale a 45 % de esa venta.</Text>
                        </Stack>
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="mp">
                    <Accordion.Control>
                        <AccordionLabel title="Costo de materia prima" amount={materialCost} />
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Table striped withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>División</Table.Th>
                                    <Table.Th>Monto</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {materialLines.filter((r) => r.amount !== 0).map((row) => (
                                    <Table.Tr key={row.idx}>
                                        <Table.Td>{row.name}</Table.Td>
                                        <Table.Td>{money(row.amount)}</Table.Td>
                                    </Table.Tr>
                                ))}
                                <Table.Tr>
                                    <Table.Td><Text fw={700}>Costo de materia prima</Text></Table.Td>
                                    <Table.Td><Text fw={700}>{money(materialCost)}</Text></Table.Td>
                                </Table.Tr>
                                <Table.Tr>
                                    <Table.Td><Text fw={700}>Utilidad bruta</Text></Table.Td>
                                    <Table.Td><Text fw={700}>{money(grossProfit)}</Text></Table.Td>
                                </Table.Tr>
                            </Table.Tbody>
                        </Table>
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="admin">
                    <Accordion.Control>
                        <AccordionLabel title="Gastos administrativos" amount={totalAdmin} />
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Stack gap="lg">
                            <PersonalTable
                                title="Gastos de personal"
                                block={adminPayroll}
                                items={rowsOf(fixedItems, 'AuxiliosAdmin')}
                                canEdit={canEdit}
                                onChange={patchItem}
                                onAdd={() => addItem('AuxiliosAdmin')}
                                onRemove={removeItem}
                            />
                            {ADMIN_GROUPS.map((key) => rubro(key, key))}
                            <Text fw={700}>Total gastos administrativos: {money(totalAdmin)}</Text>
                        </Stack>
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="ventas">
                    <Accordion.Control>
                        <AccordionLabel title="Gastos de ventas" amount={totalSales} />
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Stack gap="lg">
                            <PersonalTable
                                title="Gastos de personal"
                                block={salesPayroll}
                                items={rowsOf(fixedItems, 'AuxiliosVentas')}
                                canEdit={canEdit}
                                onChange={patchItem}
                                onAdd={() => addItem('AuxiliosVentas')}
                                onRemove={removeItem}
                            />
                            {SALES_GROUPS.map((key) => rubro(key, key))}
                            <Text fw={700}>Total gastos de ventas: {money(totalSales)}</Text>
                        </Stack>
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="fin">
                    <Accordion.Control>
                        <AccordionLabel title="Gastos financieros" amount={financial} />
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Stack gap="lg">
                            {rubro('Financieros', 'Gastos financieros')}
                            <Text fw={700}>Total gastos financieros: {money(financial)}</Text>
                        </Stack>
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="prod">
                    <Accordion.Control>
                        <AccordionLabel title="Costos de producción" amount={productionCost} />
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Stack gap="lg">
                            <PersonalTable
                                title="Mano de obra directa"
                                block={productionPayroll}
                                items={rowsOf(fixedItems, 'AuxiliosProduccion')}
                                canEdit={canEdit}
                                onChange={patchItem}
                                onAdd={() => addItem('AuxiliosProduccion')}
                                onRemove={removeItem}
                            />
                            {coopTotal > 0 && (
                                <Text size="sm">Cooperativa incluida en la mano de obra: {money(coopTotal)}</Text>
                            )}
                            {indirectKeys.map((key) => rubro(key, subgroupTitle(layout, key, key)))}
                            {rubro('ContratosServicios', 'Contratos de servicios')}
                            <Text size="sm">Mano de obra directa: {money(directLabor)}</Text>
                            <Text size="sm">Costos indirectos: {money(indirect)}</Text>
                            <Text size="sm">Contratos de servicios: {money(contratos)}</Text>
                            <Text fw={700}>Costo de producción (con materia prima): {money(productionCost)}</Text>
                        </Stack>
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="cierre">
                    <Accordion.Control>
                        <AccordionLabel title="Estado de resultados" amount={utility} />
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Table striped withTableBorder>
                            <Table.Thead>
                                <Table.Tr>
                                    <Table.Th>Concepto</Table.Th>
                                    <Table.Th>Monto</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {recap.map(([label, amount, strong]) => (
                                    <Table.Tr key={label}>
                                        <Table.Td><Text fw={strong ? 700 : 400}>{label}</Text></Table.Td>
                                        <Table.Td><Text fw={strong ? 700 : 400}>{money(amount)}</Text></Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                        </Table>
                    </Accordion.Panel>
                </Accordion.Item>
            </Accordion>
        </Stack>
    );
}
