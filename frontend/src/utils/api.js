/**
 * Centralized API utility for Perla ERP
 * Handles base URL, content-type headers, and JWT Authentication
 */

const BASE_URL =
    import.meta.env.VITE_API_BASE_URL ||
    `https://${window.location.hostname}:5263/api`;

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
                // Token expired or invalid
                localStorage.removeItem('user');
                window.location.href = '/login';
                return null;
            }

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Error en la petición');
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
            localStorage.removeItem('user');
            window.location.href = '/login';
            return null;
        }

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText || 'Error en la petición');
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }

        return await response.text();
    },
};
