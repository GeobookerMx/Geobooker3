import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { toast } from 'react-hot-toast';
import { Check, X, Eye, MapPin, Phone, Mail, Calendar, User, Building2, FileText, Briefcase, RotateCcw } from 'lucide-react';
import { sendBusinessApprovedEmail, sendBusinessRejectedEmail } from '../../services/notificationService';
import { useAdminAuditLog } from '../../hooks/useAdminAuditLog';

const TAG_LABELS = {
    pet_friendly: 'Pet Friendly',
    '24_hours': 'Abierto 24 hrs',
    accepts_card: 'Acepta tarjeta',
    accepts_cards: 'Acepta tarjetas',
    delivery: 'Entrega a domicilio',
    wifi: 'WiFi gratis',
    accessible: 'Accesible',
    parking: 'Estacionamiento',
    factura: 'Facturación',
    space_cctv: 'CCTV / circuito cerrado',
    space_contract: 'Renta con contrato',
    space_guard: 'Guardia / vigilancia',
    space_24_7_access: 'Acceso 24/7',
    space_monthly_rent: 'Renta por mes',
    space_night_parking: 'Pensión nocturna',
    space_car_garage: 'Garage para autos'
};

const BusinessApprovals = () => {
    const location = useLocation();
    const isRentalSpacesMode = location.pathname.includes('/rental-spaces');
    const { logAction } = useAdminAuditLog();
    const [businesses, setBusinesses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('pending'); // 'all', 'pending', 'approved', 'rejected'
    const [selectedBusiness, setSelectedBusiness] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        fetchBusinesses();
    }, [filter, isRentalSpacesMode]);

    const fetchBusinesses = async () => {
        try {
            setLoading(true);
            let query = supabase
                .from('businesses')
                .select(`
                    *,
                    owner:user_profiles(id, full_name, email)
                `)
                .order('created_at', { ascending: false });

            if (filter !== 'all') {
                query = query.eq('status', filter);
            }

            if (isRentalSpacesMode) {
                query = query.eq('listing_type', 'space_rental');
            } else {
                query = query.or('listing_type.is.null,listing_type.eq.business');
            }

            const { data, error } = await query;

            if (error) throw error;
            setBusinesses(data || []);
        } catch (error) {
            console.error('Error fetching businesses:', error);
            toast.error(isRentalSpacesMode ? 'Error al cargar espacios en renta' : 'Error al cargar negocios');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (businessId) => {
        console.log('🔄 Intentando aprobar negocio/espacio:', businessId);
        const loadingToast = toast.loading(isRentalSpacesMode ? 'Aprobando espacio...' : 'Aprobando negocio...');

        try {
            const business = businesses.find(b => b.id === businessId);

            const { error } = await supabase
                .from('businesses')
                .update({ status: 'approved' })
                .eq('id', businessId);

            if (error) {
                console.error('❌ Error de Supabase:', error);
                throw error;
            }

            // Registrar en logs de auditoría
            await logAction(isRentalSpacesMode ? 'approve_rental_space' : 'approve_business', 'business', businessId, business?.name);

            // Enviar notificación por correo
            if (business?.owner?.email) {
                await sendBusinessApprovedEmail(
                    business.owner.email,
                    business.owner.full_name || 'Usuario',
                    business.name,
                    business.id
                );
            }

            toast.success(isRentalSpacesMode ? 'Espacio aprobado ✅' : 'Negocio aprobado ✅', { id: loadingToast });
            fetchBusinesses();
            setShowModal(false);
        } catch (error) {
            console.error('Error approving business:', error);
            toast.error(`Error: ${error.message || 'Error desconocido'}`, { id: loadingToast });
        }
    };


    const handleReject = async (businessId, reason = '') => {
        try {
            const business = businesses.find(b => b.id === businessId);

            const { error } = await supabase
                .from('businesses')
                .update({ status: 'rejected' })
                .eq('id', businessId);

            if (error) throw error;

            // Registrar en logs de auditoría
            await logAction(isRentalSpacesMode ? 'reject_rental_space' : 'reject_business', 'business', businessId, business?.name, { reason });

            // Enviar notificación por correo
            if (business?.owner?.email) {
                await sendBusinessRejectedEmail(
                    business.owner.email,
                    business.owner.full_name || 'Usuario',
                    business.name,
                    reason
                );
            }

            toast.success(isRentalSpacesMode ? 'Espacio rechazado' : 'Negocio rechazado');
            fetchBusinesses();
            setShowModal(false);
        } catch (error) {
            console.error('Error rejecting business:', error);
            toast.error('Error al rechazar negocio');
        }
    };

    const handleMoveToPending = async (businessId) => {
        const loadingToast = toast.loading('Moviedo a pendiente para re-evaluación...');
        try {
            const { error } = await supabase
                .from('businesses')
                .update({
                    status: 'pending',
                    updated_at: new Date().toISOString()
                })
                .eq('id', businessId);

            if (error) throw error;

            // Registrar en logs de auditoría
            const business = businesses.find(b => b.id === businessId);
            await logAction(isRentalSpacesMode ? 're-evaluate_rental_space' : 're-evaluate_business', 'business', businessId, business?.name);

            toast.success(isRentalSpacesMode ? 'Espacio movido a Pendiente ✅' : 'Negocio movido a Pendiente ✅', { id: loadingToast });
            fetchBusinesses();
            setShowModal(false);
        } catch (error) {
            console.error('Error moving business to pending:', error);
            toast.error('Error al mover a pendiente', { id: loadingToast });
        }
    };

    const getStatusBadge = (status) => {
        const badges = {
            pending: <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">⏳ Pendiente</span>,
            approved: <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">✓ Aprobado</span>,
            rejected: <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">✗ Rechazado</span>,
            suspended: <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-semibold">⊘ Suspendido</span>,
        };
        return badges[status] || badges.pending;
    };

    const openModal = (business) => {
        setSelectedBusiness(business);
        setShowModal(true);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {isRentalSpacesMode ? 'Gestión de Espacios en Renta' : 'Gestión de Negocios'}
                </h1>
                <p className="text-gray-600">
                    {isRentalSpacesMode
                        ? 'Revisa locales, oficinas, bodegas, pensiones y garages enviados por usuarios'
                        : 'Revisa y aprueba solicitudes de registro'}
                </p>
            </div>

            {/* Filtros */}
            <div className="bg-white rounded-xl shadow-md p-4 mb-6 flex gap-4">
                <button
                    onClick={() => setFilter('all')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Todos ({businesses.length})
                </button>
                <button
                    onClick={() => setFilter('pending')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'pending'
                        ? 'bg-yellow-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Pendientes
                </button>
                <button
                    onClick={() => setFilter('approved')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'approved'
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Aprobados
                </button>
                <button
                    onClick={() => setFilter('rejected')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${filter === 'rejected'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                >
                    Rechazados
                </button>
            </div>

            {/* Tabla de Negocios */}
            {businesses.length === 0 ? (
                <div className="bg-white rounded-xl shadow-md p-12 text-center">
                    <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {isRentalSpacesMode ? 'No hay espacios en renta' : 'No hay negocios'}
                    </h3>
                    <p className="text-gray-500">
                        {isRentalSpacesMode ? 'No hay espacios con este estado' : 'No hay negocios con este estado'}
                    </p>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-md overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-gray-50 border-b border-gray-200">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {isRentalSpacesMode ? 'Espacio' : 'Negocio'}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Propietario
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    {isRentalSpacesMode ? 'Tipo / Renta' : 'Categoría'}
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fecha
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Acciones
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {businesses.map((business) => (
                                <tr key={business.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            {business.images && business.images[0] ? (
                                                <img
                                                    src={business.images[0]}
                                                    alt={business.name}
                                                    className="w-10 h-10 rounded-lg object-cover mr-3"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-lg bg-gray-200 flex items-center justify-center mr-3">
                                                    <Building2 className="w-5 h-5 text-gray-400" />
                                                </div>
                                            )}
                                            <div>
                                                <div className="font-medium text-gray-900">{business.name}</div>
                                                <div className="text-sm text-gray-500">{business.address}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{business.manager_name || 'N/A'}</div>
                                        <div className="text-sm text-gray-500">ID: {business.owner_id?.substring(0, 8)}...</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {isRentalSpacesMode ? (
                                            <div>
                                                <div className="text-sm font-medium text-gray-900">{business.space_type || business.subcategory || 'Espacio en renta'}</div>
                                                <div className="text-sm text-gray-500">
                                                    {business.monthly_rent ? `${Number(business.monthly_rent).toLocaleString('es-MX')} ${business.rent_currency || 'MXN'}/mes` : 'Renta no indicada'}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-sm text-gray-900 capitalize">{business.category}</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {getStatusBadge(business.status)}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        {new Date(business.created_at).toLocaleDateString('es-MX')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => openModal(business)}
                                            className="text-blue-600 hover:text-blue-900 mr-4"
                                        >
                                            <Eye className="w-5 h-5 inline" /> Ver
                                        </button>
                                        {business.status === 'pending' && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(business.id)}
                                                    className="text-green-600 hover:text-green-900 mr-2"
                                                    title="Aprobar"
                                                >
                                                    <Check className="w-5 h-5 inline" />
                                                </button>
                                                <button
                                                    onClick={() => handleReject(business.id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Rechazar"
                                                >
                                                    <X className="w-5 h-5 inline" />
                                                </button>
                                            </>
                                        )}
                                        {business.status === 'rejected' && (
                                            <>
                                                <button
                                                    onClick={() => handleApprove(business.id)}
                                                    className="text-green-600 hover:text-green-900 mr-2"
                                                    title="Aprobar Directo"
                                                >
                                                    <Check className="w-5 h-5 inline" />
                                                </button>
                                                <button
                                                    onClick={() => handleMoveToPending(business.id)}
                                                    className="text-orange-600 hover:text-orange-900"
                                                    title="Re-evaluar (Mover a Pendiente)"
                                                >
                                                    <RotateCcw className="w-5 h-5 inline" />
                                                </button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de Detalles */}
            {showModal && selectedBusiness && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                        {/* Header del Modal */}
                        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold mb-2">{selectedBusiness.name}</h2>
                                    <p className="text-blue-100">{selectedBusiness.category}</p>
                                </div>
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="mt-4">
                                {getStatusBadge(selectedBusiness.status)}
                            </div>
                        </div>

                        {/* Contenido del Modal */}
                        <div className="p-6 space-y-6">
                            {/* Información Básica */}
                            <section>
                                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                    <Building2 className="w-5 h-5 mr-2" />
                                    Información Básica
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                    {selectedBusiness.manager_name && (
                                        <div>
                                            <label className="text-sm text-gray-500">Encargado</label>
                                            <p className="font-medium">{selectedBusiness.manager_name}</p>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-sm text-gray-500">Propietario</label>
                                        <p className="font-medium">{selectedBusiness.manager_name || 'N/A'}</p>
                                        <p className="text-xs text-gray-400">ID: {selectedBusiness.owner_id}</p>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-sm text-gray-500">Descripción</label>
                                        <p className="text-gray-900">{selectedBusiness.description || 'Sin descripción'}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Ubicación */}
                            <section>
                                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                    <MapPin className="w-5 h-5 mr-2" />
                                    Ubicación
                                </h3>
                                <div className="bg-gray-50 p-4 rounded-lg">
                                    <p className="text-gray-900">{selectedBusiness.address}</p>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Lat: {selectedBusiness.latitude}, Lng: {selectedBusiness.longitude}
                                    </p>
                                </div>
                            </section>

                            {selectedBusiness.listing_type === 'space_rental' && (
                                <section>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                        <Building2 className="w-5 h-5 mr-2" />
                                        Detalles del espacio en renta
                                    </h3>
                                    <div className="grid md:grid-cols-2 gap-4 bg-emerald-50 p-4 rounded-lg border border-emerald-100">
                                        <div>
                                            <label className="text-sm text-emerald-700">Tipo de espacio</label>
                                            <p className="font-medium">{selectedBusiness.space_type || selectedBusiness.subcategory || 'No indicado'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-emerald-700">Renta mensual</label>
                                            <p className="font-medium">
                                                {selectedBusiness.monthly_rent
                                                    ? `${Number(selectedBusiness.monthly_rent).toLocaleString('es-MX')} ${selectedBusiness.rent_currency || 'MXN'}`
                                                    : 'No indicada'}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-emerald-700">Superficie</label>
                                            <p className="font-medium">{selectedBusiness.area_sqm ? `${selectedBusiness.area_sqm} m²` : 'No indicada'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm text-emerald-700">Disponible desde</label>
                                            <p className="font-medium">
                                                {selectedBusiness.available_from
                                                    ? new Date(selectedBusiness.available_from).toLocaleDateString('es-MX')
                                                    : 'No indicado'}
                                            </p>
                                        </div>
                                        {Array.isArray(selectedBusiness.tags) && selectedBusiness.tags.length > 0 && (
                                            <div className="md:col-span-2">
                                                <label className="text-sm text-emerald-700">Características declaradas</label>
                                                <div className="mt-2 flex flex-wrap gap-2">
                                                    {selectedBusiness.tags.map((tag) => (
                                                        <span key={tag} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200">
                                                            {TAG_LABELS[tag] || tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Contacto */}
                            <section>
                                <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                    <Phone className="w-5 h-5 mr-2" />
                                    Contacto
                                </h3>
                                <div className="grid md:grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg">
                                    {selectedBusiness.phone && (
                                        <div>
                                            <label className="text-sm text-gray-500">Teléfono</label>
                                            <p className="font-medium">{selectedBusiness.phone}</p>
                                        </div>
                                    )}
                                    {selectedBusiness.whatsapp && (
                                        <div>
                                            <label className="text-sm text-gray-500">WhatsApp</label>
                                            <p className="font-medium">{selectedBusiness.whatsapp}</p>
                                        </div>
                                    )}
                                    {selectedBusiness.email && (
                                        <div>
                                            <label className="text-sm text-gray-500">Email</label>
                                            <p className="font-medium">{selectedBusiness.email}</p>
                                        </div>
                                    )}
                                    {selectedBusiness.website && (
                                        <div>
                                            <label className="text-sm text-gray-500">Sitio Web</label>
                                            <a href={selectedBusiness.website} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                                                {selectedBusiness.website}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Servicios Adicionales */}
                            {(selectedBusiness.offers_invoicing || selectedBusiness.has_job_openings) && (
                                <section>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center">
                                        <Briefcase className="w-5 h-5 mr-2" />
                                        Servicios Adicionales
                                    </h3>
                                    <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                                        {selectedBusiness.offers_invoicing && (
                                            <div>
                                                <div className="flex items-center mb-2">
                                                    <FileText className="w-4 h-4 mr-2 text-green-600" />
                                                    <span className="font-medium">Ofrece Facturación</span>
                                                </div>
                                                {selectedBusiness.invoicing_details && (
                                                    <p className="text-sm text-gray-600 ml-6">{selectedBusiness.invoicing_details}</p>
                                                )}
                                            </div>
                                        )}
                                        {selectedBusiness.has_job_openings && (
                                            <div>
                                                <div className="flex items-center mb-2">
                                                    <Briefcase className="w-4 h-4 mr-2 text-blue-600" />
                                                    <span className="font-medium">Tiene Vacantes</span>
                                                </div>
                                                {selectedBusiness.job_openings_details && (
                                                    <p className="text-sm text-gray-600 ml-6">{selectedBusiness.job_openings_details}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {/* Galería de Fotos */}
                            {selectedBusiness.images && selectedBusiness.images.length > 0 && (
                                <section>
                                    <h3 className="text-lg font-bold text-gray-900 mb-3">Fotos ({selectedBusiness.images.length})</h3>
                                    <div className="grid grid-cols-3 gap-4">
                                        {selectedBusiness.images.map((img, idx) => (
                                            <img
                                                key={idx}
                                                src={img}
                                                alt={`Foto ${idx + 1}`}
                                                className="w-full h-32 object-cover rounded-lg"
                                            />
                                        ))}
                                    </div>
                                </section>
                            )}

                            {/* Fecha de Registro */}
                            <section>
                                <div className="flex items-center text-sm text-gray-500">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    Registrado el {new Date(selectedBusiness.created_at).toLocaleString('es-MX')}
                                </div>
                            </section>

                            {/* Acciones */}
                            {selectedBusiness.status === 'pending' && (
                                <div className="flex gap-4 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => handleApprove(selectedBusiness.id)}
                                        className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center"
                                    >
                                        <Check className="w-5 h-5 mr-2" />
                                        {selectedBusiness.listing_type === 'space_rental' ? 'Aprobar Espacio' : 'Aprobar Negocio'}
                                    </button>
                                    <button
                                        onClick={() => handleReject(selectedBusiness.id)}
                                        className="flex-1 bg-red-600 text-white py-3 rounded-lg font-bold hover:bg-red-700 transition flex items-center justify-center"
                                    >
                                        <X className="w-5 h-5 mr-2" />
                                        Rechazar
                                    </button>
                                </div>
                            )}

                            {selectedBusiness.status === 'rejected' && (
                                <div className="flex flex-col gap-3 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => handleApprove(selectedBusiness.id)}
                                        className="w-full bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 transition flex items-center justify-center"
                                    >
                                        <Check className="w-5 h-5 mr-2" />
                                        {selectedBusiness.listing_type === 'space_rental' ? 'Aprobar Espacio (Directo)' : 'Aprobar Negocio (Directo)'}
                                    </button>
                                    <button
                                        onClick={() => handleMoveToPending(selectedBusiness.id)}
                                        className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition flex items-center justify-center"
                                    >
                                        <RotateCcw className="w-5 h-5 mr-2" />
                                        Mover a Pendiente para Re-evaluar
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BusinessApprovals;
