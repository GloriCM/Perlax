import React, { useState } from 'react';
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
    TextInput,
    Switch,
    Divider,
    Badge
} from '@mantine/core';
import { 
    IconArrowLeft, 
    IconPencil, 
    IconTrash, 
    IconId, 
    IconCoin,
    IconSearch
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';

const OPERARIOS_LIST = [
    {
        id: '1',
        nombre: 'Obando Higuita Jose Luis',
        documento: '94071937',
        salario: '2.000.905'
    },
    {
        id: '2',
        nombre: 'Renteria Mejia Nestor Alfonso',
        documento: '1060418443',
        salario: '1.750.905'
    },
    {
        id: '3',
        nombre: 'Rodriguez Castaño Maria Alejandra',
        documento: '1107095610',
        salario: '1.750.905'
    },
    {
        id: '4',
        nombre: 'Bedoya Maria Fernanda',
        documento: '1107057124',
        salario: '0'
    }
];

export default function OperariosMaster() {
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
                    
                    {/* Header Section */}
                    <Title order={3} c="white" mb="xl">Gestión de Listas - Operarios</Title>

                    {/* Operator Form */}
                    <Paper p="md" radius="md" mb="xl" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Grid align="stretch">
                            <Grid.Col span={10}>
                                <Stack gap="xs">
                                    <TextInput 
                                        placeholder="Nombre del operario" 
                                        styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
                                    />
                                    <TextInput 
                                        placeholder="Documento" 
                                        styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
                                    />
                                    <TextInput 
                                        placeholder="Salario (Mensual)" 
                                        styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
                                    />
                                </Stack>
                            </Grid.Col>
                            <Grid.Col span={2}>
                                <Button fullWidth h="100%" color="blue.7" fw={800}>
                                    AGREGAR
                                </Button>
                            </Grid.Col>
                        </Grid>
                    </Paper>

                    {/* List Header */}
                    <Group justify="space-between" mb="lg">
                        <Title order={4} c="white">Operarios Activos:</Title>
                        <Group gap="xl">
                            <Group gap={8}>
                                <Text size="xs" c="dimmed">Solo x Horas</Text>
                                <Switch size="xs" color="gray.6" />
                            </Group>
                            <Group gap={8}>
                                <Text size="xs" c="dimmed">Ver Papelera</Text>
                                <Switch size="xs" color="gray.6" />
                            </Group>
                        </Group>
                    </Group>

                    {/* Operators List */}
                    <Stack gap="sm">
                        {OPERARIOS_LIST.map((op) => (
                            <Paper 
                                key={op.id} 
                                p="md" 
                                radius="md" 
                                style={{ 
                                    background: 'rgba(255, 255, 255, 0.02)', 
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    transition: 'background 0.2s ease'
                                }}
                            >
                                <Group justify="space-between">
                                    <Stack gap={4}>
                                        <Text c="white" fw={700} size="md">{op.nombre}</Text>
                                        <Group gap="xs">
                                            <Group gap={4} style={{ background: '#4c1d95', padding: '1px 8px', borderRadius: '4px' }}>
                                                <IconId size={12} color="white" />
                                                <Text size="xs" c="white" fw={600}>ID {op.documento}</Text>
                                            </Group>
                                            {op.salario !== '0' && (
                                                <Group gap={4}>
                                                    <IconCoin size={14} color="#10b981" />
                                                    <Text size="xs" c="green.4" fw={700}>$ {op.salario}</Text>
                                                </Group>
                                            )}
                                        </Group>
                                    </Stack>
                                    <Group gap="sm">
                                        <ActionIcon variant="light" color="yellow.6" radius="xl" size="lg">
                                            <IconPencil size={18} />
                                        </ActionIcon>
                                        <ActionIcon variant="light" color="red.6" radius="xl" size="lg">
                                            <IconTrash size={18} />
                                        </ActionIcon>
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
