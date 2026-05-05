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
    TextInput, 
    ActionIcon, 
    Badge, 
    Divider,
    ScrollArea
} from '@mantine/core';
import { 
    IconArrowLeft, 
    IconFilePlus, 
    IconFileTypePdf, 
    IconSettings, 
    IconPencil, 
    IconTrash, 
    IconCalendarEvent 
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';

const DESPERDICIO_DATA = [
    { 
        id: 1, 
        codigo: '02', 
        descripcion: 'Desperdicio durante la configuración o pruebas iniciales de la máquina', 
        op: '7499', 
        maquina: '6 SpeedMaster', 
        operario: 'Enrique Muñoz Hector Hilde', 
        fecha: '2026-03-18', 
        valor: 90 
    },
    { 
        id: 2, 
        codigo: '02', 
        descripcion: 'Desperdicio durante la configuración o pruebas iniciales de la máquina', 
        op: '7482', 
        maquina: '7 SpeedMaster', 
        operario: 'Josue lopez', 
        fecha: '2026-03-18', 
        valor: 50 
    },
    { 
        id: 3, 
        codigo: '02', 
        descripcion: 'Desperdicio durante la configuración o pruebas iniciales de la máquina', 
        op: '7482', 
        maquina: '7 SpeedMaster', 
        operario: 'Josue lopez', 
        fecha: '2026-03-18', 
        valor: 50 
    },
    { 
        id: 4, 
        codigo: '03', 
        descripcion: 'Desperdicios por cortes inexactos o mal aprovechamiento del material', 
        op: '7449', 
        maquina: '6 SpeedMaster', 
        operario: 'Enrique Muñoz Hector Hilde', 
        fecha: '2026-03-18', 
        valor: 60 
    },
];

export default function DesperdicioMaster() {
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
                    {/* Filters Row */}
                    <Group gap="md" align="flex-end" mb="xl">
                        <Stack gap={4}>
                            <Text size="xs" fw={700} c="dimmed">Fecha:</Text>
                            <Button variant="filled" color="blue.6" size="xs" leftSection={<Box w={12} h={12} bg="white" style={{ borderRadius: '2px' }} />}>Hoy</Button>
                        </Stack>
                        <Stack gap={4}>
                            <Text size="xs" fw={700} c="dimmed">Mes:</Text>
                            <Select data={['Marzo']} defaultValue="Marzo" size="xs" w={120} styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white' } }} />
                        </Stack>
                        <Stack gap={4}>
                            <Text size="xs" fw={700} c="dimmed">Año:</Text>
                            <Select data={['2026']} defaultValue="2026" size="xs" w={80} styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white' } }} />
                        </Stack>
                        <Stack gap={4}>
                            <Text size="xs" fw={700} c="dimmed">Máq:</Text>
                            <Select data={['Todas']} defaultValue="Todas" size="xs" w={120} styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white' } }} />
                        </Stack>
                        <Stack gap={4}>
                            <Text size="xs" fw={700} c="dimmed">Op:</Text>
                            <Select data={['Todos']} defaultValue="Todos" size="xs" w={120} styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white' } }} />
                        </Stack>
                        <Stack gap={4}>
                            <Text size="xs" fw={700} c="dimmed">Cod:</Text>
                            <Select data={['Todos']} defaultValue="Todos" size="xs" w={100} styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white' } }} />
                        </Stack>
                        <Stack gap={4} flex={1}>
                            <Text size="xs" fw={700} c="dimmed">OP:</Text>
                            <TextInput placeholder="Buscar..." size="xs" styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white' } }} />
                        </Stack>
                        <Group gap={6}>
                            <ActionIcon variant="filled" color="gray.7" size="sm" radius="md"><IconFileTypePdf size={18} /></ActionIcon>
                            <Button variant="filled" color="gray.7" size="xs" leftSection={<IconSettings size={16} />}>Configuración</Button>
                            <Button variant="filled" color="green.7" size="xs" leftSection={<IconFilePlus size={16} />}>Agregar Desperdicio</Button>
                        </Group>
                    </Group>

                    {/* List area */}
                    <Stack gap="sm">
                        {DESPERDICIO_DATA.map((item) => (
                            <Paper key={item.id} p="md" radius="md" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <Group justify="space-between">
                                    <Group align="flex-start" flex={1}>
                                        <Text c="blue.4" fw={800} size="xl">{item.codigo}</Text>
                                        <Stack gap={2} flex={1}>
                                            <Text c="dimmed" size="xs" style={{ maxWidth: '400px' }}>{item.descripcion}</Text>
                                        </Stack>
                                        <Stack gap={2} ml="xl">
                                            <Text c="white" size="xs" fw={500}>OP: <span style={{ color: '#94a3b8' }}>{item.op}</span></Text>
                                            <Text c="white" size="xs" fw={500}>Máq: <span style={{ color: '#94a3b8' }}>{item.maquina}</span></Text>
                                            <Text c="white" size="xs" fw={500}>Oper: <span style={{ color: '#94a3b8' }}>{item.operario}</span></Text>
                                            <Text c="white" size="xs" fw={500}>Fecha: <span style={{ color: '#94a3b8' }}>{item.fecha}</span></Text>
                                        </Stack>
                                    </Group>
                                    <Group gap="xl">
                                        <Box ta="right">
                                            <Text c="red.6" fw={800} size="xl" mb={-4}>{item.valor}</Text>
                                            <Group gap={4} justify="flex-end" opacity={0.6}>
                                                <IconPencil size={12} color="#94a3b8" />
                                                <Text size="xs" c="dimmed" style={{ cursor: 'pointer' }}>Editar</Text>
                                            </Group>
                                            <Group gap={4} justify="flex-end" opacity={0.6} mt={2}>
                                                <IconTrash size={12} color="#f87171" />
                                                <Text size="xs" c="red.4" style={{ cursor: 'pointer' }}>Eliminar</Text>
                                            </Group>
                                        </Box>
                                    </Group>
                                </Group>
                            </Paper>
                        ))}
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
