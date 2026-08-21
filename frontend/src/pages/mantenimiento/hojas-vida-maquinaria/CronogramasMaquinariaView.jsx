import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconCalendarMonth } from '@tabler/icons-react';

export default function CronogramasMaquinariaView() {
    return (
        <Stack p="md" gap="lg" className="fade-in">
            <Card className="glass-card">
                <Group gap="sm" mb={6}>
                    <ThemeIcon variant="light" color="cyan" size={34} radius="md">
                        <IconCalendarMonth size={18} />
                    </ThemeIcon>
                    <Title order={3} c="white">Cronogramas</Title>
                </Group>
                <Text size="sm" c="dimmed">
                    Vista base para planificar y controlar cronogramas de mantenimiento.
                </Text>
            </Card>
        </Stack>
    );
}
