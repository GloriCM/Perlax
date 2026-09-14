import React from 'react';
import RubrosGastos from '../../produccion/gastos/RubrosGastos';

export default function RubrosSST() {
    return (
        <RubrosGastos
            titulo="Rubros de SST"
            subtitulo="Captura de Gastos SST"
            pathPrefix="/sst/gastos"
            areaKey="sst"
        />
    );
}
