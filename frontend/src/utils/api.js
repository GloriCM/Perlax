/**
 * Centralized API utility for Perla ERP
 * Handles base URL, content-type headers, and JWT Authentication
 */

const LOCAL_API_HOSTS = new Set(['localhost', '127.0.0.1', 'perla']);

function resolveApiBaseUrl() {
    const fromEnv = String(import.meta.env.VITE_API_BASE_URL || '').trim();
    if (fromEnv) {
        return fromEnv.replace(/\/$/, '');
    }

    const host = window.location.hostname;
    if (LOCAL_API_HOSTS.has(host)) {
        return `https://${host}:5263/api`;
    }

    // Túnel Cloudflare: la API va por HTTPS en el puerto 443, sin :5263
    if (host === 'perlax.perla.work' || host.endsWith('.perla.work')) {
        return 'https://api-perlax.perla.work/api';
    }

    return `https://${host}:5263/api`;
}

const BASE_URL = resolveApiBaseUrl();

/** Origen del servidor API (sin `/api`), útil para `/uploads/...` y estáticos. */
export function getApiOrigin() {
    const base = BASE_URL.replace(/\/$/, '');
    if (/\/api$/i.test(base)) {
        return base.replace(/\/api$/i, '');
    }
    return base;
}

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

function isAuthLoginRequest(endpoint) {
    return String(endpoint || '').includes('/users/auth/login');
}

async function readErrorMessage(response) {
    const errorText = (await response.text()).trim();
    if (!errorText) return 'Error en la petición';

    try {
        const parsed = JSON.parse(errorText);
        if (typeof parsed === 'string') return summarizeErrorMessage(parsed);
        if (parsed?.message) return summarizeErrorMessage(parsed.message);
        if (parsed?.title) return summarizeErrorMessage(parsed.title);
    } catch {
        // Respuesta en texto plano del backend
    }

    return summarizeErrorMessage(errorText.replace(/^"+|"+$/g, ''));
}

function summarizeErrorMessage(text) {
    const raw = String(text || '').trim();
    if (!raw) return 'Error en la petición';

    const exceptionMatch = raw.match(/System\.[\w.]+Exception:\s*(.+)/);
    if (exceptionMatch?.[1]) {
        return exceptionMatch[1].split('\n')[0].trim();
    }

    const firstLine = raw.split('\n').map((line) => line.trim()).find(Boolean);
    if (firstLine && firstLine.length <= 220) return firstLine;

    return `${(firstLine || raw).slice(0, 220)}...`;
}

export const api = {
    async request(endpoint, options = {}) {
        const token = getStoredAuthToken();

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(`${BASE_URL}${endpoint}`, config);

            if (response.status === 401) {
                if (isAuthLoginRequest(endpoint) || options.skipAuthRedirect) {
                    throw new Error(await readErrorMessage(response));
                }

                localStorage.removeItem('user');
                window.location.href = '/login';
                return null;
            }

            if (!response.ok) {
                throw new Error(await readErrorMessage(response));
            }

            // Check if response has content
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            return await response.text();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    },

    get(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'GET' });
    },

    post(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    put(endpoint, data, options = {}) {
        return this.request(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
        });
    },

    delete(endpoint, options = {}) {
        return this.request(endpoint, { ...options, method: 'DELETE' });
    },

    /** multipart/form-data (no establecer Content-Type; el navegador añade boundary) */
    async postFormData(endpoint, formData) {
        const token = getStoredAuthToken();
        const headers = {};
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${BASE_URL}${endpoint}`, {
            method: 'POST',
            headers,
            body: formData,
        });

        if (response.status === 401) {
            if (isAuthLoginRequest(endpoint)) {
                throw new Error(await readErrorMessage(response));
            }

            localStorage.removeItem('user');
            window.location.href = '/login';
            return null;
        }

        if (!response.ok) {
            throw new Error(await readErrorMessage(response));
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        return await response.text();
    },
};
