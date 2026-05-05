import React, { useState } from 'react';
import { 
    Container, 
    Paper, 
    Title, 
    Button, 
    Group, 
    Select, 
    Text, 
    Box, 
    Stack, 
    ActionIcon, 
    Grid,
    Divider,
    ScrollArea,
    Badge
} from '@mantine/core';
import { 
    IconArrowLeft, 
    IconFileTypePdf, 
    IconRefresh, 
    IconReportAnalytics, 
    IconUser, 
    IconDownload,
    IconMoon
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';

const OPERARIOS_DATA = [
    {
        nombre: 'Enrique Muñoz Hector Hilde',
        maquina: '6 SpeedMaster',
        meta: '56.950',
        reportados: '5.764',
        equivalentes: '17.500',
        cambios: '7',
        totales: '23.264',
        ultima: '19/03/2026',
        dias: 4
    },
    {
        nombre: 'Josue lopez',
        maquina: '7 SpeedMaster',
        meta: '45.000',
        reportados: '12.000',
        equivalentes: '8.000',
        cambios: '12',
        totales: '20.000',
        ultima: '18/03/2026',
        dias: 3
    }
];

export default function TableroMaster() {
    const navigate = useNavigate();

    return (
        <Box style={{ background: '#0f172a', minHeight: '100vh', width: '100%' }} px="md">
            <TopBar />
            {/* Header Block */}
            <Paper p="lg" radius={0} style={{ background: 'transparent' }}>
                <Group justify="space-between" align="center">
                    <Group>
                        <Button variant="filled" color="gray.8" size="compact-xs" leftSection={<IconArrowLeft size={14} />} onClick={() => navigate('/')} fw={700}>
                            Volver al Panel
                        </Button>
                        <Title order={4} c="white" ml="xl">Administración Master</Title>
                    </Group>
                    <img src="/Nuevo-perla-Sinfondo.png" alt="Perla" style={{ height: 30 }} />
                </Group>
            </Paper>

            <Container size="100%" px="md" pb="xl">
                <Paper p="xl" radius="lg" style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    
                    {/* Brand and Theme Row */}
                    <Group justify="space-between" mb="lg">
                        <Group>
                            <Box>
                                <Title order={3} style={{ fontFamily: 'serif', fontStyle: 'italic', color: 'white', marginBottom: 0 }}>
                                    aleph <span style={{ color: '#f472b6', fontSize: 13, verticalAlign: 'middle' }}>impresores</span>
                                </Title>
                                <Group gap={6} mt={4}>
                                    <Box w={5} h={5} style={{ borderRadius: '50%', background: '#ff0000' }} />
                                    <Box w={5} h={5} style={{ borderRadius: '50%', background: '#ffcc00' }} />
                                    <Box w={5} h={5} style={{ borderRadius: '50%', background: '#00ccff' }} />
                                    <Box w={5} h={5} style={{ borderRadius: '50%', background: '#ffffff' }} />
                                </Group>
                            </Box>
                            <ActionIcon variant="light" color="gray" radius="xl" size="lg" ml="md">
                                <IconMoon size={20} />
                            </ActionIcon>
                        </Group>
                        <Title order={3} c="white" fw={800} tt="uppercase">Tablero Semáforos</Title>
                    </Group>

                    {/* Main Filters Row */}
                    <Paper p="md" radius="md" mb="xl" style={{ border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.02)' }}>
                        <Grid align="flex-end">
                            <Grid.Col span={2}>
                                <Stack gap={4}>
                                    <Text size="xs" fw={700} c="dimmed">Año</Text>
                                    <Select data={['2026']} defaultValue="2026" size="xs" styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white' } }} />
                                </Stack>
                            </Grid.Col>
                            <Grid.Col span={2}>
                                <Stack gap={4}>
                                    <Text size="xs" fw={700} c="dimmed">Mes</Text>
                                    <Select data={['Marzo']} defaultValue="Marzo" size="xs" styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white' } }} />
                                </Stack>
                            </Grid.Col>
                            <Grid.Col span="content">
                                <ActionIcon variant="filled" color="blue.6" size="md" mb={2}>
                                    <IconRefresh size={18} />
                                </ActionIcon>
                            </Grid.Col>
                            <Grid.Col span="auto"></Grid.Col>
                            <Grid.Col span={3}>
                                <Stack gap={4}>
                                    <Text size="xs" fw={700} c="dimmed">Filtro Máquina</Text>
                                    <Select data={['Todas']} defaultValue="Todas" size="xs" styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white' } }} />
                                </Stack>
                            </Grid.Col>
                            <Grid.Col span={3}>
                                <Stack gap={4}>
                                    <Text size="xs" fw={700} c="dimmed">Filtro Operario</Text>
                                    <Select data={['Todos']} defaultValue="Todos" size="xs" styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white' } }} />
                                </Stack>
                            </Grid.Col>
                        </Grid>
                    </Paper>

                    {/* PDF Reports Section */}
                    <Title order={4} c="white" mb="md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconReportAnalytics size={24} color="#6366f1" /> Generar Reportes PDF
                    </Title>
                    <Paper p="xl" radius="md" mb="xl" style={{ border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(255, 255, 255, 0.02)' }}>
                        <Grid align="flex-end">
                            <Grid.Col span={4}>
                                <Stack gap={4}>
                                    <Text size="xs" fw={700} c="dimmed">Tipo de Reporte:</Text>
                                    <Select data={['General (Todos)']} defaultValue="General (Todos)" size="md" styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white' } }} />
                                </Stack>
                            </Grid.Col>
                            <Grid.Col span={4}>
                                <Stack gap={4}>
                                    <Text size="xs" fw={700} c="dimmed">Periodo:</Text>
                                    <Select data={['Mensual']} defaultValue="Mensual" size="md" styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white' } }} />
                                </Stack>
                            </Grid.Col>
                            <Grid.Col span="content">
                                <ActionIcon variant="filled" color="blue.6" size="xl" mb={2}>
                                    <IconRefresh size={24} />
                                </ActionIcon>
                            </Grid.Col>
                            <Grid.Col span={12} ta="center" mt="xl">
                                <Button size="lg" color="green.7" radius="md" px={60} leftSection={<IconFileTypePdf size={24} />}>
                                    Exportar PDF
                                </Button>
                            </Grid.Col>
                        </Grid>
                    </Paper>

                    {/* Por Operario Section */}
                    <Title order={4} c="white" mb="md" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <IconUser size={24} color="#f59e0b" /> Por Operario
                    </Title>
                    <Stack gap="md">
                        {OPERARIOS_DATA.map((op, i) => (
                            <Paper key={i} p="md" radius="md" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <Group justify="space-between" align="flex-start">
                                    <Stack gap={4}>
                                        <Text c="white" fw={800} size="lg">{op.nombre} — <span style={{ color: '#94a3b8', fontWeight: 500 }}>{op.maquina}</span></Text>
                                        <Grid gap="xl" mt={4}>
                                            <Grid.Col span="content">
                                                <Text size="xs" c="dimmed">Meta 100%: <span style={{ color: '#60a5fa', fontWeight: 600 }}>{op.meta}</span></Text>
                                                <Text size="xs" c="dimmed">Tiros Reportados: <span style={{ color: '#94a3b8' }}>{op.reportados}</span></Text>
                                                <Text size="xs" c="dimmed">Tiros Equivalentes: <span style={{ color: '#94a3b8' }}>{op.equivalentes}</span></Text>
                                                <Text size="xs" c="dimmed">Cambios Totales: <span style={{ color: '#94a3b8' }}>{op.cambios}</span></Text>
                                                <Text size="sm" c="white" fw={800} mt={4}>Tiros Totales: {op.totales}</Text>
                                                <Text size="xs" c="dimmed" mt={2} style={{ fontStyle: 'italic' }}>Última: {op.ultima}</Text>
                                            </Grid.Col>
                                        </Grid>
                                    </Stack>
                                    <Box ta="right">
                                        <Badge color="blue.9" variant="filled" size="lg" radius="xs" leftSection={<Text size="xs">Días:</Text>}>{op.dias}</Badge>
                                    </Box>
                                </Group>
                            </Paper>
                        ))}
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
