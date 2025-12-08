import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, Star, Zap, TrendingUp, Camera, MapPin, BarChart, Clock, Instagram, Facebook, Globe } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_sample');

const UpgradePage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [priceId, setPriceId] = useState(null);

    // Configuración de lanzamiento
    const LAUNCH_CONFIG = {
        regularPrice: 299,
        launchPrice: 119,
        discount: 60,
        spotsLeft: 47, // Simular escasez
        deadline: '31 de Enero 2025',
        isLaunchActive: true
    };

    React.useEffect(() => {
        const fetchPlanConfig = async () => {
            try {
                const { data } = await supabase
                    .from('subscription_plans')
                    .select('stripe_price_id_mxn')
                    .eq('code', 'premium_monthly')
                    .single();
                if (data) setPriceId(data.stripe_price_id_mxn);
            } catch (err) {
                console.error('Error fetching plan:', err);
            }
        };
        fetchPlanConfig();
    }, []);

    const handleUpgrade = async () => {
        setLoading(true);
        const toastId = toast.loading('Preparando pago seguro...');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error('Debes iniciar sesión para actualizar', { id: toastId });
                navigate('/login');
                return;
            }
            const stripe = await stripePromise;
            if (!stripe) throw new Error('Stripe no pudo cargarse');

            const response = await fetch('/.netlify/functions/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: priceId || 'price_1Sc6qYRvtu8q72XsuBdILiPA',
                    userId: session.user.id,
                    customerEmail: session.user.email,
                    successUrl: window.location.origin + '/dashboard?success=true',
                    cancelUrl: window.location.origin + '/upgrade?canceled=true',
                    countryCode: 'MX'
                }),
            });
            const sessionData = await response.json();
            if (sessionData.error) throw new Error(sessionData.error);
            const { error } = await stripe.redirectToCheckout({ sessionId: sessionData.sessionId });
            if (error) throw error;
        } catch (error) {
            toast.error(`Error: ${error.message}`, { id: toastId });
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50 py-12">
            <div className="max-w-6xl mx-auto px-4">
                <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900 mb-8 flex items-center">
                    ← Volver al Dashboard
                </button>

                {/* Hero */}
                <div className="text-center mb-12">
                    {LAUNCH_CONFIG.isLaunchActive && (
                        <div className="inline-flex items-center bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold mb-4 animate-pulse">
                            🚀 LANZAMIENTO: Solo quedan {LAUNCH_CONFIG.spotsLeft} lugares al precio especial
                        </div>
                    )}
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        Haz Crecer tu Negocio
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Destaca entre miles de negocios con Geobooker Premium
                    </p>
                </div>

                {/* Plans */}
                <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
                    {/* Plan Gratis - LIMITADO */}
                    <div className="bg-white rounded-2xl shadow-md border-2 border-gray-200 p-8">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Plan Gratuito</h3>
                            <div className="text-4xl font-bold text-gray-900">$0</div>
                            <p className="text-gray-500">por siempre</p>
                        </div>

                        <p className="text-center text-gray-600 text-sm mb-6 bg-gray-50 p-3 rounded-lg">
                            Ideal para aparecer en el mapa y que te encuentren
                        </p>

                        <ul className="space-y-3 mb-8">
                            <li className="flex items-start">
                                <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span><strong>1 negocio</strong> (máximo)</span>
                            </li>
                            <li className="flex items-start">
                                <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Hasta <strong>3 fotos</strong></span>
                            </li>
                            <li className="flex items-start">
                                <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Pin básico en mapa</span>
                            </li>
                            <li className="flex items-start">
                                <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Información de contacto</span>
                            </li>
                            <li className="flex items-start">
                                <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Horario básico</span>
                            </li>
                            <li className="flex items-start text-gray-400">
                                <X className="w-5 h-5 text-gray-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Prioridad en búsquedas</span>
                            </li>
                            <li className="flex items-start text-gray-400">
                                <X className="w-5 h-5 text-gray-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Estadísticas avanzadas</span>
                            </li>
                            <li className="flex items-start text-gray-400">
                                <X className="w-5 h-5 text-gray-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Badge VERIFICADO</span>
                            </li>
                            <li className="flex items-start text-gray-400">
                                <X className="w-5 h-5 text-gray-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Redes sociales</span>
                            </li>
                        </ul>

                        <Link to="/dashboard" className="block w-full text-center bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">
                            Plan Actual
                        </Link>
                    </div>

                    {/* Plan Premium - LANZAMIENTO */}
                    <div className="bg-gradient-to-br from-purple-600 via-pink-600 to-purple-700 rounded-2xl shadow-2xl p-8 text-white relative overflow-hidden transform md:scale-105">
                        {/* Badge */}
                        <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                            🔥 LANZAMIENTO
                        </div>

                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold mb-2">Plan Premium</h3>

                            {LAUNCH_CONFIG.isLaunchActive ? (
                                <>
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="text-2xl text-white/60 line-through">${LAUNCH_CONFIG.regularPrice}</span>
                                        <span className="text-5xl font-bold">${LAUNCH_CONFIG.launchPrice}</span>
                                    </div>
                                    <p className="text-pink-200">MXN / mes</p>
                                    <div className="inline-block bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-sm font-bold mt-2">
                                        -{LAUNCH_CONFIG.discount}% DESCUENTO
                                    </div>
                                    <p className="text-xs text-pink-200 mt-2">
                                        Válido hasta {LAUNCH_CONFIG.deadline} o primeros 100 negocios
                                    </p>
                                </>
                            ) : (
                                <>
                                    <div className="text-5xl font-bold">${LAUNCH_CONFIG.regularPrice}</div>
                                    <p className="text-pink-200">MXN / mes</p>
                                </>
                            )}
                        </div>

                        <p className="text-center text-pink-100 text-sm mb-6 bg-white/10 p-3 rounded-lg">
                            Destaca realmente y atrae más clientes
                        </p>

                        <ul className="space-y-3 mb-8">
                            <li className="flex items-start">
                                <Check className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span><strong>Negocios ilimitados</strong></span>
                            </li>
                            <li className="flex items-start">
                                <Camera className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Hasta <strong>20 fotos</strong> por negocio</span>
                            </li>
                            <li className="flex items-start">
                                <MapPin className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Pin dorado <strong>animado ⭐</strong></span>
                            </li>
                            <li className="flex items-start">
                                <TrendingUp className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span><strong>Prioridad</strong> en resultados</span>
                            </li>
                            <li className="flex items-start">
                                <Zap className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Badge <strong>"VERIFICADO"</strong></span>
                            </li>
                            <li className="flex items-start">
                                <BarChart className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span><strong>Estadísticas</strong> de visitas y clics</span>
                            </li>
                            <li className="flex items-start">
                                <Clock className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Horarios de apertura avanzados</span>
                            </li>
                            <li className="flex items-start">
                                <Globe className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span><strong>Redes sociales</strong> de tu negocio</span>
                            </li>
                            <li className="flex items-start">
                                <Star className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Soporte prioritario</span>
                            </li>
                        </ul>

                        <button
                            onClick={handleUpgrade}
                            disabled={loading}
                            className={`w-full bg-yellow-400 text-gray-900 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition transform hover:scale-[1.02] shadow-lg ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Procesando...' : (
                                <>
                                    Actualizar a Premium →
                                    {LAUNCH_CONFIG.isLaunchActive && (
                                        <span className="block text-xs font-normal mt-1">Aprovecha precio de lanzamiento</span>
                                    )}
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Redes Sociales Feature Highlight */}
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-16 max-w-4xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                                    NUEVO EN PREMIUM
                                </div>
                            </div>
                            <h3 className="text-2xl font-bold text-gray-900 mb-3">
                                Conecta tus Redes Sociales
                            </h3>
                            <p className="text-gray-600 mb-4">
                                Los usuarios Premium pueden linkear sus redes sociales directamente en su perfil de negocio. Tus clientes podrán seguirte en Instagram, Facebook, TikTok, y más.
                            </p>
                            <div className="flex items-center gap-4 text-gray-400">
                                <Instagram size={28} />
                                <Facebook size={28} />
                                <Globe size={28} />
                                <span className="text-sm">y más...</span>
                            </div>
                        </div>
                        <div className="flex-shrink-0 bg-gradient-to-br from-purple-100 to-pink-100 p-6 rounded-2xl">
                            <div className="bg-white rounded-xl p-4 shadow-md w-64">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold">P</div>
                                    <div>
                                        <div className="font-bold text-sm">Pizzería Roma</div>
                                        <div className="text-xs text-green-600 flex items-center gap-1">
                                            <Zap size={10} /> VERIFICADO
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <a className="bg-pink-100 p-2 rounded-lg"><Instagram size={16} className="text-pink-500" /></a>
                                    <a className="bg-blue-100 p-2 rounded-lg"><Facebook size={16} className="text-blue-600" /></a>
                                    <a className="bg-gray-100 p-2 rounded-lg"><Globe size={16} className="text-gray-600" /></a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Benefits */}
                <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl shadow-lg p-8 text-white text-center mb-16">
                    <p className="text-xl mb-4">
                        <strong>+500 negocios</strong> ya confiaron en Geobooker Premium
                    </p>
                    <div className="flex justify-center items-center space-x-2 text-yellow-300">
                        {[...Array(5)].map((_, i) => <Star key={i} className="w-6 h-6 fill-yellow-300" />)}
                    </div>
                </div>

                {/* FAQ */}
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">Preguntas Frecuentes</h2>
                    <div className="space-y-4">
                        <details className="bg-white rounded-lg shadow-md p-6">
                            <summary className="font-bold text-lg cursor-pointer">¿Puedo cancelar en cualquier momento?</summary>
                            <p className="text-gray-600 mt-2">Sí, puedes cancelar tu suscripción Premium cuando quieras, sin penalizaciones.</p>
                        </details>
                        <details className="bg-white rounded-lg shadow-md p-6">
                            <summary className="font-bold text-lg cursor-pointer">¿El precio de lanzamiento es permanente?</summary>
                            <p className="text-gray-600 mt-2">El precio de ${LAUNCH_CONFIG.launchPrice}/mes aplica los primeros 3 meses. Después, el precio regular es ${LAUNCH_CONFIG.regularPrice}/mes.</p>
                        </details>
                        <details className="bg-white rounded-lg shadow-md p-6">
                            <summary className="font-bold text-lg cursor-pointer">¿Qué redes sociales puedo conectar?</summary>
                            <p className="text-gray-600 mt-2">Puedes agregar: Instagram, Facebook, TikTok, Twitter/X, LinkedIn, YouTube, WhatsApp Business, y tu sitio web.</p>
                        </details>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradePage;
