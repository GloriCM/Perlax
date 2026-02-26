import { TextInput, Group, ActionIcon, Text, Indicator, Box } from '@mantine/core';
import { IconSearch, IconBell } from '@tabler/icons-react';
import { useState, useEffect } from 'react';

export default function TopBar() {
    const [date, setDate] = useState('');

    useEffect(() => {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        setDate(new Date().toLocaleDateString('es-ES', options));
    }, []);

    return (
        <Group justify="space-between" align="center" py="sm" px={4}>
            <TextInput
                placeholder="Buscar módulos, órdenes o reportes..."
                leftSection={<IconSearch size={18} stroke={1.5} />}
                size="md"
                w={420}
                styles={{
                    input: {
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        color: 'white',
                        borderRadius: 12,
                        '&::placeholder': { color: '#64748b' },
                    },
                }}
            />
            <Group gap="lg">
                <Indicator color="red" size={10} offset={4} processing>
                    <ActionIcon
                        variant="subtle"
                        size="lg"
                        radius="md"
                        c="dimmed"
                    >
                        <IconBell size={22} stroke={1.5} />
                    </ActionIcon>
                </Indicator>
                <Box
                    px="md"
                    py={6}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: 10,
                    }}
                >
                    <Text size="sm" c="dimmed" style={{ textTransform: 'capitalize' }}>
                        {date}
                    </Text>
                </Box>
            </Group>
        </Group>
    );
}
