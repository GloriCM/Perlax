import { IconCube } from '@tabler/icons-react';
import PresupuestoPorAreaPage from '../shared/PresupuestoPorAreaPage';

const RUBROS = [
    'Horas Extras',
    'Mantenimiento',
    'Repuesto',
    'Refrigerios'
];

function getInitialValue(rubro) {
    if (rubro === 'Horas Extras') return 600000;
    if (rubro === 'Repuesto') return 1300000;
    if (rubro === 'Refrigerios') return 200000;
    return 0;
}

export default function ProduccionPresupuesto() {
    return (
        <PresupuestoPorAreaPage
            title="Producción"
            icon={IconCube}
            rubros={RUBROS}
            getInitialValue={(rubro) => getInitialValue(rubro)}
        />
    );
}
