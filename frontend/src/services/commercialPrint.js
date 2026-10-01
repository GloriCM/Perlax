import { getApiOrigin } from '../utils/api';

function authToken() {
    try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return user?.Token || user?.token || '';
    } catch {
        return '';
    }
}

/** Abre plantilla HTML imprimible del API (mismo patrón que cotizador). */
export function openCommercialPrint(path) {
    const token = authToken();
    const url = `${getApiOrigin()}/api/production/${path}${token ? `${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}` : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
}
