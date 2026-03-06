import { MantineProvider } from '@mantine/core';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { theme } from './theme';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/DashboardPage';
import ModulePage from './pages/ModulePage';
import Requisicion from './pages/compras/Requisicion';
import NuevaOT from './pages/ordenes/NuevaOT';
import ListaOT from './pages/ordenes/ListaOT';
import PlanesDiseno from './pages/ordenes/PlanesDiseno';
import FichasTecnicas from './pages/fichas/FichasTecnicas';
import FichaTecnicaPrint from './pages/fichas/FichaTecnicaPrint';
import TalleresPresupuesto from './pages/presupuesto/talleres/TalleresPresupuesto';
import ProduccionPresupuesto from './pages/presupuesto/produccion/ProduccionPresupuesto';
import GhumanaPresupuesto from './pages/presupuesto/gh/GhumanaPresupuesto';
import SstPresupuesto from './pages/presupuesto/sst/SstPresupuesto';
import PlaneacionPresupuesto from './pages/presupuesto/planeacion/PlaneacionPresupuesto';
import DisenoPresupuesto from './pages/presupuesto/diseño/DisenoPresupuesto';
import '@mantine/core/styles.css';
import './App.css';

function App() {
  // --- SESSION SECURITY: Inactivity Timeout ---
  useEffect(() => {
    let timeoutId;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes in milliseconds

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Only logout if there is an active session
        if (localStorage.getItem('user')) {
          console.warn('Sesión cerrada por inactividad');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
      }, INACTIVITY_LIMIT);
    };

    // Events to track user activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

    // Set initial timer
    resetTimer();

    // Add listeners
    events.forEach(event => document.addEventListener(event, resetTimer));

    return () => {
      // Cleanup
      if (timeoutId) clearTimeout(timeoutId);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, []);

  return (
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Internal Routes protected by login */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />
            <Route path=":moduleName" element={<ModulePage />} />
            <Route path="/compras/requisicion" element={<Requisicion />} />
            <Route path="/ordenes/nueva" element={<NuevaOT />} />
            <Route path="/ordenes/lista" element={<ListaOT />} />
            <Route path="/fichas/lista" element={<FichasTecnicas />} />
            <Route path="/presupuestos/talleres" element={<TalleresPresupuesto />} />
            <Route path="/presupuestos/produccion" element={<ProduccionPresupuesto />} />
            <Route path="/presupuestos/gestion-humana" element={<GhumanaPresupuesto />} />
            <Route path="/presupuestos/sst" element={<SstPresupuesto />} />
            <Route path="/presupuestos/planeacion" element={<PlaneacionPresupuesto />} />
            <Route path="/presupuestos/diseno" element={<DisenoPresupuesto />} />
          </Route>

          {/* Protected Print Route (No Sidebar/Layout) */}
          <Route path="/fichas/imprimir/:id" element={
            <ProtectedRoute>
              <FichaTecnicaPrint />
            </ProtectedRoute>
          } />

          {/* Catch-all redirect to dashboard (which will redirect to login if not authorized) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </MantineProvider>
  );
}

export default App;
