// src/pages/ReferralLanding.jsx
/**
 * Landing page for referral links
 * URL: /r/:code
 * Stores referral code in localStorage and redirects to signup
 */
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Gift, Users, Star, ArrowRight, Sparkles, MapPin } from 'lucide-react';
import SEO from '../components/SEO';

export default function ReferralLanding() {
    const { code } = useParams();
    const navigate = useNavigate();
    const [referrerName, setReferrerName] = useState('un amigo');

    useEffect(() => {
        // Store referral code for later use during signup
        if (code) {
            localStorage.setItem('referral_code', code.toUpperCase());
        }
    }, [code]);

    const handleGetStarted = () => {
        navigate('/signup');
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-purple-900/20 to-gray-900">
            <SEO
                title="Te invitaron a Geobooker | Más clientes para tu negocio"
                description="Registra tu negocio GRATIS y empieza a recibir más clientes hoy. Invitación especial."
            />

            {/* Hero Section */}
            <div className="relative overflow-hidden">
                {/* Animated background */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse" />
                    <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
                </div>

                <div className="container mx-auto px-4 py-16 relative z-10">
                    {/* Referral Badge */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/50 text-yellow-300 px-6 py-2 rounded-full text-sm font-medium">
                            <Gift className="w-4 h-4" />
                            🎉 Invitación Especial
                        </div>
                    </div>

                    {/* Main Headline */}
                    <div className="text-center max-w-3xl mx-auto">
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">
                            <span className="bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-400 text-transparent bg-clip-text">
                                ¿Buscas más clientes
                            </span>
                            <br />
                            para tu negocio? 🚀
                        </h1>

                        <p className="text-xl text-gray-300 mb-8">
                            <strong className="text-white">{referrerName}</strong> te invitó a unirte a <strong className="text-blue-400">Geobooker</strong>,
                            la plataforma donde los clientes encuentran negocios como el tuyo.
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                onClick={handleGetStarted}
                                className="group bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-xl hover:shadow-yellow-500/30 transition-all hover:scale-105 flex items-center gap-2"
                            >
                                <Sparkles className="w-5 h-5" />
                                Registrar mi Negocio GRATIS
                                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                            </button>
                        </div>

                        <p className="text-gray-500 text-sm mt-4">
                            ✅ Sin costo • ✅ Sin tarjeta de crédito • ✅ Activo en minutos
                        </p>
                    </div>

                    {/* Benefits */}
                    <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-4xl mx-auto">
                        <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-6 text-center">
                            <div className="w-14 h-14 bg-blue-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <MapPin className="w-7 h-7 text-blue-400" />
                            </div>
                            <h3 className="font-bold text-white text-lg mb-2">Aparece en el Mapa</h3>
                            <p className="text-gray-400 text-sm">Los clientes te encuentran cuando buscan negocios cerca de ellos</p>
                        </div>

                        <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-6 text-center">
                            <div className="w-14 h-14 bg-green-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <Users className="w-7 h-7 text-green-400" />
                            </div>
                            <h3 className="font-bold text-white text-lg mb-2">Más Clientes</h3>
                            <p className="text-gray-400 text-sm">Miles de personas usan Geobooker para encontrar negocios cada día</p>
                        </div>

                        <div className="bg-gray-800/50 backdrop-blur border border-gray-700 rounded-2xl p-6 text-center">
                            <div className="w-14 h-14 bg-yellow-500/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                                <Star className="w-7 h-7 text-yellow-400" />
                            </div>
                            <h3 className="font-bold text-white text-lg mb-2">100% Gratis</h3>
                            <p className="text-gray-400 text-sm">Registra tu negocio sin costo. Opcional: Premium para más visibilidad</p>
                        </div>
                    </div>

                    {/* Social Proof */}
                    <div className="text-center mt-16">
                        <p className="text-gray-400 mb-4">Ya confían en nosotros</p>
                        <div className="flex items-center justify-center gap-8 flex-wrap">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-white">500+</div>
                                <div className="text-sm text-gray-500">Negocios</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-white">10K+</div>
                                <div className="text-sm text-gray-500">Usuarios</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-white">50K+</div>
                                <div className="text-sm text-gray-500">Búsquedas/mes</div>
                            </div>
                        </div>
                    </div>

                    {/* Referral Code Display */}
                    <div className="mt-12 text-center">
                        <div className="inline-block bg-gray-800/80 border border-gray-700 rounded-xl px-6 py-3">
                            <span className="text-gray-400 text-sm">Código de invitación: </span>
                            <span className="text-yellow-400 font-mono font-bold text-lg">{code?.toUpperCase() || 'N/A'}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
