import React from 'react';
import RubrosGastos from '../../produccion/gastos/RubrosGastos';

const RubrosDiseno = () => {
    return <RubrosGastos titulo="Rubros de Diseño" showTabs={false} pathPrefix="/diseno/gastos" areaKey="diseno" />;
};

export default RubrosDiseno;
