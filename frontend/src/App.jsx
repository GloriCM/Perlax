import { MantineProvider, Box, Title, Text } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import '@mantine/notifications/styles.css';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { theme } from './theme';
import LoginPage from './pages/auth/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './layouts/DashboardLayout';
import DashboardPage from './pages/dashboard/DashboardPage';
import ModulePage from './pages/shared/ModulePage';
import NuevaOT from './pages/ordenes/nueva/NuevaOT';
import ListaOT from './pages/ordenes/lista/ListaOT';
import PlanesDiseno from './pages/ordenes/planes-diseno/PlanesDiseno';
import Auditoria from './pages/admin/auditoria/Auditoria';
import UsuariosConfig from './pages/admin/usuarios/Usuarios';
import FichasTecnicas from './pages/fichas/FichasTecnicas';
import FichaTecnicaPrint from './pages/fichas/FichaTecnicaPrint';
import CotizadorHome from './pages/cotizador/inicio/CotizadorHome';
import CotizadorWizard from './pages/cotizador/nueva/CotizadorWizard';
import CotizadorGuardadas from './pages/cotizador/guardadas/CotizadorGuardadas';
import NuevoPedido from './pages/pedidos/nuevo/NuevoPedido';
import InformePedidos from './pages/pedidos/informe/InformePedidos';
import NuevaRemision from './pages/remisiones/nueva/NuevaRemision';
import InformeRemisiones from './pages/remisiones/informe/InformeRemisiones';
import NuevaFactura from './pages/facturacion/nueva/NuevaFactura';
import InformeFacturas from './pages/facturacion/informe/InformeFacturas';
import ExistenciasPt from './pages/inventario/existencias/ExistenciasPt';
import DevolucionesPt from './pages/inventario/devoluciones/DevolucionesPt';
import ConsumosAlmacen from './pages/compras/ConsumosAlmacen';
import ClientesPage from './pages/clientes/ClientesPage';
import GastosProduccion from './pages/produccion/gastos/GastosProduccion';
import GraficasGastos from './pages/produccion/gastos/GraficasGastos';
import RubrosGastos from './pages/produccion/gastos/RubrosGastos';
import Cotizaciones from './pages/produccion/gastos/Cotizaciones';
import ProveedoresGastos from './pages/produccion/gastos/ProveedoresGastos';
import HorasExtra from './pages/produccion/personal/HorasExtra';
import Recargos from './pages/produccion/personal/Recargos';
import Salarios from './pages/produccion/personal/Salarios';
import AperturaProduccion from './pages/produccion/operacion/AperturaProduccion';
import DetalleOpPage from './pages/produccion/operacion/DetalleOpPage';
import EstadoOrdenesProduccion from './pages/produccion/operacion/EstadoOrdenesProduccion';
import RegistrarOpExistente from './pages/produccion/operacion/RegistrarOpExistente';
import Programador from './pages/planeacion/programador/Programador';

// Talleres y Despachos Wrappers
import GastosTalleres from './pages/talleres/gastos/captura/GastosTalleres';
import GraficasTalleres from './pages/talleres/gastos/graficas/GraficasTalleres';
import RubrosTalleres from './pages/talleres/gastos/rubros/RubrosTalleres';
import CotizacionesTalleres from './pages/talleres/gastos/cotizaciones/CotizacionesTalleres';
import ProveedoresTalleres from './pages/talleres/gastos/proveedores/ProveedoresTalleres';
import SalariosTalleres from './pages/talleres/personal/salarios/SalariosTalleres';

// Gestión Humana Wrappers
import GastosGH from './pages/gestion-humana/gastos/captura/GastosGH';
import CotizacionesGH from './pages/gestion-humana/gastos/cotizaciones/CotizacionesGH';
import GraficasGH from './pages/gestion-humana/gastos/graficas/GraficasGH';
import RubrosGH from './pages/gestion-humana/gastos/rubros/RubrosGH';
import TiposServicio from './pages/gestion-humana/gastos/servicios/TiposServicio';
import ProveedoresGH from './pages/gestion-humana/gastos/proveedores/ProveedoresGH';

// Planeación Wrappers
import GastosPlaneacion from './pages/planeacion/gastos/GastosPlaneacion';
import CotizacionesPlaneacion from './pages/planeacion/gastos/CotizacionesPlaneacion';
import GraficasPlaneacion from './pages/planeacion/gastos/GraficasPlaneacion';
import RubrosPlaneacion from './pages/planeacion/gastos/RubrosPlaneacion';
import ProveedoresPlaneacion from './pages/planeacion/gastos/ProveedoresPlaneacion';
import PersonalAlmacen from './pages/planeacion/personal/PersonalAlmacen';
import TalleresPresupuesto from './pages/presupuesto/talleres/TalleresPresupuesto';
import ProduccionPresupuesto from './pages/presupuesto/produccion/ProduccionPresupuesto';
import GhumanaPresupuesto from './pages/presupuesto/gh/GhumanaPresupuesto';
import SstPresupuesto from './pages/presupuesto/sst/SstPresupuesto';
import PlaneacionPresupuesto from './pages/presupuesto/planeacion/PlaneacionPresupuesto';
import DisenoPresupuesto from './pages/presupuesto/diseño/DisenoPresupuesto';
import PresupuestoGeneral from './pages/presupuesto/general/PresupuestoGeneral';
import PresupuestoDetalle from './pages/presupuesto/detalle/PresupuestoDetalle';
import EquiposMantenimiento from './pages/mantenimiento/equipos/EquiposMantenimiento';
import EncuestasCalidad from './pages/calidad/encuestas-calidad/EncuestasCalidad';
import ReporteNC from './pages/calidad/reporte-nc/ReporteNC';
import ConsolidadoNC from './pages/calidad/consolidado-nc/ConsolidadoNC';
import PlanesAccion from './pages/calidad/planes-accion/PlanesAccion';
import ReporteDiario from './pages/reportes/ReporteDiario';
import GastosDiseno from './pages/diseno/gastos/GastosDiseno';
import GraficasDiseno from './pages/diseno/gastos/GraficasDiseno';
import RubrosDiseno from './pages/diseno/gastos/RubrosDiseno';
import CotizacionesDiseno from './pages/diseno/gastos/CotizacionesDiseno';
import ProveedoresDiseno from './pages/diseno/gastos/ProveedoresDiseno';
import PlaneadorDiseno from './pages/diseno/programador/PlaneadorDiseno';
import PanelMantenimiento from './pages/mantenimiento/equipos/PanelMantenimiento';
import GastosMantenimiento from './pages/mantenimiento/gastos/GastosMantenimiento';
import InventarioMantenimiento from './pages/mantenimiento/inventario/InventarioMantenimiento';
import HojasDeVidaMaquinariaView from './pages/mantenimiento/hojas-vida-maquinaria/HojasDeVidaMaquinariaView';
import CronogramasMaquinariaView from './pages/mantenimiento/hojas-vida-maquinaria/CronogramasMaquinariaView';
import TicketsDanoMaquinariaView from './pages/mantenimiento/hojas-vida-maquinaria/TicketsDanoMaquinariaView';
import MantenimientosMaquinariaView from './pages/mantenimiento/hojas-vida-maquinaria/MantenimientosMaquinariaView';
import RubrosMantenimiento from './pages/mantenimiento/gastos/RubrosMantenimiento';
import ProductosMantenimiento from './pages/mantenimiento/gastos/ProductosMantenimiento';
import CotizacionesMantenimiento from './pages/mantenimiento/gastos/CotizacionesMantenimiento';
import ProveedoresMantenimiento from './pages/mantenimiento/gastos/ProveedoresMantenimiento';
import GraficasMantenimiento from './pages/mantenimiento/gastos/GraficasMantenimiento';
import GastosSST from './pages/sst/gastos/captura/GastosSST';
import CotizacionesSST from './pages/sst/gastos/cotizaciones/CotizacionesSST';
import GraficasSST from './pages/sst/gastos/graficas/GraficasSST';
import RubrosSST from './pages/sst/gastos/rubros/RubrosSST';
import TiposServicioSST from './pages/sst/gastos/servicios/TiposServicioSST';
import ProveedoresSST from './pages/sst/gastos/proveedores/ProveedoresSST';
import OrdenAseoSST from './pages/sst/orden-aseo/OrdenAseoSST';
import CapturaMensual from './pages/cuadro-master/captura/CapturaMensual';
import DesperdicioMaster from './pages/cuadro-master/desperdicio/DesperdicioMaster';
import TableroMaster from './pages/cuadro-master/tablero/TableroMaster';
import ConfigMaquinasMaster from './pages/cuadro-master/config-maquinas/ConfigMaquinasMaster';
import OperariosMaster from './pages/cuadro-master/operarios/OperariosMaster';
import CartasMaster from './pages/cuadro-master/cartas/CartasMaster';
import '@mantine/core/styles.css';
import './App.css';
import AppErrorBoundary from './components/AppErrorBoundary';
import ChatCenter from './pages/chat/ChatCenter';
import CotizadorCatalogos from './pages/cotizador/catalogos/CotizadorCatalogos.jsx';
import AjustesHub from './pages/admin/ajustes/AjustesHub.jsx';
import InformesGestion from './pages/informes/InformesGestion.jsx';
import PlantaFloorPage from './pages/planta/PlantaFloorPage';
import RequisicionPage from './pages/compras/requisicion/RequisicionPage';
import PedidosPage from './pages/compras/pedidos/PedidosPage';
import RecepcionPage from './pages/compras/recepcion/RecepcionPage';
import IndicadoresPage from './pages/compras/indicadores/IndicadoresPage';
import CatalogoProductos from './pages/compras/catalogo-productos/CatalogoProductos';

function App() {
  // --- SESSION SECURITY: Inactivity Timeout ---
  useEffect(() => {
    let timeoutId;
    const INACTIVITY_LIMIT = 15 * 60 * 1000; // 15 minutes in milliseconds

    const resetTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        // Vista planta: sin sesión ERP; no forzar /login
        if (window.location.pathname.startsWith('/planta')) return;
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
      <Notifications position="top-right" zIndex={4000} />
      <AppErrorBoundary>
        <BrowserRouter>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/planta" element={<PlantaFloorPage />} />

          {/* Internal Routes protected by login */}
          <Route path="/" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            <Route index element={<DashboardPage />} />

            {/* Specific Modular Routes FIRST */}
            <Route path="/compras/requisicion" element={<RequisicionPage />} />
            <Route path="/compras/pedidos" element={<PedidosPage />} />
            <Route path="/compras/recepcion" element={<RecepcionPage />} />
            <Route path="/compras/catalogo-productos" element={<CatalogoProductos />} />
            <Route path="/compras/indicadores" element={<IndicadoresPage />} />
            <Route path="/almacen" element={<Navigate to="/compras/requisicion" replace />} />
            <Route path="/ordenes/nueva" element={<NuevaOT />} />
            <Route path="/ordenes/lista" element={<ListaOT />} />
            <Route path="/ordenes/planes-diseno" element={<PlanesDiseno />} />
            <Route path="/fichas/lista" element={<FichasTecnicas />} />
            <Route path="/cotizador" element={<CotizadorHome />} />
            <Route path="/cotizador/nueva" element={<CotizadorWizard />} />
            <Route path="/cotizador/nueva/ot/:orderId" element={<CotizadorWizard />} />
            <Route path="/cotizador/guardadas" element={<CotizadorGuardadas />} />
            <Route path="/cotizador/catalogos" element={<CotizadorCatalogos />} />
            <Route path="/cotizador/:id" element={<CotizadorWizard />} />
            <Route path="/cotizaciones/*" element={<Navigate to="/cotizador" replace />} />
            <Route path="/pedidos/nuevo" element={<NuevoPedido />} />
            <Route path="/pedidos/nuevo/:id" element={<NuevoPedido />} />
            <Route path="/pedidos/informe" element={<InformePedidos />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/remisiones/nueva" element={<NuevaRemision />} />
            <Route path="/remisiones/nueva/:id" element={<NuevaRemision />} />
            <Route path="/remisiones/informe" element={<InformeRemisiones />} />
            <Route path="/remisiones" element={<Navigate to="/remisiones/informe" replace />} />
            <Route path="/facturacion/nueva" element={<NuevaFactura />} />
            <Route path="/facturacion/informe" element={<InformeFacturas />} />
            <Route path="/facturacion" element={<Navigate to="/facturacion/informe" replace />} />
            <Route path="/inventario/existencias" element={<ExistenciasPt />} />
            <Route path="/inventario/devoluciones" element={<DevolucionesPt />} />
            <Route path="/inventario" element={<Navigate to="/inventario/existencias" replace />} />
            <Route path="/compras/consumos" element={<ConsumosAlmacen />} />
            <Route path="/reporte-diario" element={<ReporteDiario />} />
            <Route path="/produccion/apertura" element={<AperturaProduccion />} />
            <Route path="/produccion/op-existente" element={<RegistrarOpExistente />} />
            <Route path="/planeacion/programador" element={<Programador />} />
            <Route path="/planeacion/panel" element={<Navigate to="/planeacion/programador" replace />} />
            <Route path="/produccion/planeacion" element={<Navigate to="/planeacion/programador" replace />} />
            <Route path="/produccion/estado-ordenes" element={<EstadoOrdenesProduccion />} />
            <Route path="/produccion/op/:id" element={<DetalleOpPage />} />
            <Route path="/chat" element={<ChatCenter />} />
            <Route path="/gastos/control/captura" element={<GastosProduccion areaKey="produccion" pathPrefix="/gastos/control" />} />
            <Route path="/gastos/control/graficas" element={<GraficasGastos />} />
            <Route path="/gastos/control/rubros" element={<RubrosGastos areaKey="produccion" />} />
            <Route path="/gastos/control/cotizaciones" element={<Cotizaciones />} />
            <Route path="/gastos/control/proveedores" element={<ProveedoresGastos subtitulo="Producción - Control de Gastos" areaKey="produccion" />} />
            <Route path="/gastos/personal/horas-extra" element={<HorasExtra />} />
            <Route
                path="/planeacion/personal/horas-extra"
                element={(
                    <HorasExtra
                        titulo="Horas Extra de Almacén"
                        subtitulo="Planeación"
                        personnelRoles={['Almacen']}
                        expenseHint="Las horas extras de almacén se registran en Gastos de Planeación."
                    />
                )}
            />
            <Route
                path="/talleres-gastos/personal/horas-extra"
                element={(
                    <HorasExtra
                        titulo="Horas Extra de Talleres"
                        subtitulo="Control de Personal"
                        personnelRoles={['Taller']}
                        expenseHint="Las horas extras del personal de talleres se registran en Gastos de Talleres."
                    />
                )}
            />
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
            <Route path="/planeacion/personal" element={<PersonalAlmacen />} />

            {/* Diseño Gastos */}
            <Route path="/diseno/gastos/captura" element={<GastosDiseno />} />
            <Route path="/diseno/gastos/graficas" element={<GraficasDiseno />} />
            <Route path="/diseno/gastos/rubros" element={<RubrosDiseno />} />
            <Route path="/diseno/gastos/cotizaciones" element={<CotizacionesDiseno />} />
            <Route path="/diseno/gastos/proveedores" element={<ProveedoresDiseno />} />
            <Route path="/diseno/planeador" element={<PlaneadorDiseno />} />

            {/* Presupuestos */}
            <Route path="/presupuestos" element={<PresupuestoGeneral />} />
            <Route path="/presupuestos/talleres" element={<TalleresPresupuesto />} />
            <Route path="/presupuestos/produccion" element={<ProduccionPresupuesto />} />
            <Route path="/presupuestos/gestion-humana" element={<GhumanaPresupuesto />} />
            <Route path="/presupuestos/sst" element={<SstPresupuesto />} />
            <Route path="/presupuestos/planeacion" element={<PlaneacionPresupuesto />} />
            <Route path="/presupuestos/diseno" element={<DisenoPresupuesto />} />
            <Route path="/presupuestos/:id" element={<PresupuestoDetalle />} />

            {/* Mantenimiento */}
            <Route path="/mantenimiento/hojas-vida-maquinaria/hojas-de-vida" element={<HojasDeVidaMaquinariaView />} />
            <Route path="/mantenimiento/hojas-vida-maquinaria/cronogramas" element={<CronogramasMaquinariaView />} />
            <Route path="/mantenimiento/hojas-vida-maquinaria/tickets-dano" element={<TicketsDanoMaquinariaView />} />
            <Route path="/mantenimiento/hojas-vida-maquinaria/mantenimientos" element={<MantenimientosMaquinariaView />} />
            <Route path="/mantenimiento/gastos" element={<Navigate to="/mantenimiento/gastos/captura" replace />} />
            <Route path="/mantenimiento/gastos/captura" element={<GastosMantenimiento />} />
            <Route path="/mantenimiento/gastos/graficas" element={<GraficasMantenimiento />} />
            <Route path="/mantenimiento/gastos/rubros" element={<RubrosMantenimiento />} />
            <Route path="/mantenimiento/gastos/productos" element={<ProductosMantenimiento />} />
            <Route path="/mantenimiento/gastos/cotizaciones" element={<CotizacionesMantenimiento />} />
            <Route path="/mantenimiento/gastos/proveedores" element={<ProveedoresMantenimiento />} />
            <Route path="/mantenimiento/inventario" element={<InventarioMantenimiento />} />
            <Route path="/mantenimiento-equipos/equipos" element={<EquiposMantenimiento />} />
            <Route path="/mantenimiento-equipos/panel" element={<PanelMantenimiento />} />
            <Route path="/mantenimiento-equipos" element={<Navigate to="/mantenimiento-equipos/panel" replace />} />
            {/* Compatibilidad temporal con ruta padre */}
            <Route path="/mantenimiento/hojas-vida-maquinaria" element={<Navigate to="/mantenimiento/hojas-vida-maquinaria/hojas-de-vida" replace />} />
            <Route path="/mantenimiento" element={<Navigate to="/mantenimiento/hojas-vida-maquinaria/hojas-de-vida" replace />} />

            {/* Calidad */}
            <Route path="/calidad/encuestas-calidad" element={<EncuestasCalidad />} />
            <Route path="/calidad/reporte-nc" element={<ReporteNC />} />
            <Route path="/calidad/consolidado-nc" element={<ConsolidadoNC />} />
            <Route path="/calidad/planes-accion" element={<PlanesAccion />} />
            <Route path="/admin/auditoria" element={<Auditoria />} />
            <Route path="/configuracion/usuarios" element={<UsuariosConfig />} />
            <Route path="/ajustes" element={<AjustesHub />} />
            <Route path="/ajustes/cotizador-catalogos" element={<CotizadorCatalogos />} />
            <Route path="/informes" element={<InformesGestion />} />
            <Route path="/informes/:reportKey" element={<InformesGestion />} />

            {/* SST */}
            <Route path="/sst/gastos/captura" element={<GastosSST />} />
            <Route path="/sst/gastos/cotizaciones" element={<CotizacionesSST />} />
            <Route path="/sst/gastos/graficas" element={<GraficasSST />} />
            <Route path="/sst/gastos/rubros" element={<RubrosSST />} />
            <Route path="/sst/gastos/servicios" element={<TiposServicioSST />} />
            <Route path="/sst/gastos/proveedores" element={<ProveedoresSST />} />
            <Route path="/sst/orden-aseo" element={<OrdenAseoSST />} />

            {/* Cuadro Master */}
            <Route path="cuadro-master">
              <Route path="captura" element={<CapturaMensual />} />
              <Route path="desperdicio" element={<DesperdicioMaster />} />
              <Route path="tablero" element={<TableroMaster />} />
              <Route path="historial" element={<Navigate to="/cuadro-master/captura" replace />} />
              <Route path="config-maquinas" element={<ConfigMaquinasMaster />} />
              <Route path="operarios" element={<OperariosMaster />} />
              <Route path="cartas" element={<CartasMaster />} />
            </Route>

            {/* Dynamic Module Route LATER */}
            <Route path=":moduleName" element={<ModulePage />} />
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
      </AppErrorBoundary>
    </MantineProvider >
  );
}

export default App;
