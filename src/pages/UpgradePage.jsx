import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, Star, Zap, TrendingUp, Camera, MapPin, BarChart, Clock, Instagram, Facebook, Globe, CreditCard, Store, Gift } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';
import OxxoVoucher from '../components/payment/OxxoVoucher';
import { formatPrice, getCurrencyConfig } from '../utils/currencyUtils';
import { isPremiumPromoActive, getDaysRemaining, PROMOTIONS } from '../config/promotions';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const UpgradePage = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [priceId, setPriceId] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [oxxoVoucher, setOxxoVoucher] = useState(null);

    // 🎉 Verificar si la promo está activa
    const promoActive = isPremiumPromoActive();
    const promoDaysLeft = promoActive ? getDaysRemaining() : 0;

    // Configuración de lanzamiento
    const LAUNCH_CONFIG = {
        regularPrice: getCurrencyConfig().code === 'MXN' ? 299 : 14.99,
        launchPrice: 0, // GRATIS durante promo
        monthsFree: 3,
        spotsLeft: 4847, // De 5,000 totales
        totalSpots: 5000,
        deadline: new Date(PROMOTIONS.PREMIUM_FREE_UNTIL).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }),
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

    // 🎉 Activar Premium GRATIS durante promoción (sin Stripe)
    const handleFreeUpgrade = async () => {
        setLoading(true);
        const toastId = toast.loading('Activando Premium gratis...');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                toast.error('Debes iniciar sesión para activar Premium', { id: toastId });
                navigate('/login');
                return;
            }

            // Actualizar directamente en user_profiles
            const { error } = await supabase
                .from('user_profiles')
                .upsert({
                    id: session.user.id,
                    is_premium_owner: true,
                    premium_until: PROMOTIONS.PREMIUM_FREE_UNTIL,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (error) throw error;

            toast.success('🎉 ¡Premium activado GRATIS! Disfruta todas las funciones.', { id: toastId, duration: 5000 });
            setTimeout(() => navigate('/dashboard'), 1500);
        } catch (error) {
            console.error('Error activando Premium gratis:', error);
            toast.error(`Error: ${error.message}`, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    // Abrir modal de selección de pago (solo cuando NO hay promo)
    const handleStartUpgrade = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            toast.error('Debes iniciar sesión para actualizar');
            navigate('/login');
            return;
        }

        // Si hay promo activa, activar gratis directamente
        if (promoActive) {
            handleFreeUpgrade();
            return;
        }

        setShowPaymentModal(true);
    };

    // Procesar pago con tarjeta
    const handleCardPayment = async () => {
        setLoading(true);
        const toastId = toast.loading('Preparando pago seguro...');
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const stripe = await stripePromise;

            if (!stripe) {
                console.error('Stripe failed to load. Check VITE_STRIPE_PUBLIC_KEY');
                throw new Error('Stripe no pudo cargarse. Verifica la configuración.');
            }

            console.log('Creating premium checkout session...');

            const response = await fetch('/.netlify/functions/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Use amount instead of priceId for one-time or trials
                    // Stripe minimum is $10 MXN (1000 centavos)
                    amount: LAUNCH_CONFIG.launchPrice === 0 ? 1000 : LAUNCH_CONFIG.regularPrice * 100, // cents
                    currency: 'mxn',
                    productName: 'Geobooker Premium - 3 meses gratis',
                    userId: session.user.id,
                    customerEmail: session.user.email,
                    successUrl: window.location.origin + '/dashboard?success=true',
                    cancelUrl: window.location.origin + '/dashboard/upgrade?canceled=true',
                    mode: 'payment',
                    metadata: {
                        type: 'premium_subscription',
                        user_id: session.user.id,
                        trial_months: LAUNCH_CONFIG.monthsFree
                    }
                }),
            });

            console.log('Premium checkout response status:', response.status);
            const sessionData = await response.json();
            console.log('Premium checkout session:', sessionData);

            if (!response.ok || sessionData.error) {
                throw new Error(sessionData.error || sessionData.debug || 'Error en el servicio de pagos');
            }

            if (!sessionData.url) {
                throw new Error('No se recibió URL de pago');
            }

            toast.success('Redirigiendo a Stripe...', { id: toastId });
            window.location.href = sessionData.url;
        } catch (error) {
            console.error('Error en checkout:', error);
            toast.error(`Error: ${error.message}`, { id: toastId });
            setLoading(false);
        }
    };

    // Procesar pago con OXXO
    const handleOxxoPayment = async () => {
        setLoading(true);
        const toastId = toast.loading('Generando voucher OXXO...');
        try {
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch('/.netlify/functions/create-oxxo-payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Use same trial pricing as card: $10 MXN minimum for free trial
                    amount: LAUNCH_CONFIG.launchPrice === 0 ? 10 : LAUNCH_CONFIG.regularPrice,
                    email: session.user.email,
                    name: session.user.user_metadata?.full_name || 'Cliente Geobooker',
                    productName: 'Premium Geobooker (3 meses gratis)',
                    productId: 'premium_subscription',
                    userId: session.user.id,
                    description: 'Suscripción Premium Geobooker - 3 meses gratis incluidos'
                }),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || 'Error al generar voucher');
            }

            toast.success('¡Voucher generado!', { id: toastId });
            setOxxoVoucher({
                voucherUrl: data.voucher.hostedVoucherUrl,
                referenceNumber: data.voucher.number,
                expiresAt: data.voucher.expiresAfter,
                amount: data.amount
            });
            setShowPaymentModal(false);
        } catch (error) {
            console.error('Error OXXO:', error);
            toast.error(`Error: ${error.message}`, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    // Confirmar método de pago
    const handleConfirmPayment = () => {
        if (paymentMethod === 'card') {
            handleCardPayment();
        } else {
            handleOxxoPayment();
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-purple-50 via-white to-pink-50 py-12">
            <div className="max-w-6xl mx-auto px-4">
                <button onClick={() => navigate('/dashboard')} className="text-gray-600 hover:text-gray-900 mb-8 flex items-center">
                    ← Volver al Dashboard
                </button>

                {/* 🎉 Banner de Promoción GRATIS */}
                {promoActive && (
                    <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-6 mb-8 text-white shadow-xl">
                        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex items-center gap-4">
                                <div className="bg-white/20 p-3 rounded-full">
                                    <Gift className="w-10 h-10" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold">🎉 ¡Premium GRATIS!</h2>
                                    <p className="text-emerald-100">
                                        Promoción válida hasta el {LAUNCH_CONFIG.deadline} — Quedan {promoDaysLeft} días
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleFreeUpgrade}
                                disabled={loading}
                                className="bg-white text-emerald-600 px-8 py-3 rounded-xl font-bold text-lg hover:bg-emerald-50 transition shadow-lg whitespace-nowrap disabled:opacity-50"
                            >
                                {loading ? 'Activando...' : '✨ Activar Premium Gratis'}
                            </button>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3">
                            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">✓ Sin tarjeta</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">✓ Sin pagos</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">✓ Acceso completo</span>
                            <span className="bg-white/20 px-3 py-1 rounded-full text-sm">✓ Cancela cuando quieras</span>
                        </div>
                    </div>
                )}

                {/* Hero */}
                <div className="text-center mb-12">
                    {LAUNCH_CONFIG.isLaunchActive && !promoActive && (
                        <div className="inline-flex items-center bg-gradient-to-r from-pink-500 to-purple-600 text-white px-6 py-2 rounded-full text-sm font-bold mb-4 animate-pulse">
                            🎁 LANZAMIENTO: ¡{LAUNCH_CONFIG.monthsFree} MESES GRATIS para los primeros {LAUNCH_CONFIG.totalSpots.toLocaleString()} negocios!
                        </div>
                    )}
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                        {promoActive ? '¡Premium sin costo!' : 'Haz Crecer tu Negocio'}
                    </h1>
                    <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                        {promoActive
                            ? 'Activa Premium gratis y disfruta todas las funciones para tu negocio'
                            : 'Destaca entre miles de negocios con Geobooker Premium'
                        }
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

                            {promoActive ? (
                                <>
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="text-2xl text-white/60 line-through">{formatPrice(299)}/mes</span>
                                        <span className="text-5xl font-bold">¡GRATIS!</span>
                                    </div>
                                    <p className="text-pink-200">hasta el {LAUNCH_CONFIG.deadline}</p>
                                    <div className="inline-block bg-green-400 text-green-900 px-4 py-1 rounded-full text-sm font-bold mt-2">
                                        🎉 PROMOCIÓN ACTIVA — Sin pago requerido
                                    </div>
                                </>
                            ) : LAUNCH_CONFIG.isLaunchActive ? (
                                <>
                                    <div className="flex items-center justify-center gap-3">
                                        <span className="text-2xl text-white/60 line-through">{formatPrice(299)}/mes</span>
                                        <span className="text-5xl font-bold">¡GRATIS!</span>
                                    </div>
                                    <p className="text-pink-200">por {LAUNCH_CONFIG.monthsFree} meses</p>
                                    <div className="inline-block bg-yellow-400 text-yellow-900 px-4 py-1 rounded-full text-sm font-bold mt-2">
                                        🎉 OFERTA DE LANZAMIENTO
                                    </div>
                                    <p className="text-xs text-pink-200 mt-2">
                                        Después solo {formatPrice(299)} • Quedan {LAUNCH_CONFIG.spotsLeft.toLocaleString()} lugares
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
                                <span>Hasta <strong>5 negocios</strong></span>
                            </li>
                            <li className="flex items-start">
                                <Camera className="w-5 h-5 text-yellow-300 mr-3 mt-0.5 flex-shrink-0" />
                                <span>Hasta <strong>10 fotos</strong> por negocio</span>
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
                            onClick={promoActive ? handleFreeUpgrade : handleStartUpgrade}
                            disabled={loading}
                            className={`w-full ${promoActive ? 'bg-green-400 hover:bg-green-300' : 'bg-yellow-400 hover:bg-yellow-300'} text-gray-900 py-4 rounded-xl font-bold text-lg transition transform hover:scale-[1.02] shadow-lg ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
                        >
                            {loading ? 'Activando...' : promoActive ? (
                                <>
                                    ✨ Activar Premium GRATIS →
                                    <span className="block text-xs font-normal mt-1">Sin tarjeta ni pago • Acceso inmediato</span>
                                </>
                            ) : (
                                <>
                                    🎁 ¡Obtener {LAUNCH_CONFIG.monthsFree} Meses GRATIS! →
                                    {LAUNCH_CONFIG.isLaunchActive && (
                                        <span className="block text-xs font-normal mt-1">Solo {LAUNCH_CONFIG.spotsLeft.toLocaleString()} lugares disponibles</span>
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
                            <summary className="font-bold text-lg cursor-pointer">¿Realmente son 3 meses GRATIS?</summary>
                            <p className="text-gray-600 mt-2">¡Sí! Los primeros {LAUNCH_CONFIG.totalSpots.toLocaleString()} negocios que se registren obtienen Premium gratis por 3 meses. Después de ese periodo, puedes continuar por {formatPrice(299)} o cancelar sin costo.</p>
                        </details>
                        <details className="bg-white rounded-lg shadow-md p-6">
                            <summary className="font-bold text-lg cursor-pointer">¿Cuántos negocios puedo registrar?</summary>
                            <p className="text-gray-600 mt-2">Con Premium puedes registrar hasta 5 negocios, cada uno con hasta 10 fotos. Ideal para emprendedores con múltiples locales o franquiciantes.</p>
                        </details>
                        <details className="bg-white rounded-lg shadow-md p-6">
                            <summary className="font-bold text-lg cursor-pointer">¿Puedo cancelar en cualquier momento?</summary>
                            <p className="text-gray-600 mt-2">Sí, puedes cancelar tu suscripción Premium cuando quieras, sin penalizaciones. Incluso durante el periodo de prueba gratuito.</p>
                        </details>
                        <details className="bg-white rounded-lg shadow-md p-6">
                            <summary className="font-bold text-lg cursor-pointer">¿Qué redes sociales puedo conectar?</summary>
                            <p className="text-gray-600 mt-2">Puedes agregar: Instagram, Facebook, TikTok, Twitter/X, LinkedIn, YouTube, WhatsApp Business, y tu sitio web.</p>
                        </details>
                    </div>
                </div>
            </div>

            {/* Modal de Selección de Método de Pago (solo cuando NO hay promo activa) */}
            {showPaymentModal && !promoActive && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-bold text-gray-900">💳 Método de Pago</h2>
                            <button
                                onClick={() => setShowPaymentModal(false)}
                                className="text-gray-400 hover:text-gray-600 text-2xl"
                            >
                                ×
                            </button>
                        </div>

                        <p className="text-gray-600 mb-6">
                            Elige cómo quieres activar tu prueba de <strong>{LAUNCH_CONFIG.monthsFree} meses GRATIS</strong>:
                        </p>

                        {/* Opción Tarjeta */}
                        <button
                            onClick={() => setPaymentMethod('card')}
                            className={`w-full p-4 rounded-xl border-2 mb-3 text-left transition-all ${paymentMethod === 'card'
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${paymentMethod === 'card' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
                                    <CreditCard className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">Tarjeta de Crédito/Débito</h4>
                                    <p className="text-sm text-gray-500">Visa, Mastercard, AMEX</p>
                                </div>
                                {paymentMethod === 'card' && (
                                    <Check className="w-5 h-5 text-blue-500 ml-auto" />
                                )}
                            </div>
                            {paymentMethod === 'card' && (
                                <p className="text-xs text-blue-600 mt-2 pl-11">
                                    ✓ Activación inmediata • Renovación automática
                                </p>
                            )}
                        </button>

                        {/* Opción OXXO */}
                        <button
                            onClick={() => setPaymentMethod('oxxo')}
                            className={`w-full p-4 rounded-xl border-2 mb-6 text-left transition-all ${paymentMethod === 'oxxo'
                                ? 'border-yellow-500 bg-yellow-50'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${paymentMethod === 'oxxo' ? 'bg-yellow-500 text-white' : 'bg-gray-100'}`}>
                                    <Store className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">Pago en Efectivo</h4>
                                    <p className="text-sm text-gray-500">OXXO, 7-Eleven, Farmacias</p>
                                </div>
                                {paymentMethod === 'oxxo' && (
                                    <Check className="w-5 h-5 text-yellow-500 ml-auto" />
                                )}
                            </div>
                            {paymentMethod === 'oxxo' && (
                                <p className="text-xs text-yellow-700 mt-2 pl-11">
                                    ⏱ Tienes 3 días para pagar • Activación en 1-24 hrs
                                </p>
                            )}
                        </button>

                        {/* Resumen */}
                        <div className="bg-gray-50 rounded-xl p-4 mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-gray-600">Total a pagar hoy:</span>
                                <span className="text-2xl font-bold text-green-600">$0 MXN</span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Después de {LAUNCH_CONFIG.monthsFree} meses: ${LAUNCH_CONFIG.regularPrice}/mes
                            </p>
                        </div>

                        {/* Botón Confirmar */}
                        <button
                            onClick={handleConfirmPayment}
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl font-bold text-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50"
                        >
                            {loading ? 'Procesando...' : (
                                paymentMethod === 'card'
                                    ? '🔒 Continuar con Tarjeta'
                                    : '🏪 Generar Voucher OXXO'
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Voucher OXXO generado */}
            {oxxoVoucher && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="max-w-md w-full">
                        <OxxoVoucher
                            voucherUrl={oxxoVoucher.voucherUrl}
                            referenceNumber={oxxoVoucher.referenceNumber}
                            expiresAt={oxxoVoucher.expiresAt}
                            amount={oxxoVoucher.amount}
                            onClose={() => {
                                setOxxoVoucher(null);
                                navigate('/dashboard');
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default UpgradePage;
