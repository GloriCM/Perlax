import { useEffect, useState } from 'react';
import { Outlet, useLocation, Navigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { Drawer, ScrollArea } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { canAccessRoute, getCurrentUser, getFirstAllowedPath } from '../utils/permissions';
import { useIsMobileLayout } from '../utils/useIsMobileLayout';
import './DashboardLayout.css';

export default function DashboardLayout() {
    const location = useLocation();
    const user = getCurrentUser();
    const isMobile = useIsMobileLayout();
    const [mobileNavOpen, { toggle: toggleMobileNav, close: closeMobileNav }] = useDisclosure(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    useEffect(() => {
        closeMobileNav();
    }, [location.pathname, closeMobileNav]);

    if (user && !canAccessRoute(location.pathname, user)) {
        const fallback = getFirstAllowedPath(user);
        const target = fallback && fallback !== location.pathname ? fallback : '/';
        return <Navigate to={target} replace />;
    }

    const isNoTopBar = location.pathname.startsWith('/sst') || location.pathname.startsWith('/cuadro-master');

    const sidebarOpen = isMobile ? mobileNavOpen : !sidebarCollapsed;

    const handleMenuClick = () => {
        if (isMobile) {
            toggleMobileNav();
            return;
        }
        setSidebarCollapsed((prev) => !prev);
    };

    return (
        <div className={`dashboard-layout ${isMobile ? 'dashboard-layout--mobile' : ''} ${sidebarCollapsed ? 'dashboard-layout--sidebar-collapsed' : ''}`}>
            {!isMobile && !sidebarCollapsed && (
                <Sidebar className="sidebar-desktop-only" />
            )}
            {isMobile && (
                <Drawer
                    opened={mobileNavOpen}
                    onClose={closeMobileNav}
                    padding={0}
                    size="min(320px, 88vw)"
                    position="left"
                    withCloseButton={false}
                    zIndex={400}
                    overlayProps={{ backgroundOpacity: 0.55, blur: 2 }}
                    transitionProps={{ transition: 'slide-right', duration: 250 }}
                    styles={{
                        content: {
                            background: 'transparent',
                            boxShadow: 'none',
                        },
                        body: {
                            padding: 0,
                            height: '100%',
                        },
                    }}
                >
                    <Sidebar onNavigate={closeMobileNav} className="sidebar-drawer" />
                </Drawer>
            )}
            <div className="dashboard-main">
                {!isNoTopBar && (
                    <TopBar
                        showMenuButton
                        menuOpened={sidebarOpen}
                        onMenuClick={handleMenuClick}
                    />
                )}
                <ScrollArea flex={1} scrollbarSize={4} className="dashboard-scroll">
                    <div
                        className="dashboard-content fade-in"
                        style={{ paddingTop: isNoTopBar ? '0' : 'inherit' }}
                    >
                        <Outlet />
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
