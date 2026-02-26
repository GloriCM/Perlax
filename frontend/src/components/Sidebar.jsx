import { NavLink, Text, Avatar, Group, Box } from '@mantine/core';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    IconChartPie,
    IconCube,
    IconPackages,
    IconShoppingCart,
    IconFileInvoice,
    IconCalculator,
    IconUsersGroup,
    IconWallet,
    IconSettings,
    IconClipboardList,
    IconFileText,
    IconTruck,
    IconReportAnalytics,
    IconCalendarStats,
    IconCheckupList,
    IconTools,
    IconPalette,
    IconShieldCheck,
    IconBriefcase,
} from '@tabler/icons-react';
import './Sidebar.css';

const navSections = [
    {
        title: 'Operaciones',
        items: [
            { label: 'Dashboard', icon: IconChartPie, path: '/' },
            { label: 'Producción', icon: IconCube, path: '/produccion' },
            { label: 'Inventario PT', icon: IconPackages, path: '/inventario' },
            { label: 'Compras & Almacén', icon: IconShoppingCart, path: '/compras' },
            { label: 'Cotizaciones', icon: IconFileText, path: '/cotizaciones' },
            { label: 'Ordenes de Trabajo', icon: IconClipboardList, path: '/ordenes' },
            { label: 'Fichas Técnicas', icon: IconReportAnalytics, path: '/fichas' },
            { label: 'Pedidos', icon: IconBriefcase, path: '/pedidos' },
            { label: 'Remisiones', icon: IconTruck, path: '/remisiones' },
            { label: 'Facturación', icon: IconFileInvoice, path: '/facturacion' },
        ],
    },
    {
        title: 'Administración',
        items: [
            { label: 'Cuadro Master', icon: IconCalendarStats, path: '/cuadro-master' },
            { label: 'Gastos Producción', icon: IconCalculator, path: '/gastos' },
            { label: 'Gestión Humana', icon: IconUsersGroup, path: '/gestion-humana' },
            { label: 'Presupuestos', icon: IconWallet, path: '/presupuestos' },
            { label: 'Presupuestos SST', icon: IconShieldCheck, path: '/presupuestos-sst' },
            { label: 'Mantenimiento', icon: IconTools, path: '/mantenimiento' },
            { label: 'Calidad', icon: IconCheckupList, path: '/calidad' },
            { label: 'Planeación', icon: IconReportAnalytics, path: '/planeacion' },
            { label: 'Diseño', icon: IconPalette, path: '/diseno' },
        ],
    },
    {
        title: 'Configuración',
        items: [
            { label: 'Ajustes', icon: IconSettings, path: '/ajustes' },
        ],
    },
];

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    return (
        <div className="sidebar-wrapper">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <img src="/Nuevo-perla-Sinfondo.png" alt="Perlax" className="sidebar-logo-img" />
                </div>

                <div className="sidebar-user-header">
                    <Text className="user-name" fw={700}>Admin Master</Text>
                    <Text className="user-role" size="xs">Super Administrador</Text>
                </div>
            </div>

            <Box className="sidebar-nav-container">
                {navSections.map((section) => (
                    <Box key={section.title} mb="md">
                        <Text
                            size="xs"
                            fw={600}
                            c="dimmed"
                            tt="uppercase"
                            pl="md"
                            mb={8}
                            style={{ letterSpacing: '1.5px', fontSize: 10 }}
                        >
                            {section.title}
                        </Text>
                        {section.items.map((item) => (
                            <NavLink
                                key={item.path}
                                label={item.label}
                                leftSection={<item.icon size={20} stroke={1.5} />}
                                active={location.pathname === item.path}
                                onClick={() => navigate(item.path)}
                                variant="filled"
                                className="sidebar-nav-item"
                                styles={{
                                    root: {
                                        borderRadius: 12,
                                        marginBottom: 4,
                                        padding: '10px 14px',
                                        color: location.pathname === item.path ? 'white' : '#94a3b8',
                                        background: location.pathname === item.path
                                            ? '#6366f1'
                                            : 'transparent',
                                        transition: 'background 0.15s ease',
                                        '&:hover': {
                                            background: location.pathname === item.path
                                                ? '#4f46e5'
                                                : 'rgba(255,255,255,0.06)',
                                            color: 'white',
                                        },
                                    },
                                    label: {
                                        fontSize: 14,
                                        fontWeight: location.pathname === item.path ? 600 : 500,
                                    },
                                }}
                            />
                        ))}
                    </Box>
                ))}
            </Box>

            <div className="sidebar-footer">
                <Text size="xs" c="dimmed" ta="center">Perlax v1.0.0</Text>
            </div>
        </div>
    );
}
