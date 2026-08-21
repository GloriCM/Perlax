import { IconUsers } from '@tabler/icons-react';
import PresupuestoPorAreaPage from '../shared/PresupuestoPorAreaPage';

const RUBROS = [
    'Agua/Luz/Alcantarillado/Aseo',
    'Aire Acondicionado',
    'Arreglos Varios',
    'BUSQUEDA DE PERSONAL'
];

export default function GhumanaPresupuesto() {
    return (
        <PresupuestoPorAreaPage
            title="Gestión Humana"
            icon={IconUsers}
            rubros={RUBROS}
            rowLabel="Tipo de servicio"
        />
    );
}
