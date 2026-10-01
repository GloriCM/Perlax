import {
    Accordion,
    Button,
    Group,
    Menu,
    NumberInput,
    Stack,
    Table,
    Text,
    TextInput,
    Title
} from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { money, numberProps } from './elliotFormat';
import {
    SECTION_KIND_OPTIONS_VARIABLE,
    createSection,
    createSubgroup,
    normalizeLayout
} from './budgetLayout';

export default function CostosVariablesPanel({ draft, setDraft, canEdit }) {
    const layout = normalizeLayout(draft.layout);
    const sections = [...(layout.variable || [])].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    const commissions = draft.commissions || [];
    const fixedItems = draft.fixedItems || [];

    const patchLayout = (updater, immediate = false) => {
        setDraft((prev) => {
            const cur = normalizeLayout(prev.layout);
            const nextVar = typeof updater === 'function' ? updater(cur.variable) : updater;
            return { ...prev, layout: { ...cur, variable: nextVar } };
        }, immediate ? { immediate: true } : undefined);
    };

    const addSection = (kind) => {
        patchLayout((variable) => [...variable, createSection(kind)], true);
    };

    const removeSection = (sectionId) => {
        const section = sections.find((s) => s.id === sectionId);
        setDraft((prev) => {
            const cur = normalizeLayout(prev.layout);
            let next = { ...prev, layout: { ...cur, variable: cur.variable.filter((s) => s.id !== sectionId) } };
            if (section?.kind === 'commissions') {
                const keys = new Set((section.subgroups || []).map((g) => g.key));
                next = { ...next, commissions: (prev.commissions || []).filter((c) => !keys.has(c.group)) };
            }
            if (section?.kind === 'items') {
                const keys = new Set((section.subgroups || []).map((g) => g.key));
                next = { ...next, fixedItems: (prev.fixedItems || []).filter((i) => !keys.has(i.group)) };
            }
            return next;
        }, { immediate: true });
    };

    const renameSection = (sectionId, title) => {
        patchLayout((variable) => variable.map((s) => (s.id === sectionId ? { ...s, title } : s)));
    };

    const addSubgroup = (sectionId) => {
        const sub = createSubgroup(sections.find((s) => s.id === sectionId)?.kind === 'commissions' ? 'comision' : 'var');
        patchLayout((variable) => variable.map((s) => (
            s.id === sectionId ? { ...s, subgroups: [...(s.subgroups || []), sub] } : s
        )), true);
    };

    const patchSubgroup = (sectionId, subId, patch) => {
        setDraft((prev) => {
            const cur = normalizeLayout(prev.layout);
            const section = cur.variable.find((s) => s.id === sectionId);
            const oldSub = section?.subgroups?.find((g) => g.id === subId);
            const oldKey = oldSub?.key;
            const nextVar = cur.variable.map((s) => {
                if (s.id !== sectionId) return s;
                return {
                    ...s,
                    subgroups: (s.subgroups || []).map((g) => (g.id === subId ? { ...g, ...patch } : g))
                };
            });
            let next = { ...prev, layout: { ...cur, variable: nextVar } };
            if (patch.key && oldKey && patch.key !== oldKey) {
                if (section?.kind === 'commissions') {
                    next = {
                        ...next,
                        commissions: (prev.commissions || []).map((c) => (c.group === oldKey ? { ...c, group: patch.key } : c))
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
            const section = cur.variable.find((s) => s.id === sectionId);
            const sub = section?.subgroups?.find((g) => g.id === subId);
            const key = sub?.key;
            const nextVar = cur.variable.map((s) => {
                if (s.id !== sectionId) return s;
                return { ...s, subgroups: (s.subgroups || []).filter((g) => g.id !== subId) };
            });
            let next = { ...prev, layout: { ...cur, variable: nextVar } };
            if (key && section?.kind === 'commissions') {
                next = { ...next, commissions: (prev.commissions || []).filter((c) => c.group !== key) };
            }
            if (key && section?.kind === 'items') {
                next = { ...next, fixedItems: (prev.fixedItems || []).filter((i) => i.group !== key) };
            }
            return next;
        }, { immediate: true });
    };

    return (
        <Stack gap="lg">
            <Group justify="space-between" wrap="wrap">
                <div>
                    <Title order={4}>Costos variables</Title>
                    <Text size="sm" c="dimmed">Secciones y subgrupos a tu medida. Se guarda solo.</Text>
                </div>
                {canEdit && (
                    <Menu shadow="md" width={320}>
                        <Menu.Target>
                            <Button leftSection={<IconPlus size={16} />} color="indigo" variant="light">
                                Agregar sección
                            </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {SECTION_KIND_OPTIONS_VARIABLE.map((opt) => (
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
                    Sin secciones. Agrega comisiones u otros rubros variables.
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
                                        <Button
                                            size="xs"
                                            variant="default"
                                            leftSection={<IconPlus size={14} />}
                                            onClick={() => addSubgroup(section.id)}
                                        >
                                            Agregar subgrupo
                                        </Button>
                                        <Button size="xs" color="red" variant="subtle" onClick={() => removeSection(section.id)}>
                                            Eliminar sección
                                        </Button>
                                    </Group>
                                )}

                                {(section.subgroups || []).map((sub) => {
                                    if (section.kind === 'commissions') {
                                        const rows = commissions
                                            .map((c, idx) => ({ ...c, _idx: idx }))
                                            .filter((c) => c.group === sub.key);
                                        return (
                                            <Stack key={sub.id} gap="sm">
                                                <Group justify="space-between">
                                                    {canEdit ? (
                                                        <TextInput
                                                            label="Subgrupo"
                                                            value={sub.title}
                                                            w={260}
                                                            onChange={(e) => patchSubgroup(section.id, sub.id, { title: e.currentTarget.value })}
                                                        />
                                                    ) : (
                                                        <Text fw={600}>{sub.title}</Text>
                                                    )}
                                                    <Group>
                                                        {canEdit && (
                                                            <Button
                                                                size="xs"
                                                                variant="light"
                                                                leftSection={<IconPlus size={14} />}
                                                                onClick={() => setDraft((prev) => ({
                                                                    ...prev,
                                                                    commissions: [...prev.commissions, {
                                                                        name: '', group: sub.key, rate: 0.03, baseAmount: 0,
                                                                        sortOrder: prev.commissions.length + 1
                                                                    }]
                                                                }), { immediate: true })}
                                                            >
                                                                Agregar
                                                            </Button>
                                                        )}
                                                        {canEdit && (
                                                            <Button size="xs" color="red" variant="subtle" onClick={() => removeSubgroup(section.id, sub.id)}>
                                                                Borrar subgrupo
                                                            </Button>
                                                        )}
                                                    </Group>
                                                </Group>
                                                <Table striped withTableBorder>
                                                    <Table.Thead>
                                                        <Table.Tr>
                                                            <Table.Th>Concepto</Table.Th>
                                                            <Table.Th>Tasa</Table.Th>
                                                            <Table.Th>Base</Table.Th>
                                                            <Table.Th>Comisión</Table.Th>
                                                            {canEdit && <Table.Th />}
                                                        </Table.Tr>
                                                    </Table.Thead>
                                                    <Table.Tbody>
                                                        {rows.map((c) => (
                                                            <Table.Tr key={c._idx}>
                                                                <Table.Td>
                                                                    {canEdit ? (
                                                                        <TextInput value={c.name} onChange={(e) => setDraft((prev) => {
                                                                            const next = [...prev.commissions];
                                                                            next[c._idx] = { ...next[c._idx], name: e.currentTarget.value };
                                                                            return { ...prev, commissions: next };
                                                                        })} />
                                                                    ) : c.name}
                                                                </Table.Td>
                                                                <Table.Td>
                                                                    {canEdit ? (
                                                                        <NumberInput min={0} max={1} step={0.001} decimalScale={4} value={c.rate}
                                                                            onChange={(v) => setDraft((prev) => {
                                                                                const next = [...prev.commissions];
                                                                                next[c._idx] = { ...next[c._idx], rate: Number(v) || 0 };
                                                                                return { ...prev, commissions: next };
                                                                            })} />
                                                                    ) : `${((Number(c.rate) || 0) * 100).toFixed(2)}%`}
                                                                </Table.Td>
                                                                <Table.Td>
                                                                    {canEdit ? (
                                                                        <NumberInput {...numberProps} value={c.baseAmount}
                                                                            onChange={(v) => setDraft((prev) => {
                                                                                const next = [...prev.commissions];
                                                                                next[c._idx] = { ...next[c._idx], baseAmount: Number(v) || 0 };
                                                                                return { ...prev, commissions: next };
                                                                            })} />
                                                                    ) : money(c.baseAmount)}
                                                                </Table.Td>
                                                                <Table.Td>{money((Number(c.baseAmount) || 0) * (Number(c.rate) || 0))}</Table.Td>
                                                                {canEdit && (
                                                                    <Table.Td>
                                                                        <Button size="compact-xs" color="red" variant="subtle" onClick={() => setDraft((prev) => ({
                                                                            ...prev,
                                                                            commissions: prev.commissions.filter((_, i) => i !== c._idx)
                                                                        }), { immediate: true })}>
                                                                            <IconTrash size={14} />
                                                                        </Button>
                                                                    </Table.Td>
                                                                )}
                                                            </Table.Tr>
                                                        ))}
                                                        {rows.length === 0 && (
                                                            <Table.Tr>
                                                                <Table.Td colSpan={5}><Text c="dimmed" ta="center" py="sm">Sin comisiones.</Text></Table.Td>
                                                            </Table.Tr>
                                                        )}
                                                    </Table.Tbody>
                                                </Table>
                                            </Stack>
                                        );
                                    }

                                    // items kind in variables → same fixedItems store, different groups
                                    const rows = fixedItems
                                        .map((it, idx) => ({ ...it, _idx: idx }))
                                        .filter((it) => it.group === sub.key);
                                    return (
                                        <Stack key={sub.id} gap="sm">
                                            <Group justify="space-between">
                                                {canEdit ? (
                                                    <TextInput
                                                        label="Subgrupo"
                                                        value={sub.title}
                                                        w={260}
                                                        onChange={(e) => patchSubgroup(section.id, sub.id, { title: e.currentTarget.value })}
                                                    />
                                                ) : (
                                                    <Text fw={600}>{sub.title}</Text>
                                                )}
                                                <Group>
                                                    {canEdit && (
                                                        <Button
                                                            size="xs"
                                                            variant="light"
                                                            leftSection={<IconPlus size={14} />}
                                                            onClick={() => setDraft((prev) => ({
                                                                ...prev,
                                                                fixedItems: [...prev.fixedItems, {
                                                                    group: sub.key, concept: '', amount: 0, sortOrder: prev.fixedItems.length + 1
                                                                }]
                                                            }), { immediate: true })}
                                                        >
                                                            Agregar
                                                        </Button>
                                                    )}
                                                    {canEdit && (
                                                        <Button size="xs" color="red" variant="subtle" onClick={() => removeSubgroup(section.id, sub.id)}>
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
                                                                    <TextInput value={it.concept} onChange={(e) => setDraft((prev) => {
                                                                        const next = [...prev.fixedItems];
                                                                        next[it._idx] = { ...next[it._idx], concept: e.currentTarget.value };
                                                                        return { ...prev, fixedItems: next };
                                                                    })} />
                                                                ) : it.concept}
                                                            </Table.Td>
                                                            <Table.Td>
                                                                {canEdit ? (
                                                                    <NumberInput {...numberProps} value={it.amount}
                                                                        onChange={(v) => setDraft((prev) => {
                                                                            const next = [...prev.fixedItems];
                                                                            next[it._idx] = { ...next[it._idx], amount: Number(v) || 0 };
                                                                            return { ...prev, fixedItems: next };
                                                                        })} />
                                                                ) : money(it.amount)}
                                                            </Table.Td>
                                                            {canEdit && (
                                                                <Table.Td>
                                                                    <Button size="compact-xs" color="red" variant="subtle" onClick={() => setDraft((prev) => ({
                                                                        ...prev,
                                                                        fixedItems: prev.fixedItems.filter((_, i) => i !== it._idx)
                                                                    }), { immediate: true })}>
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
                                        </Stack>
                                    );
                                })}
                            </Stack>
                        </Accordion.Panel>
                    </Accordion.Item>
                ))}
            </Accordion>
        </Stack>
    );
}
