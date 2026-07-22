import { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Badge,
    Box,
    Button,
    Card,
    Group,
    Modal,
    Select,
    SimpleGrid,
    Stack,
    Table,
    Text,
    TextInput,
    Textarea,
    Title
} from '@mantine/core';
import {
    IconAlertTriangle,
    IconFilter,
    IconPlus,
    IconReportAnalytics,
    IconWallet
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../utils/api';
import './Presupuestos.css';

const STATUS_COLORS = {
    Pendiente: 'yellow',
    Aprobado: 'green',
    Cerrado: 'gray',
    Cancelado: 'red',
    'En Ajuste': 'orange'
};

const money = (v) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(v || 0);

function createEmptyForm() {
    const year = new Date().getFullYear();
    return {
        company: 'Perla',
        fiscalYear: String(year),
        startDate: `${year}-01-01`,
        endDate: `${year}-12-31`,
        currency: 'COP',
        costCenter: '',
        observations: '',
        businessUnitName: '',
        businessUnitResponsible: ''
    };
}

function toApiDate(value) {
    if (!value) return null;
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}

export default function PresupuestoGeneral() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [company, setCompany] = useState('');
    const [year, setYear] = useState('');
    const [status, setStatus] = useState('all');
    const [opened, setOpened] = useState(false);
    const [form, setForm] = useState(createEmptyForm);
    const [formError, setFormError] = useState('');

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const params = new URLSearchParams();
            if (company.trim()) params.set('company', company.trim());
            if (year.trim()) params.set('fiscalYear', year.trim());
            if (status !== 'all') params.set('status', status);
            const qs = params.toString();
            const data = await api.get(`/budgets${qs ? `?${qs}` : ''}`);
            setItems(data || []);
        } catch (e) {
            setError(e.message || 'No se pudieron cargar los presupuestos.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const kpis = useMemo(() => {
        const total = items.length;
        const pending = items.filter((i) => i.status === 'Pendiente').length;
        const approved = items.filter((i) => i.status === 'Aprobado').length;
        const income = items.reduce((s, i) => s + (i.totalIncome || 0), 0);
        return { total, pending, approved, income };
    }, [items]);

    const handleCreate = async () => {
        setFormError('');
        if (!form.company.trim() || !form.fiscalYear) {
            setFormError('Empresa y vigencia son obligatorios.');
            return;
        }
        try {
            const payload = {
                company: form.company.trim(),
                fiscalYear: Number(form.fiscalYear),
                startDate: toApiDate(form.startDate),
                endDate: toApiDate(form.endDate),
                currency: form.currency,
                costCenter: form.costCenter || null,
                observations: form.observations || null,
                businessUnits: form.businessUnitName.trim()
                    ? [{
                        name: form.businessUnitName.trim(),
                        responsible: form.businessUnitResponsible.trim() || 'Por definir'
                    }]
                    : []
            };
            if (!payload.startDate || !payload.endDate) {
                setFormError('Las fechas de inicio y fin son obligatorias.');
                return;
            }
            const created = await api.post('/budgets', payload);
            setOpened(false);
            setForm(createEmptyForm());
            navigate(`/presupuestos/${created.id}`);
        } catch (e) {
            setFormError(e.message || 'No se pudo crear el presupuesto.');
        }
    };

    return (
            <Box className="presupuestos-page fade-in">
                <Stack gap="lg">
                    <Group justify="space-between" align="end">
                        <Box>
                            <Title order={1} className="presupuestos-title">Presupuesto General</Title>
                            <Text className="presupuestos-subtitle">
                                Gestión de presupuestos por vigencia, unidades de negocio, ingresos, costos, gastos y reportes financieros.
                            </Text>
                        </Box>
                        <Group>
                            <Button
                                leftSection={<IconFilter size={17} />}
                                variant={filtersOpen ? 'light' : 'default'}
                                onClick={() => setFiltersOpen((v) => !v)}
                            >
                                Filtrar
                            </Button>
                            <Button leftSection={<IconPlus size={17} />} color="indigo" onClick={() => setOpened(true)}>
                                Nuevo presupuesto
                            </Button>
                        </Group>
                    </Group>

                    {filtersOpen && (
                        <Card className="presupuestos-card" padding="lg">
                            <SimpleGrid cols={{ base: 1, sm: 3 }}>
                                <TextInput label="Empresa" value={company} onChange={(e) => setCompany(e.currentTarget.value)} />
                                <TextInput label="Vigencia" placeholder="2026" value={year} onChange={(e) => setYear(e.currentTarget.value)} />
                                <Select
                                    label="Estado"
                                    value={status}
                                    onChange={(v) => setStatus(v || 'all')}
                                    data={[
                                        { value: 'all', label: 'Todos' },
                                        { value: 'Pendiente', label: 'Pendiente' },
                                        { value: 'Aprobado', label: 'Aprobado' },
                                        { value: 'En Ajuste', label: 'En Ajuste' },
                                        { value: 'Cerrado', label: 'Cerrado' },
                                        { value: 'Cancelado', label: 'Cancelado' }
                                    ]}
                                />
                            </SimpleGrid>
                            <Group justify="flex-end" mt="md">
                                <Button color="indigo" onClick={load}>Aplicar</Button>
                            </Group>
                        </Card>
                    )}

                    {error && (
                        <Alert color="red" icon={<IconAlertTriangle size={16} />}>{error}</Alert>
                    )}

                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }}>
                        <Card className="presupuestos-kpi" padding="lg">
                            <Text className="presupuestos-kpi-label">Total</Text>
                            <Title order={3}>{kpis.total} Presupuestos</Title>
                        </Card>
                        <Card className="presupuestos-kpi" padding="lg">
                            <Text className="presupuestos-kpi-label">Pendientes</Text>
                            <Title order={3}>{kpis.pending}</Title>
                        </Card>
                        <Card className="presupuestos-kpi" padding="lg">
                            <Text className="presupuestos-kpi-label">Aprobados</Text>
                            <Title order={3}>{kpis.approved}</Title>
                        </Card>
                        <Card className="presupuestos-kpi" padding="lg">
                            <Text className="presupuestos-kpi-label">Ingresos proyectados</Text>
                            <Title order={4}>{money(kpis.income)}</Title>
                        </Card>
                    </SimpleGrid>

                    <Card className="presupuestos-card" padding="lg">
                        {loading ? (
                            <Text c="dimmed" ta="center" py="xl">Cargando presupuestos...</Text>
                        ) : items.length === 0 ? (
                            <Text c="dimmed" ta="center" py="xl">No hay presupuestos registrados.</Text>
                        ) : (
                            <Table highlightOnHover>
                                <Table.Thead>
                                    <Table.Tr>
                                        <Table.Th>Código</Table.Th>
                                        <Table.Th>Empresa</Table.Th>
                                        <Table.Th>Vigencia</Table.Th>
                                        <Table.Th>Moneda</Table.Th>
                                        <Table.Th>U. Negocio</Table.Th>
                                        <Table.Th>Ingresos</Table.Th>
                                        <Table.Th>Estado</Table.Th>
                                    </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                    {items.map((item) => (
                                        <Table.Tr
                                            key={item.id}
                                            className="presupuestos-table-row"
                                            onClick={() => navigate(`/presupuestos/${item.id}`)}
                                        >
                                            <Table.Td>
                                                <Group gap={6}>
                                                    <IconWallet size={14} />
                                                    <Text fw={600}>{item.code}</Text>
                                                </Group>
                                            </Table.Td>
                                            <Table.Td>{item.company}</Table.Td>
                                            <Table.Td>{item.fiscalYear}</Table.Td>
                                            <Table.Td>{item.currency}</Table.Td>
                                            <Table.Td>{item.businessUnitCount}</Table.Td>
                                            <Table.Td>{money(item.totalIncome)}</Table.Td>
                                            <Table.Td>
                                                <Badge color={STATUS_COLORS[item.status] || 'gray'} variant="light">
                                                    {item.status}
                                                </Badge>
                                            </Table.Td>
                                        </Table.Tr>
                                    ))}
                                </Table.Tbody>
                            </Table>
                        )}
                    </Card>
                </Stack>

                <Modal opened={opened} onClose={() => setOpened(false)} title="Nuevo Presupuesto General" size="lg">
                    <Stack>
                        {formError && <Alert color="red">{formError}</Alert>}
                        <SimpleGrid cols={{ base: 1, md: 2 }}>
                            <TextInput
                                label="Empresa"
                                value={form.company}
                                onChange={(e) => {
                                    const value = e.currentTarget.value;
                                    setForm((p) => ({ ...p, company: value }));
                                }}
                            />
                            <Select
                                label="Vigencia"
                                value={form.fiscalYear}
                                onChange={(v) => setForm((p) => ({ ...p, fiscalYear: v || p.fiscalYear }))}
                                data={['2025', '2026', '2027', '2028']}
                            />
                            <TextInput
                                label="Fecha inicio"
                                type="date"
                                value={form.startDate || ''}
                                onChange={(e) => {
                                    const value = e.currentTarget.value;
                                    setForm((p) => ({ ...p, startDate: value }));
                                }}
                            />
                            <TextInput
                                label="Fecha fin"
                                type="date"
                                value={form.endDate || ''}
                                onChange={(e) => {
                                    const value = e.currentTarget.value;
                                    setForm((p) => ({ ...p, endDate: value }));
                                }}
                            />
                            <Select
                                label="Moneda"
                                value={form.currency}
                                onChange={(v) => setForm((p) => ({ ...p, currency: v || 'COP' }))}
                                data={['COP', 'USD', 'EUR']}
                            />
                            <TextInput
                                label="Centro de costos"
                                value={form.costCenter}
                                onChange={(e) => {
                                    const value = e.currentTarget.value;
                                    setForm((p) => ({ ...p, costCenter: value }));
                                }}
                            />
                            <TextInput
                                label="Unidad de negocio (opcional)"
                                value={form.businessUnitName}
                                onChange={(e) => {
                                    const value = e.currentTarget.value;
                                    setForm((p) => ({ ...p, businessUnitName: value }));
                                }}
                            />
                            <TextInput
                                label="Responsable U.N."
                                value={form.businessUnitResponsible}
                                onChange={(e) => {
                                    const value = e.currentTarget.value;
                                    setForm((p) => ({ ...p, businessUnitResponsible: value }));
                                }}
                            />
                        </SimpleGrid>
                        <Textarea
                            label="Observaciones"
                            value={form.observations}
                            onChange={(e) => {
                                const value = e.currentTarget.value;
                                setForm((p) => ({ ...p, observations: value }));
                            }}
                        />
                        <Group justify="flex-end">
                            <Button variant="default" onClick={() => setOpened(false)}>Cancelar</Button>
                            <Button color="indigo" leftSection={<IconReportAnalytics size={16} />} onClick={handleCreate}>
                                Crear
                            </Button>
                        </Group>
                    </Stack>
                </Modal>
            </Box>
    );
}
