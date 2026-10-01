import { IconPalette } from '@tabler/icons-react';
import PresupuestoPorAreaPage from '../shared/PresupuestoPorAreaPage';

const RUBROS = [
    'Clises',
    'Impresiones Digitales',
    'Marcos',
    'Muestra'
];

export default function DisenoPresupuesto() {
    return (
        <PresupuestoPorAreaPage
            title="Diseño"
            storageKey="diseno"
            icon={IconPalette}
            rubros={RUBROS}
        />
    );
}
