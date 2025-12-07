import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Search, Star, Zap, Shield, Heart } from 'lucide-react';

const WelcomePage = () => {
    const [animated, setAnimated] = useState(false);

    useEffect(() => {
        // Trigger animations after component mounts
        setTimeout(() => setAnimated(true), 100);
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-purple-50 relative overflow-hidden">
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-64 h-64 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
                <div className="absolute top-40 right-20 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse" style={{ animationDelay: '1s' }}></div>
                <div className="absolute bottom-20 left-1/2 w-80 h-80 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>

                {/* Floating icons */}
                <div className="absolute top-1/4 left-[15%] text-pink-300 animate-bounce" style={{ animationDelay: '0.5s' }}>
                    <MapPin size={32} />
                </div>
                <div className="absolute top-1/3 right-[10%] text-purple-300 animate-bounce" style={{ animationDelay: '1s' }}>
                    <Search size={28} />
                </div>
                <div className="absolute bottom-1/3 left-[8%] text-blue-300 animate-bounce" style={{ animationDelay: '1.5s' }}>
                    <Star size={24} />
                </div>
            </div>

            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
                {/* Logo */}
                <div className={`mb-8 transform transition-all duration-700 ${animated ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
                    <img
                        src="/images/logo-main.png"
                        alt="Geobooker"
                        className="w-48 h-auto md:w-64 drop-shadow-lg hover:scale-105 transition-transform duration-300"
                    />
                </div>

                {/* Tagline */}
                <div className={`text-center mb-10 transform transition-all duration-700 delay-200 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
                        <span className="text-gray-800">Encuentra </span>
                        <span className="bg-gradient-to-r from-pink-500 to-purple-600 bg-clip-text text-transparent">negocios</span>
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-500 font-light">
                        cerca de ti, en segundos ⚡
                    </p>
                </div>

                {/* Feature cards */}
                <div className={`grid grid-cols-3 gap-4 md:gap-8 mb-10 max-w-lg w-full transform transition-all duration-700 delay-400 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <div className="text-center group cursor-pointer">
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-pink-400 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                            <Zap className="w-7 h-7 md:w-8 md:h-8 text-white" />
                        </div>
                        <span className="text-xs md:text-sm font-medium text-gray-600">Rápido</span>
                    </div>
                    <div className="text-center group cursor-pointer">
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-purple-400 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                            <MapPin className="w-7 h-7 md:w-8 md:h-8 text-white" />
                        </div>
                        <span className="text-xs md:text-sm font-medium text-gray-600">Local</span>
                    </div>
                    <div className="text-center group cursor-pointer">
                        <div className="w-14 h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-400 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-300">
                            <Shield className="w-7 h-7 md:w-8 md:h-8 text-white" />
                        </div>
                        <span className="text-xs md:text-sm font-medium text-gray-600">Gratis</span>
                    </div>
                </div>

                {/* Action buttons */}
                <div className={`w-full max-w-sm space-y-4 transform transition-all duration-700 delay-500 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <Link
                        to="/signup"
                        className="block w-full bg-gradient-to-r from-pink-500 via-purple-500 to-purple-600 text-white text-center py-4 px-6 rounded-2xl text-lg font-bold hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 shadow-xl"
                    >
                        🚀 Comenzar Gratis
                    </Link>

                    <Link
                        to="/login"
                        className="block w-full bg-white/80 backdrop-blur-sm border-2 border-purple-200 text-purple-600 text-center py-4 px-6 rounded-2xl text-lg font-semibold hover:bg-purple-50 hover:border-purple-300 transition-all duration-300"
                    >
                        Ya tengo cuenta
                    </Link>

                    <Link
                        to="/home"
                        className="block w-full text-gray-500 text-center py-3 text-sm hover:text-purple-600 transition-colors"
                    >
                        Explorar sin cuenta →
                    </Link>
                </div>

                {/* Trust indicators */}
                <div className={`mt-10 text-center transform transition-all duration-700 delay-700 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <div className="flex items-center justify-center space-x-1 text-yellow-500 mb-2">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} size={16} fill="currentColor" />
                        ))}
                    </div>
                    <p className="text-sm text-gray-400">
                        Usado por miles de mexicanos 🇲🇽
                    </p>
                </div>

                {/* Footer */}
                <div className={`mt-8 text-center transform transition-all duration-700 delay-800 ${animated ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
                    <p className="text-xs text-gray-400 mb-2">
                        Al continuar, aceptas nuestros{' '}
                        <Link to="/terms" className="text-purple-500 hover:underline">Términos</Link>
                        {' '}y{' '}
                        <Link to="/privacy" className="text-purple-500 hover:underline">Privacidad</Link>
                    </p>
                    <p className="text-xs text-gray-300 flex items-center justify-center">
                        Hecho con <Heart size={12} className="mx-1 text-pink-400 fill-current" /> en México
                    </p>
                </div>
            </div>
        </div>
    );
};

export default WelcomePage;
