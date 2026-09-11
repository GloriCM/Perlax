import React from 'react';
import GastosProduccion from '../../produccion/gastos/GastosProduccion';

const GastosGH = () => {
    return (
        <GastosProduccion
            titulo="Gastos de Gestión Humana"
            pathPrefix="/gestion-humana/gastos"
            areaKey="gestion-humana"
            personnelRoles={[]}
        />
    );
};

export default GastosGH;
