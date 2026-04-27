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
    Select, 
    Grid,
    List,
    ThemeIcon
} from '@mantine/core';
import { 
    IconArrowLeft, 
    IconDeviceFloppy,
    IconFileText,
    IconInfoCircle
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';

export default function CartasMaster() {
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
                    
                    {/* Title Section */}
                    <Stack align="center" gap={4} mb="xl">
                        <Title order={2} c="white" fw={800}>Generación de Cartas</Title>
                        <Text c="dimmed" size="sm" style={{ fontStyle: 'italic' }}>Avisos y Felicitaciones (ZIP)</Text>
                    </Stack>

                    {/* period Selection */}
                    <Paper p="xl" radius="md" mb="lg" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Title order={5} c="white" mb="md">Seleccione Período:</Title>
                        <Grid>
                            <Grid.Col span={6}>
                                <Stack gap={4}>
                                    <Text size="xs" fw={700} c="dimmed">Año</Text>
                                    <Select 
                                        data={['2026']} 
                                        defaultValue="2026" 
                                        styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
                                    />
                                </Stack>
                            </Grid.Col>
                            <Grid.Col span={6}>
                                <Stack gap={4}>
                                    <Text size="xs" fw={700} c="dimmed">Mes</Text>
                                    <Select 
                                        data={['Marzo']} 
                                        defaultValue="Marzo" 
                                        styles={{ input: { background: 'rgba(255,255,255,0.05)', color: 'white', border: '1px solid rgba(255,255,255,0.1)' } }}
                                    />
                                </Stack>
                            </Grid.Col>
                        </Grid>

                        <Button 
                            fullWidth 
                            mt="xl" 
                            size="lg" 
                            color="blue.6" 
                            leftSection={<IconDeviceFloppy size={20} />}
                            fw={700}
                        >
                            Generar y Descargar ZIP
                        </Button>
                    </Paper>

                    {/* Info Section */}
                    <Paper p="lg" radius="md" style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Title order={5} c="white" mb="md">¿Qué genera esto?</Title>
                        <List 
                            spacing="xs" 
                            size="sm" 
                            center
                            styles={{ item: { color: '#94a3b8' } }}
                        >
                            <List.Item>
                                Un archivo comprimido (.ZIP) con todas las cartas individuales.
                            </List.Item>
                            <List.Item>
                                Cartas en <span style={{ color: '#22c55e', fontWeight: 800 }}>VERDE</span>: Felicitación + Bono.
                            </List.Item>
                            <List.Item>
                                Cartas en <span style={{ color: '#ef4444', fontWeight: 800 }}>ROJO</span>: Invitación a mejorar.
                            </List.Item>
                        </List>
                    </Paper>
                </Paper>
            </Container>
        </Box>
    );
}
