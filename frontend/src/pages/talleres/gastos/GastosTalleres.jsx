import React from 'react';
import GastosProduccion from '../../produccion/gastos/GastosProduccion';

const GastosTalleres = () => {
    return (
        <GastosProduccion
            titulo="Talleres y Despachos"
            pathPrefix="/talleres-gastos/control"
            areaKey="talleres"
            personnelRoles={['Taller']}
        />
    );
};

export default GastosTalleres;
