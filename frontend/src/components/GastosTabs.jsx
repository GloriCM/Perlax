import { Group, UnstyledButton, Text, Box } from '@mantine/core';
import {
    IconCash,
    IconChartBar,
    IconTags,
    IconFileDollar,
    IconBuildingFactory2,
    IconUsers,
    IconCategory
} from '@tabler/icons-react';
import { useNavigate, useLocation } from 'react-router-dom';

const getTabs = (pathPrefix) => [
    { id: 'captura', label: 'Captura de Gastos', icon: IconCash, path: `${pathPrefix}/captura` },
    { id: 'graficas', label: 'Gráficas', icon: IconChartBar, path: `${pathPrefix}/graficas` },
    { id: 'rubros', label: 'Rubros', icon: IconTags, path: `${pathPrefix}/rubros` },
    { id: 'cotizaciones', label: 'Cotizaciones', icon: IconFileDollar, path: `${pathPrefix}/cotizaciones` },
    { id: 'proveedores', label: 'Proveedores', icon: IconBuildingFactory2, path: `${pathPrefix}/proveedores` },
];

export default function GastosTabs({ pathPrefix = '/planeacion/gastos' }) {
    const navigate = useNavigate();
    const location = useLocation();
    const TABS = getTabs(pathPrefix);

    return (
        <Box mb="md">
            <Group gap={8}>
                {TABS.map((tab) => {
                    const isActive = location.pathname === tab.path;
                    return (
                        <UnstyledButton
                            key={tab.id}
                            onClick={() => navigate(tab.path)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                padding: '8px 20px',
                                borderRadius: '10px',
                                backgroundColor: isActive ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                                color: isActive ? '#3b82f6' : '#94a3b8',
                                transition: 'all 0.2s ease',
                                border: isActive ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid transparent'
                            }}
                            onMouseEnter={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!isActive) {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }
                            }}
                        >
                            <tab.icon size={18} stroke={isActive ? 2 : 1.5} />
                            <Text size="sm" fw={isActive ? 700 : 500}>
                                {tab.label}
                            </Text>
                        </UnstyledButton>
                    );
                })}
            </Group>
        </Box>
    );
}
