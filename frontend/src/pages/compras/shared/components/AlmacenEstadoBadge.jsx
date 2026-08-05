import { ESTADO_BADGE_COLORS } from '../../../../data/almacenConstants';

export default function AlmacenEstadoBadge({ estado, size = 'sm' }) {
    const colors = ESTADO_BADGE_COLORS[estado] || ESTADO_BADGE_COLORS.Pendiente;
    const fontSize = size === 'xs' ? 11 : 12;
    const padding = size === 'xs' ? '2px 8px' : '4px 12px';

    return (
        <span
            className="almacen-estado-badge"
            style={{
                background: colors.bg,
                color: colors.text,
                border: `1px solid ${colors.border}`,
                fontSize,
                padding,
            }}
        >
            {estado}
        </span>
    );
}
