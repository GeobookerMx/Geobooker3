import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

const BusinessList = () => {
    const { user } = useAuth();
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [togglingId, setTogglingId] = useState(null);

    useEffect(() => {
        if (user) {
            fetchBusinesses();
        }
    }, [user]);

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
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Mis Negocios</h2>
                <Link
                    to="/business/register"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition duration-200 font-semibold flex items-center"
                >
                    <span className="mr-2">+</span> Registrar Negocio
                </Link>
            </div>

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

                                {/* Visibility Toggle */}
                                {business.status === 'approved' && (
                                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg mb-3">
                                        <div className="flex items-center gap-2">
                                            {business.is_visible !== false ? (
                                                <Eye className="w-4 h-4 text-green-600" />
                                            ) : (
                                                <EyeOff className="w-4 h-4 text-gray-400" />
                                            )}
                                            <span className="text-sm font-medium text-gray-700">
                                                Visible en mapa
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleToggleVisibility(business.id, business.is_visible !== false)}
                                            disabled={togglingId === business.id}
                                            className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${business.is_visible !== false
                                                    ? 'bg-green-500'
                                                    : 'bg-gray-300'
                                                } ${togglingId === business.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                                        >
                                            <span
                                                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 ${business.is_visible !== false ? 'translate-x-6' : 'translate-x-0'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                                    <Link
                                        to={`/dashboard/business/${business.id}/edit`}
                                        className="text-blue-600 text-sm font-semibold hover:text-blue-800"
                                    >
                                        Editar
                                    </Link>
                                    <span className="text-gray-400 text-xs">
                                        {new Date(business.created_at).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default BusinessList;

