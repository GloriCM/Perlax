import React from 'react';
import RubrosGastos from '../../produccion/gastos/RubrosGastos';

export default function RubrosMantenimiento() {
    return (
        <RubrosGastos
            titulo="Rubros de Mantenimiento"
            subtitulo="Control de Gastos"
            pathPrefix="/mantenimiento/gastos"
            areaKey="mantenimiento"
        />
    );
}
