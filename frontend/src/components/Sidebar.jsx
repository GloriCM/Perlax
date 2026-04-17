import { NavLink, Text, Avatar, Group, Box } from '@mantine/core';
import { api } from '../utils/api';
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
    IconClipboardCheck,
    IconClipboardData,
    IconFileAnalytics,
    IconCalendarMonth,
    IconTrash,
    IconTrafficLights,
    IconHistory,
    IconSettingsAutomation,
    IconUsers,
    IconMail,
    IconCash,
    IconTags,
    IconBuildingFactory2,
    IconFileDollar,
    IconCoins,
    IconPercentage,
    IconReceipt2,
    IconCategory,
    IconLayoutDashboard,
    IconEngine,
    IconBrush,
} from '@tabler/icons-react';
import './Sidebar.css';

/**
 * Recursive function to check if any child (or nested child) is active
 */
function isChildActive(item, currentPath) {
    if (!item.children) return false;
    return item.children.some(child =>
        currentPath === child.path || isChildActive(child, currentPath)
    );
}

/**
 * Recursive function to render NavLinks with premium styling
 */
function renderNavLink(item, location, navigate, level = 0) {
    const hasChildren = item.children && item.children.length > 0;
    const isDirectActive = location.pathname === item.path;
    const isParentActive = isChildActive(item, location.pathname);
    const isActive = isDirectActive || isParentActive;
    const isDeep = level > 0;

    return (
        <NavLink
            key={item.path}
            label={item.label}
            leftSection={<item.icon size={isDeep ? 18 : 20} stroke={1.5} />}
            active={isActive}
            onClick={() => !hasChildren && navigate(item.path)}
            defaultOpened={isActive}
            childrenOffset={isDeep ? 16 : 28}
            variant={level === 0 ? "filled" : "subtle"}
            className="sidebar-nav-item"
            styles={{
                root: {
                    borderRadius: level === 0 ? 12 : 10,
                    marginBottom: level === 0 ? 4 : 2,
                    padding: level === 0 ? '10px 14px' : '8px 12px',
                    color: isDirectActive ? (level === 0 ? 'white' : '#6366f1') : (isActive ? (level === 0 ? 'white' : '#6366f1') : '#94a3b8'),
                    background: isDirectActive && level === 0
                        ? '#6366f1'
                        : 'transparent',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                        background: isDirectActive && level === 0
                            ? '#4f46e5'
                            : 'rgba(255,255,255,0.06)',
                        color: isDirectActive ? 'white' : (level === 0 ? 'white' : '#818cf8'),
                    },
                },
                label: {
                    fontSize: level === 0 ? 14 : 13,
                    fontWeight: isActive ? 600 : (level === 0 ? 500 : 400),
                },
                chevron: {
                    color: '#64748b',
                }
            }}
        >
            {hasChildren && item.children.map((child) => renderNavLink(child, location, navigate, level + 1))}
        </NavLink>
    );
}

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
                    { label: 'Listado', icon: IconList, path: '/fichas/lista' },
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
                    {
                        label: 'Planeación',
                        icon: IconCalendarTime,
                        path: '/planeacion',
                        children: [
                            { label: 'Panel', icon: IconLayoutDashboard, path: '/produccion/planeacion' },
                            {
                                label: 'Gastos',
                                icon: IconCoins,
                                path: '/planeacion/gastos',
                                children: [
                                    { label: 'Captura de Gastos', icon: IconCash, path: '/planeacion/gastos/captura' },
                                    { label: 'Gráficas', icon: IconChartBar, path: '/planeacion/gastos/graficas' },
                                    { label: 'Rubros', icon: IconTags, path: '/planeacion/gastos/rubros' },
                                    { label: 'Cotizaciones', icon: IconFileDollar, path: '/planeacion/gastos/cotizaciones' },
                                    { label: 'Proveedores', icon: IconBuildingFactory2, path: '/planeacion/gastos/proveedores' },
                                    { label: 'Personal', icon: IconUsers, path: '/planeacion/gastos/personal' },
                                ]
                            }
                        ]
                    },
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
            {
                label: 'Calidad',
                icon: IconCheckupList,
                path: '/calidad',
                children: [
                    { label: 'Encuestas de Calidad', icon: IconClipboardCheck, path: '/calidad/encuestas-calidad' },
                    { label: 'Reporte de NC', icon: IconReportAnalytics, path: '/calidad/reporte-nc' },
                    { label: 'Consolidado de NC', icon: IconFileAnalytics, path: '/calidad/consolidado-nc' },
                    { label: 'Planes de Acción', icon: IconCalendarStats, path: '/calidad/planes-accion' },
                ]
            },
            {
                label: 'Cuadro Master',
                icon: IconCalendarStats,
                path: '/cuadro-master',
                children: [
                    { label: 'Captura Mensual', icon: IconCalendarMonth, path: '/cuadro-master/captura' },
                    { label: 'Desperdicio', icon: IconTrash, path: '/cuadro-master/desperdicio' },
                    { label: 'Tablero Semáforos', icon: IconTrafficLights, path: '/cuadro-master/tablero' },
                    { label: 'Historial', icon: IconHistory, path: '/cuadro-master/historial' },
                    { label: 'Config Máquinas', icon: IconSettingsAutomation, path: '/cuadro-master/config-maquinas' },
                    { label: 'Operarios', icon: IconUsers, path: '/cuadro-master/operarios' },
                    { label: 'Cartas', icon: IconMail, path: '/cuadro-master/cartas' },
                ]
            },
            {
                label: 'Diseño',
                icon: IconPalette,
                path: '/diseno',
                children: [
                    {
                        label: 'Cuadro de Gastos',
                        icon: IconCalculator,
                        path: '/diseno/gastos',
                        children: [
                            { label: 'Captura de Gastos', icon: IconCash, path: '/diseno/gastos/captura' },
                            { label: 'Gráficas', icon: IconChartBar, path: '/diseno/gastos/graficas' },
                            { label: 'Rubros', icon: IconTags, path: '/diseno/gastos/rubros' },
                            { label: 'Cotizaciones', icon: IconFileDollar, path: '/diseno/gastos/cotizaciones' },
                            { label: 'Proveedores', icon: IconBuildingFactory2, path: '/diseno/gastos/proveedores' },
                        ]
                    }
                ]
            },
            {
                label: 'Producción',
                icon: IconCalculator,
                path: '/gastos',
                children: [
                    {
                        label: 'Control de Gastos',
                        icon: IconCoins,
                        path: '/gastos/control',
                        children: [
                            { label: 'Captura de Gastos', icon: IconCash, path: '/gastos/control/captura' },
                            { label: 'Gráficas', icon: IconChartBar, path: '/gastos/control/graficas' },
                            { label: 'Rubros', icon: IconTags, path: '/gastos/control/rubros' },
                            { label: 'Cotizaciones', icon: IconFileDollar, path: '/gastos/control/cotizaciones' },
                            { label: 'Proveedores', icon: IconBuildingFactory2, path: '/gastos/control/proveedores' },
                        ]
                    },
                    {
                        label: 'Control de Personal',
                        icon: IconUsers,
                        path: '/gastos/personal',
                        children: [
                            { label: 'Horas Extra', icon: IconClock, path: '/gastos/personal/horas-extra' },
                            { label: 'Recargo', icon: IconPercentage, path: '/gastos/personal/recargo' },
                            { label: 'Salarios', icon: IconReceipt2, path: '/gastos/personal/salarios' },
                        ]
                    }
                ]
            },
            {
                label: 'Talleres y Despachos',
                icon: IconTools,
                path: '/talleres-gastos',
                children: [
                    {
                        label: 'Cuadro de Gastos',
                        icon: IconCoins,
                        path: '/talleres-gastos/control',
                        children: [
                            { label: 'Captura de Gastos', icon: IconCash, path: '/talleres-gastos/control/captura' },
                            { label: 'Gráficas', icon: IconChartBar, path: '/talleres-gastos/control/graficas' },
                            { label: 'Rubros', icon: IconTags, path: '/talleres-gastos/control/rubros' },
                            { label: 'Cotizaciones', icon: IconFileDollar, path: '/talleres-gastos/control/cotizaciones' },
                            { label: 'Proveedores', icon: IconBuildingFactory2, path: '/talleres-gastos/control/proveedores' },
                        ]
                    },
                    {
                        label: 'Personal',
                        icon: IconUsers,
                        path: '/talleres-gastos/personal',
                        children: [
                            { label: 'Salarios', icon: IconReceipt2, path: '/talleres-gastos/personal/salarios' },
                        ]
                    }
                ]
            },
            {
                label: 'Gestión Humana',
                icon: IconUsersGroup,
                path: '/gestion-humana',
                children: [
                    {
                        label: 'Cuadro de Gastos',
                        icon: IconCalculator,
                        path: '/gestion-humana/gastos',
                        children: [
                            { label: 'Captura de Gastos', icon: IconCash, path: '/gestion-humana/gastos/captura' },
                            { label: 'Cotizaciones', icon: IconFileDollar, path: '/gestion-humana/gastos/cotizaciones' },
                            { label: 'Gráficas', icon: IconChartBar, path: '/gestion-humana/gastos/graficas' },
                            { label: 'Rubros', icon: IconTags, path: '/gestion-humana/gastos/rubros' },
                            { label: 'Tipos de Servicios', icon: IconCategory, path: '/gestion-humana/gastos/servicios' },
                            { label: 'Proveedores', icon: IconBuildingFactory2, path: '/gestion-humana/gastos/proveedores' },
                        ]
                    }
                ]
            },
            {
                label: 'Mantenimiento de Equipos',
                icon: IconTools,
                path: '/mantenimiento',
                children: [
                    { label: 'Panel de Control', icon: IconLayoutDashboard, path: '/mantenimiento/panel' },
                    { label: 'Equipos', icon: IconEngine, path: '/mantenimiento/equipos' },
                ]
            },
            {
                label: 'Planeación',
                icon: IconReportAnalytics,
                path: '/planeacion',
                children: [
                    {
                        label: 'Cuadro de Gastos',
                        icon: IconCalculator,
                        path: '/planeacion/gastos',
                        children: [
                            { label: 'Captura de Gastos', icon: IconCash, path: '/planeacion/gastos/captura' },
                            { label: 'Gráficas', icon: IconChartBar, path: '/planeacion/gastos/graficas' },
                            { label: 'Rubros', icon: IconTags, path: '/planeacion/gastos/rubros' },
                            { label: 'Cotizaciones', icon: IconFileDollar, path: '/planeacion/gastos/cotizaciones' },
                            { label: 'Proveedores', icon: IconBuildingFactory2, path: '/planeacion/gastos/proveedores' },
                        ]
                    },
                    { label: 'Personal', icon: IconUsers, path: '/planeacion/personal' },
                ]
            },
            {
                label: 'Presupuestos',
                icon: IconWallet,
                path: '/presupuestos',
                children: [
                    { label: 'Producción', icon: IconCube, path: '/presupuestos/produccion' },
                    { label: 'Talleres', icon: IconTools, path: '/presupuestos/talleres' },
                    { label: 'G. Humana', icon: IconUsers, path: '/presupuestos/gestion-humana' },
                    { label: 'Sst', icon: IconShieldCheck, path: '/presupuestos/sst' },
                    { label: 'Planeación', icon: IconReportAnalytics, path: '/presupuestos/planeacion' },
                    { label: 'Diseño', icon: IconPalette, path: '/presupuestos/diseno' },
                ]
            },
            {
                label: 'SST',
                icon: IconShieldCheck,
                path: '/sst',
                children: [
                    {
                        label: 'Cuadro de Gastos',
                        icon: IconCalculator,
                        path: '/sst/gastos',
                        children: [
                            { label: 'Captura de Gastos', icon: IconCash, path: '/sst/gastos/captura' },
                            { label: 'Cotizaciones', icon: IconFileDollar, path: '/sst/gastos/cotizaciones' },
                            { label: 'Gráficas', icon: IconChartBar, path: '/sst/gastos/graficas' },
                            { label: 'Rubros', icon: IconTags, path: '/sst/gastos/rubros' },
                            { label: 'Tipos de Servicios', icon: IconCategory, path: '/sst/gastos/servicios' },
                            { label: 'Proveedores', icon: IconBuildingFactory2, path: '/sst/gastos/proveedores' },
                        ]
                    },
                    { label: 'Orden y Aseo', icon: IconBrush, path: '/sst/orden-aseo' },
                ]
            },
        ],
    },
    {
        title: 'Configuración',
        items: [
            { label: 'Auditoría', icon: IconHistory, path: '/admin/auditoria' },
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
            await api.post('/users/auth/logout', {
                userId: user.id || null,
                username: user.username
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
                    <img src="/Nuevo-perla-Sinfondo.png" alt="Perla" className="sidebar-logo-img" />
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
                        {section.items.map((item) => renderNavLink(item, location, navigate))}
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
                            marginTop: 2,
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
                <img
                    src="/Logo%20Aleph%20(fondo%20oscuro).png"
                    alt="Logo Aleph"
                    className="sidebar-footer-logo"
                />
            </div>
        </div>
    );
}
