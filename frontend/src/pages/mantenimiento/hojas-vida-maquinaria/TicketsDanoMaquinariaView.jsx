import { Card, Group, Stack, Text, ThemeIcon, Title } from '@mantine/core';
import { IconFileAnalytics } from '@tabler/icons-react';

export default function TicketsDanoMaquinariaView() {
    return (
        <Stack p="md" gap="lg" className="fade-in">
            <Card className="glass-card">
                <Group gap="sm" mb={6}>
                    <ThemeIcon variant="light" color="orange" size={34} radius="md">
                        <IconFileAnalytics size={18} />
                    </ThemeIcon>
                    <Title order={3} c="white">Tickets de Daño</Title>
                </Group>
                <Text size="sm" c="dimmed">
                    Vista base para registrar y hacer seguimiento a tickets de daño de maquinaria.
                </Text>
            </Card>
        </Stack>
    );
}
