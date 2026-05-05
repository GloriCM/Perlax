import React from 'react';
import { Container, Paper, Title, Button, Group, Text, Stack, ActionIcon } from '@mantine/core';
import { IconArrowLeft, IconPlus, IconTags, IconPencil, IconTrash } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import GastosTabs from '../../../components/GastosTabs';

const RUBROS_DATA = [
    {
        name: 'Capacitacion-Asesorias-Auditorias, actividades de bienestar',
        items: [
            'Aerorumba-terapia fisica, yoga',
            'Auditoria Sistema de gestion de seguridad y salud',
            'Auditoria Sistema de gestion de seguridad y salud en el trabajo',
            'Auxiliar de SST',
            'Brigada de emergencias (Dotacion y Capacitacion)',
            'Comite de convivencia laboral (Recurso ARL)',
            'Comite paritario de seguridad y salud en el trabajo',
            'Honorarios Asesor Externo SST',
            'Plan de Capacitaciones y refigerios'
        ]
    },
    {
        name: 'Higiene Industrial Y manejo ambiental',
        items: [
            'Compra de teteros plásticos para disposición de sustancias quimicas',
            'Control de plagas',
            'Mediciones Ambientales',
            'Puntos Ecologicos',
            'Recoleccion De residuos Peligrosos'
        ]
    },
    {
        name: 'Iluminacion-Infraestructural',
        items: [
            'Cambio o Instalación de iluminarias'
        ]
    }
];

export default function RubrosSST() {
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
                        <IconTags size={20} color="#94a3b8" />
                        <Title order={5} c="white">Rubros</Title>
                    </Group>
                    <Button variant="filled" color="blue" size="sm" leftSection={<IconPlus size={18} />}>+ Agregar</Button>
                </Group>
            </Paper>

            <Stack gap="md">
                {RUBROS_DATA.map((section) => (
                    <Paper key={section.name} p="md" radius="md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                        <Group justify="space-between" align="flex-start">
                            <Stack gap={4}>
                                <Text fw={700} c="white">{section.name}</Text>
                                {section.items.map((item, i) => (
                                    <Text key={i} size="xs" c="dimmed" pl="md">• {item}</Text>
                                ))}
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
