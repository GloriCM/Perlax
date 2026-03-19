import { Title, Text, Group, SimpleGrid, Paper, ThemeIcon, Stack } from '@mantine/core';
import { IconEngine, IconTools, IconClock, IconAlertCircle, IconCheck } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export default function PanelMantenimiento() {
    const navigate = useNavigate();

    const stats = [
        { label: 'Total Equipos', value: '42', icon: IconEngine, color: 'blue' },
        { label: 'En Inventario', value: '38', icon: IconCheck, color: 'green' },
        { label: 'En Mantenimiento', value: '3', icon: IconTools, color: 'orange' },
        { label: 'Urgentes', value: '1', icon: IconAlertCircle, color: 'red' },
    ];

    return (
        <div className="panel-mantenimiento-container fade-in" style={{ padding: '20px' }}>
            <Stack gap="xl">
                <Group justify="space-between">
                    <div>
                        <Title order={2} c="white">Panel de Control - Mantenimiento</Title>
                        <Text c="dimmed">Resumen general del estado de los activos</Text>
                    </div>
                </Group>

                <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                    {stats.map((stat) => (
                        <Paper key={stat.label} p="md" radius="md" withBorder style={{
                            background: 'rgba(255,255,255,0.03)',
                            backdropFilter: 'blur(10px)',
                            borderColor: 'rgba(255,255,255,0.1)'
                        }}>
                            <Group>
                                <ThemeIcon size="xl" radius="md" variant="light" color={stat.color}>
                                    <stat.icon size={24} />
                                </ThemeIcon>
                                <div>
                                    <Text size="xs" c="dimmed" tt="uppercase" fw={700}>
                                        {stat.label}
                                    </Text>
                                    <Text fw={700} size="xl">
                                        {stat.value}
                                    </Text>
                                </div>
                            </Group>
                        </Paper>
                    ))}
                </SimpleGrid>

                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                    <Paper p="xl" radius="md" withBorder
                        onClick={() => navigate('/mantenimiento/equipos')}
                        style={{
                            background: 'rgba(255,255,255,0.03)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                        }}
                        className="hover-card"
                    >
                        <Stack align="center" gap="xs">
                            <IconEngine size={48} color="#228be6" />
                            <Title order={3}>Gestión de Equipos</Title>
                            <Text ta="center" c="dimmed">
                                Ver listado completo, hojas de vida y asignar mantenimientos.
                            </Text>
                        </Stack>
                    </Paper>

                    <Paper p="xl" radius="md" withBorder
                        style={{ background: 'rgba(255,255,255,0.03)', opacity: 0.7 }}
                    >
                        <Stack align="center" gap="xs">
                            <IconClock size={48} color="#fab005" />
                            <Title order={3}>Próximos Mantenimientos</Title>
                            <Text ta="center" c="dimmed">
                                Calendario de inspecciones preventivas.
                            </Text>
                            <Text size="xs" c="orange" fw={700}>PRÓXIMAMENTE</Text>
                        </Stack>
                    </Paper>
                </SimpleGrid>
            </Stack>
        </div>
    );
}
