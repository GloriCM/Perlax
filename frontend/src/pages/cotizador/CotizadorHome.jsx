import { Card, Title, Text, Stack, SimpleGrid, Button } from '@mantine/core';
import { IconPlus, IconHistory, IconSettings } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

export default function CotizadorHome() {
    const navigate = useNavigate();
    return (
        <Stack p="md" gap="lg" className="fade-in">
            <Card className="glass-card">
                <Title order={2} c="white">Cotizador</Title>
                <Text c="dimmed" size="sm">
                    Un solo flujo: cotice Caja o Bolsa, calcule precios, guarde y convierta a OT cuando haga falta.
                </Text>
            </Card>
            <SimpleGrid cols={{ base: 1, md: 3 }} spacing="lg">
                <Card className="glass-card" p="xl">
                    <Stack gap="md">
                        <IconPlus size={32} color="#6366f1" />
                        <Title order={4} c="white">Nueva cotizacion</Title>
                        <Button onClick={() => navigate('/cotizador/nueva')}>Comenzar</Button>
                    </Stack>
                </Card>
                <Card className="glass-card" p="xl">
                    <Stack gap="md">
                        <IconHistory size={32} color="#22c55e" />
                        <Title order={4} c="white">Guardadas</Title>
                        <Button variant="light" color="green" onClick={() => navigate('/cotizador/guardadas')}>Ver historial</Button>
                    </Stack>
                </Card>
                <Card className="glass-card" p="xl">
                    <Stack gap="md">
                        <IconSettings size={32} color="#f59e0b" />
                        <Title order={4} c="white">Materiales y máquinas</Title>
                        <Text size="sm" c="dimmed">
                            Papeles, barnices, terminados, flautas, cordones, planchas y tarifas de máquina del cotizador.
                        </Text>
                        <Button variant="light" color="yellow" onClick={() => navigate('/cotizador/catalogos')}>
                            Administrar catálogos
                        </Button>
                    </Stack>
                </Card>
            </SimpleGrid>
        </Stack>
    );
}