import React from 'react';
import ProveedoresGastos from '../../produccion/gastos/ProveedoresGastos';

export default function ProveedoresSST() {
    return (
        <ProveedoresGastos
            titulo="Proveedores de SST"
            subtitulo="Captura de Gastos SST"
            pathPrefix="/sst/gastos"
            areaKey="sst"
        />
    );
}
