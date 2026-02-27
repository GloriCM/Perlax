import { MantineProvider } from '@mantine/core';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { theme } from './theme';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import ModulePage from './pages/ModulePage';
import Requisicion from './pages/compras/Requisicion';
import NuevaOT from './pages/ordenes/NuevaOT';
import ListaOT from './pages/ordenes/ListaOT';
import PlanesDiseno from './pages/ordenes/PlanesDiseno';
import '@mantine/core/styles.css';
import './App.css';

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<DashboardLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path=":moduleName" element={<ModulePage />} />
            <Route path="/compras/requisicion" element={<Requisicion />} />
            <Route path="/ordenes/nueva" element={<NuevaOT />} />
            <Route path="/ordenes/lista" element={<ListaOT />} />
            <Route path="/ordenes/planes-diseno" element={<PlanesDiseno />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
