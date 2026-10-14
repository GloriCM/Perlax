import { Accordion, Button, Group, NumberInput, Stack, Table, Text, TextInput, Title } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { money, numberProps } from './elliotFormat';

const INDIRECT_BUCKETS = [
    { id: 'mant', title: 'Mantenimiento maquinaria', group: 'MantenimientoMaquinas' },
    { id: 'fletes', title: 'Fletes', group: 'FletesIndirectos' },
    { id: 'depre', title: 'Depreciación', group: 'DepreciacionIndirecta' },
    { id: 'serv', title: 'Servicios', group: 'ServiciosIndirectos' },
    { id: 'div', title: 'Diversos', group: 'DiversosIndirectos' }
];

function plain(value) {
    return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function bucketId(item) {
    const known = INDIRECT_BUCKETS.find((b) => b.group === item.group);
    if (known) return known.id;
    if (item.group !== 'CostosIndirectos') return null;
    const text = plain(item.concept);
    if (text.includes('flete')) return 'fletes';
    if (text.includes('depreci')) return 'depre';
    if (text.includes('energia') || text.includes('agua') || text.includes('emsirva')) return 'serv';
    if (text.includes('montacargas') && !text.includes('servicio')) return 'mant';
    if (
        text.includes('cafeteria')
        || text.includes('aseo')
        || text.includes('combustible')
        || text.includes('disolvente')
        || text.includes('droga')
        || text.includes('peaje')
        || text.includes('servicio montacarga')
        || text.includes('compra gas')
        || text.includes('taxi')
        || text === 'otros'
    ) return 'div';
    return 'mant';
}

function rowsOf(items, group) {
    return (items || [])
        .map((item, idx) => ({ ...item, _idx: idx }))
        .filter((item) => item.group === group)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

function peopleOf(people, section) {
    return (people || [])
        .map((person, idx) => ({ ...person, _idx: idx }))
        .filter((person) => person.section === section)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
}

function splitProduction(rows) {
    const firstCenter = rows.findIndex((person) => person.costCenterCode);
    if (firstCenter <= 0) return { staff: rows, plant: [] };
    return { staff: rows.slice(0, firstCenter), plant: rows.slice(firstCenter) };
}

function sumAmount(rows) {
    return rows.reduce((s, row) => s + (Number(row.amount) || 0), 0);
}

function LineTable({ title, rows, canEdit, onChange, onAdd, onRemove, amountLabel = 'Valor' }) {
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
                        <Table.Th>{amountLabel}</Table.Th>
                        {canEdit && <Table.Th />}
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {rows.map((row) => (
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
                    ))}
                    {rows.length === 0 && (
                        <Table.Tr>
                            <Table.Td colSpan={canEdit ? 3 : 2}>
                                <Text c="dimmed" ta="center" py="sm">Sin líneas.</Text>
                            </Table.Td>
                        </Table.Tr>
                    )}
                    <Table.Tr>
                        <Table.Td><Text fw={700}>Total {title.toLowerCase()}</Text></Table.Td>
                        <Table.Td><Text fw={700}>{money(sumAmount(rows))}</Text></Table.Td>
                        {canEdit && <Table.Td />}
                    </Table.Tr>
                </Table.Tbody>
            </Table>
        </Stack>
    );
}

function PeopleRows({ rows, canEdit, transportLabel, onChange, onRemove }) {
    const sueldo = rows.reduce((s, person) => s + (Number(person.salary) || 0), 0);
    const transporte = rows.reduce((s, person) => s + (Number(person.transportSubsidy) || 0), 0);
    return (
        <>
            {rows.map((person) => {
                const total = (Number(person.salary) || 0) + (Number(person.transportSubsidy) || 0);
                return (
                    <Table.Tr key={person._idx}>
                        <Table.Td>
                            {canEdit ? (
                                <TextInput value={person.name || ''} onChange={(e) => onChange(person._idx, { name: e.currentTarget.value })} />
                            ) : person.name}
                        </Table.Td>
                        <Table.Td>
                            {canEdit ? (
                                <TextInput value={person.role || ''} onChange={(e) => onChange(person._idx, { role: e.currentTarget.value })} />
                            ) : person.role}
                        </Table.Td>
                        <Table.Td>
                            {canEdit ? (
                                <NumberInput {...numberProps} value={person.salary} onChange={(v) => onChange(person._idx, { salary: Number(v) || 0 })} />
                            ) : money(person.salary)}
                        </Table.Td>
                        <Table.Td>
                            {canEdit ? (
                                <NumberInput {...numberProps} value={person.transportSubsidy} onChange={(v) => onChange(person._idx, { transportSubsidy: Number(v) || 0 })} />
                            ) : money(person.transportSubsidy)}
                        </Table.Td>
                        <Table.Td>{money(total)}</Table.Td>
                        {canEdit && (
                            <Table.Td>
                                <Button size="compact-xs" color="red" variant="subtle" onClick={() => onRemove(person._idx)}>
                                    <IconTrash size={14} />
                                </Button>
                            </Table.Td>
                        )}
                    </Table.Tr>
                );
            })}
            <Table.Tr>
                <Table.Td colSpan={2}><Text fw={700}>Subtotal</Text></Table.Td>
                <Table.Td><Text fw={700}>{money(sueldo)}</Text></Table.Td>
                <Table.Td><Text fw={700}>{money(transporte)}</Text></Table.Td>
                <Table.Td><Text fw={700}>{money(sueldo + transporte)}</Text></Table.Td>
                {canEdit && <Table.Td />}
            </Table.Tr>
        </>
    );
}

function PeopleTable({ title, rows, groups, canEdit, transportLabel, onChange, onAdd, onRemove }) {
    const blocks = groups || [{ rows }];
    return (
        <Stack gap="sm">
            <Group justify="space-between">
                <Text fw={600}>{title}</Text>
                {canEdit && (
                    <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={onAdd}>
                        Agregar persona
                    </Button>
                )}
            </Group>
            <Table striped withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Nombre</Table.Th>
                        <Table.Th>Cargo</Table.Th>
                        <Table.Th>Sueldo</Table.Th>
                        <Table.Th>{transportLabel}</Table.Th>
                        <Table.Th>Total</Table.Th>
                        {canEdit && <Table.Th />}
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {blocks.map((block) => (
                        <PeopleRows
                            key={block.key || 'all'}
                            rows={block.rows}
                            canEdit={canEdit}
                            transportLabel={transportLabel}
                            onChange={onChange}
                            onRemove={onRemove}
                        />
                    ))}
                    {rows.length === 0 && (
                        <Table.Tr>
                            <Table.Td colSpan={canEdit ? 6 : 5}>
                                <Text c="dimmed" ta="center" py="sm">Sin personas.</Text>
                            </Table.Td>
                        </Table.Tr>
                    )}
                </Table.Tbody>
            </Table>
        </Stack>
    );
}

function AccordionLabel({ title, amount }) {
    return (
        <Group justify="space-between" wrap="nowrap" pr="sm">
            <Text fw={600}>{title}</Text>
            {amount != null && <Text fw={600}>{money(amount)}</Text>}
        </Group>
    );
}

export default function CostosFijosPanel({ draft, setDraft, canEdit }) {
    const people = draft.people || [];
    const fixedItems = draft.fixedItems || [];
    const adminPeople = peopleOf(people, 'Admin');
    const salesPeople = peopleOf(people, 'Sales');
    const productionPeople = peopleOf(people, 'Production');
    const productionSplit = splitProduction(productionPeople);

    const indirectRows = (fixedItems || [])
        .map((item, idx) => ({ ...item, _idx: idx }))
        .filter((item) => bucketId(item));
    const indirectTotal = sumAmount(indirectRows);
    const honorarios = rowsOf(fixedItems, 'Honorarios');
    const arrendamientosVentas = rowsOf(fixedItems, 'ArrendamientosVentas');
    const contratos = rowsOf(fixedItems, 'ContratosServicios');

    const patchPerson = (idx, patch) => {
        setDraft((prev) => {
            const next = [...(prev.people || [])];
            next[idx] = { ...next[idx], ...patch };
            return { ...prev, people: next };
        });
    };

    const addPerson = (section) => {
        setDraft((prev) => ({
            ...prev,
            people: [
                ...(prev.people || []),
                {
                    section,
                    name: '',
                    role: '',
                    salary: 0,
                    transportSubsidy: 0,
                    costCenterCode: section === 'Production' ? '' : null,
                    sortOrder: (prev.people || []).length + 1
                }
            ]
        }), { immediate: true });
    };

    const removePerson = (idx) => {
        setDraft((prev) => ({
            ...prev,
            people: (prev.people || []).filter((_, i) => i !== idx)
        }), { immediate: true });
    };

    const patchItem = (idx, patch) => {
        setDraft((prev) => {
            const next = [...(prev.fixedItems || [])];
            next[idx] = { ...next[idx], ...patch };
            return { ...prev, fixedItems: next };
        });
    };

    const addItem = (group, concept = '') => {
        setDraft((prev) => ({
            ...prev,
            fixedItems: [
                ...(prev.fixedItems || []),
                { group, concept, amount: 0, sortOrder: (prev.fixedItems || []).length + 1 }
            ]
        }), { immediate: true });
    };

    const removeItem = (idx) => {
        setDraft((prev) => ({
            ...prev,
            fixedItems: (prev.fixedItems || []).filter((_, i) => i !== idx)
        }), { immediate: true });
    };

    const adminPay = adminPeople.reduce((s, person) => s + (Number(person.salary) || 0) + (Number(person.transportSubsidy) || 0), 0);
    const salesPay = salesPeople.reduce((s, person) => s + (Number(person.salary) || 0) + (Number(person.transportSubsidy) || 0), 0);
    const productionPay = productionPeople.reduce((s, person) => s + (Number(person.salary) || 0) + (Number(person.transportSubsidy) || 0), 0);

    return (
        <Stack gap="lg">
            <div>
                <Title order={4}>Costos fijos</Title>
                <Text size="sm" c="dimmed">
                    Nómina, honorarios, mano de obra, costos indirectos y servicios. Los ingresos y el estado de resultados están en Presupuesto.
                </Text>
            </div>

            <Accordion multiple defaultValue={['admon', 'ventas', 'mod', 'indirectos', 'servicios']}>
                <Accordion.Item value="admon">
                    <Accordion.Control>
                        <AccordionLabel title="Gastos de administración" amount={adminPay + sumAmount(honorarios)} />
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Stack gap="lg">
                            <PeopleTable
                                title="Sueldos"
                                rows={adminPeople}
                                canEdit={canEdit}
                                transportLabel="Subsidio transporte"
                                onChange={patchPerson}
                                onAdd={() => addPerson('Admin')}
                                onRemove={removePerson}
                            />
                            <LineTable
                                title="Honorarios"
                                rows={honorarios}
                                canEdit={canEdit}
                                onChange={patchItem}
                                onAdd={() => addItem('Honorarios')}
                                onRemove={removeItem}
                            />
                        </Stack>
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="ventas">
                    <Accordion.Control>
                        <AccordionLabel title="Gastos de ventas" amount={salesPay + sumAmount(arrendamientosVentas)} />
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Stack gap="lg">
                            <PeopleTable
                                title="Sueldos"
                                rows={salesPeople}
                                canEdit={canEdit}
                                transportLabel="Subsidio transporte"
                                onChange={patchPerson}
                                onAdd={() => addPerson('Sales')}
                                onRemove={removePerson}
                            />
                            <LineTable
                                title="Arrendamiento"
                                rows={arrendamientosVentas}
                                canEdit={canEdit}
                                onChange={patchItem}
                                onAdd={() => addItem('ArrendamientosVentas')}
                                onRemove={removeItem}
                            />
                        </Stack>
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="mod">
                    <Accordion.Control>
                        <AccordionLabel title="Mano de obra" amount={productionPay} />
                    </Accordion.Control>
                    <Accordion.Panel>
                        <PeopleTable
                            title="Contratación directa"
                            rows={productionPeople}
                            groups={[
                                { key: 'staff', rows: productionSplit.staff },
                                { key: 'plant', rows: productionSplit.plant }
                            ]}
                            canEdit={canEdit}
                            transportLabel="Auxilio transporte"
                            onChange={patchPerson}
                            onAdd={() => addPerson('Production')}
                            onRemove={removePerson}
                        />
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="indirectos">
                    <Accordion.Control>
                        <AccordionLabel title="Costos indirectos" amount={indirectTotal} />
                    </Accordion.Control>
                    <Accordion.Panel>
                        <Stack gap="lg">
                            {INDIRECT_BUCKETS.map((bucket) => (
                                <LineTable
                                    key={bucket.id}
                                    title={bucket.title}
                                    rows={indirectRows
                                        .filter((item) => bucketId(item) === bucket.id)
                                        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))}
                                    canEdit={canEdit}
                                    onChange={(idx, patch) => patchItem(idx, { ...patch, group: bucket.group })}
                                    onAdd={() => addItem(bucket.group)}
                                    onRemove={removeItem}
                                />
                            ))}
                            <Text fw={700}>Total costos indirectos: {money(indirectTotal)}</Text>
                        </Stack>
                    </Accordion.Panel>
                </Accordion.Item>

                <Accordion.Item value="servicios">
                    <Accordion.Control>
                        <AccordionLabel title="Servicios" amount={sumAmount(contratos)} />
                    </Accordion.Control>
                    <Accordion.Panel>
                        <LineTable
                            title="Servicios"
                            rows={contratos}
                            canEdit={canEdit}
                            onChange={patchItem}
                            onAdd={() => addItem('ContratosServicios')}
                            onRemove={removeItem}
                        />
                    </Accordion.Panel>
                </Accordion.Item>
            </Accordion>
        </Stack>
    );
}
