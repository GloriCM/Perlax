import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconListDetails, IconTool } from '@tabler/icons-react';

export default function HojasVidaMaquinaria() {
    return (
        <Stack p="md" gap="lg" className="fade-in">
            <Card
                className="glass-card"
                style={{
                    background: 'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(14,165,233,0.08))',
                }}
            >
                <Group gap="sm" mb={6}>
                    <ThemeIcon variant="light" color="indigo" size={34} radius="md">
                        <IconListDetails size={18} />
                    </ThemeIcon>
                    <Title order={3} c="white">Hojas de Vida Maquinaria</Title>
                </Group>
                <Text size="sm" c="dimmed">
                    Módulo base para historial técnico, mantenimientos y estado de cada equipo de maquinaria.
                </Text>
            </Card>

            <Card className="glass-card">
                <Group gap="sm" mb="sm">
                    <ThemeIcon variant="light" color="teal" size={32} radius="md">
                        <IconTool size={18} />
                    </ThemeIcon>
                    <Title order={5} c="white">En construcción</Title>
                </Group>
                <Text size="sm" c="dimmed">
                    Aquí irá la gestión de fichas por máquina, mantenimientos preventivos/correctivos y evidencias.
                </Text>
            </Card>
        </Stack>
    );
}
