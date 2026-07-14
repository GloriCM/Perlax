import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconListDetails } from '@tabler/icons-react';

export default function HojasDeVidaMaquinariaView() {
    return (
        <Stack p="md" gap="lg" className="fade-in">
            <Card className="glass-card">
                <Group gap="sm" mb={6}>
                    <ThemeIcon variant="light" color="indigo" size={34} radius="md">
                        <IconListDetails size={18} />
                    </ThemeIcon>
                    <Title order={3} c="white">Hojas de Vida</Title>
                </Group>
                <Text size="sm" c="dimmed">
                    Vista base para consultar y administrar hojas de vida de maquinaria.
                </Text>
            </Card>
        </Stack>
    );
}
