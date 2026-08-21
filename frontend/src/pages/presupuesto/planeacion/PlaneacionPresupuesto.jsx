import { IconReportAnalytics } from '@tabler/icons-react';
import PresupuestoPorAreaPage from '../shared/PresupuestoPorAreaPage';

const RUBROS = [
    'Cajas',
    'Horas Extras',
    'Insumos Especiales',
    'Recargo'
];

export default function PlaneacionPresupuesto() {
    return (
        <PresupuestoPorAreaPage
            title="Planeación"
            icon={IconReportAnalytics}
            rubros={RUBROS}
        />
    );
}
