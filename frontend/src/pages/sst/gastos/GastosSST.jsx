import React from 'react';
import GastosProduccion from '../../produccion/gastos/GastosProduccion';

export default function GastosSST() {
    return (
        <GastosProduccion
            titulo="Captura de Gastos SST"
            showTabs
            pathPrefix="/sst/gastos"
            persistRemote={false}
            presupuestoInicial={0}
            personnelRoles={[]}
        />
    );
}
