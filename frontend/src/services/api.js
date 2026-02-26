import axios from 'axios';

const api = axios.create({
    baseURL: 'https://localhost:5001/api', // Ajusta según el puerto de tu backend
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor para añadir el token JWT a las peticiones
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
