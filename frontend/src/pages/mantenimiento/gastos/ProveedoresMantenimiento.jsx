import React from 'react';
import ProveedoresGastos from '../../produccion/gastos/ProveedoresGastos';

export default function ProveedoresMantenimiento() {
    return (
        <ProveedoresGastos
            titulo="Proveedores de Mantenimiento"
            subtitulo="Control de Gastos"
            pathPrefix="/mantenimiento/gastos"
            areaKey="mantenimiento"
        />
    );
}
