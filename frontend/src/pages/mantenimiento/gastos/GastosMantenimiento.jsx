import React from 'react';
import GastosProduccion from '../../produccion/gastos/GastosProduccion';

export default function GastosMantenimiento() {
    return (
        <GastosProduccion
            titulo="Gastos de Mantenimiento"
            showTabs
            pathPrefix="/mantenimiento/gastos"
            areaKey="mantenimiento"
            personnelRoles={[]}
        />
    );
}
