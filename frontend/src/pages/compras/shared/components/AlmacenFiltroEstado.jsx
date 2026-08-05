import { ESTADOS_REQUISICION, ESTADO_FILTER_COLORS } from '../../../../data/almacenConstants';

export default function AlmacenFiltroEstado({ value, onChange, counts = {} }) {
    const options = ['Todos', ...ESTADOS_REQUISICION];

    return (
        <div className="almacen-filtro-estado">
            <span className="almacen-filtro-estado__label">Filtrar por estado</span>
            <div className="almacen-filtro-estado__pills">
                {options.map((estado) => {
                    const active = value === estado;
                    const colors = ESTADO_FILTER_COLORS[estado] || ESTADO_FILTER_COLORS.Todos;
                    const count = counts[estado] ?? 0;

                    return (
                        <button
                            key={estado}
                            type="button"
                            className={`almacen-filtro-pill ${active ? 'almacen-filtro-pill--active' : ''}`}
                            onClick={() => onChange(estado)}
                            style={active ? { background: colors.bg, color: colors.text } : undefined}
                        >
                            {estado}
                            <span
                                className="almacen-filtro-pill__count"
                                style={{ background: active ? 'rgba(255,255,255,0.25)' : (colors.count || '#e5e7eb') }}
                            >
                                {count}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
