import React from 'react';
import GastosProduccion from '../../produccion/gastos/GastosProduccion';

const GastosPlaneacion = () => {
    return (
        <GastosProduccion
            titulo="Gastos de Planeación"
            showTabs
            pathPrefix="/planeacion/gastos"
            areaKey="planeacion"
            personnelRoles={['Almacen']}
        />
    );
};

export default GastosPlaneacion;
