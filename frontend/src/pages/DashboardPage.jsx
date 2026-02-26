import {
    SimpleGrid,
    Card,
    Text,
    Title,
    Group,
    RingProgress,
    Progress,
    ThemeIcon,
    Badge,
    Stack,
    Box,
} from '@mantine/core';
import {
    IconClipboardList,
    IconTrendingUp,
    IconCurrencyDollar,
    IconAlertTriangle,
    IconChartBar,
} from '@tabler/icons-react';
import './DashboardPage.css';

const stats = [
    { label: 'Ordenes Activas', value: '24', icon: IconClipboardList, color: 'indigo' },
    { label: 'Eficiencia', value: '94%', icon: IconTrendingUp, color: 'teal' },
    { label: 'Ingresos', value: '$12.4M', icon: IconCurrencyDollar, color: 'violet' },
];

const barData = [40, 70, 50, 90, 60, 75, 85];
const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const stockAlerts = [
    { name: 'Materia Prima A', status: 'Bajo', color: 'red' },
    { name: 'Materia Prima B', status: 'Bajo', color: 'red' },
    { name: 'Insumos Envase', status: 'OK', color: 'green' },
    { name: 'Material Empaque', status: 'OK', color: 'green' },
];

export default function DashboardPage() {
    return (
        <div className="fade-in">
            {/* Welcome Banner */}
            <Card className="glass-card welcome-banner" mb="lg">
                <Group justify="space-between" align="flex-start">
                    <div>
                        <Title order={3} c="white" mb={4}>Bienvenido a Producción</Title>
                        <Text size="sm" c="dimmed">Resumen general de las operaciones del día.</Text>
                    </div>
                </Group>
                <SimpleGrid cols={3} mt="xl" spacing="xl">
                    {stats.map((stat) => (
                        <div key={stat.label} className="stat-card">
                            <Group gap="sm" align="center">
                                <ThemeIcon variant="light" color={stat.color} size={42} radius="md">
                                    <stat.icon size={22} stroke={1.5} />
                                </ThemeIcon>
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" style={{ letterSpacing: 1 }}>
                                        {stat.label}
                                    </Text>
                                    <Text size="xl" fw={700} c="white">{stat.value}</Text>
                                </div>
                            </Group>
                        </div>
                    ))}
                </SimpleGrid>
            </Card>

            <SimpleGrid cols={{ base: 1, md: 2, lg: 3 }} spacing="lg">
                {/* Bar Chart Card */}
                <Card className="glass-card">
                    <Group justify="space-between" mb="md">
                        <Title order={5} c="white">Reporte Diario</Title>
                        <IconChartBar size={20} color="#94a3b8" />
                    </Group>
                    <div className="bar-chart-container">
                        {barData.map((height, i) => (
                            <div key={i} className="bar-wrapper">
                                <div
                                    className="bar-fill"
                                    style={{ height: `${height}%` }}
                                />
                                <Text size="xs" c="dimmed" mt={4}>{days[i]}</Text>
                            </div>
                        ))}
                    </div>
                </Card>

                {/* Inventory Alerts */}
                <Card className="glass-card">
                    <Group justify="space-between" mb="md">
                        <Title order={5} c="white">Inventario</Title>
                        <IconAlertTriangle size={20} color="#f59e0b" />
                    </Group>
                    <Stack gap={0}>
                        {stockAlerts.map((item) => (
                            <Group
                                key={item.name}
                                justify="space-between"
                                py="sm"
                                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                            >
                                <Text size="sm" c="white">{item.name}</Text>
                                <Badge
                                    color={item.color}
                                    variant="light"
                                    size="sm"
                                    radius="sm"
                                >
                                    {item.status}
                                </Badge>
                            </Group>
                        ))}
                    </Stack>
                </Card>

                {/* Budget Progress */}
                <Card className="glass-card">
                    <Title order={5} c="white" mb="md">Presupuesto Ejecutado</Title>
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                        <RingProgress
                            size={160}
                            thickness={12}
                            roundCaps
                            sections={[{ value: 75, color: 'indigo' }]}
                            label={
                                <Text ta="center" fw={700} size="xl" c="white">
                                    75%
                                </Text>
                            }
                        />
                    </div>
                    <Stack gap="xs">
                        <Group justify="space-between">
                            <Text size="xs" c="dimmed">Producción</Text>
                            <Text size="xs" c="white">82%</Text>
                        </Group>
                        <Progress value={82} color="indigo" size="sm" radius="xl" />
                        <Group justify="space-between" mt={4}>
                            <Text size="xs" c="dimmed">Administración</Text>
                            <Text size="xs" c="white">65%</Text>
                        </Group>
                        <Progress value={65} color="violet" size="sm" radius="xl" />
                    </Stack>
                </Card>
            </SimpleGrid>
        </div>
    );
}
