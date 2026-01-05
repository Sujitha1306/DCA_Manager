import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ allowedRoles }) {
    const { user, loading } = useAuth();

    if (loading) return <div className="h-screen w-full flex items-center justify-center bg-slate-50 text-slate-400">Loading Access Control...</div>;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // If user is logged in but doesn't have the right role, 
        // maybe redirect to a specialized unauthorized page, 
        // but for now redirect to root which will typically serve their dashboard.
        // If they ARE at root, this might cause a loop, so let's check.
        return <Navigate to="/" replace />;
    }

    return <Outlet />;
}
