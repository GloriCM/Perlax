import { IconShieldCheck } from '@tabler/icons-react';
import PresupuestoPorAreaPage from '../shared/PresupuestoPorAreaPage';

const RUBROS = [
    'Aerorumba-terapia fisica, yoga',
    'Afiches, Carteleras, avisos, medios de comunicacion',
    'Aplicacion de la bateria del riesgo psicosocial',
    'Arreglos locativos (Para riesgo Mecanico, locativo)'
];

export default function SstPresupuesto() {
    return (
        <PresupuestoPorAreaPage
            title="SST"
            icon={IconShieldCheck}
            rubros={RUBROS}
            rowLabel="Tipo de servicio"
        />
    );
}
