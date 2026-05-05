import React, { useState } from 'react';
import { Container, Paper, Title, Button, Group, Select, Text, SimpleGrid, RingProgress, Stack, Box } from '@mantine/core';
import { IconArrowLeft, IconChartBar, IconFileAnalytics, IconDownload, IconExternalLink } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import GastosTabs from '../../../components/GastosTabs';

export default function GraficasSST() {
    const navigate = useNavigate();
    const [year, setYear] = useState('2026');

    const stats = [
        { label: 'Presupuesto', value: 0, color: 'blue' },
        { label: 'Gastado', value: 13414683, color: 'green' },
        { label: 'Exceso', value: 13414683, color: 'red' },
        { label: 'Registros', value: 25, color: 'gray' },
    ];

    const performance = [
        { label: 'Arreglos locativos (Para riesgo Mecanico, locativo)', value: 6395798, budget: 0 },
        { label: 'Honorarios Asesor Externo SST', value: 3400000, budget: 0 },
        { label: 'Examenes Medicos (Ingreso, Periodicos, Egreso, Post Incapacidad, o de Seguimiento', value: 1027594, budget: 0 },
    ];

    return (
        <Container size="xl" py="xl">
            <Paper p="lg" radius="lg" mb="lg" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Group justify="space-between" align="center">
                    <Group>
                        <Button variant="filled" color="gray.8" size="compact-xs" leftSection={<IconArrowLeft size={14} />} onClick={() => navigate('/')} fw={700}>
                            Volver al Panel
                        </Button>
                        <Title order={4} c="white" ml="xl">Captura de Gastos SST</Title>
                    </Group>
                    <img src="/Nuevo-perla-Sinfondo.png" alt="Perla" style={{ height: 30 }} />
                </Group>
            </Paper>

            <Paper p="md" radius="lg" mb="lg" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Group justify="space-between">
                    <Group gap="sm">
                        <IconChartBar size={20} color="#94a3b8" />
                        <Title order={5} c="white">Dashboard Anual Completo</Title>
                    </Group>
                    <Group gap="sm">
                        <Button variant="filled" color="teal" size="xs" leftSection={<IconFileAnalytics size={16} />}>Generar Informe</Button>
                        <Button variant="filled" color="blue" size="xs" leftSection={<IconDownload size={16} />}>Exportar CSV</Button>
                        <Stack gap={2}>
                            <Select data={['Todo el Año']} defaultValue="Todo el Año" size="xs" w={120} />
                            <Select data={['2026']} value={year} onChange={setYear} size="xs" w={120} />
                        </Stack>
                    </Group>
                </Group>
            </Paper>

            <SimpleGrid cols={{ base: 1, sm: 4 }} spacing="md" mb="lg">
                {stats.map((stat) => (
                    <Paper key={stat.label} p="md" radius="lg" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
                        <Text size="xs" c="dimmed" fw={600} tt="uppercase">{stat.label}</Text>
                        <Text fw={800} size="lg" c={stat.color === 'red' ? 'red.6' : 'white'}>
                            {stat.label === 'Registros' ? stat.value : `$ ${stat.value.toLocaleString('es-CO')}`}
                        </Text>
                    </Paper>
                ))}
            </SimpleGrid>

            <Paper p="lg" radius="lg" mb="lg" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Title order={6} c="white" mb="md">Ejecución Anual Completo</Title>
                <Box h={20} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '10px', overflow: 'hidden' }}>
                    <Box w="0%" h="100%" style={{ background: '#3b82f6' }} />
                </Box>
                <Text size="xs" ta="center" mt={4} c="dimmed">0% ejecutado</Text>
            </Paper>

            <Paper p="lg" radius="lg" style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <Title order={6} c="white" mb="xl">Desempeño por Tipo de Servicio</Title>
                <Stack gap="xl">
                    {performance.map((item) => (
                        <Stack key={item.label} gap={4}>
                            <Group justify="space-between">
                                <Text size="sm" fw={600} c="blue.4" style={{ cursor: 'pointer', textDecoration: 'underline' }}>{item.label} 🤙</Text>
                                <Text size="sm" fw={700} c="white">$ {item.value.toLocaleString('es-CO')} / $ 0</Text>
                            </Group>
                            <Box h={8} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                <Box w="100%" h="100%" style={{ background: '#ef4444' }} />
                            </Box>
                            <Text size="xs" c="red.4" fw={600}>⚠️ Superó presupuesto por $ {item.value.toLocaleString('es-CO')}</Text>
                        </Stack>
                    ))}
                </Stack>
            </Paper>
        </Container>
    );
}
