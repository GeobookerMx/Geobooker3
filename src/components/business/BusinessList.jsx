import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, MapPin, Info, Crown, Lock } from 'lucide-react';
import LocationEditModal from './LocationEditModal';

const FREE_BUSINESS_LIMIT = 2;

const BusinessList = () => {
    const { user } = useAuth();
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState(null);
    const [locationModalBusiness, setLocationModalBusiness] = useState(null);
    const [isPremium, setIsPremium] = useState(false);

    useEffect(() => {
        if (user) {
            fetchBusinesses();
            checkPremiumStatus();
        }
    }, [user]);

    const checkPremiumStatus = async () => {
        try {
            const { data } = await supabase
                .from('user_profiles')
                .select('is_premium')
                .eq('id', user.id)
                .maybeSingle();
            setIsPremium(data?.is_premium || false);
        } catch (error) {
            console.error('Error checking premium:', error);
        }
    };

    const fetchBusinesses = async () => {
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('*')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setBusinesses(data || []);
        } catch (error) {
            console.error('Error fetching businesses:', error);
            toast.error('Error al cargar tus negocios');
        } finally {
            setLoading(false);
        }
    };

    const canAddMoreBusinesses = isPremium || businesses.length < FREE_BUSINESS_LIMIT;
    const businessesRemaining = FREE_BUSINESS_LIMIT - businesses.length;

    // Toggle business visibility on/off
    const handleToggleVisibility = async (businessId, currentVisibility) => {
        setTogglingId(businessId);
        try {
            const newVisibility = !currentVisibility;
            const { error } = await supabase
                .from('businesses')
                .update({ is_visible: newVisibility })
                .eq('id', businessId)
                .eq('owner_id', user.id); // Security: only owner can toggle

            if (error) throw error;

            // Update local state
            setBusinesses(prev => prev.map(b =>
                b.id === businessId ? { ...b, is_visible: newVisibility } : b
            ));

            toast.success(
                newVisibility
                    ? '✅ Tu negocio ahora es visible en el mapa'
                    : '🔒 Tu negocio está oculto del mapa',
                { duration: 3000 }
            );
        } catch (error) {
            console.error('Error toggling visibility:', error);
            toast.error('Error al cambiar la visibilidad');
        } finally {
            setTogglingId(null);
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'approved':
                return <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-semibold">Aprobado</span>;
            case 'pending':
                return <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-semibold">Pendiente</span>;
            case 'rejected':
                return <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full font-semibold">Rechazado</span>;
            default:
                return <span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-semibold">{status}</span>;
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div>
            {/* Header with limit info */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        Mis Negocios
                        {isPremium && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full flex items-center gap-1">
                                <Crown className="w-3 h-3 fill-yellow-500" /> Premium
                            </span>
                        )}
                    </h2>
                    {!isPremium && businesses.length > 0 && (
                        <p className="text-sm text-gray-500 mt-1">
                            {businessesRemaining > 0
                                ? `${businessesRemaining} negocio${businessesRemaining > 1 ? 's' : ''} gratis restante${businessesRemaining > 1 ? 's' : ''}`
                                : '⚠️ Límite de negocios gratis alcanzado'
                            }
                        </p>
                    )}
                </div>

                {canAddMoreBusinesses ? (
                    <Link
                        to="/business/register"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 font-semibold flex items-center"
                    >
                        <span className="mr-2">+</span> Registrar Negocio
                    </Link>
                ) : (
                    <Link
                        to="/dashboard/upgrade"
                        className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-4 py-2 rounded-lg hover:from-yellow-600 hover:to-orange-600 transition duration-200 font-semibold flex items-center gap-2"
                    >
                        <Lock className="w-4 h-4" />
                        Desbloquear más negocios
                    </Link>
                )}
            </div>

            {/* Premium benefits banner for location changes */}
            {businesses.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-xl p-4 mb-6">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                                📍 ¿Tu negocio cambió de ubicación?
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">GRATIS</span>
                            </h4>
                            <p className="text-sm text-gray-600 mt-1">
                                Puedes cambiar la ubicación de tu negocio <strong>hasta 3 veces al mes</strong>.
                                Ideal para food trucks, vendedores ambulantes o si te mudaste.
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                Haz clic en el botón <span className="text-green-600 font-semibold">📍 Ubicación</span> de cualquier negocio para cambiarla.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {businesses.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                    <div className="text-4xl mb-4">🏪</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No tienes negocios registrados</h3>
                    <p className="text-gray-500 mb-6">Registra tu primer negocio para aparecer en Geobooker</p>
                    <Link
                        to="/business/register"
                        className="text-blue-600 font-semibold hover:underline"
                    >
                        Comenzar ahora
                    </Link>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {businesses.map((business) => (
                        <div key={business.id} className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition duration-200">
                            <div className="h-32 bg-gradient-to-r from-blue-400 to-blue-600 relative">
                                {business.images && business.images[0] ? (
                                    <img
                                        src={business.images[0]}
                                        alt={business.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full text-white text-4xl opacity-50">
                                        🏢
                                    </div>
                                )}
                                <div className="absolute top-2 right-2">
                                    {getStatusBadge(business.status)}
                                </div>
                            </div>

                            <div className="p-4">
                                <h3 className="font-bold text-lg text-gray-900 mb-1">{business.name}</h3>
                                <p className="text-sm text-gray-500 mb-3">{business.category}</p>

                                <div className="flex items-center text-sm text-gray-600 mb-4">
                                    <span className="mr-1">📍</span>
                                    <span className="truncate">{business.address}</span>
                                </div>

                                {/* Visibility Toggle - Digital Open/Close Feature */}
                                {business.status === 'approved' && (
                                    <div className={`p-3 rounded-lg mb-3 border-2 transition-all ${business.is_visible !== false
                                        ? 'bg-green-50 border-green-200'
                                        : 'bg-gray-50 border-gray-200'
                                        }`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                {business.is_visible !== false ? (
                                                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center animate-pulse">
                                                        <Eye className="w-4 h-4 text-white" />
                                                    </div>
                                                ) : (
                                                    <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                                                        <EyeOff className="w-4 h-4 text-gray-500" />
                                                    </div>
                                                )}
                                                <div>
                                                    <span className="text-sm font-bold text-gray-800 flex items-center gap-1">
                                                        {business.is_visible !== false ? '🟢 Abierto' : '🔴 Cerrado'}
                                                        <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full font-bold">
                                                            FREE
                                                        </span>
                                                    </span>
                                                    <p className="text-xs text-gray-500">
                                                        {business.is_visible !== false
                                                            ? 'Visible en el mapa'
                                                            : 'Oculto del mapa'
                                                        }
                                                    </p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleToggleVisibility(business.id, business.is_visible !== false)}
                                                disabled={togglingId === business.id}
                                                className={`relative w-14 h-7 rounded-full transition-all duration-300 shadow-inner ${business.is_visible !== false
                                                    ? 'bg-gradient-to-r from-green-400 to-green-600'
                                                    : 'bg-gray-300'
                                                    } ${togglingId === business.id ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:shadow-md'}`}
                                            >
                                                <span
                                                    className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-md transition-transform duration-300 flex items-center justify-center ${business.is_visible !== false ? 'translate-x-7' : 'translate-x-0'
                                                        }`}
                                                >
                                                    {business.is_visible !== false
                                                        ? <span className="text-xs">✓</span>
                                                        : <span className="text-xs text-gray-400">×</span>
                                                    }
                                                </span>
                                            </button>
                                        </div>
                                        {/* Benefits tooltip */}
                                        <div className="text-[10px] text-gray-500 flex flex-wrap gap-2 mt-1">
                                            <span>🔒 Seguridad</span>
                                            <span>⏰ Control horario</span>
                                            <span>📍 Privacidad</span>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                    <div className="flex gap-2">
                                        <Link
                                            to={`/dashboard/business/${business.id}/edit`}
                                            className="text-blue-600 text-sm font-semibold hover:text-blue-800"
                                        >
                                            Editar
                                        </Link>
                                        <button
                                            onClick={() => setLocationModalBusiness(business)}
                                            className="text-green-600 text-sm font-semibold hover:text-green-800 flex items-center gap-1"
                                        >
                                            <MapPin className="w-3 h-3" />
                                            Ubicación
                                        </button>
                                    </div>
                                    <span className="text-gray-400 text-xs">
                                        {new Date(business.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Location Edit Modal */}
            {locationModalBusiness && (
                <LocationEditModal
                    business={locationModalBusiness}
                    onClose={() => setLocationModalBusiness(null)}
                    onSuccess={() => {
                        setLocationModalBusiness(null);
                        fetchBusinesses();
                    }}
                />
            )}
        </div>
    );
};

export default BusinessList;
