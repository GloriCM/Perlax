import { Link } from 'react-router-dom';
import { Card, SimpleGrid, Stack, Text, Title, ThemeIcon, Group } from '@mantine/core';
import {
    IconSettings, IconUserCog, IconHistory, IconUsers, IconBuildingStore, IconChartBar,
} from '@tabler/icons-react';

const links = [
    {
        title: 'Usuarios y roles',
        desc: 'Alta de usuarios, áreas, matriz de vistas y estados.',
        path: '/configuracion/usuarios',
        icon: IconUserCog,
    },
    {
        title: 'Auditoría',
        desc: 'Bitácora de acciones relevantes del sistema.',
        path: '/admin/auditoria',
        icon: IconHistory,
    },
    {
        title: 'Catálogos del cotizador',
        desc: 'Máquinas, materiales, factores, micro flauta y planchas.',
        path: '/ajustes/cotizador-catalogos',
        icon: IconSettings,
    },
    {
        title: 'Clientes',
        desc: 'Maestro de clientes y % de recibo de mercancía.',
        path: '/clientes',
        icon: IconUsers,
    },
    {
        title: 'Proveedores (Almacén)',
        desc: 'Catálogo de proveedores en Compras & Almacén.',
        path: '/compras/pedidos',
        icon: IconBuildingStore,
    },
    {
        title: 'Informes de gestión',
        desc: 'Consultas gerenciales de pedidos, OP, ventas y stock.',
        path: '/informes',
        icon: IconChartBar,
    },
];

export default function AjustesHub() {
    return (
        <Stack gap="md" p="md">
            <div>
                <Title order={2}>Parametrización / Ajustes</Title>
                <Text c="dimmed" size="sm">
                    Índice de configuración real de PerlaX. No hay un segundo sistema de parámetros genéricos:
                    aquí se reúnen usuarios, catálogos, maestros e informes.
                </Text>
            </div>

            <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
                {links.map((item) => {
                    const Icon = item.icon;
                    return (
                        <Card
                            key={item.path}
                            component={Link}
                            to={item.path}
                            withBorder
                            padding="lg"
                            style={{ textDecoration: 'none', color: 'inherit' }}
                        >
                            <Group mb="sm">
                                <ThemeIcon size={40} radius="md" variant="light" color="indigo">
                                    <Icon size={22} />
                                </ThemeIcon>
                                <Text fw={700}>{item.title}</Text>
                            </Group>
                            <Text size="sm" c="dimmed">{item.desc}</Text>
                        </Card>
                    );
                })}
            </SimpleGrid>
        </Stack>
    );
}
