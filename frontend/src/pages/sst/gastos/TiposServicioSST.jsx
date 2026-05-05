import React from 'react';
import { Container, Paper, Title, Button, Group, Text, Stack, ActionIcon, Select } from '@mantine/core';
import { IconArrowLeft, IconPlus, IconCategory, IconPencil, IconTrash } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import GastosTabs from '../../../components/GastosTabs';

const SERVICIOS_DATA = [
    { name: 'Aerorumba-terapia fisica, yoga', rubro: 'Capacitacion-Asesorias-Auditorias, actividades de bienestar' },
    { name: 'Afiches, Carteleras, avisos, medios de comunicacion', rubro: 'Otros' },
    { name: 'Aplicacion de la bateria del riesgo psicosocial', rubro: 'Otros' },
    { name: 'Arreglos locativos (Para riesgo Mecanico, locativo)', rubro: 'Infraestructura Y aseguramiento de la operacion' },
    { name: 'Auditoria Sistema de gestion de seguridad y salud', rubro: 'Capacitacion-Asesorias-Auditorias, actividades de bienestar' },
    { name: 'Auditoria Sistema de gestion de seguridad y salud en el trabajo', rubro: 'Capacitacion-Asesorias-Auditorias, actividades de bienestar' },
    { name: 'Auxiliar de SST', rubro: 'Capacitacion-Asesorias-Auditorias, actividades de bienestar' },
];

export default function TiposServicioSST() {
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
                        <IconCategory size={20} color="#94a3b8" />
                        <Title order={5} c="white">Tipos de Servicio</Title>
                    </Group>
                    <Button variant="filled" color="blue" size="sm" leftSection={<IconPlus size={18} />}>+ Agregar</Button>
                </Group>
                <Group mt="md">
                    <Text size="sm" c="dimmed">Filtrar por Rubro:</Text>
                    <Select data={['Todos']} defaultValue="Todos" size="xs" w={200} />
                </Group>
            </Paper>

            <Stack gap="sm">
                {SERVICIOS_DATA.map((item) => (
                    <Paper key={item.name} p="sm" radius="md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Group justify="space-between">
                            <Stack gap={0}>
                                <Text fw={600} size="sm" c="white">{item.name}</Text>
                                <Text size="xs" c="dimmed">Rubro: {item.rubro}</Text>
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
