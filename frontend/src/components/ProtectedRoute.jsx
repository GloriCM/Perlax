import { Navigate } from 'react-router-dom';

/**
 * ProtectedRoute component - ensures that only authenticated users can access internal routes.
 * If no user is found in localStorage, it redirects to the /login page.
 */
export default function ProtectedRoute({ children }) {
    const user = localStorage.getItem('user');

    if (!user) {
        // Redirect them to the /login page if not logged in
        return <Navigate to="/login" replace />;
    }

    return children;
}
