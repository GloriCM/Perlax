import { getApiOrigin } from './api';

function getStoredAuthToken() {
    try {
        const raw = localStorage.getItem('user');
        if (!raw) return null;
        const user = JSON.parse(raw);
        return user?.token ?? user?.Token ?? null;
    } catch {
        return null;
    }
}

function encodeUploadPath(publicPath) {
    const trimmed = String(publicPath || '').trim();
    if (!trimmed || /^https?:\/\//i.test(trimmed)) return trimmed;
    const path = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
    return path.split('/').map((segment, index) => {
        if (index === 0 && segment === '') return '';
        try { return encodeURIComponent(decodeURIComponent(segment)); }
        catch { return encodeURIComponent(segment); }
    }).join('/');
}

export function resolveUploadUrl(publicPath) {
    if (!publicPath || typeof publicPath !== 'string') return '';
    const trimmed = publicPath.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const origin = getApiOrigin();
    const path = encodeUploadPath(trimmed);
    const token = getStoredAuthToken();
    if (!token) return `${origin}${path}`;
    const separator = path.includes('?') ? '&' : '?';
    return `${origin}${path}${separator}access_token=${encodeURIComponent(token)}`;
}