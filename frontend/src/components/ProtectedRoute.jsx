import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute component - ensures that only authenticated users can access internal routes.
 * If no user is found in localStorage, or if the token has expired, it redirects to the /login page.
 */
export default function ProtectedRoute({ children }) {
    const userStr = localStorage.getItem('user');

    if (!userStr) {
        return <Navigate to="/login" replace />;
    }

    try {
        const user = JSON.parse(userStr);
        if (!user || !user.token) {
            localStorage.removeItem('user');
            return <Navigate to="/login" replace />;
        }

        // Decodificamos el payload del JWT para validar la fecha de expiración
        const payloadBase64 = user.token.split('.')[1];
        if (payloadBase64) {
            const decodedPayload = JSON.parse(atob(payloadBase64));
            const currentTime = Math.floor(Date.now() / 1000);
            
            if (decodedPayload.exp && decodedPayload.exp < currentTime) {
                localStorage.removeItem('user');
                return <Navigate to="/login" replace />;
            }
        }
    } catch (error) {
        localStorage.removeItem('user');
        return <Navigate to="/login" replace />;
    }

    return children;
}
