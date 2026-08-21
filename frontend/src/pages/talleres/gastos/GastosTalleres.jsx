import React from 'react';
import GastosProduccion from '../../produccion/gastos/GastosProduccion';

const GastosTalleres = () => {
    return <GastosProduccion titulo="Talleres y Despachos" personnelRoles={['Taller']} />;
};

export default GastosTalleres;
