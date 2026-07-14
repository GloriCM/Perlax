import React from 'react';
import GastosProduccion from '../produccion/GastosProduccion';

const RUBROS_MANTENIMIENTO = [
    'Todos los Rubros',
    'Ferreteria',
    'Lubricacion',
    'Mantenimiento',
    'Repuestos',
    'Rodamientos',
    'Sistema Aire',
];

export default function GastosMantenimiento() {
    return (
        <GastosProduccion
            titulo="Gastos de Mantenimiento"
            showTabs={true}
            pathPrefix="/mantenimiento/gastos"
            rubros={RUBROS_MANTENIMIENTO}
        />
    );
}
