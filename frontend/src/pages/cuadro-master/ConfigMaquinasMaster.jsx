import React from 'react';
import { 
    Container, 
    Paper, 
    Title, 
    Button, 
    Group, 
    Text, 
    Box, 
    Stack, 
    ActionIcon, 
    Grid,
    Badge,
    ScrollArea,
    Center
} from '@mantine/core';
import { 
    IconArrowLeft, 
    IconPlus,
    IconSettings
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';

const MAQUINAS_DATA = [
    {
        id: '1a',
        nombre: '1A CONVERTIDORA',
        meta100: '30000',
        meta75: '22500',
        valorTiro: '$5',
        importancia: '4.80%',
        tarifa: '$75.000',
        status: 'Activa'
    },
    {
        id: '1b',
        nombre: '1B CONVERTIDORA',
        meta100: '30000',
        meta75: '22500',
        valorTiro: '$5',
        importancia: '4.76%',
        tarifa: '$75.000',
        status: 'Activa'
    },
    {
        id: '2a',
        nombre: '2A Guillotina polar132',
        meta100: '60000',
        meta75: '45000',
        valorTiro: '$2',
        importancia: '4.76%',
        tarifa: '$75.000',
        status: 'Activa'
    },
    {
        id: '2b',
        nombre: '2B Guillotina org- Perfecta 107',
        meta100: '60000',
        meta75: '45000',
        valorTiro: '$2',
        importancia: '10.00%',
        tarifa: '$85.000',
        status: 'Activa'
    }
];

export default function ConfigMaquinasMaster() {
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
                        <Title order={2} c="white" fw={800}>Parámetros de Máquinas</Title>
                    </Group>

                    {/* New Machine Button */}
                    <Button 
                        fullWidth 
                        size="md" 
                        color="blue.6" 
                        leftSection={<IconPlus size={20} />}
                        fw={800}
                        mb="md"
                    >
                        NUEVA MÁQUINA
                    </Button>

                    {/* Total Importance Banner */}
                    <Paper p="xs" radius="xs" mb="xl" style={{ border: '1px solid #dcfce7', background: '#f0fdf4' }}>
                        <Center>
                            <Text fw={700} c="green.9">Total Importancia: 100.00%</Text>
                        </Center>
                    </Paper>

                    {/* Machines List */}
                    <Stack gap="md">
                        {MAQUINAS_DATA.map((maquina) => (
                            <Paper 
                                key={maquina.id} 
                                p="md" 
                                radius="md" 
                                style={{ 
                                    background: '#93c5fd', // Light blue from screenshot
                                    border: '1px solid rgba(0,0,0,0.1)',
                                    position: 'relative'
                                }}
                            >
                                <Badge 
                                    color="green.1" 
                                    variant="filled" 
                                    style={{ 
                                        position: 'absolute', 
                                        top: 15, 
                                        right: 15,
                                        color: '#15803d',
                                        fontWeight: 800,
                                        textTransform: 'none'
                                    }}
                                >
                                    {maquina.status}
                                </Badge>

                                <Stack gap={4}>
                                    <Title order={4} c="black" fw={800}>{maquina.nombre}</Title>
                                    <Text size="sm" c="black">
                                        Meta 100%: <b>{maquina.meta100}</b> | Meta 75%: <b>{maquina.meta75}</b>
                                    </Text>
                                    <Text size="sm" c="black">
                                        Valor/Tiro: <b>{maquina.valorTiro}</b> | Importancia: <b>{maquina.importancia}</b>
                                    </Text>
                                    <Text size="sm" c="black">
                                        Tarifa: <b>{maquina.tarifa}</b>
                                    </Text>
                                </Stack>
                            </Paper>
                        ))}
                    </Stack>
                </Paper>
            </Container>
        </Box>
    );
}
