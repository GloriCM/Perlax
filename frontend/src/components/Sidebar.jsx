import { NavLink, Text, Box } from '@mantine/core';
import { api } from '../utils/api';
import { useNavigate, useLocation } from 'react-router-dom';
import { IconLogout } from '@tabler/icons-react';
import { filterNavSections, getCurrentUser } from '../utils/permissions';
import './Sidebar.css';

export { navSections } from '../config/navSections';

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

export default function Sidebar() {
    const navigate = useNavigate();
    const location = useLocation();

    const user = getCurrentUser() || {};
    const sections = filterNavSections(user);
    const displayName =
        [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
        user.username ||
        user.Username ||
        'Usuario';

    const handleLogout = async () => {
        try {
            await api.post('/users/auth/logout', {});
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
                    <Text className="user-name" fw={700}>{displayName}</Text>
                    <Text className="user-role" size="xs">{user.role || user.Role || 'Usuario'}</Text>
                </div>
            </div>

            <Box className="sidebar-nav-container">
                {sections.map((section) => (
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
