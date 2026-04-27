import React from 'react';
import { Container, Paper, Title, Button, Group, Text, Stack, ActionIcon, Select } from '@mantine/core';
import { IconArrowLeft, IconPlus, IconBuildingStore, IconPencil, IconTrash, IconPhone } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import GastosTabs from '../../../components/GastosTabs';

const PROVEEDORES_DATA = [
    { name: 'ATH MONTACARGAS', type: 'Entrenamiento y reentrenamiento de montacarguistas', phone: '3113729985' },
    { name: 'Bomberos Cali', type: 'Certificacion de bomberos' },
    { name: 'Canaveral', type: 'Plan de Capacitaciones y refrigerios' },
    { name: 'CEMDIL', type: 'Examenes Medicos (Ingreso, Periodicos, Egreso, Post Incapacidad, o de Seguimiento)' },
    { name: 'CEMDIL', type: 'Examenes Medicos (Ingreso, Periodicos, Egreso, Post Incapacidad, o de Seguimiento)' },
    { name: 'Combustibles Juanchito', type: 'Recoleccion De residuos Peligrosos' },
    { name: 'Comercio Electrico', type: 'Cambio o Instalación de iluminarias' },
];

export default function ProveedoresSST() {
    const navigate = useNavigate();

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
                        <IconBuildingStore size={20} color="#94a3b8" />
                        <Title order={5} c="white">Proveedores</Title>
                    </Group>
                    <Button variant="filled" color="blue" size="sm" leftSection={<IconPlus size={18} />}>+ Agregar</Button>
                </Group>
                <Group mt="md">
                    <Text size="sm" c="dimmed">Rubro:</Text>
                    <Select data={['Todos']} defaultValue="Todos" size="xs" w={150} />
                    <Text size="sm" c="dimmed" ml="md">Tipo:</Text>
                    <Select data={['Todos']} defaultValue="Todos" size="xs" w={150} />
                </Group>
            </Paper>

            <Stack gap="sm">
                {PROVEEDORES_DATA.map((item, i) => (
                    <Paper key={i} p="sm" radius="md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Group justify="space-between">
                            <Stack gap={0}>
                                <Text fw={600} size="sm" c="white">{item.name}</Text>
                                <Text size="xs" c="dimmed">Tipo: {item.type}</Text>
                                {item.phone && (
                                    <Group gap={4}>
                                        <IconPhone size={12} c="red.6" />
                                        <Text size="xs" c="dimmed">{item.phone}</Text>
                                    </Group>
                                )}
                            </Stack>
                            <Group gap="xs">
                                <ActionIcon variant="subtle" color="orange"><IconPencil size={18} /></ActionIcon>
                                <ActionIcon variant="subtle" color="red"><IconTrash size={18} /></ActionIcon>
                            </Group>
                        </Group>
                    </Paper>
                ))}
            </Stack>
        </Container>
    );
}
