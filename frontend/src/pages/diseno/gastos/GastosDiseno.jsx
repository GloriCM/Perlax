import React from 'react';
import GastosProduccion from '../../produccion/gastos/GastosProduccion';

const GastosDiseno = () => {
    return (
        <GastosProduccion
            titulo="Gastos de Diseño"
            showTabs={false}
            pathPrefix="/diseno/gastos"
            areaKey="diseno"
            personnelRoles={[]}
        />
    );
};

export default GastosDiseno;
