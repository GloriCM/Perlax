/**
 * Centralized API utility for Perla ERP
 * Handles base URL, content-type headers, and JWT Authentication
 */

const BASE_URL = `https://${window.location.hostname}:5263/api`;

export const api = {
    async request(endpoint, options = {}) {
        const user = JSON.parse(localStorage.getItem('user'));
        const token = user?.token;

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
};
