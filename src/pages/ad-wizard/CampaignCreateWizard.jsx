import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, ArrowRight, Image as ImageIcon, CreditCard, Loader, Globe, MapPin, Map, Building } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import toast from 'react-hot-toast';

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

    // Geographic data
    const [countries] = useState([
        { code: 'MX', name: 'México' },
        { code: 'AR', name: 'Argentina' },
        { code: 'BO', name: 'Bolivia' },
        { code: 'BR', name: 'Brasil' },
        { code: 'CL', name: 'Chile' },
        { code: 'CO', name: 'Colombia' },
        { code: 'CR', name: 'Costa Rica' },
        { code: 'CU', name: 'Cuba' },
        { code: 'DO', name: 'República Dominicana' },
        { code: 'EC', name: 'Ecuador' },
        { code: 'SV', name: 'El Salvador' },
        { code: 'GT', name: 'Guatemala' },
        { code: 'HN', name: 'Honduras' },
        { code: 'NI', name: 'Nicaragua' },
        { code: 'PA', name: 'Panamá' },
        { code: 'PY', name: 'Paraguay' },
        { code: 'PE', name: 'Perú' },
        { code: 'PR', name: 'Puerto Rico' },
        { code: 'UY', name: 'Uruguay' },
        { code: 'VE', name: 'Venezuela' },
        { code: 'ES', name: 'España' },
        { code: 'US', name: 'Estados Unidos' },
        { code: 'CA', name: 'Canadá' }
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
        if (spaceId) {
            supabase.from('ad_spaces').select('*').eq('id', spaceId).single()
                .then(({ data }) => data && setAdSpace(data));
        }
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

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            toast.error('La imagen no debe superar 2MB');
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

            // 2. Ahora iniciar el checkout de Stripe
            const stripe = await stripePromise;
            if (!stripe) throw new Error('Stripe no pudo cargarse');

            const { data: { user } } = await supabase.auth.getUser();

            const response = await fetch('/.netlify/functions/create-checkout-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    priceId: adSpace.stripe_price_id || null,
                    productId: adSpace.stripe_product_id || null,
                    amount: Math.round(adSpace.price_monthly * 100), // En centavos
                    userId: user?.id || null,
                    customerEmail: formData.advertiser_email,
                    successUrl: window.location.origin + '/advertise/success?campaign=' + campaignId,
                    cancelUrl: window.location.origin + '/advertise/create?space=' + spaceId + '&canceled=true',
                    countryCode: formData.target_country || 'MX',
                    mode: 'payment', // Pago único para publicidad
                    metadata: {
                        type: 'ad_payment',
                        campaign_id: campaignId,
                        ad_space_id: spaceId,
                        ad_space_name: adSpace.name
                    }
                }),
            });

            const sessionData = await response.json();

            if (sessionData.error) {
                throw new Error(sessionData.error);
            }

            toast.success('Redirigiendo a pago seguro...', { id: toastId });

            // 3. Redirigir a Stripe Checkout
            const { error: stripeError } = await stripe.redirectToCheckout({
                sessionId: sessionData.sessionId
            });

            if (stripeError) throw stripeError;

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
                                            <p className="text-xs text-gray-400 mt-1">Max 2MB</p>
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
                                        {countries.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
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

                            {/* Resumen */}
                            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                                <div className="flex justify-between"><span className="text-gray-600">Espacio:</span><strong>{adSpace.display_name}</strong></div>
                                <div className="flex justify-between"><span className="text-gray-600">Alcance:</span><strong>{getTargetLocation()}</strong></div>
                                <div className="flex justify-between"><span className="text-gray-600">URL destino:</span><span className="text-blue-600 text-sm truncate max-w-[200px]">{formData.cta_url}</span></div>
                                <div className="flex justify-between border-t pt-2 text-lg"><span>Total:</span><strong className="text-green-600">${adSpace.price_monthly} MXN/mes</strong></div>
                            </div>

                            <p className="text-sm text-gray-500 text-center bg-yellow-50 p-3 rounded-lg">
                                ⏳ Tu campaña será revisada por nuestro equipo en 24-48 horas antes de activarse.
                            </p>
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
                            <button onClick={() => setStep(s => s + 1)}
                                className="bg-blue-600 text-white px-6 py-2 rounded-lg flex items-center hover:bg-blue-700">
                                Continuar <ArrowRight size={18} className="ml-1" />
                            </button>
                        ) : (
                            <button onClick={handleSubmit} disabled={loading}
                                className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50">
                                {loading ? <Loader className="animate-spin" /> : 'Enviar Campaña'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CampaignCreateWizard;
