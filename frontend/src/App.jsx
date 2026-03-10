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
import GastosProduccion from './pages/produccion/GastosProduccion';
import GraficasGastos from './pages/produccion/GraficasGastos';
import RubrosGastos from './pages/produccion/RubrosGastos';
import Cotizaciones from './pages/produccion/Cotizaciones';
import ProveedoresGastos from './pages/produccion/ProveedoresGastos';
import HorasExtra from './pages/produccion/HorasExtra';
import Recargos from './pages/produccion/Recargos';
import Salarios from './pages/produccion/Salarios';

// Talleres y Despachos Wrappers
import GastosTalleres from './pages/talleres/gastos/GastosTalleres';
import GraficasTalleres from './pages/talleres/gastos/GraficasTalleres';
import RubrosTalleres from './pages/talleres/gastos/RubrosTalleres';
import CotizacionesTalleres from './pages/talleres/gastos/CotizacionesTalleres';
import ProveedoresTalleres from './pages/talleres/gastos/ProveedoresTalleres';
import SalariosTalleres from './pages/talleres/gastos/SalariosTalleres';

// Gestión Humana Wrappers
import GastosGH from './pages/gestion-humana/gastos/GastosGH';
import CotizacionesGH from './pages/gestion-humana/gastos/CotizacionesGH';
import GraficasGH from './pages/gestion-humana/gastos/GraficasGH';
import RubrosGH from './pages/gestion-humana/gastos/RubrosGH';
import TiposServicio from './pages/gestion-humana/gastos/TiposServicio';
import ProveedoresGH from './pages/gestion-humana/gastos/ProveedoresGH';

// Planeación Wrappers
import GastosPlaneacion from './pages/planeacion/gastos/GastosPlaneacion';
import CotizacionesPlaneacion from './pages/planeacion/gastos/CotizacionesPlaneacion';
import GraficasPlaneacion from './pages/planeacion/gastos/GraficasPlaneacion';
import RubrosPlaneacion from './pages/planeacion/gastos/RubrosPlaneacion';
import ProveedoresPlaneacion from './pages/planeacion/gastos/ProveedoresPlaneacion';
import PersonalAlmacen from './pages/planeacion/gastos/PersonalAlmacen';
import TalleresPresupuesto from './pages/presupuesto/talleres/TalleresPresupuesto';
import ProduccionPresupuesto from './pages/presupuesto/produccion/ProduccionPresupuesto';
import GhumanaPresupuesto from './pages/presupuesto/gh/GhumanaPresupuesto';
import SstPresupuesto from './pages/presupuesto/sst/SstPresupuesto';
import PlaneacionPresupuesto from './pages/presupuesto/planeacion/PlaneacionPresupuesto';
import DisenoPresupuesto from './pages/presupuesto/diseño/DisenoPresupuesto';
import EquiposMantenimiento from './pages/mantenimiento_equipos/equipos/EquiposMantenimiento';
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
            <Route path="/gastos/control/captura" element={<GastosProduccion />} />
            <Route path="/gastos/control/graficas" element={<GraficasGastos />} />
            <Route path="/gastos/control/rubros" element={<RubrosGastos />} />
            <Route path="/gastos/control/cotizaciones" element={<Cotizaciones />} />
            <Route path="/gastos/control/proveedores" element={<ProveedoresGastos subtitulo="Producción - Control de Gastos" />} />
            <Route path="/gastos/personal/horas-extra" element={<HorasExtra />} />
            <Route path="/gastos/personal/recargo" element={<Recargos />} />
            <Route path="/gastos/personal/salarios" element={<Salarios />} />
            {/* Talleres y Despachos */}
            <Route path="/talleres-gastos/control/captura" element={<GastosTalleres />} />
            <Route path="/talleres-gastos/control/graficas" element={<GraficasTalleres />} />
            <Route path="/talleres-gastos/control/rubros" element={<RubrosTalleres />} />
            <Route path="/talleres-gastos/control/cotizaciones" element={<CotizacionesTalleres />} />
            <Route path="/talleres-gastos/control/proveedores" element={<ProveedoresTalleres />} />
            <Route path="/talleres-gastos/personal/salarios" element={<SalariosTalleres />} />
            {/* Gestión Humana */}
            <Route path="/gestion-humana/gastos/captura" element={<GastosGH />} />
            <Route path="/gestion-humana/gastos/cotizaciones" element={<CotizacionesGH />} />
            <Route path="/gestion-humana/gastos/graficas" element={<GraficasGH />} />
            <Route path="/gestion-humana/gastos/rubros" element={<RubrosGH />} />
            <Route path="/gestion-humana/gastos/servicios" element={<TiposServicio />} />
            <Route path="/gestion-humana/gastos/proveedores" element={<ProveedoresGH />} />
            {/* Planeación Gastos */}
            <Route path="/planeacion/gastos/captura" element={<GastosPlaneacion />} />
            <Route path="/planeacion/gastos/cotizaciones" element={<CotizacionesPlaneacion />} />
            <Route path="/planeacion/gastos/graficas" element={<GraficasPlaneacion />} />
            <Route path="/planeacion/gastos/rubros" element={<RubrosPlaneacion />} />
            <Route path="/planeacion/gastos/proveedores" element={<ProveedoresPlaneacion />} />
            <Route path="/planeacion/gastos/personal" element={<PersonalAlmacen />} />
            <Route path="/presupuestos/talleres" element={<TalleresPresupuesto />} />
            <Route path="/presupuestos/produccion" element={<ProduccionPresupuesto />} />
            <Route path="/presupuestos/gestion-humana" element={<GhumanaPresupuesto />} />
            <Route path="/presupuestos/sst" element={<SstPresupuesto />} />
            <Route path="/presupuestos/planeacion" element={<PlaneacionPresupuesto />} />
            <Route path="/presupuestos/diseno" element={<DisenoPresupuesto />} />
            <Route path="/mantenimiento/equipos" element={<EquiposMantenimiento />} />
          </Route >

          {/* Protected Print Route (No Sidebar/Layout) */}
          < Route path="/fichas/imprimir/:id" element={
            < ProtectedRoute >
              <FichaTecnicaPrint />
            </ProtectedRoute >
          } />

          {/* Catch-all redirect to dashboard (which will redirect to login if not authorized) */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes >
      </BrowserRouter >
    </MantineProvider >
  );
}

export default App;
