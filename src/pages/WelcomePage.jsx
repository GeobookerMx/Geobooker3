import React from 'react';
import { Link } from 'react-router-dom';

const WelcomePage = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 flex items-center justify-center px-4">
            <div className="max-w-4xl w-full">
                {/* Logo y Título */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-white rounded-full shadow-2xl mb-6">
                        <span className="text-5xl font-bold text-blue-600">G</span>
                    </div>
                    <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
                        Bienvenido a Geobooker
                    </h1>
                    <p className="text-xl md:text-2xl text-blue-100">
                        Encuentra negocios cerca de ti en segundos
                    </p>
                </div>

                {/* Beneficios */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">Búsqueda Rápida</h3>
                        <p className="text-blue-100 text-sm">
                            Encuentra lo que necesitas en tu área al instante
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            </svg>
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">Cerca de Ti</h3>
                        <p className="text-blue-100 text-sm">
                            Resultados basados en tu ubicación actual
                        </p>
                    </div>

                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">100% Gratis</h3>
                        <p className="text-blue-100 text-sm">
                            Sin costo para usuarios, siempre
                        </p>
                    </div>
                </div>

                {/* Botones de Acción */}
                <div className="bg-white rounded-2xl shadow-2xl p-8 md:p-12">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
                        Comienza Ahora
                    </h2>

                    <div className="space-y-4">
                        <Link
                            to="/signup"
                            className="block w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white text-center py-4 px-6 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition duration-300 shadow-lg hover:shadow-xl"
                        >
                            Crear Cuenta Nueva
                        </Link>

                        <Link
                            to="/login"
                            className="block w-full bg-white border-2 border-blue-600 text-blue-600 text-center py-4 px-6 rounded-xl text-lg font-semibold hover:bg-blue-50 transition duration-300"
                        >
                            Ya Tengo Cuenta
                        </Link>
                    </div>

                    <p className="text-center text-gray-500 text-sm mt-6">
                        Al continuar, aceptas nuestros{' '}
                        <Link to="/terms" className="text-blue-600 hover:underline">
                            Términos de Servicio
                        </Link>{' '}
                        y{' '}
                        <Link to="/privacy" className="text-blue-600 hover:underline">
                            Política de Privacidad
                        </Link>
                    </p>
                </div>

                {/* Footer */}
                <div className="text-center mt-8 text-blue-100 text-sm">
                    <p>© 2025 Geobooker. Hecho con ❤️ en México 🇲🇽</p>
                </div>
            </div>
        </div>
    );
};

export default WelcomePage;
