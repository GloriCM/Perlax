import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Badge,
    Box,
    Button,
    Card,
    Group,
    Modal,
    NumberInput,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Tabs,
    Text,
    TextInput,
    Textarea,
    Title
} from '@mantine/core';
import {
    IconAlertTriangle,
    IconArrowLeft,
    IconCheck,
    IconLock,
    IconPlus,
    IconRefresh,
    IconReportMoney,
    IconUsers
} from '@tabler/icons-react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../utils/api';
import './Presupuestos.css';

const OTHER_TYPE = '__other__';
const OTHER_CATEGORY = '__other_cat__';
const CUSTOM_LINE_TYPES_KEY = 'perlax.budget.customLineTypes';

const LINE_TYPES = [
    { value: 'Income', label: 'Ingresos' },
    { value: 'RawMaterial', label: 'Materia Prima' },
    { value: 'ProductionCost', label: 'Costos de Producción' },
    { value: 'AdminExpense', label: 'Gastos Administrativos' },
    { value: 'SalesExpense', label: 'Gastos de Ventas' },
    { value: 'FinancialExpense', label: 'Gastos Financieros' },
    { value: OTHER_TYPE, label: 'Otro' }
];

const BASE_LINE_TYPES = LINE_TYPES.filter((x) => x.value !== OTHER_TYPE);

function loadCustomLineTypes() {
    try {
        const raw = localStorage.getItem(CUSTOM_LINE_TYPES_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed)
            ? parsed.filter((x) => x && x.value && x.label)
            : [];
    } catch {
        return [];
    }
}

function saveCustomLineType(label) {
    const name = String(label || '').trim().slice(0, 40);
    if (!name) return null;
    const existing = loadCustomLineTypes();
    if (!existing.some((x) => String(x.value).toLowerCase() === name.toLowerCase())) {
        existing.push({ value: name, label: name });
        localStorage.setItem(CUSTOM_LINE_TYPES_KEY, JSON.stringify(existing));
    }
    return name;
}

const money = (v) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(v || 0);

const emptyLine = () => ({
    lineType: 'Income',
    customLineType: '',
    category: null,
    customCategory: '',
    concept: '',
    projectedValue: 0,
    frequency: 'Anual',
    businessUnitId: null,
    quantity: null,
    unitCost: null,
    observations: ''
});

export default function PresupuestoDetalle() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [budget, setBudget] = useState(null);
    const [categories, setCategories] = useState([]);
    const [error, setError] = useState('');
    const [alert, setAlert] = useState('');
    const [loading, setLoading] = useState(true);
    const [lineOpen, setLineOpen] = useState(false);
    const [lineForm, setLineForm] = useState(emptyLine());
    const [customLineTypes, setCustomLineTypes] = useState(() => loadCustomLineTypes());
    const [buOpen, setBuOpen] = useState(false);
    const [buForm, setBuForm] = useState({ name: '', responsible: '' });
    const [personOpen, setPersonOpen] = useState(false);
    const [personForm, setPersonForm] = useState({
        position: '',
        area: '',
        category: 'Personal Administrativo',
        headcount: 1,
        monthlySalary: 0,
        benefits: 0,
        allowances: 0,
        bonuses: 0,
        overtime: 0,
        businessUnitId: null
    });
    const [incomeStatement, setIncomeStatement] = useState(null);
    const [costMap, setCostMap] = useState(null);
    const [lineTypeFilter, setLineTypeFilter] = useState('Income');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const [detail, cats] = await Promise.all([
                api.get(`/budgets/${id}`),
                api.get('/budgets/categories')
            ]);
            setBudget(detail);
            setCategories(cats || []);
        } catch (e) {
            setError(e.message || 'No se pudo cargar el presupuesto.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [id]);

    const resolvedLineType =
        lineForm.lineType === OTHER_TYPE
            ? (lineForm.customLineType || '').trim()
            : lineForm.lineType;

    const typeOptions = useMemo(() => {
        const fromBudget = (budget?.lines || [])
            .map((l) => l.lineType)
            .filter(Boolean)
            .filter((v) => !BASE_LINE_TYPES.some((b) => b.value === v))
            .map((v) => ({ value: v, label: v }));
        const customs = customLineTypes.filter(
            (c) => !BASE_LINE_TYPES.some((b) => b.value === c.value)
        );
        const other = LINE_TYPES.find((x) => x.value === OTHER_TYPE);
        const seen = new Set();
        return [...BASE_LINE_TYPES, ...customs, ...fromBudget, other].filter((x) => {
            if (!x || seen.has(x.value)) return false;
            seen.add(x.value);
            return true;
        });
    }, [budget, customLineTypes]);

    const filterTypeOptions = useMemo(
        () => typeOptions.filter((x) => x.value !== OTHER_TYPE),
        [typeOptions]
    );

    const categoryOptions = useMemo(() => {
        const typeForCats = resolvedLineType || lineForm.lineType;
        const known = categories
            .filter((c) => c.lineType === typeForCats || c.lineType === lineForm.lineType)
            .map((c) => ({ value: c.name, label: c.name }));
        const fromLines = (budget?.lines || [])
            .filter((l) => l.lineType === typeForCats)
            .map((l) => l.category)
            .filter(Boolean)
            .map((name) => ({ value: name, label: name }));
        const seen = new Set();
        return [...known, ...fromLines, { value: OTHER_CATEGORY, label: 'Otro' }].filter((x) => {
            if (seen.has(x.value)) return false;
            seen.add(x.value);
            return true;
        });
    }, [categories, lineForm.lineType, resolvedLineType, budget]);

    const buOptions = useMemo(
        () => (budget?.businessUnits || []).map((u) => ({ value: u.id, label: u.name })),
        [budget]
    );

    const filteredLines = useMemo(
        () => (budget?.lines || []).filter((l) => l.lineType === lineTypeFilter),
        [budget, lineTypeFilter]
    );

    const canEdit = budget?.status === 'Pendiente' || budget?.status === 'En Ajuste';

    const runAction = async (fn, okMessage) => {
        try {
            const updated = await fn();
            setBudget(updated);
            setAlert(okMessage);
        } catch (e) {
            setAlert(e.message || 'Operación fallida.');
        }
    };

    const addLine = async () => {
        let lineType = lineForm.lineType;
        if (lineType === OTHER_TYPE) {
            const saved = saveCustomLineType(lineForm.customLineType);
            if (!saved) {
                setAlert('Indica el nombre del tipo personalizado.');
                return;
            }
            lineType = saved;
            setCustomLineTypes(loadCustomLineTypes());
        }

        let category = lineForm.category;
        if (category === OTHER_CATEGORY) {
            category = String(lineForm.customCategory || '').trim();
            if (!category) {
                setAlert('Indica el nombre de la categoría personalizada.');
                return;
            }
        }

        if (!category || !lineForm.concept) {
            setAlert('Categoría y concepto son obligatorios.');
            return;
        }

        const { customLineType, customCategory, ...rest } = lineForm;
        await runAction(
            () => api.post(`/budgets/${id}/lines`, {
                ...rest,
                lineType,
                category,
                projectedValue: Number(lineForm.projectedValue) || 0,
                quantity: lineForm.quantity ? Number(lineForm.quantity) : null,
                unitCost: lineForm.unitCost ? Number(lineForm.unitCost) : null
            }),
            'Línea presupuestal agregada.'
        );
        setLineOpen(false);
        setLineForm(emptyLine());
    };

    const deleteLine = async (lineId) => {
        await runAction(
            () => api.delete(`/budgets/${id}/lines/${lineId}`),
            'Línea eliminada.'
        );
    };

    const addBu = async () => {
        if (!buForm.name.trim()) {
            setAlert('El nombre de la unidad es obligatorio.');
            return;
        }
        await runAction(
            () => api.post(`/budgets/${id}/business-units`, buForm),
            'Unidad de negocio agregada.'
        );
        setBuOpen(false);
        setBuForm({ name: '', responsible: '' });
    };

    const addPerson = async () => {
        if (!personForm.position || !personForm.headcount || !personForm.monthlySalary) {
            setAlert('Cargo, cantidad y salario son obligatorios.');
            return;
        }
        await runAction(
            () => api.post(`/budgets/${id}/personnel`, personForm),
            'Cargo presupuestado agregado.'
        );
        setPersonOpen(false);
    };

    const loadReports = async () => {
        try {
            const [is, cm] = await Promise.all([
                api.get(`/budgets/${id}/income-statement`),
                api.get(`/budgets/${id}/cost-map`)
            ]);
            setIncomeStatement(is);
            setCostMap(cm);
        } catch (e) {
            setAlert(e.message || 'No se pudieron generar los reportes.');
        }
    };

    if (loading) {
        return <Box className="presupuestos-page"><Text c="dimmed">Cargando detalle...</Text></Box>;
    }

    if (error || !budget) {
        return (
            <Box className="presupuestos-page">
                <Alert color="red" icon={<IconAlertTriangle size={16} />}>{error || 'Presupuesto no encontrado'}</Alert>
                <Button mt="md" variant="default" onClick={() => navigate('/presupuestos')}>Volver</Button>
            </Box>
        );
    }

    return (
        <Box className="presupuestos-page fade-in">
            <Stack gap="lg">
                <Group justify="space-between" align="start">
                    <Box>
                        <Button
                            variant="subtle"
                            leftSection={<IconArrowLeft size={16} />}
                            mb="sm"
                            onClick={() => navigate('/presupuestos')}
                        >
                            Volver al listado
                        </Button>
                        <Title order={1} className="presupuestos-title">
                            {budget.code} · {budget.company}
                        </Title>
                        <Text className="presupuestos-subtitle">
                            Vigencia {budget.fiscalYear} · {budget.currency}
                        </Text>
                    </Box>
                    <Group>
                        <Badge size="lg" color={budget.status === 'Aprobado' ? 'green' : 'yellow'}>{budget.status}</Badge>
                        {canEdit && (
                            <Button color="green" leftSection={<IconCheck size={16} />} onClick={() => runAction(() => api.post(`/budgets/${id}/approve`, {}), 'Presupuesto aprobado.')}>
                                Aprobar
                            </Button>
                        )}
                        {budget.status === 'Aprobado' && (
                            <Button color="gray" leftSection={<IconLock size={16} />} onClick={() => runAction(() => api.post(`/budgets/${id}/close`), 'Presupuesto cerrado.')}>
                                Cerrar
                            </Button>
                        )}
                        {(budget.status === 'Cerrado' || budget.status === 'Aprobado') && (
                            <Button variant="light" leftSection={<IconRefresh size={16} />} onClick={() => runAction(() => api.post(`/budgets/${id}/reopen`), 'Presupuesto reabierto.')}>
                                Reabrir
                            </Button>
                        )}
                    </Group>
                </Group>

                {alert && (
                    <Alert color="indigo" variant="light" onClose={() => setAlert('')} withCloseButton>
                        {alert}
                    </Alert>
                )}

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                    <Card className="presupuestos-kpi" padding="lg">
                        <Text className="presupuestos-kpi-label">Ingresos</Text>
                        <Title order={4}>{money(budget.totals?.income)}</Title>
                    </Card>
                    <Card className="presupuestos-kpi" padding="lg">
                        <Text className="presupuestos-kpi-label">Costos / Gastos</Text>
                        <Title order={4}>{money(budget.totals?.totalExpenses)}</Title>
                    </Card>
                    <Card className="presupuestos-kpi" padding="lg">
                        <Text className="presupuestos-kpi-label">Personal</Text>
                        <Title order={4}>{money(budget.totals?.personnel)}</Title>
                    </Card>
                    <Card className="presupuestos-kpi" padding="lg">
                        <Text className="presupuestos-kpi-label">Resultado proyectado</Text>
                        <Title order={4}>{money(budget.totals?.projectedResult)}</Title>
                    </Card>
                </SimpleGrid>

                <Tabs defaultValue="lineas" variant="pills">
                    <Tabs.List className="presupuestos-tabs-list">
                        <Tabs.Tab value="lineas">Líneas presupuestales</Tabs.Tab>
                        <Tabs.Tab value="unidades">Unidades de negocio</Tabs.Tab>
                        <Tabs.Tab value="personal" leftSection={<IconUsers size={14} />}>Personal</Tabs.Tab>
                        <Tabs.Tab value="ajustes">Ajustes</Tabs.Tab>
                        <Tabs.Tab value="reportes" leftSection={<IconReportMoney size={14} />}>Reportes</Tabs.Tab>
                    </Tabs.List>

                    <Tabs.Panel value="lineas" pt="md">
                        <Stack>
                            <Group justify="space-between">
                                <Select
                                    data={filterTypeOptions}
                                    value={lineTypeFilter}
                                    onChange={(v) => setLineTypeFilter(v || 'Income')}
                                    w={280}
                                />
                                {canEdit && (
                                    <Button leftSection={<IconPlus size={16} />} color="indigo" onClick={() => {
                                        setLineForm({
                                            ...emptyLine(),
                                            lineType: lineTypeFilter === OTHER_TYPE ? 'Income' : lineTypeFilter
                                        });
                                        setLineOpen(true);
                                    }}>
                                        Agregar línea
                                    </Button>
                                )}
                            </Group>
                            <Card className="presupuestos-card" padding="lg">
                                <Table>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Categoría</Table.Th>
                                            <Table.Th>Concepto</Table.Th>
                                            <Table.Th>Valor</Table.Th>
                                            <Table.Th>Frecuencia</Table.Th>
                                            <Table.Th />
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {filteredLines.map((line) => (
                                            <Table.Tr key={line.id}>
                                                <Table.Td>{line.category}</Table.Td>
                                                <Table.Td>{line.concept}</Table.Td>
                                                <Table.Td>{money(line.projectedValue)}</Table.Td>
                                                <Table.Td>{line.frequency}</Table.Td>
                                                <Table.Td>
                                                    {canEdit && !line.isApproved && (
                                                        <Button size="compact-xs" variant="subtle" color="red" onClick={() => deleteLine(line.id)}>
                                                            Eliminar
                                                        </Button>
                                                    )}
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                        {filteredLines.length === 0 && (
                                            <Table.Tr>
                                                <Table.Td colSpan={5}>
                                                    <Text c="dimmed" ta="center" py="md">Sin registros en esta categoría.</Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </Card>
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="unidades" pt="md">
                        <Stack>
                            {canEdit && (
                                <Group justify="flex-end">
                                    <Button leftSection={<IconPlus size={16} />} color="indigo" onClick={() => setBuOpen(true)}>
                                        Agregar unidad
                                    </Button>
                                </Group>
                            )}
                            <Card className="presupuestos-card" padding="lg">
                                <Table>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Nombre</Table.Th>
                                            <Table.Th>Responsable</Table.Th>
                                            <Table.Th>Aprobador</Table.Th>
                                            <Table.Th>Estado</Table.Th>
                                            <Table.Th />
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {(budget.businessUnits || []).map((bu) => (
                                            <Table.Tr key={bu.id}>
                                                <Table.Td>{bu.name}</Table.Td>
                                                <Table.Td>{bu.responsible}</Table.Td>
                                                <Table.Td>{bu.approver || ' '}</Table.Td>
                                                <Table.Td><Badge variant="light">{bu.status}</Badge></Table.Td>
                                                <Table.Td>
                                                    {canEdit && bu.status !== 'Aprobado' && (
                                                        <Button
                                                            size="compact-xs"
                                                            variant="light"
                                                            color="green"
                                                            onClick={() => runAction(
                                                                () => api.put(`/budgets/${id}/business-units/${bu.id}/approve`),
                                                                'Unidad aprobada.'
                                                            )}
                                                        >
                                                            Aprobar
                                                        </Button>
                                                    )}
                                                </Table.Td>
                                            </Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </Card>
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="personal" pt="md">
                        <Stack>
                            {canEdit && (
                                <Group justify="flex-end">
                                    <Button leftSection={<IconPlus size={16} />} color="indigo" onClick={() => setPersonOpen(true)}>
                                        Agregar cargo
                                    </Button>
                                </Group>
                            )}
                            <Card className="presupuestos-card" padding="lg">
                                <Table>
                                    <Table.Thead>
                                        <Table.Tr>
                                            <Table.Th>Cargo</Table.Th>
                                            <Table.Th>Área</Table.Th>
                                            <Table.Th>Cant.</Table.Th>
                                            <Table.Th>Salario</Table.Th>
                                            <Table.Th>Anual</Table.Th>
                                        </Table.Tr>
                                    </Table.Thead>
                                    <Table.Tbody>
                                        {(budget.personnel || []).map((p) => (
                                            <Table.Tr key={p.id}>
                                                <Table.Td>{p.position}</Table.Td>
                                                <Table.Td>{p.area}</Table.Td>
                                                <Table.Td>{p.headcount}</Table.Td>
                                                <Table.Td>{money(p.monthlySalary)}</Table.Td>
                                                <Table.Td>{money(p.annualTotal)}</Table.Td>
                                            </Table.Tr>
                                        ))}
                                        {(budget.personnel || []).length === 0 && (
                                            <Table.Tr>
                                                <Table.Td colSpan={5}>
                                                    <Text c="dimmed" ta="center" py="md">Sin personal presupuestado.</Text>
                                                </Table.Td>
                                            </Table.Tr>
                                        )}
                                    </Table.Tbody>
                                </Table>
                            </Card>
                        </Stack>
                    </Tabs.Panel>

                    <Tabs.Panel value="ajustes" pt="md">
                        <Card className="presupuestos-card" padding="lg">
                            <Table>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Tipo</Table.Th>
                                        <Table.Th>Concepto</Table.Th>
                                        <Table.Th>Anterior</Table.Th>
                                        <Table.Th>Nuevo</Table.Th>
                                        <Table.Th>Motivo</Table.Th>
                                        <Table.Th>Estado</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {(budget.adjustments || []).map((a) => (
                                        <Table.Tr key={a.id}>
                                            <Table.Td>{a.adjustmentType}</Table.Td>
                                            <Table.Td>{a.concept}</Table.Td>
                                            <Table.Td>{money(a.previousValue)}</Table.Td>
                                            <Table.Td>{money(a.newValue)}</Table.Td>
                                            <Table.Td>{a.motive}</Table.Td>
                                            <Table.Td><Badge variant="light">{a.status}</Badge></Table.Td>
                                        </Table.Tr>
                                    ))}
                                    {(budget.adjustments || []).length === 0 && (
                                        <Table.Tr>
                                            <Table.Td colSpan={6}>
                                                <Text c="dimmed" ta="center" py="md">Sin ajustes registrados.</Text>
                                            </Table.Td>
                                        </Table.Tr>
                                    )}
                                </Table.Tbody>
                            </Table>
                        </Card>
                    </Tabs.Panel>

                    <Tabs.Panel value="reportes" pt="md">
                        <Stack>
                            <Button color="indigo" w="fit-content" onClick={loadReports}>
                                Generar Estado de Resultados y Mapa de Costos
                            </Button>
                            {incomeStatement && (
                                <Card className="presupuestos-card" padding="lg">
                                    <Title order={4} mb="md">Estado de Resultados Proyectado</Title>
                                    <SimpleGrid cols={{ base: 1, md: 2 }} className="presupuestos-report-block">
                                        <Text>Ingresos operacionales: <b>{money(incomeStatement.incomeOperational)}</b></Text>
                                        <Text>Costo de ventas: <b>{money(incomeStatement.costOfSales?.total)}</b></Text>
                                        <Text>Utilidad bruta: <b>{money(incomeStatement.grossProfit)}</b> ({incomeStatement.grossMargin}%)</Text>
                                        <Text>Gastos operacionales: <b>{money(incomeStatement.operatingExpenses?.total)}</b></Text>
                                        <Text>Utilidad operacional: <b>{money(incomeStatement.operatingProfit)}</b> ({incomeStatement.operatingMargin}%)</Text>
                                        <Text>Gastos financieros: <b>{money(incomeStatement.financialExpenses)}</b></Text>
                                        <Text>Utilidad neta proyectada: <b>{money(incomeStatement.netProfit)}</b> ({incomeStatement.netMargin}%)</Text>
                                    </SimpleGrid>
                                </Card>
                            )}
                            {costMap && (
                                <Card className="presupuestos-card" padding="lg">
                                    <Title order={4} mb="md">Mapa de Costos</Title>
                                    <Text mb="sm">Costo total: <b>{money(costMap.totalCosts)}</b></Text>
                                    <Table>
                                        <Table.Thead>
                                            <Table.Tr>
                                                <Table.Th>Tipo</Table.Th>
                                                <Table.Th>Categoría</Table.Th>
                                                <Table.Th>Total</Table.Th>
                                                <Table.Th>%</Table.Th>
                                            </Table.Tr>
                                        </Table.Thead>
                                        <Table.Tbody>
                                            {(costMap.categories || []).map((c, idx) => (
                                                <Table.Tr key={`${c.lineType}-${c.category}-${idx}`}>
                                                    <Table.Td>{c.lineType}</Table.Td>
                                                    <Table.Td>{c.category}</Table.Td>
                                                    <Table.Td>{money(c.total)}</Table.Td>
                                                    <Table.Td>{c.sharePercent}%</Table.Td>
                                                </Table.Tr>
                                            ))}
                                        </Table.Tbody>
                                    </Table>
                                </Card>
                            )}
                        </Stack>
                    </Tabs.Panel>
                </Tabs>
            </Stack>

            <Modal opened={lineOpen} onClose={() => setLineOpen(false)} title="Agregar línea presupuestal" size="lg">
                <Stack>
                    <Select
                        label="Tipo"
                        data={typeOptions}
                        value={lineForm.lineType}
                        onChange={(v) => setLineForm((p) => ({
                            ...p,
                            lineType: v || 'Income',
                            customLineType: v === OTHER_TYPE ? p.customLineType : '',
                            category: null,
                            customCategory: ''
                        }))}
                    />
                    {lineForm.lineType === OTHER_TYPE && (
                        <TextInput
                            label="Nombre del tipo"
                            placeholder="Ej. Inversión, Contingencia..."
                            value={lineForm.customLineType}
                            onChange={(e) => {
                                const value = e.currentTarget.value;
                                setLineForm((p) => ({
                                    ...p,
                                    customLineType: value,
                                    category: null,
                                    customCategory: ''
                                }));
                            }}
                        />
                    )}
                    <Select
                        key={`category-${lineForm.lineType}-${resolvedLineType}`}
                        label="Categoría"
                        data={categoryOptions}
                        value={lineForm.category}
                        searchable
                        clearable
                        placeholder="Selecciona una categoría"
                        onChange={(v) => setLineForm((p) => ({
                            ...p,
                            category: v,
                            customCategory: v === OTHER_CATEGORY ? p.customCategory : ''
                        }))}
                    />
                    {lineForm.category === OTHER_CATEGORY && (
                        <TextInput
                            label="Nombre de la categoría"
                            placeholder="Escribe la categoría"
                            value={lineForm.customCategory}
                            onChange={(e) => {
                                const value = e.currentTarget.value;
                                setLineForm((p) => ({ ...p, customCategory: value }));
                            }}
                        />
                    )}
                    <TextInput
                        label="Concepto"
                        value={lineForm.concept}
                        onChange={(e) => { const value = e.currentTarget.value; setLineForm((p) => ({ ...p, concept: value })); }}
                    />
                    <Select
                        label="Unidad de negocio"
                        data={buOptions}
                        clearable
                        value={lineForm.businessUnitId}
                        onChange={(v) => setLineForm((p) => ({ ...p, businessUnitId: v }))}
                    />
                    {lineForm.lineType === 'RawMaterial' ? (
                        <SimpleGrid cols={2}>
                            <NumberInput
                                label="Cantidad"
                                value={lineForm.quantity}
                                onChange={(v) => setLineForm((p) => ({ ...p, quantity: v }))}
                            />
                            <NumberInput
                                label="Costo unitario"
                                value={lineForm.unitCost}
                                onChange={(v) => setLineForm((p) => ({ ...p, unitCost: v }))}
                            />
                        </SimpleGrid>
                    ) : (
                        <NumberInput
                            label="Valor proyectado"
                            value={lineForm.projectedValue}
                            onChange={(v) => setLineForm((p) => ({ ...p, projectedValue: v }))}
                            thousandSeparator="."
                            decimalSeparator=","
                        />
                    )}
                    <Select
                        label="Frecuencia"
                        data={['Mensual', 'Trimestral', 'Semestral', 'Anual', 'Eventual']}
                        value={lineForm.frequency}
                        onChange={(v) => setLineForm((p) => ({ ...p, frequency: v || 'Anual' }))}
                    />
                    <Textarea
                        label="Observaciones"
                        value={lineForm.observations}
                        onChange={(e) => { const value = e.currentTarget.value; setLineForm((p) => ({ ...p, observations: value })); }}
                    />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setLineOpen(false)}>Cancelar</Button>
                        <Button color="indigo" onClick={addLine}>Guardar</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal opened={buOpen} onClose={() => setBuOpen(false)} title="Nueva unidad de negocio">
                <Stack>
                    <TextInput label="Nombre" value={buForm.name} onChange={(e) => { const value = e.currentTarget.value; setBuForm((p) => ({ ...p, name: value })); }} />
                    <TextInput label="Responsable" value={buForm.responsible} onChange={(e) => { const value = e.currentTarget.value; setBuForm((p) => ({ ...p, responsible: value })); }} />
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setBuOpen(false)}>Cancelar</Button>
                        <Button color="indigo" onClick={addBu}>Guardar</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal opened={personOpen} onClose={() => setPersonOpen(false)} title="Personal presupuestado" size="lg">
                <Stack>
                    <SimpleGrid cols={{ base: 1, md: 2 }}>
                        <TextInput label="Cargo" value={personForm.position} onChange={(e) => { const value = e.currentTarget.value; setPersonForm((p) => ({ ...p, position: value })); }} />
                        <TextInput label="Área" value={personForm.area} onChange={(e) => { const value = e.currentTarget.value; setPersonForm((p) => ({ ...p, area: value })); }} />
                        <Select
                            label="Categoría"
                            data={categories.filter((c) => c.lineType === 'Personnel').map((c) => c.name)}
                            value={personForm.category}
                            onChange={(v) => setPersonForm((p) => ({ ...p, category: v || p.category }))}
                        />
                        <Select
                            label="Unidad de negocio"
                            data={buOptions}
                            clearable
                            value={personForm.businessUnitId}
                            onChange={(v) => setPersonForm((p) => ({ ...p, businessUnitId: v }))}
                        />
                        <NumberInput label="Cantidad" value={personForm.headcount} onChange={(v) => setPersonForm((p) => ({ ...p, headcount: v || 1 }))} />
                        <NumberInput label="Salario mensual" value={personForm.monthlySalary} onChange={(v) => setPersonForm((p) => ({ ...p, monthlySalary: v || 0 }))} />
                        <NumberInput label="Prestaciones" value={personForm.benefits} onChange={(v) => setPersonForm((p) => ({ ...p, benefits: v || 0 }))} />
                        <NumberInput label="Auxilios" value={personForm.allowances} onChange={(v) => setPersonForm((p) => ({ ...p, allowances: v || 0 }))} />
                    </SimpleGrid>
                    <Group justify="flex-end">
                        <Button variant="default" onClick={() => setPersonOpen(false)}>Cancelar</Button>
                        <Button color="indigo" onClick={addPerson}>Guardar</Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
}
