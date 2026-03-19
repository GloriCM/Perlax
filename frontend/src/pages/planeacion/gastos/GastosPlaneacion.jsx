import React from 'react';
import { Container } from '@mantine/core';
import GastosProduccion from '../../produccion/GastosProduccion';
import GastosTabs from '../../../components/GastosTabs';

const GastosPlaneacion = () => {
    return (
        <>
            <GastosProduccion titulo="Gastos de Planeación" showTabs={true} />
        </>
    );
};

export default GastosPlaneacion;
