import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// ✅ Antes este componente mantenía su propio onAuthStateChange y getSession(),
// generando un tercer listener paralelo al de AuthContext y Header — esto causaba
// re-renders en cascada y prompts de login duplicados después de OAuth.
// Ahora delegamos en AuthContext (fuente única de verdad).
const ProtectedRoute = ({ children }) => {
    const { user, loading, authError, retrySession } = useAuth();

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

    if (!user && authError) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
                <div role="alert" className="max-w-md text-center">
                    <h1 className="text-xl font-semibold text-gray-900">No pudimos comprobar tu sesión</h1>
                    <p className="mt-3 text-gray-600">Revisa tu conexión. Puedes volver a intentar sin cerrar tu cuenta.</p>
                    <button type="button" onClick={retrySession} className="mt-5 min-h-[44px] rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white">Volver a intentar</button>
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
