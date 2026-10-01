export const money = (v) =>
    new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    }).format(v || 0);

export const pct = (v) =>
    `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(v || 0)}%`;

export const SECTION_LABELS = {
    Admin: 'Administración',
    Sales: 'Ventas',
    Production: 'Producción (MOD)',
    Cooperative: 'Cooperativa'
};

export const FIXED_GROUP_LABELS = {
    Honorarios: 'Honorarios',
    Impuestos: 'Impuestos',
    Arrendamientos: 'Arrendamientos (admin)',
    Contribuciones: 'Contribuciones',
    ServiciosAdmin: 'Servicios administrativos',
    GastosLegales: 'Gastos legales',
    MantenimientoAdmin: 'Mantenimiento admin',
    Adecuacion: 'Adecuación e instalación',
    ViajesAdmin: 'Viajes administración',
    DepreciacionAdmin: 'Depreciación admin',
    Diferidos: 'Diferidos',
    DiversosAdmin: 'Diversos admin',
    ArrendamientosVentas: 'Arrendamientos ventas',
    ServiciosVentas: 'Servicios ventas',
    ViajesVentas: 'Viajes ventas',
    DiversosVentas: 'Diversos ventas',
    Financieros: 'Gastos financieros',
    AuxiliosAdmin: 'Auxilios admin',
    AuxiliosVentas: 'Auxilios ventas',
    AuxiliosProduccion: 'Auxilios producción',
    AdmonCooperativa: 'Admon cooperativa',
    MantenimientoMaquinas: 'Mantenimiento maquinaria',
    CostosIndirectos: 'Costos indirectos',
    ContratosServicios: 'Contratos de servicios'
};

export const numberProps = {
    min: 0,
    hideControls: true,
    thousandSeparator: '.',
    decimalSeparator: ',',
    decimalScale: 0
};
