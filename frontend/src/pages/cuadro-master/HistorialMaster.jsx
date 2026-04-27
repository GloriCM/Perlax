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
    Table,
    Badge,
    Center
} from '@mantine/core';
import { 
    IconArrowLeft, 
    IconCalendar, 
    IconChevronLeft, 
    IconChevronRight, 
    IconRefresh, 
    IconSearch
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';

const HISTORIAL_DATA = [
    {
        fecha: '19/3/2026',
        operario: 'Enrique Muñoz Hector Hilde',
        maquina: '6 SpeedMaster',
        op: '7495',
        actividad: 'Puesta a Punto',
        inicio: '07:02:52',
        fin: '---',
        tiempo: 'En Progreso',
        tiros: '-',
        desp: '-',
        pago: '-'
    }
];

export default function HistorialMaster() {
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
                    
                    {/* Brand Header */}
                    <Group justify="center" mb="xl">
                        <Title order={3} style={{ fontFamily: 'serif', fontStyle: 'italic', color: 'white' }}>
                            aleph <span style={{ color: '#f472b6', fontSize: 13, verticalAlign: 'middle' }}>impresores</span>
                        </Title>
                        <Title order={2} c="white" fw={800}>Explorador de Producción</Title>
                    </Group>

                    {/* Date Navigation */}
                    <Paper p="md" mb="lg" style={{ background: 'transparent' }}>
                        <Group justify="space-between">
                            <Button variant="filled" color="gray.7" leftSection={<IconChevronLeft size={16} />}>
                                Día Anterior
                            </Button>
                            
                            <Stack align="center" gap={5}>
                                <Title order={4} c="white">Jueves 19 de Mar 2026</Title>
                                <Group gap={5} style={{ background: 'rgba(255,255,255,0.05)', padding: '5px 15px', borderRadius: '4px', cursor: 'pointer' }}>
                                    <Text size="sm" c="dimmed">19/03/2026</Text>
                                    <IconCalendar size={16} color="#94a3b8" />
                                </Group>
                            </Stack>

                            <Button variant="filled" color="gray.7" rightSection={<IconChevronRight size={16} />}>
                                Día Siguiente
                            </Button>
                        </Group>
                    </Paper>

                    {/* Filters */}
                    <Grid mb="md">
                        <Grid.Col span={6}>
                            <Stack gap={4}>
                                <Text size="xs" fw={700} c="dimmed">Máquina:</Text>
                                <Select 
                                    data={['Todas las Máquinas']} 
                                    defaultValue="Todas las Máquinas" 
                                    styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white' } }}
                                />
                            </Stack>
                        </Grid.Col>
                        <Grid.Col span={6}>
                            <Stack gap={4}>
                                <Text size="xs" fw={700} c="dimmed">Operario:</Text>
                                <Select 
                                    data={['Todos los Operarios']} 
                                    defaultValue="Todos los Operarios" 
                                    styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white' } }}
                                />
                            </Stack>
                        </Grid.Col>
                    </Grid>

                    {/* Update Button */}
                    <Stack gap={4} mb="xl">
                        <Button 
                            fullWidth 
                            size="lg" 
                            color="blue.6" 
                            leftSection={<IconRefresh size={20} />}
                            fw={700}
                        >
                            Actualizar Ahora
                        </Button>
                        <Center>
                            <Text size="xs" c="dimmed">Actualización en tiempo real (4s)</Text>
                        </Center>
                    </Stack>

                    {/* Results Table */}
                    <Text size="sm" style={{ fontStyle: 'italic' }} c="dimmed" mb="xs">Resultados: 1 registros</Text>
                    <Paper style={{ background: 'transparent', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }} radius="md">
                        <Table verticalSpacing="sm">
                            <Table.Thead style={{ background: '#1e293b' }}>
                                <Table.Tr>
                                    <Table.Th c="white">Fecha</Table.Th>
                                    <Table.Th c="white">Operario</Table.Th>
                                    <Table.Th c="white">Máquina</Table.Th>
                                    <Table.Th c="white">OP</Table.Th>
                                    <Table.Th c="white">Actividad</Table.Th>
                                    <Table.Th c="white">Inicio</Table.Th>
                                    <Table.Th c="white">Fin</Table.Th>
                                    <Table.Th c="white">Tiempo</Table.Th>
                                    <Table.Th c="white">Tiros</Table.Th>
                                    <Table.Th c="white">Desp</Table.Th>
                                    <Table.Th c="white">Pago</Table.Th>
                                </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                                {HISTORIAL_DATA.map((row, i) => (
                                    <Table.Tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Table.Td c="dimmed" size="xs">{row.fecha}</Table.Td>
                                        <Table.Td c="dimmed" size="xs">{row.operario}</Table.Td>
                                        <Table.Td c="dimmed" size="xs">{row.maquina}</Table.Td>
                                        <Table.Td c="dimmed" size="xs">{row.op}</Table.Td>
                                        <Table.Td fw={700} c="blue.4">{row.actividad}</Table.Td>
                                        <Table.Td c="dimmed" size="xs">{row.inicio}</Table.Td>
                                        <Table.Td c="dimmed" size="xs">{row.fin}</Table.Td>
                                        <Table.Td fw={700} c="blue.4">{row.tiempo}</Table.Td>
                                        <Table.Td c="dimmed" size="xs" ta="center">{row.tiros}</Table.Td>
                                        <Table.Td c="dimmed" size="xs" ta="center">{row.desp}</Table.Td>
                                        <Table.Td c="dimmed" size="xs" ta="center">{row.pago}</Table.Td>
                                    </Table.Tr>
                                ))}
                            </Table.Tbody>
                            <Table.Tfoot style={{ background: 'rgba(255,255,255,0.02)' }}>
                                <Table.Tr>
                                    <Table.Td fw={800} c="white">TOTALES</Table.Td>
                                    <Table.Td colSpan={6}></Table.Td>
                                    <Table.Td fw={700} c="white" ta="right">00:00:00</Table.Td>
                                    <Table.Td fw={700} c="white" ta="center">0</Table.Td>
                                    <Table.Td fw={700} c="white" ta="center">0</Table.Td>
                                    <Table.Td fw={700} c="white" ta="center">-</Table.Td>
                                </Table.Tr>
                            </Table.Tfoot>
                        </Table>
                    </Paper>
                </Paper>
            </Container>
        </Box>
    );
}
