import React, { useState } from 'react';
import { Container, Paper, Title, Button, Group, Select, Text, Box } from '@mantine/core';
import { IconArrowLeft, IconPlus, IconFileDollar } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import GastosTabs from '../../../components/GastosTabs';

export default function CotizacionesSST() {
    const navigate = useNavigate();
    const [year, setYear] = useState('2026');
    const [month, setMonth] = useState('Marzo');

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
                        <IconFileDollar size={20} color="#94a3b8" />
                        <Title order={5} c="white">Cotizaciones SST</Title>
                    </Group>
                    <Group gap="sm">
                        <Select data={['2024', '2025', '2026']} value={year} onChange={setYear} w={100} size="sm" />
                        <Select data={['Enero', 'Febrero', 'Marzo']} value={month} onChange={setMonth} w={140} size="sm" />
                    </Group>
                </Group>
            </Paper>

            <Button fullWidth size="md" radius="md" mb="xl" color="blue" leftSection={<IconPlus size={20} />} styles={{ root: { background: '#2563eb' } }}>
                + Nueva Cotización
            </Button>

            <Paper p="xl" radius="md" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', textAlign: 'center' }}>
                <Text c="dimmed" size="lg">No hay cotizaciones para este período</Text>
            </Paper>
        </Container>
    );
}
