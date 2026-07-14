import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconTools } from '@tabler/icons-react';

export default function MantenimientosMaquinariaView() {
    return (
        <Stack p="md" gap="lg" className="fade-in">
            <Card className="glass-card">
                <Group gap="sm" mb={6}>
                    <ThemeIcon variant="light" color="teal" size={34} radius="md">
                        <IconTools size={18} />
                    </ThemeIcon>
                    <Title order={3} c="white">Mantenimientos</Title>
                </Group>
                <Text size="sm" c="dimmed">
                    Vista base para mantenimientos preventivos y correctivos de maquinaria.
                </Text>
            </Card>
        </Stack>
    );
}
