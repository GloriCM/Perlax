import React from 'react';
import GastosProduccion from '../../produccion/GastosProduccion';

const RUBROS_SST = [
    'Todos los Rubros',
    'Infraestructura',
    'Capacitaciones',
    'EPP',
    'Papeleria',
    'Servicios Medicos',
    'Otros',
];

const mockExpensesSST = [
    {
        id: 1,
        category: 'Arreglos locativos (Para riesgo Mecanico, locativo)',
        type: 'Infraestructura Y aseguramiento de la operacion',
        details: [
            { icon: 'settings', text: 'TECHOS Y GOTERAS' },
            { icon: 'calendar', text: '11/3/2026' },
            { icon: 'file', text: 'Factura: 23' },
        ],
        description: 'ARREGLO TE TEJAS DE ETERNIT PLANTA 1 PLANTA 2, LIMPIEZA E IMPERMEABILIZACION DE LA CANAL PLANTA 2 CON REFUERZO DE EMPAMES Y SONDEO DE BAJANTES',
        baseAmount: 5778000,
        ivaAmount: 0,
        amount: 5778000,
        status: 'gastado',
        borderColor: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.03)',
    },
    {
        id: 2,
        category: 'Plan de Capacitaciones y refigerios',
        type: 'Capacitacion-Asesorias-Auditorias, actividades de bienestar',
        details: [
            { icon: 'settings', text: 'D1' },
            { icon: 'calendar', text: '11/3/2026' },
            { icon: 'file', text: 'Factura: G5H7191923' },
        ],
        description: 'COMPRA DE REFRIGERIO PARA REUNION MES MARZO',
        baseAmount: 32450,
        ivaAmount: 0,
        amount: 32450,
        status: 'gastado',
        borderColor: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.03)',
    },
];

export default function GastosSST() {
    return (
        <GastosProduccion
            titulo="Captura de Gastos SST"
            showTabs={true}
            pathPrefix="/sst/gastos"
            rubros={RUBROS_SST}
            initialExpenses={mockExpensesSST}
            presupuestoInicial={0}
        />
    );
}
