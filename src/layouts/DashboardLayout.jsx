import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { ScrollArea } from '@mantine/core';
import './DashboardLayout.css';

export default function DashboardLayout() {
    return (
        <div className="dashboard-layout">
            <Sidebar />
            <div className="dashboard-main">
                <TopBar />
                <ScrollArea flex={1} scrollbarSize={4}>
                    <div className="dashboard-content fade-in">
                        <Outlet />
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
