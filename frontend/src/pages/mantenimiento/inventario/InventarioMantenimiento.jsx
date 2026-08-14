import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconArchive, IconPackages } from '@tabler/icons-react';

export default function InventarioMantenimiento() {
    return (
        <Stack p="md" gap="lg" className="fade-in">
            <Card
                className="glass-card"
                style={{
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.14), rgba(249,115,22,0.08))',
                }}
            >
                <Group gap="sm" mb={6}>
                    <ThemeIcon variant="light" color="orange" size={34} radius="md">
                        <IconArchive size={18} />
                    </ThemeIcon>
                    <Title order={3} c="white">Inventario Mantenimiento</Title>
                </Group>
                <Text size="sm" c="dimmed">
                    Módulo base para controlar existencias de repuestos, consumibles y herramientas de mantenimiento.
                </Text>
            </Card>

            <Card className="glass-card">
                <Group gap="sm" mb="sm">
                    <ThemeIcon variant="light" color="yellow" size={32} radius="md">
                        <IconPackages size={18} />
                    </ThemeIcon>
                    <Title order={5} c="white">En construcción</Title>
                </Group>
                <Text size="sm" c="dimmed">
                    Aquí se administrarán entradas, salidas y niveles mínimos de inventario de mantenimiento.
                </Text>
            </Card>
        </Stack>
    );
}
