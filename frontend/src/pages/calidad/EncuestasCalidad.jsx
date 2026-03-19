import React, { useState } from 'react';
import {
    Container,
    Paper,
    Title,
    Text,
    Group,
    Stack,
    Button,
    ActionIcon,
    Box,
    Select,
    SimpleGrid,
    Table,
    Badge,
    ThemeIcon,
    ScrollArea,
    Progress
} from '@mantine/core';
import {
    IconArrowLeft,
    IconRefresh,
    IconFileTypePdf,
    IconFileSpreadsheet,
    IconInfoCircle,
    IconPhoto,
    IconCheck,
    IconAlertTriangle,
    IconCircleX,
    IconTrendingUp
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const mockDefectos = [
    { name: 'Otros', value: 22, color: '#f97316' },
    { name: 'Marcas superficiales', value: 20, color: '#fb923c' },
];

const mockData = [
    {
        fecha: '16/3/2026 12:57 p. m.',
        operario: 'Roldan Barona Erik Esteban',
        maquina: '8B Troqueladora de Papel',
        op: '7408',
        proceso: 'Troquelado',
        estado: 'En proceso',
        novedades: null,
        fotos: 0
    },
    {
        fecha: '14/3/2026 05:24 p. m.',
        operario: 'Obando Higuita Jose Luis',
        maquina: '6 SpeedMaster',
        op: '7388',
        proceso: 'Impresión',
        estado: 'Terminado',
        novedades: 3,
        fotos: 3
    },
    {
        fecha: '13/3/2026 08:50 p. m.',
        operario: 'Josue lopez',
        maquina: '7 SpeedMaster',
        op: '7486',
        proceso: 'Impresión',
        estado: 'Terminado',
        novedades: 2,
        fotos: 2
    },
    {
        fecha: '13/3/2026 03:35 p. m.',
        operario: 'Obando Higuita Jose Luis',
        maquina: '6 SpeedMaster',
        op: '7451',
        proceso: 'Impresión',
        estado: 'Terminado',
        novedades: 4,
        fotos: 4
    },
];

const EncuestasCalidad = () => {
    const navigate = useNavigate();

    return (
        <Container size="xl" py="md">
            {/* Header */}
            <Paper p="md" radius="lg" mb="sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <Group justify="space-between" align="center">
                    <Group>
                        <Button
                            variant="filled"
                            color="gray.8"
                            size="compact-xs"
                            leftSection={<IconArrowLeft size={14} />}
                            onClick={() => navigate('/')}
                            fw={700}
                        >
                            Volver al Panel
                        </Button>
                        <Title order={4} c="white" ml="xl">Encuestas de Calidad</Title>
                    </Group>
                    <img src="/Nuevo-perla-Sinfondo.png" alt="Perla" style={{ height: 30 }} />
                </Group>
            </Paper>


            {/* Filters Row */}
            <Group gap="md" mb="md" align="flex-end">
                <Group gap="xs">
                    <Select size="xs" label="Mes" placeholder="Marzo" data={['Enero', 'Febrero', 'Marzo']} defaultValue="Marzo" style={{ width: 110 }} />
                    <Select size="xs" label="Año" placeholder="2026" data={['2025', '2026']} defaultValue="2026" style={{ width: 90 }} />
                </Group>

                <Group gap="xs" ml="auto">
                    <Button variant="filled" color="blue" leftSection={<IconRefresh size={16} />} size="xs" fw={700}>Actualizar</Button>
                    <Button variant="filled" color="green" leftSection={<IconFileTypePdf size={16} />} size="xs" fw={700}>PDF</Button>
                    <Button variant="filled" color="dark" leftSection={<IconFileSpreadsheet size={16} />} size="xs" fw={700}>Excel</Button>
                    <Button variant="filled" color="indigo" leftSection={<IconInfoCircle size={16} />} size="xs" fw={700}>Detalles de OP</Button>
                </Group>
            </Group>

            {/* Secondary Filters */}
            <SimpleGrid cols={6} spacing="xs" mb="xl">
                <Select size="xs" label="Día" placeholder="Todos" data={['Todos', '1', '2']} defaultValue="Todos" />
                <Select size="xs" label="Máquina" placeholder="Todas" data={['Todas', 'SpeedMaster']} defaultValue="Todas" />
                <Select size="xs" label="Proceso" placeholder="Todos" data={['Todos', 'Impresión']} defaultValue="Todos" />
                <Select size="xs" label="Estado" placeholder="Todos" data={['Todos', 'Terminado']} defaultValue="Todos" />
                <Select size="xs" label="Estatus" placeholder="Todos" data={['Todos', 'OK']} defaultValue="Todos" />
                <Select size="xs" label="Defecto" placeholder="Cualquiera" data={['Cualquiera']} defaultValue="Cualquiera" />
            </SimpleGrid>

            {/* Analytics Rows */}
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg" mb="xl">
                <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                    <Text size="sm" c="dimmed">Total</Text>
                    <Text size="xl" fw={800} c="white">43</Text>
                </Paper>
                <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '4px solid #22c55e', textAlign: 'center' }}>
                    <Text size="sm" c="dimmed">Calidad OK</Text>
                    <Text size="xl" fw={800} c="white">6</Text>
                    <Text size="xs" c="dimmed">14.0%</Text>
                </Paper>
                <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.03)', borderLeft: '4px solid #ef4444', textAlign: 'center' }}>
                    <Text size="sm" c="dimmed">Con Defectos</Text>
                    <Text size="xl" fw={800} c="white">37</Text>
                    <Text size="xs" c="dimmed">86.0%</Text>
                </Paper>
            </SimpleGrid>

            {/* Charts/MiniTables */}
            <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg" mb="xl">
                <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Group justify="space-between" mb="md">
                        <Title order={5} c="white">Top 5 Defectos Recurrentes</Title>
                    </Group>
                    <Stack gap="xs">
                        {mockDefectos.map(def => (
                            <Box key={def.name}>
                                <Group justify="space-between" mb={2}>
                                    <Text size="xs" c="gray.4">{def.name}</Text>
                                    <Text size="xs" fw={700} c="white">{def.value}</Text>
                                </Group>
                                <Progress value={(def.value / 22) * 100} color={def.color} size="sm" radius="xl" />
                            </Box>
                        ))}
                    </Stack>
                </Paper>

                <Paper p="md" radius="md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <Title order={5} c="white" mb="md">Calidad por Máquina</Title>
                    <Table verticalSpacing="xs">
                        <thead>
                            <tr>
                                <th style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 500 }}>Máquina</th>
                                <th style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 500 }}>Total</th>
                                <th style={{ color: '#94a3b8', fontSize: '11px', fontWeight: 500 }}>Fallos</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style={{ color: 'white', fontSize: '13px' }}>6 SpeedMaster</td>
                                <td style={{ color: 'white', fontSize: '13px' }}>7</td>
                                <td style={{ color: 'white', fontSize: '13px' }}>
                                    <Badge color="red.7" variant="filled">7</Badge>
                                </td>
                            </tr>
                        </tbody>
                    </Table>
                </Paper>
            </SimpleGrid>

            {/* Main Table */}
            <Paper p="0" radius="md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                <ScrollArea offsetScrollbars scrollbarSize={10}>
                    <Table
                        verticalSpacing={1}
                        horizontalSpacing="md"
                        mih={1000}
                        style={{ tableLayout: 'fixed' }}
                        styles={{
                            th: { padding: '4px 8px !important', fontSize: '10px' },
                            td: { padding: '3px 8px !important', fontSize: '11px' }
                        }}
                    >
                        <thead style={{ background: 'rgba(255,255,255,0.05)' }}>
                            <tr>
                                <th style={{ color: '#94a3b8', width: '150px' }}>Fecha</th>
                                <th style={{ color: '#94a3b8', width: '200px' }}>Operario</th>
                                <th style={{ color: '#94a3b8', width: '180px' }}>Máquina</th>
                                <th style={{ color: '#94a3b8', width: '80px' }}>OP</th>
                                <th style={{ color: '#94a3b8', width: '120px' }}>Proceso</th>
                                <th style={{ color: '#94a3b8', width: '100px' }}>Estado</th>
                                <th style={{ color: '#94a3b8', width: '60px' }}>Nov.</th>
                                <th style={{ color: '#94a3b8', width: '80px' }}>Foto</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockData.map((item, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <td style={{ color: 'white' }}>{item.fecha}</td>
                                    <td style={{ color: 'white' }}>{item.operario}</td>
                                    <td style={{ color: 'white' }}>{item.maquina}</td>
                                    <td style={{ color: 'white', fontWeight: 700 }}>{item.op}</td>
                                    <td style={{ color: 'white' }}>{item.proceso}</td>
                                    <td>
                                        <Badge
                                            color={item.estado === 'Terminado' ? 'green' : 'orange'}
                                            variant="outline"
                                            size="xs"
                                        >
                                            {item.estado}
                                        </Badge>
                                    </td>
                                    <td>
                                        {item.novedades ? (
                                            <Text fw={700} c="red.5" size="xs">{item.novedades}</Text>
                                        ) : (
                                            <IconCheck size={14} color="#22c55e" />
                                        )}
                                    </td>
                                    <td>
                                        {item.fotos > 0 && (
                                            <Group gap={4}>
                                                <IconPhoto size={14} color="#94a3b8" />
                                                <Text size="xs" c="dimmed">({item.fotos})</Text>
                                            </Group>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </ScrollArea>
            </Paper>
        </Container>
    );
};

export default EncuestasCalidad;
