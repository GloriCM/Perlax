import { IconTools } from '@tabler/icons-react';
import PresupuestoPorAreaPage from '../shared/PresupuestoPorAreaPage';

const RUBROS = [
    'Acompañamiento',
    'ALIMENTACION POR TIEMPO EXTRA',
    'ALQUILER MONTACARGAS',
    'Estibas plásticas para despacho'
];

function getInitialValue(rubro) {
    return rubro === 'ALIMENTACION POR TIEMPO EXTRA' ? 50000 : 0;
}

export default function TalleresPresupuesto() {
    return (
        <PresupuestoPorAreaPage
            title="Talleres"
            icon={IconTools}
            rubros={RUBROS}
            getInitialValue={(rubro) => getInitialValue(rubro)}
        />
    );
}
