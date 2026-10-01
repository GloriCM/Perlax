import {
    Accordion,
    Button,
    Group,
    Menu,
    NumberInput,
    Select,
    Stack,
    Table,
    Text,
    TextInput,
    Title,
    Tooltip
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { money, numberProps } from './elliotFormat';
import { computePersonPayroll, PRESTACION_LABELS } from './elliotPayroll';
import {
    PAYROLL_MAPS_TO,
    SECTION_KIND_OPTIONS_FIXED,
    createSection,
    createSubgroup,
    normalizeLayout
} from './budgetLayout';

function pctLike(v) {
    return `${((Number(v) || 0) * 100).toFixed(1)}%`;
}

function IncomeBlock({ incomes, canEdit, onChange, onAdd, onRemove }) {
    return (
        <Stack gap="sm">
            <Group justify="flex-end">
                {canEdit && (
                    <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={onAdd}>
                        Agregar línea
                    </Button>
                )}
            </Group>
            <Table striped withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th>Código</Table.Th>
                        <Table.Th>Nombre</Table.Th>
                        <Table.Th>Monto</Table.Th>
                        <Table.Th>% MP</Table.Th>
                        {canEdit && <Table.Th />}
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {incomes.map((row, idx) => (
                        <Table.Tr key={row.id || idx}>
                            <Table.Td>
                                {canEdit ? (
                                    <TextInput value={row.code || ''} onChange={(e) => onChange(idx, { code: e.currentTarget.value })} />
                                ) : row.code}
                            </Table.Td>
                            <Table.Td>
                                {canEdit ? (
                                    <TextInput value={row.name || ''} onChange={(e) => onChange(idx, { name: e.currentTarget.value })} />
                                ) : row.name}
                            </Table.Td>
                            <Table.Td>
                                {canEdit ? (
                                    <NumberInput {...numberProps} value={row.amount} onChange={(v) => onChange(idx, { amount: Number(v) || 0 })} />
                                ) : money(row.amount)}
                            </Table.Td>
                            <Table.Td>
                                {canEdit ? (
                                    <NumberInput min={0} max={1} step={0.01} decimalScale={4} value={row.materialPct}
                                        onChange={(v) => onChange(idx, { materialPct: Number(v) || 0 })} />
                                ) : pctLike(row.materialPct)}
                            </Table.Td>
                            {canEdit && (
                                <Table.Td>
                                    <Button size="compact-xs" color="red" variant="subtle" onClick={() => onRemove(idx)}>
                                        <IconTrash size={14} />
                                    </Button>
                                </Table.Td>
                            )}
                        </Table.Tr>
                    ))}
                    {incomes.length === 0 && (
                        <Table.Tr>
                            <Table.Td colSpan={5}><Text c="dimmed" ta="center" py="sm">Sin líneas de ingreso.</Text></Table.Td>
                        </Table.Tr>
                    )}
                </Table.Tbody>
            </Table>
        </Stack>
    );
}

function PayrollBlock({ people, subgroup, canEdit, onChangePerson, onAddPerson, onRemovePerson, onPatchSubgroup }) {
    const key = subgroup.key;
    const rows = people.map((p, idx) => ({ ...p, _idx: idx })).filter((p) => p.section === key);
    const showCenter = (subgroup.mapsTo || key) === 'Production';
    const calcRows = rows.map((p) => ({
        ...p,
        calc: computePersonPayroll({ ...p, section: subgroup.mapsTo || p.section })
    }));
    const areaPrestaciones = calcRows.reduce((s, r) => s + r.calc.prestaciones, 0);
    const areaTotal = calcRows.reduce((s, r) => s + r.calc.total, 0);
    const colSpan = (showCenter ? 7 : 6) + (canEdit ? 1 : 0);

    return (
        <Stack gap="sm" mt="md">
            <Group justify="space-between" align="flex-end" wrap="wrap">
                <Group grow style={{ flex: 1 }} maw={520}>
                    {canEdit ? (
                        <>
                            <TextInput
                                label="Nombre del área"
                                value={subgroup.title}
                                onChange={(e) => onPatchSubgroup({ title: e.currentTarget.value })}
                            />
                            <Select
                                label="Entra al cálculo como"
                                data={PAYROLL_MAPS_TO}
                                value={subgroup.mapsTo || 'Admin'}
                                onChange={(v) => onPatchSubgroup({ mapsTo: v || 'Admin' })}
                            />
                        </>
                    ) : (
                        <Text fw={600}>{subgroup.title}</Text>
                    )}
                </Group>
                {canEdit && (
                    <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => onAddPerson(key)}>
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
                        <Table.Th>Subsidio</Table.Th>
                        {showCenter && <Table.Th>Centro</Table.Th>}
                        <Table.Th>Prestaciones</Table.Th>
                        <Table.Th>Total</Table.Th>
                        {canEdit && <Table.Th />}
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    {calcRows.map((p) => (
                        <Table.Tr key={p._idx}>
                            <Table.Td>
                                {canEdit ? <TextInput value={p.name} onChange={(e) => onChangePerson(p._idx, { name: e.currentTarget.value })} /> : p.name}
                            </Table.Td>
                            <Table.Td>
                                {canEdit ? <TextInput value={p.role} onChange={(e) => onChangePerson(p._idx, { role: e.currentTarget.value })} /> : p.role}
                            </Table.Td>
                            <Table.Td>
                                {canEdit ? <NumberInput {...numberProps} value={p.salary} onChange={(v) => onChangePerson(p._idx, { salary: Number(v) || 0 })} /> : money(p.salary)}
                            </Table.Td>
                            <Table.Td>
                                {canEdit ? <NumberInput {...numberProps} value={p.transportSubsidy} onChange={(v) => onChangePerson(p._idx, { transportSubsidy: Number(v) || 0 })} /> : money(p.transportSubsidy)}
                            </Table.Td>
                            {showCenter && (
                                <Table.Td>
                                    {canEdit ? (
                                        <TextInput value={p.costCenterCode || ''} onChange={(e) => onChangePerson(p._idx, { costCenterCode: e.currentTarget.value })} />
                                    ) : (p.costCenterCode || '—')}
                                </Table.Td>
                            )}
                            <Table.Td>
                                <Tooltip
                                    multiline
                                    w={280}
                                    label={(() => {
                                        const isCoop = (subgroup.mapsTo || p.section) === 'Cooperative';
                                        if (!(p.calc.prestaciones > 0)) return 'Sin prestaciones';
                                        if (isCoop) {
                                            return `Prestaciones cooperativa (52% del sueldo): ${money(p.calc.prestaciones)}`;
                                        }
                                        return PRESTACION_LABELS
                                            .map((c) => `${c.label}: ${money(p.calc[c.key])}`)
                                            .join('\n');
                                    })()}
                                >
                                    <Text size="sm" style={{ cursor: 'help' }}>{money(p.calc.prestaciones)}</Text>
                                </Tooltip>
                            </Table.Td>
                            <Table.Td>{money(p.calc.total)}</Table.Td>
                            {canEdit && (
                                <Table.Td>
                                    <Button size="compact-xs" color="red" variant="subtle" onClick={() => onRemovePerson(p._idx)}>
                                        <IconTrash size={14} />
                                    </Button>
                                </Table.Td>
                            )}
                        </Table.Tr>
                    ))}
                    {calcRows.length === 0 ? (
                        <Table.Tr>
                            <Table.Td colSpan={colSpan}>
                                <Text c="dimmed" ta="center" py="sm">Sin personas.</Text>
                            </Table.Td>
                        </Table.Tr>
                    ) : (
                        <Table.Tr>
                            <Table.Td colSpan={showCenter ? 5 : 4}>
                                <Text size="sm" fw={600}>Total del área</Text>
                            </Table.Td>
                            <Table.Td><Text size="sm" fw={600}>{money(areaPrestaciones)}</Text></Table.Td>
                            <Table.Td><Text size="sm" fw={700}>{money(areaTotal)}</Text></Table.Td>
                            {canEdit && <Table.Td />}
                        </Table.Tr>
                    )}
                </Table.Tbody>
            </Table>
            {calcRows.length > 0 && (
                <Text size="xs" c="dimmed">
                    Prestaciones = cesantía, interés, prima, vacaciones, ARL, salud, pensión y caja (igual que el Excel).
                </Text>
            )}
        </Stack>
    );
}

function ItemsBlock({ items, subgroup, canEdit, onChange, onAdd, onRemove, onPatchSubgroup, onRemoveSubgroup }) {
    const key = subgroup.key;
    const rows = items.map((it, idx) => ({ ...it, _idx: idx })).filter((it) => it.group === key);

    return (
        <Stack gap="sm" mt="md">
            <Group justify="space-between">
                {canEdit ? (
                    <TextInput
                        label="Subgrupo"
                        value={subgroup.title}
                        onChange={(e) => {
                            const title = e.currentTarget.value;
                            onPatchSubgroup({ title });
                        }}
                        w={280}
                    />
                ) : (
                    <Text fw={600}>{subgroup.title}</Text>
                )}
                <Group>
                    {canEdit && (
                        <Button size="xs" variant="light" leftSection={<IconPlus size={14} />} onClick={() => onAdd(key)}>
                            Agregar ítem
                        </Button>
                    )}
                    {canEdit && (
                        <Button size="xs" color="red" variant="subtle" onClick={onRemoveSubgroup}>
                            Borrar subgrupo
                        </Button>
                    )}
                </Group>
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
                    {rows.map((it) => (
                        <Table.Tr key={it._idx}>
                            <Table.Td>
                                {canEdit ? (
                                    <TextInput value={it.concept} onChange={(e) => onChange(it._idx, { concept: e.currentTarget.value })} />
                                ) : it.concept}
                            </Table.Td>
                            <Table.Td>
                                {canEdit ? (
                                    <NumberInput {...numberProps} value={it.amount} onChange={(v) => onChange(it._idx, { amount: Number(v) || 0 })} />
                                ) : money(it.amount)}
                            </Table.Td>
                            {canEdit && (
                                <Table.Td>
                                    <Button size="compact-xs" color="red" variant="subtle" onClick={() => onRemove(it._idx)}>
                                        <IconTrash size={14} />
                                    </Button>
                                </Table.Td>
                            )}
                        </Table.Tr>
                    ))}
                    {rows.length === 0 && (
                        <Table.Tr>
                            <Table.Td colSpan={3}><Text c="dimmed" ta="center" py="sm">Sin ítems.</Text></Table.Td>
                        </Table.Tr>
                    )}
                </Table.Tbody>
            </Table>
            <Text size="sm" c="dimmed">Subtotal: {money(rows.reduce((s, r) => s + (Number(r.amount) || 0), 0))}</Text>
        </Stack>
    );
}

export default function CostosFijosPanel({ workbook, draft, setDraft, canEdit }) {
    const layout = normalizeLayout(draft.layout);
    const sections = [...(layout.fixed || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const incomes = draft.incomes || [];
    const people = draft.people || [];
    const fixedItems = draft.fixedItems || [];

    const patchLayout = (updater, immediate = false) => {
        setDraft((prev) => {
            const cur = normalizeLayout(prev.layout);
            const nextFixed = typeof updater === 'function' ? updater(cur.fixed) : updater;
            return { ...prev, layout: { ...cur, fixed: nextFixed } };
        }, immediate ? { immediate: true } : undefined);
    };

    const addSection = (kind) => {
        patchLayout((fixed) => [...fixed, createSection(kind)], true);
    };

    const removeSection = (sectionId) => {
        const section = sections.find((s) => s.id === sectionId);
        setDraft((prev) => {
            const cur = normalizeLayout(prev.layout);
            let next = { ...prev, layout: { ...cur, fixed: cur.fixed.filter((s) => s.id !== sectionId) } };
            if (section?.kind === 'income') next = { ...next, incomes: [] };
            if (section?.kind === 'payroll') {
                const keys = new Set((section.subgroups || []).map((g) => g.key));
                next = { ...next, people: (prev.people || []).filter((p) => !keys.has(p.section)) };
            }
            if (section?.kind === 'items') {
                const keys = new Set((section.subgroups || []).map((g) => g.key));
                next = { ...next, fixedItems: (prev.fixedItems || []).filter((i) => !keys.has(i.group)) };
            }
            return next;
        }, { immediate: true });
    };

    const renameSection = (sectionId, title) => {
        patchLayout((fixed) => fixed.map((s) => (s.id === sectionId ? { ...s, title } : s)));
    };

    const addSubgroup = (sectionId) => {
        const sub = createSubgroup('rubro');
        patchLayout((fixed) => fixed.map((s) => (
            s.id === sectionId ? { ...s, subgroups: [...(s.subgroups || []), sub] } : s
        )), true);
    };

    const addPayrollSubgroup = (sectionId) => {
        const sub = { ...createSubgroup('area'), title: 'Nueva área', mapsTo: 'Admin' };
        patchLayout((fixed) => fixed.map((s) => (
            s.id === sectionId ? { ...s, subgroups: [...(s.subgroups || []), sub] } : s
        )), true);
    };

    const patchSubgroup = (sectionId, subId, patch) => {
        setDraft((prev) => {
            const cur = normalizeLayout(prev.layout);
            const section = cur.fixed.find((s) => s.id === sectionId);
            const oldSub = section?.subgroups?.find((g) => g.id === subId);
            const oldKey = oldSub?.key;
            const nextFixed = cur.fixed.map((s) => {
                if (s.id !== sectionId) return s;
                return {
                    ...s,
                    subgroups: (s.subgroups || []).map((g) => (g.id === subId ? { ...g, ...patch } : g))
                };
            });
            let next = { ...prev, layout: { ...cur, fixed: nextFixed } };
            // Si cambia el key interno, reasigna datos
            if (patch.key && oldKey && patch.key !== oldKey) {
                if (section?.kind === 'payroll') {
                    next = {
                        ...next,
                        people: (prev.people || []).map((p) => (p.section === oldKey ? { ...p, section: patch.key } : p))
                    };
                }
                if (section?.kind === 'items') {
                    next = {
                        ...next,
                        fixedItems: (prev.fixedItems || []).map((i) => (i.group === oldKey ? { ...i, group: patch.key } : i))
                    };
                }
            }
            return next;
        });
    };

    const removeSubgroup = (sectionId, subId) => {
        setDraft((prev) => {
            const cur = normalizeLayout(prev.layout);
            const section = cur.fixed.find((s) => s.id === sectionId);
            const sub = section?.subgroups?.find((g) => g.id === subId);
            const key = sub?.key;
            const nextFixed = cur.fixed.map((s) => {
                if (s.id !== sectionId) return s;
                return { ...s, subgroups: (s.subgroups || []).filter((g) => g.id !== subId) };
            });
            let next = { ...prev, layout: { ...cur, fixed: nextFixed } };
            if (key && section?.kind === 'payroll') {
                next = { ...next, people: (prev.people || []).filter((p) => p.section !== key) };
            }
            if (key && section?.kind === 'items') {
                next = { ...next, fixedItems: (prev.fixedItems || []).filter((i) => i.group !== key) };
            }
            return next;
        }, { immediate: true });
    };

    return (
        <Stack gap="lg">
            <Group justify="space-between" align="center" wrap="wrap">
                <div>
                    <Title order={4}>Costos fijos</Title>
                    <Text size="sm" c="dimmed">
                        Arma tus propias secciones y subgrupos. Todo se guarda solo.
                    </Text>
                </div>
                {canEdit && (
                    <Menu shadow="md" width={320}>
                        <Menu.Target>
                            <Button leftSection={<IconPlus size={16} />} color="indigo" variant="light">
                                Agregar sección
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {SECTION_KIND_OPTIONS_FIXED.map((opt) => (
                                <Menu.Item key={opt.value} onClick={() => addSection(opt.value)}>
                                    {opt.label}
                                </Menu.Item>
                            ))}
                        </Menu.Dropdown>
                    </Menu>
                )}
            </Group>

            {sections.length === 0 && (
                <Text c="dimmed" ta="center" py="xl">
                    Sin secciones. Usa «Agregar sección» para crear ingresos, nómina o rubros a tu medida.
                </Text>
            )}

            <Accordion multiple defaultValue={sections.map((s) => s.id)}>
                {sections.map((section) => (
                    <Accordion.Item key={section.id} value={section.id}>
                        <Accordion.Control>
                            {canEdit ? (
                                <TextInput
                                    value={section.title}
                                    onClick={(e) => e.stopPropagation()}
                                    onChange={(e) => renameSection(section.id, e.currentTarget.value)}
                                    variant="unstyled"
                                    styles={{ input: { fontWeight: 600, fontSize: 15 } }}
                                />
                            ) : section.title}
                        </Accordion.Control>
                        <Accordion.Panel>
                            <Stack gap="md">
                                {canEdit && (
                                    <Group justify="flex-end">
                                        {(section.kind === 'items' || section.kind === 'payroll') && (
                                            <Button
                                                size="xs"
                                                variant="default"
                                                leftSection={<IconPlus size={14} />}
                                                onClick={() => (section.kind === 'payroll'
                                                    ? addPayrollSubgroup(section.id)
                                                    : addSubgroup(section.id))}
                                            >
                                                Agregar subgrupo / área
                                            </Button>
                                        )}
                                        <Button size="xs" color="red" variant="subtle" onClick={() => removeSection(section.id)}>
                                            Eliminar sección
                                        </Button>
                                    </Group>
                                )}

                                {section.kind === 'income' && (
                                    <IncomeBlock
                                        incomes={incomes}
                                        canEdit={canEdit}
                                        onChange={(idx, patch) => setDraft((prev) => {
                                            const next = [...prev.incomes];
                                            next[idx] = { ...next[idx], ...patch };
                                            return { ...prev, incomes: next };
                                        })}
                                        onAdd={() => setDraft((prev) => ({
                                            ...prev,
                                            incomes: [...prev.incomes, { code: '', name: '', amount: 0, materialPct: 0.45, sortOrder: prev.incomes.length + 1 }]
                                        }), { immediate: true })}
                                        onRemove={(idx) => setDraft((prev) => ({
                                            ...prev,
                                            incomes: prev.incomes.filter((_, i) => i !== idx)
                                        }), { immediate: true })}
                                    />
                                )}

                                {section.kind === 'payroll' && (section.subgroups || []).map((sub) => (
                                    <PayrollBlock
                                        key={sub.id}
                                        people={people}
                                        subgroup={sub}
                                        canEdit={canEdit}
                                        onChangePerson={(idx, patch) => setDraft((prev) => {
                                            const next = [...prev.people];
                                            next[idx] = { ...next[idx], ...patch };
                                            return { ...prev, people: next };
                                        })}
                                        onAddPerson={(sec) => setDraft((prev) => ({
                                            ...prev,
                                            people: [...prev.people, {
                                                section: sec, name: '', role: '', salary: 0, transportSubsidy: 0,
                                                costCenterCode: (sub.mapsTo || sec) === 'Production' ? '' : null,
                                                sortOrder: prev.people.length + 1
                                            }]
                                        }), { immediate: true })}
                                        onRemovePerson={(idx) => setDraft((prev) => ({
                                            ...prev,
                                            people: prev.people.filter((_, i) => i !== idx)
                                        }), { immediate: true })}
                                        onPatchSubgroup={(patch) => patchSubgroup(section.id, sub.id, patch)}
                                    />
                                ))}

                                {section.kind === 'items' && (section.subgroups || []).map((sub) => (
                                    <ItemsBlock
                                        key={sub.id}
                                        items={fixedItems}
                                        subgroup={sub}
                                        canEdit={canEdit}
                                        onChange={(idx, patch) => setDraft((prev) => {
                                            const next = [...prev.fixedItems];
                                            next[idx] = { ...next[idx], ...patch };
                                            return { ...prev, fixedItems: next };
                                        })}
                                        onAdd={(group) => setDraft((prev) => ({
                                            ...prev,
                                            fixedItems: [...prev.fixedItems, { group, concept: '', amount: 0, sortOrder: prev.fixedItems.length + 1 }]
                                        }), { immediate: true })}
                                        onRemove={(idx) => setDraft((prev) => ({
                                            ...prev,
                                            fixedItems: prev.fixedItems.filter((_, i) => i !== idx)
                                        }), { immediate: true })}
                                        onPatchSubgroup={(patch) => patchSubgroup(section.id, sub.id, patch)}
                                        onRemoveSubgroup={() => removeSubgroup(section.id, sub.id)}
                                    />
                                ))}
                            </Stack>
                        </Accordion.Panel>
                    </Accordion.Item>
                ))}
            </Accordion>

            {workbook?.summary && (
                <Text size="sm" c="dimmed">Utilidad calculada: {money(workbook.summary.utility)}</Text>
            )}
        </Stack>
    );
}
