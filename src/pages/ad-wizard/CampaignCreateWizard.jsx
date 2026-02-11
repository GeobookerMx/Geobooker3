import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, ArrowRight, Image as ImageIcon, CreditCard, Loader, Globe, MapPin, Map, Building, Store, Check } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';
import OxxoVoucher from '../../components/payment/OxxoVoucher';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

const CampaignCreateWizard = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    // Estados del Wizard
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [spaceId] = useState(searchParams.get('space') || '');
    const [adSpace, setAdSpace] = useState(null);

    // Estados para método de pago
    const [paymentMethod, setPaymentMethod] = useState('card');
    const [oxxoVoucher, setOxxoVoucher] = useState(null);

    // Geographic data - Organized by regions
    const [countries] = useState([
        // 🌎 Norteamérica
        { code: 'US', name: '🇺🇸 Estados Unidos', region: 'northamerica' },
        { code: 'CA', name: '🇨🇦 Canadá', region: 'northamerica' },
        { code: 'MX', name: '🇲🇽 México', region: 'northamerica' },

        // 🌎 Latinoamérica
        { code: 'AR', name: '🇦🇷 Argentina', region: 'latam' },
        { code: 'BO', name: '🇧🇴 Bolivia', region: 'latam' },
        { code: 'BR', name: '🇧🇷 Brasil', region: 'latam' },
        { code: 'CL', name: '🇨🇱 Chile', region: 'latam' },
        { code: 'CO', name: '🇨🇴 Colombia', region: 'latam' },
        { code: 'CR', name: '🇨🇷 Costa Rica', region: 'latam' },
        { code: 'CU', name: '🇨🇺 Cuba', region: 'latam' },
        { code: 'DO', name: '🇩🇴 República Dominicana', region: 'latam' },
        { code: 'EC', name: '🇪🇨 Ecuador', region: 'latam' },
        { code: 'SV', name: '🇸🇻 El Salvador', region: 'latam' },
        { code: 'GT', name: '🇬🇹 Guatemala', region: 'latam' },
        { code: 'HN', name: '🇭🇳 Honduras', region: 'latam' },
        { code: 'NI', name: '🇳🇮 Nicaragua', region: 'latam' },
        { code: 'PA', name: '🇵🇦 Panamá', region: 'latam' },
        { code: 'PY', name: '🇵🇾 Paraguay', region: 'latam' },
        { code: 'PE', name: '🇵🇪 Perú', region: 'latam' },
        { code: 'PR', name: '🇵🇷 Puerto Rico', region: 'latam' },
        { code: 'UY', name: '🇺🇾 Uruguay', region: 'latam' },
        { code: 'VE', name: '🇻🇪 Venezuela', region: 'latam' },

        // 🌍 Europa
        { code: 'ES', name: '🇪🇸 España', region: 'europe' },
        { code: 'DE', name: '🇩🇪 Alemania', region: 'europe' },
        { code: 'FR', name: '🇫🇷 Francia', region: 'europe' },
        { code: 'IT', name: '🇮🇹 Italia', region: 'europe' },
        { code: 'GB', name: '🇬🇧 Reino Unido', region: 'europe' },
        { code: 'PT', name: '🇵🇹 Portugal', region: 'europe' },
        { code: 'NL', name: '🇳🇱 Países Bajos', region: 'europe' },
        { code: 'BE', name: '🇧🇪 Bélgica', region: 'europe' },
        { code: 'CH', name: '🇨🇭 Suiza', region: 'europe' },
        { code: 'AT', name: '🇦🇹 Austria', region: 'europe' },
        { code: 'IE', name: '🇮🇪 Irlanda', region: 'europe' },
        { code: 'PL', name: '🇵🇱 Polonia', region: 'europe' },
        { code: 'SE', name: '🇸🇪 Suecia', region: 'europe' },
        { code: 'NO', name: '🇳🇴 Noruega', region: 'europe' },
        { code: 'DK', name: '🇩🇰 Dinamarca', region: 'europe' },
    ]);
    const [regions, setRegions] = useState([]);
    const [cities, setCities] = useState([]);

    // Form Data
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        cta_text: 'Ver Más',
        cta_url: 'https://',
        image_url: '',
        geographic_scope: 'country',
        target_country: 'MX',
        target_region: '',
        target_city: '',
        target_language: 'es',
        advertiser_name: '',
        advertiser_email: ''
    });

    // Cargar espacio
    useEffect(() => {
        const loadAdSpace = async () => {
            if (!spaceId) {
                console.error('No se proporcionó spaceId');
                toast.error('Error: No se especificó el espacio publicitario');
                return;
            }

            try {
                console.log('Cargando espacio con ID:', spaceId);
                const { data, error } = await supabase
                    .from('ad_spaces')
                    .select('*')
                    .eq('id', spaceId)
                    .single();

                if (error) {
                    console.error('Error cargando ad_space:', error);
                    toast.error('No se encontró el espacio publicitario');
                    return;
                }

                if (data) {
                    console.log('Ad space cargado:', data);
                    setAdSpace(data);
                }
            } catch (err) {
                console.error('Error inesperado:', err);
                toast.error('Error cargando el espacio publicitario');
            }
        };

        loadAdSpace();
    }, [spaceId]);

    // Cargar email del usuario
    useEffect(() => {
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (user) {
                setFormData(prev => ({ ...prev, advertiser_email: user.email }));
            }
        });
    }, []);

    // Cargar regiones cuando cambia país y scope
    useEffect(() => {
        if (formData.target_country && ['region', 'city'].includes(formData.geographic_scope)) {
            supabase.from('geographic_regions')
                .select('id, name')
                .eq('country_code', formData.target_country)
                .order('name')
                .then(({ data }) => setRegions(data || []));
        } else {
            setRegions([]);
            setFormData(prev => ({ ...prev, target_region: '', target_city: '' }));
        }
    }, [formData.target_country, formData.geographic_scope]);

    // Cargar ciudades cuando cambia región
    useEffect(() => {
        if (formData.target_region && formData.geographic_scope === 'city') {
            supabase.from('geographic_cities')
                .select('id, name')
                .eq('region_id', formData.target_region)
                .order('name')
                .then(({ data }) => setCities(data || []));
        } else {
            setCities([]);
            setFormData(prev => ({ ...prev, target_city: '' }));
        }
    }, [formData.target_region, formData.geographic_scope]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Validación por paso
    const validateStep = (currentStep) => {
        if (currentStep === 1) {
            if (!formData.advertiser_name || formData.advertiser_name.trim().length < 2) {
                toast.error('Ingresa el nombre de tu empresa (mínimo 2 caracteres)');
                return false;
            }
            if (!formData.title || formData.title.trim().length < 3) {
                toast.error('Ingresa un título para tu anuncio (mínimo 3 caracteres)');
                return false;
            }
            if (!formData.image_url) {
                toast.error('Sube una imagen para tu anuncio');
                return false;
            }
            if (!formData.cta_url || !formData.cta_url.startsWith('https://') || formData.cta_url === 'https://') {
                toast.error('Ingresa una URL de destino válida (debe empezar con https://)');
                return false;
            }
            return true;
        }
        if (currentStep === 2) {
            if (formData.geographic_scope !== 'global' && !formData.target_country) {
                toast.error('Selecciona un país de destino');
                return false;
            }
            if (formData.geographic_scope === 'region' && !formData.target_region) {
                toast.error('Selecciona una región');
                return false;
            }
            if (formData.geographic_scope === 'city' && !formData.target_city) {
                toast.error('Selecciona una ciudad');
                return false;
            }
            return true;
        }
        return true;
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            toast.error('La imagen no debe superar 5MB');
            return;
        }

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Debes iniciar sesión');

            const filePath = `${user.id}/${Date.now()}.${file.name.split('.').pop()}`;
            const { error } = await supabase.storage.from('ad-creatives').upload(filePath, file);
            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage.from('ad-creatives').getPublicUrl(filePath);
            setFormData(prev => ({ ...prev, image_url: publicUrl }));
            toast.success('Imagen subida');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setUploading(false);
        }
    };

    const getTargetLocation = () => {
        const country = countries.find(c => c.code === formData.target_country);
        const region = regions.find(r => r.id === formData.target_region);
        const city = cities.find(c => c.id === formData.target_city);

        if (formData.geographic_scope === 'global') return 'Global';
        if (formData.geographic_scope === 'country') return country?.name || '';
        if (formData.geographic_scope === 'region') return `${region?.name || ''}, ${country?.name || ''}`;
        return `${city?.name || ''}, ${region?.name || ''}, ${country?.name || ''}`;
    };

    const handleSubmit = async () => {
        setLoading(true);
        const toastId = toast.loading('Procesando tu campaña...');

        try {
            // 1. Primero crear la campaña como draft
            const { data: campaignId, error } = await supabase.rpc('create_draft_campaign', {
                p_space_id: spaceId,
                p_advertiser_name: formData.advertiser_name,
                p_advertiser_email: formData.advertiser_email,
                p_geographic_scope: formData.geographic_scope,
                p_target_location: getTargetLocation(),
                p_audience_targeting: { countries: [formData.target_country], languages: [formData.target_language] },
                p_budget: adSpace?.price_monthly || 0,
                p_creative_title: formData.title,
                p_creative_description: formData.description,
                p_creative_url: formData.cta_url,
                p_creative_cta: formData.cta_text,
                p_creative_image: formData.image_url,
                p_target_country: formData.target_country || null,
                p_target_region: formData.target_region || null,
                p_target_city: formData.target_city || null
            });

            if (error) throw error;

            // 2. Procesar según método de pago
            if (paymentMethod === 'card') {
                // Pago con tarjeta - Stripe Checkout
                const stripe = await stripePromise;
                if (!stripe) {
                    console.error('Stripe failed to load. Check VITE_STRIPE_PUBLIC_KEY');
                    throw new Error('Stripe no pudo cargarse. Verifica la configuración.');
                }

                const { data: { user } } = await supabase.auth.getUser();

                // Determine currency based on country
                const currency = ['US', 'CA'].includes(formData.target_country) ? 'usd' : 'mxn';

                console.log('Creating checkout session...', {
                    adSpace: adSpace.name,
                    amount: adSpace.price_monthly,
                    currency
                });

                const response = await fetch('/.netlify/functions/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        priceId: adSpace.stripe_price_id || null,
                        productId: adSpace.stripe_product_id || null,
                        productName: `Geobooker Ads - ${adSpace.display_name}`,
                        amount: Math.round(adSpace.price_monthly * 100),
                        currency: currency,
                        userId: user?.id || null,
                        customerEmail: formData.advertiser_email,
                        successUrl: window.location.origin + '/advertise/success?campaign=' + campaignId,
                        cancelUrl: window.location.origin + '/advertise/create?space=' + spaceId + '&canceled=true',
                        mode: 'payment',
                        metadata: {
                            type: 'ad_payment',
                            campaign_id: campaignId,
                            ad_space_id: spaceId,
                            ad_space_name: adSpace.name
                        }
                    }),
                });

                const sessionData = await response.json();
                console.log('Checkout session response:', sessionData);

                if (!response.ok || sessionData.error) {
                    throw new Error(sessionData.error || 'Error al crear sesión de pago');
                }

                if (!sessionData.url) {
                    throw new Error('No se recibió URL de pago');
                }

                toast.success('Redirigiendo a pago seguro...', { id: toastId });
                window.location.href = sessionData.url;

            } else {
                // Pago en OXXO
                const response = await fetch('/.netlify/functions/create-oxxo-payment', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        amount: adSpace.price_monthly,
                        email: formData.advertiser_email,
                        productName: `Campaña ${adSpace.display_name}`,
                        productId: campaignId,
                        userId: (await supabase.auth.getUser()).data.user?.id,
                        description: `Publicidad Geobooker - ${adSpace.display_name}`
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
            }

        } catch (error) {
            console.error('Error en campaña:', error);
            toast.error('Error: ' + error.message, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    if (!adSpace) return <div className="p-10 text-center">Cargando...</div>;

    const scopeOptions = [
        { value: 'global', icon: Globe, label: 'Global', desc: 'Todos los países' },
        { value: 'country', icon: MapPin, label: 'País', desc: 'Un país específico' },
        { value: 'region', icon: Map, label: 'Región', desc: 'Estado o provincia' },
        { value: 'city', icon: Building, label: 'Ciudad', desc: 'Ciudad específica' }
    ];

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4">
            <div className="max-w-2xl mx-auto">
                {/* Progress */}
                <div className="flex justify-between text-sm mb-8">
                    {['Creativo', 'Segmentación', 'Confirmar'].map((label, i) => (
                        <div key={i} className={`flex-1 text-center ${step > i ? 'text-blue-600 font-semibold' : 'text-gray-400'}`}>
                            {i + 1}. {label}
                        </div>
                    ))}
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-bold mb-1">{adSpace.display_name}</h2>
                    <p className="text-gray-500 mb-6">${adSpace.price_monthly}/mes</p>

                    {/* PASO 1 */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Nombre Empresa</label>
                                <input name="advertiser_name" value={formData.advertiser_name}
                                    onChange={handleInputChange} className="w-full border rounded-lg p-3"
                                    placeholder="Tu empresa" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Título del Anuncio</label>
                                <input name="title" value={formData.title}
                                    onChange={handleInputChange} className="w-full border rounded-lg p-3"
                                    placeholder="Ej: 2x1 en Pizzas" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Descripción</label>
                                <textarea name="description" value={formData.description}
                                    onChange={handleInputChange} rows={3} className="w-full border rounded-lg p-3"
                                    placeholder="Describe tu oferta..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Texto Botón</label>
                                    <input name="cta_text" value={formData.cta_text}
                                        onChange={handleInputChange} className="w-full border rounded-lg p-3" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">URL Destino</label>
                                    <input name="cta_url" value={formData.cta_url}
                                        onChange={handleInputChange} className="w-full border rounded-lg p-3" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Imagen</label>
                                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                                    {formData.image_url ? (
                                        <img src={formData.image_url} alt="Preview" className="max-h-40 mx-auto rounded" />
                                    ) : uploading ? (
                                        <Loader className="animate-spin mx-auto text-blue-500" />
                                    ) : (
                                        <>
                                            <ImageIcon className="mx-auto text-gray-400 mb-2" size={40} />
                                            <label className="cursor-pointer text-blue-600 hover:underline">
                                                Subir imagen o GIF
                                                <input type="file" accept="image/*,.gif" onChange={handleImageUpload} className="hidden" />
                                            </label>
                                            <p className="text-xs text-gray-400 mt-1">JPG, PNG, WebP o GIF • Max 5MB</p>
                                            {adSpace?.size_desktop && (
                                                <p className="text-xs text-blue-500 mt-1 font-medium">
                                                    📐 Tamaño recomendado: {adSpace.size_desktop} (desktop) / {adSpace.size_mobile || 'responsive'} (mobile)
                                                </p>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PASO 2 */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium mb-3">Alcance Geográfico</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {scopeOptions.map(opt => (
                                        <button key={opt.value}
                                            onClick={() => setFormData(prev => ({ ...prev, geographic_scope: opt.value }))}
                                            className={`p-4 rounded-xl border-2 text-left transition ${formData.geographic_scope === opt.value
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                                }`}>
                                            <opt.icon className={formData.geographic_scope === opt.value ? 'text-blue-600' : 'text-gray-400'} />
                                            <div className="font-semibold mt-2">{opt.label}</div>
                                            <div className="text-xs text-gray-500">{opt.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {formData.geographic_scope !== 'global' && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">País</label>
                                    <select name="target_country" value={formData.target_country}
                                        onChange={handleInputChange} className="w-full border rounded-lg p-3">
                                        <optgroup label="🌎 América del Norte">
                                            {countries.filter(c => c.region === 'northamerica').map(c =>
                                                <option key={c.code} value={c.code}>{c.name}</option>
                                            )}
                                        </optgroup>
                                        <optgroup label="🌎 Latinoamérica">
                                            {countries.filter(c => c.region === 'latam').map(c =>
                                                <option key={c.code} value={c.code}>{c.name}</option>
                                            )}
                                        </optgroup>
                                        <optgroup label="🌍 Europa">
                                            {countries.filter(c => c.region === 'europe').map(c =>
                                                <option key={c.code} value={c.code}>{c.name}</option>
                                            )}
                                        </optgroup>
                                    </select>
                                </div>
                            )}

                            {['region', 'city'].includes(formData.geographic_scope) && regions.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Región/Estado</label>
                                    <select name="target_region" value={formData.target_region}
                                        onChange={handleInputChange} className="w-full border rounded-lg p-3">
                                        <option value="">Seleccionar...</option>
                                        {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                            )}

                            {formData.geographic_scope === 'city' && cities.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Ciudad</label>
                                    <select name="target_city" value={formData.target_city}
                                        onChange={handleInputChange} className="w-full border rounded-lg p-3">
                                        <option value="">Seleccionar...</option>
                                        {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                    )}

                    {/* PASO 3 - Confirmar con Preview */}
                    {step === 3 && (
                        <div className="space-y-6">
                            <h3 className="text-xl font-bold text-center">Vista Previa de tu Anuncio</h3>

                            {/* AD PREVIEW */}
                            <div className="bg-gradient-to-br from-gray-100 to-gray-50 p-6 rounded-xl">
                                <p className="text-xs text-gray-400 mb-3 text-center">Así se verá tu anuncio:</p>
                                <div className="max-w-md mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
                                    {/* Image */}
                                    {formData.image_url ? (
                                        <img src={formData.image_url} alt="Preview" className="w-full h-48 object-cover" />
                                    ) : (
                                        <div className="w-full h-48 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                                            <ImageIcon size={48} className="text-gray-300" />
                                        </div>
                                    )}
                                    {/* Content */}
                                    <div className="p-4">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-blue-100 text-blue-600 text-xs px-2 py-0.5 rounded font-medium">PATROCINADO</span>
                                            <span className="text-xs text-gray-400">{getTargetLocation()}</span>
                                        </div>
                                        <h4 className="font-bold text-lg text-gray-900">
                                            {formData.title || 'Título de tu anuncio'}
                                        </h4>
                                        <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                                            {formData.description || 'Descripción de tu oferta aquí...'}
                                        </p>
                                        <div className="mt-4 flex items-center justify-between">
                                            <span className="text-xs text-gray-400">{formData.advertiser_name || 'Tu Empresa'}</span>
                                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition">
                                                {formData.cta_text || 'Ver Más'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Resumen con IVA */}
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between"><span className="text-gray-600">Espacio:</span><strong>{adSpace.display_name}</strong></div>
                                <div className="flex justify-between"><span className="text-gray-600">Alcance:</span><strong>{getTargetLocation()}</strong></div>
                                <div className="flex justify-between"><span className="text-gray-600">URL destino:</span><span className="text-blue-600 text-sm truncate max-w-[200px]">{formData.cta_url}</span></div>

                                {/* Desglose de precios */}
                                <div className="border-t pt-3 mt-3 space-y-1">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600">Subtotal:</span>
                                        <span>${adSpace.price_monthly?.toLocaleString('es-MX')} MXN</span>
                                    </div>
                                    {formData.target_country === 'MX' ? (
                                        <>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-gray-600">IVA (16%):</span>
                                                <span>${(adSpace.price_monthly * 0.16).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN</span>
                                            </div>
                                            <div className="flex justify-between text-lg font-bold border-t pt-2">
                                                <span>Total:</span>
                                                <span className="text-green-600">${(adSpace.price_monthly * 1.16).toLocaleString('es-MX', { minimumFractionDigits: 2 })} MXN/mes</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between text-sm text-green-600">
                                                <span>IVA (Exportación):</span>
                                                <span>$0.00 MXN (Tasa 0%)</span>
                                            </div>
                                            <div className="flex justify-between text-lg font-bold border-t pt-2">
                                                <span>Total:</span>
                                                <span className="text-green-600">${adSpace.price_monthly?.toLocaleString('es-MX')} MXN/mes</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Selector de Método de Pago */}
                            <div className="space-y-3 mt-6">
                                <h4 className="font-semibold text-gray-800">💳 Método de Pago</h4>

                                <button
                                    onClick={() => setPaymentMethod('card')}
                                    className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${paymentMethod === 'card'
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                >
                                    <div className={`p-2 rounded-lg ${paymentMethod === 'card' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
                                        <CreditCard className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-medium">Tarjeta</span>
                                        <span className="text-xs text-gray-500 ml-2">Pago inmediato</span>
                                    </div>
                                    {paymentMethod === 'card' && <Check className="w-5 h-5 text-blue-500" />}
                                </button>

                                <button
                                    onClick={() => setPaymentMethod('oxxo')}
                                    disabled={adSpace.price_monthly > 10000}
                                    className={`w-full p-3 rounded-xl border-2 text-left transition-all flex items-center gap-3 ${paymentMethod === 'oxxo'
                                        ? 'border-yellow-500 bg-yellow-50'
                                        : 'border-gray-200 hover:border-gray-300'
                                        } ${adSpace.price_monthly > 10000 ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className={`p-2 rounded-lg ${paymentMethod === 'oxxo' ? 'bg-yellow-500 text-white' : 'bg-gray-100'}`}>
                                        <Store className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1">
                                        <span className="font-medium">Efectivo</span>
                                        <span className="text-xs text-gray-500 ml-2">OXXO, 7-Eleven</span>
                                    </div>
                                    {paymentMethod === 'oxxo' && <Check className="w-5 h-5 text-yellow-500" />}
                                </button>
                            </div>

                            {/* Avisos importantes */}
                            <div className="space-y-3 mt-4">
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg">
                                    <p className="text-sm text-amber-800 font-medium mb-1">⏳ Tiempo de revisión: 24-48 horas</p>
                                    <p className="text-xs text-amber-700">Tu campaña será revisada por nuestro equipo antes de activarse para asegurar que cumple con las políticas de contenido.</p>
                                </div>

                                <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                                    <p className="text-sm text-blue-800 font-medium mb-1">🧾 Facturación</p>
                                    <p className="text-xs text-blue-700">
                                        Una vez que tu campaña sea aprobada y entre en pauta, recibirás tu factura por correo electrónico al email proporcionado.
                                        {formData.target_country === 'MX' && ' Se incluirá el desglose de IVA (16%).'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between mt-8">
                        {step > 1 ? (
                            <button onClick={() => setStep(s => s - 1)} className="flex items-center text-gray-600">
                                <ArrowLeft size={18} className="mr-1" /> Atrás
                            </button>
                        ) : <div />}

                        {step < 3 ? (
                            <button onClick={() => {
                                if (validateStep(step)) setStep(s => s + 1);
                            }}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center hover:bg-blue-700">
                                Continuar <ArrowRight size={18} className="ml-1" />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={loading}
                                className={`text-white px-8 py-3 rounded-lg font-bold disabled:opacity-50 ${paymentMethod === 'card'
                                    ? 'bg-green-600 hover:bg-green-700'
                                    : 'bg-yellow-600 hover:bg-yellow-700'
                                    }`}>
                                {loading ? <Loader className="animate-spin" /> : (
                                    paymentMethod === 'card' ? '🔒 Pagar con Tarjeta' : '🏪 Generar Voucher OXXO'
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Voucher OXXO */}
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
                                navigate('/advertise/pending');
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default CampaignCreateWizard;
