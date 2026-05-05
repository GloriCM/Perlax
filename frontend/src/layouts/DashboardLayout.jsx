import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { ScrollArea } from '@mantine/core';
import './DashboardLayout.css';

export default function DashboardLayout() {
    const location = useLocation();
    const isNoTopBar = location.pathname.startsWith('/sst') || location.pathname.startsWith('/cuadro-master');

    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-main">
                {!isNoTopBar && <TopBar />}
                <ScrollArea flex={1} scrollbarSize={4}>
                    <div className="dashboard-content fade-in" style={{ paddingTop: isNoTopBar ? '0' : 'inherit' }}>
                        <Outlet />
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
