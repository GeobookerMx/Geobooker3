import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { MailX, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import SEO from '../components/SEO';

const UnsubscribePage = () => {
    const [searchParams] = useSearchParams();
    const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
    const email = searchParams.get('email');
    const token = searchParams.get('token');

    useEffect(() => {
        const handleUnsubscribe = async () => {
            if (!email || !token) {
                setStatus('error');
                return;
            }

            try {
                // Buscamos el negocio y el token
                const { data: business, error: findError } = await supabase
                    .from('businesses')
                    .select('id')
                    .eq('contact_email', email)
                    .eq('verification_token', token)
                    .single();

                if (findError || !business) throw new Error('Invalid token or email');

                // Marcamos el email como "bloqueado" o simplemente borramos el contact_email
                // Para efectos de marketing, lo ideal es tener un flag 'is_unsubscribed'
                // pero por ahora podemos limpiar el contact_email para no mandarle nada más.
                const { error: updateError } = await supabase
                    .from('businesses')
                    .update({
                        contact_email: null, // Evita futuros envíos
                    })
                    .eq('id', business.id);

                if (updateError) throw updateError;
                setStatus('success');
            } catch (err) {
                console.error('Unsubscribe error:', err);
                setStatus('error');
            }
        };

        handleUnsubscribe();
    }, [email, token]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <SEO title="Darse de baja - Geobooker" noindex={true} />

            <div className="bg-white p-8 md:p-12 rounded-3xl shadow-xl max-w-md w-full text-center">
                {status === 'loading' && (
                    <div className="space-y-4">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto" />
                        <h1 className="text-xl font-bold text-gray-900">Procesando tu solicitud...</h1>
                        <p className="text-gray-500">Estamos actualizando tu suscripción.</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="space-y-4">
                        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle className="w-10 h-10 text-green-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Has sido dado de baja</h1>
                        <p className="text-gray-600 leading-relaxed">
                            Lamentamos verte partir. Tu correo <strong>{email}</strong> ha sido eliminado de nuestras listas de marketing comercial.
                            No recibirás más promociones de Geobooker.
                        </p>
                        <hr className="my-6" />
                        <Link to="/" className="inline-block text-blue-600 font-bold hover:underline">
                            Volver al sitio principal
                        </Link>
                    </div>
                )}

                {status === 'error' && (
                    <div className="space-y-4">
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">Algo salió mal</h1>
                        <p className="text-gray-600">
                            No pudimos procesar tu solicitud automáticamente. Es posible que el enlace haya expirado.
                        </p>
                        <p className="text-sm text-gray-400 mt-4">
                            Por favor envía un correo a <a href="mailto:soporte@geobooker.com.mx" className="text-blue-600 underline">soporte@geobooker.com.mx</a> para que te demos de baja manualmente.
                        </p>
                    </div>
                )}
            </div>

            <p className="mt-8 text-sm text-gray-400">
                Geobooker | Directorio comercial y profesional de México.
            </p>
        </div>
    );
};

export default UnsubscribePage;
