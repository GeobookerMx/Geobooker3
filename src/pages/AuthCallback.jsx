// src/pages/AuthCallback.jsx
// Maneja el callback de OAuth (Google, Apple) después de autenticación
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const AuthCallback = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('processing');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Verificar si hay error en los parámetros
                const error = searchParams.get('error');
                const errorDescription = searchParams.get('error_description');

                if (error) {
                    console.error('OAuth error:', error, errorDescription);
                    setStatus('error');
                    setTimeout(() => {
                        navigate('/login?error=' + encodeURIComponent(errorDescription || error));
                    }, 2000);
                    return;
                }

                // Obtener la sesión actual (Supabase maneja el token automáticamente)
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('Error obteniendo sesión:', sessionError);
                    setStatus('error');
                    setTimeout(() => navigate('/login?error=session_failed'), 2000);
                    return;
                }

                if (session) {
                    setStatus('success');
                    // Pequeño delay para mostrar mensaje de éxito
                    setTimeout(() => navigate('/'), 1000);
                } else {
                    // No hay sesión, puede que el token aún no se haya procesado
                    // Esperamos un momento y reintentamos
                    await new Promise(resolve => setTimeout(resolve, 1000));

                    const { data: { session: retrySession } } = await supabase.auth.getSession();

                    if (retrySession) {
                        setStatus('success');
                        setTimeout(() => navigate('/'), 1000);
                    } else {
                        setStatus('error');
                        setTimeout(() => navigate('/login'), 2000);
                    }
                }
            } catch (err) {
                console.error('Error en callback:', err);
                setStatus('error');
                setTimeout(() => navigate('/login?error=callback_failed'), 2000);
            }
        };

        handleCallback();
    }, [navigate, searchParams]);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4 text-center">
                {status === 'processing' && (
                    <>
                        <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-200 border-t-blue-600 mx-auto"></div>
                        <h2 className="mt-6 text-xl font-semibold text-gray-800">
                            Completando inicio de sesión...
                        </h2>
                        <p className="mt-2 text-gray-500">
                            Por favor espera un momento
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </div>
                        <h2 className="mt-6 text-xl font-semibold text-gray-800">
                            ¡Inicio de sesión exitoso!
                        </h2>
                        <p className="mt-2 text-gray-500">
                            Redirigiendo al dashboard...
                        </p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h2 className="mt-6 text-xl font-semibold text-gray-800">
                            Error de autenticación
                        </h2>
                        <p className="mt-2 text-gray-500">
                            Redirigiendo al login...
                        </p>
                    </>
                )}
            </div>
        </div>
    );
};

export default AuthCallback;
