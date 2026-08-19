import React from 'react';
import ProveedoresGastos from '../../produccion/gastos/ProveedoresGastos';

const ProveedoresDiseno = () => {
    return <ProveedoresGastos titulo="Proveedores de Diseño" showTabs={false} pathPrefix="/diseno/gastos" areaKey="diseno" />;
};

export default ProveedoresDiseno;
