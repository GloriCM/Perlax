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

export async function fetchAuthenticatedUploadBlob(publicPath) {
    if (!publicPath || typeof publicPath !== 'string') {
        throw new Error('Ruta de archivo invalida');
    }
    const trimmed = publicPath.trim();
    const token = getStoredAuthToken();
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const requestUrl = /^https?:\/\//i.test(trimmed)
        ? trimmed
        : `${getApiOrigin()}${encodeUploadPath(trimmed)}`;
    const response = await fetch(requestUrl, { headers });
    if (!response.ok) {
        throw new Error(`No se pudo cargar el archivo (${response.status})`);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}