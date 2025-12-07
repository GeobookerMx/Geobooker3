import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, Star, Zap, TrendingUp, Camera, MapPin, BarChart } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

// Inicializar Stripe (asegúrate de tener la variable en .env.local)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY || 'pk_test_sample');

const UpgradePage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [priceId, setPriceId] = useState(null); // ID del precio de Stripe

    // Cargar configuración de precio desde Supabase
    React.useEffect(() => {
        const fetchPlanConfig = async () => {
            try {
                // Por defecto cargamos el plan mensual premium
                // En el futuro, aquí seleccionamos por país/moneda
                const { data, error } = await supabase
                    .from('subscription_plans')
                    .select('stripe_price_id_mxn')
                    .eq('code', 'premium_monthly')
                    .single();

                if (data) {
                    setPriceId(data.stripe_price_id_mxn);
                } else if (!error) {
                    // Fallback si no hay datos en DB
                    console.warn('No plan config found');
                }
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
            // 1. Obtener usuario actual
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error('Debes iniciar sesión para actualizar', { id: toastId });
                navigate('/login');
                return;
            }

            // 2. Obtener instancia de Stripe
            const stripe = await stripePromise;
            if (!stripe) throw new Error('Stripe no pudo cargarse');

            // 3. Crear sesión de checkout en el backend (Netlify Function)
            // Usamos '/.netlify/functions/...' que es la ruta estándar
            const response = await fetch('/.netlify/functions/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: priceId || 'price_H5ggYwtDq4fbrJ', // Fallback ID o el de la DB
                    userId: session.user.id,
                    customerEmail: session.user.email,
                    successUrl: window.location.origin + '/dashboard?success=true',
                    cancelUrl: window.location.origin + '/upgrade?canceled=true',
                    countryCode: 'MX' // Idealmente dinámico
                }),
            });

            const sessionData = await response.json();

            if (sessionData.error) {
                throw new Error(sessionData.error);
            }

            // 4. Redirigir a Stripe
            const { error } = await stripe.redirectToCheckout({
                sessionId: sessionData.sessionId,
            });

            if (error) {
                throw error;
            }

        } catch (error) {
            console.error('Error de pago:', error);
            toast.error(`Error al iniciar pago: ${error.message}`, { id: toastId });
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-12">
            <div className="max-w-7xl mx-auto px-4">
                {/* Back Button */}
                <button
                    onClick={() => navigate('/dashboard')}
                    className="text-gray-600 hover:text-gray-900 mb-8 flex items-center"
                >
                    ← Volver al Dashboard
                </button>

                {/* Hero Section */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-semibold mb-4">
                        <Star className="w-4 h-4 mr-2 fill-yellow-500" />
                        Actualiza a Premium
                    </div>
                    <h1 className="text-5xl font-bold text-gray-900 mb-4">
                        Haz Crecer tu Negocio
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        Destaca entre miles de negocios, obtén más clientes y controla tu presencia en línea con Geobooker Premium
                    </p>
                </div>

                {/* Comparison Table */}
                <div className="grid md:grid-cols-2 gap-8 mb-16">
                    {/* Plan Gratis */}
                    <div className="bg-white rounded-2xl shadow-md border-2 border-gray-200 p-8">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-gray-900 mb-2">Plan Gratuito</h3>
                            <div className="text-4xl font-bold text-gray-900">$0</div>
                            <p className="text-gray-500">por siempre</p>
                        </div>

                        <ul className="space-y-4 mb-8">
                            <li className="flex items-start">
                                <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Hasta <strong>2 negocios</strong></span>
                            </li>
                            <li className="flex items-start">
                                <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span><strong>1 foto</strong> por negocio</span>
                            </li>
                            <li className="flex items-start">
                                <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Pin dorado básico en mapa</span>
                            </li>
                            <li className="flex items-start">
                                <Check className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Información de contacto</span>
                            </li>
                            <li className="flex items-start text-gray-400">
                                <X className="w-5 h-5 text-gray-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Galería de fotos</span>
                            </li>
                            <li className="flex items-start text-gray-400">
                                <X className="w-5 h-5 text-gray-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Estadísticas de visitas</span>
                            </li>
                            <li className="flex items-start text-gray-400">
                                <X className="w-5 h-5 text-gray-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Prioridad en búsquedas</span>
                            </li>
                            <li className="flex items-start text-gray-400">
                                <X className="w-5 h-5 text-gray-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Pin animado destacado</span>
                            </li>
                        </ul>

                        <Link
                            to="/dashboard"
                            className="block w-full text-center bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition"
                        >
                            Plan Actual
                        </Link>
                    </div>

                    {/* Plan Premium */}
                    <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl shadow-2xl border-2 border-blue-500 p-8 text-white relative overflow-hidden transform scale-105">
                        {/* Badge "Más Popular" */}
                        <div className="absolute top-4 right-4 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                            MÁS POPULAR
                        </div>

                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold mb-2">Plan Premium</h3>
                            <div className="text-5xl font-bold">$299</div>
                            <p className="text-blue-100">MXN / mes</p>
                        </div>

                        <ul className="space-y-4 mb-8">
                            <li className="flex items-start">
                                <Check className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span><strong>Negocios ilimitados</strong></span>
                            </li>
                            <li className="flex items-start">
                                <Camera className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Hasta <strong>10 fotos</strong> por negocio</span>
                            </li>
                            <li className="flex items-start">
                                <MapPin className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Pin dorado <strong>animado</strong> ⭐</span>
                            </li>
                            <li className="flex items-start">
                                <BarChart className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span><strong>Estadísticas</strong> de visitas y clicks</span>
                            </li>
                            <li className="flex items-start">
                                <TrendingUp className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span><strong>Prioridad</strong> en resultados de búsqueda</span>
                            </li>
                            <li className="flex items-start">
                                <Zap className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Badge <strong>"VERIFICADO"</strong> en tu negocio</span>
                            </li>
                            <li className="flex items-start">
                                <Check className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Horarios de apertura</span>
                            </li>
                            <li className="flex items-start">
                                <Check className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Soporte prioritario</span>
                            </li>
                        </ul>

                        <button
                            onClick={handleUpgrade}
                            disabled={loading}
                            className={`w-full bg-yellow-400 text-gray-900 py-4 rounded-lg font-bold text-lg hover:bg-yellow-300 transition transform hover:scale-105 shadow-lg flex items-center justify-center ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {loading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Procesando...
                                </>
                            ) : (
                                'Actualizar a Premium →'
                            )}
                        </button>
                    </div>
                </div>

                {/* ROI Calculator / Benefits */}
                <div className="bg-white rounded-2xl shadow-lg p-8 mb-16">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
                        ¿Por qué actualizar a Premium?
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <TrendingUp className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Más Visibilidad</h3>
                            <p className="text-gray-600">
                                Los negocios Premium aparecen primero en los resultados de búsqueda
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Camera className="w-8 h-8 text-purple-600" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Galería Completa</h3>
                            <p className="text-gray-600">
                                10 fotos para mostrar tu negocio como se merece
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                <BarChart className="w-8 h-8 text-green-600" />
                            </div>
                            <h3 className="font-bold text-lg mb-2">Estadísticas Reales</h3>
                            <p className="text-gray-600">
                                Ve cuántas personas buscan y visitan tu negocio
                            </p>
                        </div>
                    </div>
                </div>

                {/* Social Proof */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg p-8 text-white text-center">
                    <p className="text-xl mb-4">
                        <strong>+500 negocios</strong> ya confiaron en Geobooker Premium
                    </p>
                    <div className="flex justify-center items-center space-x-2 text-yellow-300">
                        <Star className="w-6 h-6 fill-yellow-300" />
                        <Star className="w-6 h-6 fill-yellow-300" />
                        <Star className="w-6 h-6 fill-yellow-300" />
                        <Star className="w-6 h-6 fill-yellow-300" />
                        <Star className="w-6 h-6 fill-yellow-300" />
                    </div>
                    <p className="mt-2 text-blue-100">Calificación promedio de nuestros clientes Premium</p>
                </div>

                {/* FAQ */}
                <div className="mt-16">
                    <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
                        Preguntas Frecuentes
                    </h2>

                    <div className="max-w-3xl mx-auto space-y-4">
                        <details className="bg-white rounded-lg shadow-md p-6">
                            <summary className="font-bold text-lg cursor-pointer">
                                ¿Puedo cancelar en cualquier momento?
                            </summary>
                            <p className="text-gray-600 mt-2">
                                Sí, puedes cancelar tu suscripción Premium en cualquier momento desde tu dashboard. No hay penalizaciones ni cargos ocultos.
                            </p>
                        </details>

                        <details className="bg-white rounded-lg shadow-md p-6">
                            <summary className="font-bold text-lg cursor-pointer">
                                ¿Qué pasa con mis negocios si cancelo Premium?
                            </summary>
                            <p className="text-gray-600 mt-2">
                                Si cancelas, tus negocios permanecen activos pero vuelves al plan gratuito (máximo 2 negocios, 1 foto). Los negocios adicionales quedarán ocultos hasta que reactives Premium.
                            </p>
                        </details>

                        <details className="bg-white rounded-lg shadow-md p-6">
                            <summary className="font-bold text-lg cursor-pointer">
                                ¿Ofrecen descuentos por pago anual?
                            </summary>
                            <p className="text-gray-600 mt-2">
                                ¡Sí! Si pagas anualmente, obtienes 2 meses gratis (10 meses al precio de 12). Contáctanos para más información.
                            </p>
                        </details>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UpgradePage;
