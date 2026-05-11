import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ✅ Antes este componente mantenía su propio onAuthStateChange y getSession(),
// generando un tercer listener paralelo al de AuthContext y Header — esto causaba
// re-renders en cascada y prompts de login duplicados después de OAuth.
// Ahora delegamos en AuthContext (fuente única de verdad).
const ProtectedRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Cargando...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/welcome" replace />;
    }

    return children;
};

export default ProtectedRoute;
