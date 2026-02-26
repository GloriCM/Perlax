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
    IconLogout,
    IconDoorEnter,
    IconListDetails,
    IconCalendarTime,
    IconArchive,
    IconArrowBackUp,
    IconFilePlus,
    IconBuildingStore,
    IconStack2,
    IconClipboardPlus,
    IconPencil,
    IconSquarePlus,
    IconLayoutList,
    IconArtboard,
    IconList,
    IconPackage,
    IconChartBar,
    IconReceipt,
    IconClock,
} from '@tabler/icons-react';
import './Sidebar.css';

const navSections = [
    {
        title: 'Operaciones',
        items: [
            { label: 'Dashboard', icon: IconChartPie, path: '/' },
            {
                label: 'Compras & Almacén',
                icon: IconShoppingCart,
                path: '/compras',
                children: [
                    { label: 'Requisición', icon: IconFilePlus, path: '/compras/requisicion' },
                    { label: 'Compras', icon: IconBuildingStore, path: '/compras/compras' },
                    { label: 'Consumos', icon: IconStack2, path: '/compras/consumos' },
                    { label: 'Saldos de Inventario', icon: IconCalculator, path: '/compras/saldos' },
                ]
            },
            {
                label: 'Cotizaciones',
                icon: IconFileText,
                path: '/cotizaciones',
                children: [
                    { label: 'Desde OT', icon: IconClipboardPlus, path: '/cotizaciones/desde-ot' },
                    { label: 'Manual', icon: IconPencil, path: '/cotizaciones/manual' },
                ]
            },
            {
                label: 'Facturación',
                icon: IconFileInvoice,
                path: '/facturacion',
                children: [
                    { label: 'Nueva Factura', icon: IconReceipt, path: '/facturacion/nueva' },
                    { label: 'Informe', icon: IconChartBar, path: '/facturacion/informe' },
                ]
            },
            {
                label: 'Fichas Técnicas',
                icon: IconReportAnalytics,
                path: '/fichas',
                children: [
                    { label: 'Listado', icon: IconList, path: '/fichas/listado' },
                ]
            },
            {
                label: 'Inventario PT',
                icon: IconPackages,
                path: '/inventario',
                children: [
                    { label: 'Existencias', icon: IconArchive, path: '/inventario/existencias' },
                    { label: 'Devoluciones', icon: IconArrowBackUp, path: '/inventario/devoluciones' },
                ]
            },
            {
                label: 'Ordenes de Trabajo',
                icon: IconClipboardList,
                path: '/ordenes',
                children: [
                    { label: 'Nueva OT', icon: IconSquarePlus, path: '/ordenes/nueva' },
                    { label: 'Lista de OT', icon: IconLayoutList, path: '/ordenes/lista' },
                    { label: 'Planes de Diseño', icon: IconArtboard, path: '/ordenes/planes-diseno' },
                ]
            },
            {
                label: 'Pedidos',
                icon: IconBriefcase,
                path: '/pedidos',
                children: [
                    { label: 'Nuevo Pedido', icon: IconPackage, path: '/pedidos/nuevo' },
                    { label: 'Informe', icon: IconChartBar, path: '/pedidos/informe' },
                ]
            },
            {
                label: 'Producción',
                icon: IconCube,
                path: '/produccion',
                children: [
                    { label: 'Apertura', icon: IconDoorEnter, path: '/produccion/apertura' },
                    { label: 'Estado de Ordenes', icon: IconListDetails, path: '/produccion/estado-ordenes' },
                    { label: 'Planeación', icon: IconCalendarTime, path: '/produccion/planeacion' },
                ]
            },
            {
                label: 'Remisiones',
                icon: IconTruck,
                path: '/remisiones',
                children: [
                    { label: 'Nueva Remisión', icon: IconFilePlus, path: '/remisiones/nueva' },
                    { label: 'Informe', icon: IconChartBar, path: '/remisiones/informe' },
                ]
            },
            { label: 'Reporte Diario', icon: IconClock, path: '/reporte-diario' },
        ],
    },
    {
        title: 'Administración',
        items: [
            { label: 'Calidad', icon: IconCheckupList, path: '/calidad' },
            { label: 'Cuadro Master', icon: IconCalendarStats, path: '/cuadro-master' },
            { label: 'Diseño', icon: IconPalette, path: '/diseno' },
            { label: 'Gastos Producción', icon: IconCalculator, path: '/gastos' },
            { label: 'Gestión Humana', icon: IconUsersGroup, path: '/gestion-humana' },
            { label: 'Mantenimiento', icon: IconTools, path: '/mantenimiento' },
            { label: 'Planeación', icon: IconReportAnalytics, path: '/planeacion' },
            { label: 'Presupuestos', icon: IconWallet, path: '/presupuestos' },
            { label: 'SST', icon: IconShieldCheck, path: '/sst' },
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

    // Get user from localStorage
    const user = JSON.parse(localStorage.getItem('user') || '{"username": "Admin Master", "role": "Super Administrador"}');

    const handleLogout = async () => {
        try {
            await fetch('http://localhost:5262/api/users/auth/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id || null,
                    username: user.username
                })
            });
        } catch (err) {
            console.error('Error logging out:', err);
        } finally {
            localStorage.removeItem('user');
            navigate('/login');
        }
    };

    return (
        <div className="sidebar-wrapper">
            <div className="sidebar-header">
                <div className="sidebar-logo">
                    <img src="/Nuevo-perla-Sinfondo.png" alt="Perlax" className="sidebar-logo-img" />
                </div>

                <div className="sidebar-user-header">
                    <Text className="user-name" fw={700}>{user.username}</Text>
                    <Text className="user-role" size="xs">{user.role || 'Usuario'}</Text>
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
                                active={location.pathname === item.path || (item.children && item.children.some(c => location.pathname === c.path))}
                                onClick={() => !item.children && navigate(item.path)}
                                variant="filled"
                                className="sidebar-nav-item"
                                childrenOffset={28}
                                defaultOpened={item.children && item.children.some(c => location.pathname === c.path)}
                                styles={{
                                    root: {
                                        borderRadius: 12,
                                        marginBottom: 4,
                                        padding: '10px 14px',
                                        color: (location.pathname === item.path || (item.children && item.children.some(c => location.pathname === c.path))) ? 'white' : '#94a3b8',
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
                                        fontWeight: (location.pathname === item.path || (item.children && item.children.some(c => location.pathname === c.path))) ? 600 : 500,
                                    },
                                    chevron: {
                                        color: '#64748b',
                                    }
                                }}
                            >
                                {item.children?.map((child) => (
                                    <NavLink
                                        key={child.path}
                                        label={child.label}
                                        leftSection={<child.icon size={18} stroke={1.5} />}
                                        active={location.pathname === child.path}
                                        onClick={() => navigate(child.path)}
                                        variant="subtle"
                                        className="sidebar-nav-item"
                                        styles={{
                                            root: {
                                                borderRadius: 10,
                                                marginBottom: 2,
                                                padding: '8px 12px',
                                                color: location.pathname === child.path ? '#6366f1' : '#64748b',
                                                '&:hover': {
                                                    background: 'rgba(99, 102, 241, 0.05)',
                                                    color: '#818cf8',
                                                },
                                            },
                                            label: {
                                                fontSize: 13,
                                                fontWeight: location.pathname === child.path ? 600 : 400,
                                            },
                                        }}
                                    />
                                ))}
                            </NavLink>
                        ))}
                    </Box>
                ))}
            </Box>

            <div className="sidebar-footer">
                <NavLink
                    label="Cerrar Sesión"
                    leftSection={<IconLogout size={20} stroke={1.5} />}
                    onClick={handleLogout}
                    className="sidebar-nav-item logout-button"
                    styles={{
                        root: {
                            borderRadius: 12,
                            padding: '10px 14px',
                            color: '#fb7185',
                            marginTop: 8,
                            '&:hover': {
                                background: 'rgba(251, 113, 133, 0.1)',
                                color: '#f43f5e',
                            },
                        },
                        label: {
                            fontWeight: 600,
                        },
                    }}
                />
                <Text size="xs" c="dimmed" ta="center" mt="md">Perlax v1.0.0</Text>
            </div>
        </div>
    );
}
