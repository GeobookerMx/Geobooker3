import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { GoogleMap, LoadScript, Marker } from '@react-google-maps/api';
import { toast } from 'react-hot-toast';
import { Upload, X, MapPin, Clock, Phone, Globe, Mail, Image as ImageIcon, Briefcase, FileText, Share2 } from 'lucide-react';

const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '0.75rem',
};

const defaultCenter = {
    lat: 19.4326,
    lng: -99.1332,
};

const BusinessEditPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const mapRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isPremium, setIsPremium] = useState(false);
    const [business, setBusiness] = useState(null);
    const [mapCenter, setMapCenter] = useState(defaultCenter);

    const [formData, setFormData] = useState({
        name: '',
        manager_name: '',
        category: '',
        description: '',
        address: '',
        phone: '',
        whatsapp: '',
        website: '',
        email: '',
        facebook: '',
        instagram: '',
        tiktok: '',
        latitude: null,
        longitude: null,
        offers_invoicing: false,
        invoicing_details: '',
        has_job_openings: false,
        job_openings_details: '',
        images: [],
        opening_hours: null
    });

    // Cargar negocio y perfil de usuario
    useEffect(() => {
        if (user) {
            loadBusiness();
            checkPremiumStatus();
        }
    }, [id, user]);

    const loadBusiness = async () => {
        try {
            const { data, error } = await supabase
                .from('businesses')
                .select('*')
                .eq('id', id)
                .eq('owner_id', user.id)
                .single();

            if (error) throw error;

            if (!data) {
                toast.error('Negocio no encontrado o no tienes permiso');
                navigate('/dashboard');
                return;
            }

            setBusiness(data);
            setFormData({
                name: data.name || '',
                manager_name: data.manager_name || '',
                category: data.category || '',
                description: data.description || '',
                address: data.address || '',
                phone: data.phone || '',
                whatsapp: data.whatsapp || '',
                website: data.website || '',
                email: data.email || '',
                facebook: data.facebook || '',
                instagram: data.instagram || '',
                tiktok: data.tiktok || '',
                latitude: data.latitude,
                longitude: data.longitude,
                offers_invoicing: data.offers_invoicing || false,
                invoicing_details: data.invoicing_details || '',
                has_job_openings: data.has_job_openings || false,
                job_openings_details: data.job_openings_details || '',
                images: data.images || [],
                opening_hours: data.opening_hours || null
            });

            if (data.latitude && data.longitude) {
                setMapCenter({ lat: data.latitude, lng: data.longitude });
            }
        } catch (error) {
            console.error('Error loading business:', error);
            toast.error('Error al cargar el negocio');
        } finally {
            setLoading(false);
        }
    };

    const checkPremiumStatus = async () => {
        try {
            const { data } = await supabase
                .from('user_profiles')
                .select('is_premium')
                .eq('id', user.id)
                .single();

            setIsPremium(data?.is_premium || false);
        } catch (error) {
            console.error('Error checking premium status:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const onMapLoad = useCallback((map) => {
        mapRef.current = map;
    }, []);

    const onMarkerDragEnd = (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
        }));
    };

    const onMapClick = (e) => {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setFormData(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng
        }));
    };

    // Sistema de fotos
    const handleImageUpload = async (e) => {
        const files = Array.from(e.target.files);
        const currentImageCount = formData.images.length;
        const maxImages = isPremium ? 10 : 1;

        if (currentImageCount >= maxImages) {
            if (isPremium) {
                toast.error('Máximo 10 fotos permitidas');
            } else {
                toast.error('Plan gratuito: solo 1 foto. Actualiza a Premium para 10 fotos', {
                    duration: 5000
                });
                return;
            }
            return;
        }

        const remainingSlots = maxImages - currentImageCount;
        const filesToUpload = files.slice(0, remainingSlots);

        for (const file of filesToUpload) {
            if (file.size > 2 * 1024 * 1024) {
                toast.error(`${file.name} excede 2MB`);
                continue;
            }

            try {
                const fileName = `${id}/${Date.now()}_${file.name}`;
                const { error: uploadError } = await supabase.storage
                    .from('business-images')
                    .upload(fileName, file);

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage
                    .from('business-images')
                    .getPublicUrl(fileName);

                setFormData(prev => ({
                    ...prev,
                    images: [...prev.images, publicUrl]
                }));

                toast.success('Foto agregada');
            } catch (error) {
                console.error('Error uploading image:', error);
                toast.error('Error al subir foto');
            }
        }
    };

    const removeImage = async (imageUrl) => {
        try {
            const pathMatch = imageUrl.match(/business-images\/(.+)$/);
            if (pathMatch) {
                await supabase.storage
                    .from('business-images')
                    .remove([pathMatch[1]]);
            }

            setFormData(prev => ({
                ...prev,
                images: prev.images.filter(img => img !== imageUrl)
            }));

            toast.success('Foto eliminada');
        } catch (error) {
            console.error('Error removing image:', error);
            toast.error('Error al eliminar foto');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name || !formData.category) {
            toast.error('Nombre y categoría son obligatorios');
            return;
        }

        if (!formData.latitude || !formData.longitude) {
            toast.error('Selecciona la ubicación en el mapa');
            return;
        }

        try {
            setSaving(true);

            const { error } = await supabase
                .from('businesses')
                .update({
                    name: formData.name,
                    manager_name: formData.manager_name,
                    category: formData.category,
                    description: formData.description,
                    address: formData.address,
                    phone: formData.phone,
                    whatsapp: formData.whatsapp,
                    website: formData.website,
                    email: formData.email,
                    facebook: formData.facebook,
                    instagram: formData.instagram,
                    tiktok: formData.tiktok,
                    latitude: formData.latitude,
                    longitude: formData.longitude,
                    offers_invoicing: formData.offers_invoicing,
                    invoicing_details: formData.invoicing_details,
                    has_job_openings: formData.has_job_openings,
                    job_openings_details: formData.job_openings_details,
                    images: formData.images,
                    opening_hours: formData.opening_hours,
                    updated_at: new Date()
                })
                .eq('id', id);

            if (error) throw error;

            toast.success('¡Negocio actualizado exitosamente!');
            navigate('/dashboard');
        } catch (error) {
            console.error('Error updating business:', error);
            toast.error('Error al actualizar el negocio');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    const maxImages = isPremium ? 10 : 1;
    const currentImageCount = formData.images.length;

    return (
        <div className="max-w-5xl mx-auto px-4 py-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Editar Negocio</h1>
                        <p className="text-gray-600 mt-1">Actualiza la información de tu negocio</p>
                    </div>
                    <Link
                        to="/dashboard"
                        className="text-gray-600 hover:text-gray-900 font-medium"
                    >
                        ← Volver al Dashboard
                    </Link>
                </div>

                {/* Status Badge */}
                <div className="mt-4">
                    {business?.status === 'pending' && (
                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                            ⏳ Pendiente de Aprobación
                        </span>
                    )}
                    {business?.status === 'approved' && (
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                            ✓ Aprobado
                        </span>
                    )}
                    {business?.status === 'rejected' && (
                        <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
                            ✗ Rechazado
                        </span>
                    )}
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Sección 1: Información Básica */}
                <section className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                        Información Básica
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre del Negocio *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Nombre del Encargado
                            </label>
                            <input
                                type="text"
                                name="manager_name"
                                value={formData.manager_name}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Ej. Juan Pérez"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Categoría *
                            </label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                required
                            >
                                <option value="">Selecciona una categoría</option>
                                <option value="restaurant">Restaurante / Comida</option>
                                <option value="shop">Tienda / Comercio</option>
                                <option value="service">Servicios</option>
                                <option value="health">Salud / Farmacia</option>
                                <option value="entertainment">Entretenimiento</option>
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Descripción
                            </label>
                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Describe tu negocio, qué ofreces, qué te hace único..."
                            />
                        </div>
                    </div>
                </section>

                {/* Sección 2: Ubicación */}
                <section className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                        <MapPin className="w-5 h-5 mr-2" />
                        Ubicación
                    </h2>
                    <p className="text-sm text-gray-500 mb-4">
                        Arrastra el pin rojo o haz click en el mapa para ajustar la ubicación exacta
                    </p>

                    <div className="rounded-xl overflow-hidden border border-gray-300 shadow-sm mb-4">
                        <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                            <GoogleMap
                                mapContainerStyle={mapContainerStyle}
                                center={mapCenter}
                                zoom={15}
                                onLoad={onMapLoad}
                                onClick={onMapClick}
                                options={{
                                    streetViewControl: false,
                                    mapTypeControl: false,
                                }}
                            >
                                {formData.latitude && formData.longitude && (
                                    <Marker
                                        position={{ lat: formData.latitude, lng: formData.longitude }}
                                        draggable={true}
                                        onDragEnd={onMarkerDragEnd}
                                    />
                                )}
                            </GoogleMap>
                        </LoadScript>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Dirección Escrita
                        </label>
                        <input
                            type="text"
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Calle, número, colonia, ciudad..."
                        />
                    </div>
                </section>

                {/* Sección 3: Contacto */}
                <section className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">3</span>
                        <Phone className="w-5 h-5 mr-2" />
                        Contacto
                    </h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Phone className="w-4 h-4 inline mr-1" />
                                Teléfono
                            </label>
                            <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="+52 55 1234 5678"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                WhatsApp
                            </label>
                            <input
                                type="tel"
                                name="whatsapp"
                                value={formData.whatsapp}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="+52 55 1234 5678"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Mail className="w-4 h-4 inline mr-1" />
                                Email
                            </label>
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="contacto@tunegocio.com"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Globe className="w-4 h-4 inline mr-1" />
                                Sitio Web
                            </label>
                            <input
                                type="url"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="https://tusitio.com"
                            />
                        </div>
                    </div>
                </section>

                {/* Sección 4: Redes Sociales */}
                <section className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">4</span>
                        <Share2 className="w-5 h-5 mr-2" />
                        Redes Sociales
                    </h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Facebook
                            </label>
                            <input
                                type="url"
                                name="facebook"
                                value={formData.facebook}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="https://facebook.com/tu-negocio"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Instagram
                            </label>
                            <input
                                type="text"
                                name="instagram"
                                value={formData.instagram}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="@tunegocio"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                TikTok
                            </label>
                            <input
                                type="text"
                                name="tiktok"
                                value={formData.tiktok}
                                onChange={handleChange}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                placeholder="@tunegocio"
                            />
                        </div>
                    </div>
                </section>

                {/* Sección 5: Servicios Adicionales */}
                <section className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">5</span>
                        <Briefcase className="w-5 h-5 mr-2" />
                        Servicios Adicionales
                    </h2>

                    {/* Facturación */}
                    <div className="mb-6">
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="offers_invoicing"
                                checked={formData.offers_invoicing}
                                onChange={handleChange}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-3 text-sm font-medium text-gray-700">
                                <FileText className="w-4 h-4 inline mr-1" />
                                Ofrecemos facturación
                            </span>
                        </label>

                        {formData.offers_invoicing && (
                            <div className="mt-3 ml-8">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Detalles de facturación (RFC, razón social, etc.)
                                </label>
                                <textarea
                                    name="invoicing_details"
                                    value={formData.invoicing_details}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="RFC: XXXX123456XXX, Razón Social: Mi Empresa S.A. de C.V."
                                />
                            </div>
                        )}
                    </div>

                    {/* Vacantes */}
                    <div>
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="has_job_openings"
                                checked={formData.has_job_openings}
                                onChange={handleChange}
                                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-3 text-sm font-medium text-gray-700">
                                <Briefcase className="w-4 h-4 inline mr-1" />
                                Tenemos vacantes laborales
                            </span>
                        </label>

                        {formData.has_job_openings && (
                            <div className="mt-3 ml-8">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Descripción de vacantes
                                </label>
                                <textarea
                                    name="job_openings_details"
                                    value={formData.job_openings_details}
                                    onChange={handleChange}
                                    rows={3}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    placeholder="Se busca mesero con experiencia, horario de 10am a 6pm..."
                                />
                            </div>
                        )}
                    </div>
                </section>

                {/* Sección 6: Galería de Fotos */}
                <section className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800 flex items-center">
                            <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">6</span>
                            <ImageIcon className="w-5 h-5 mr-2" />
                            Galería de Fotos
                        </h2>
                        <span className="text-sm text-gray-600">
                            {currentImageCount} / {maxImages} fotos
                            {!isPremium && (
                                <Link to="/dashboard/upgrade" className="ml-2 text-blue-600 hover:underline">
                                    Actualizar a Premium
                                </Link>
                            )}
                        </span>
                    </div>

                    {!isPremium && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
                            <p className="text-sm text-yellow-800">
                                <strong>Plan Gratuito:</strong> Puedes subir 1 foto.
                                Actualiza a Premium para subir hasta 10 fotos y destacar tu negocio.
                            </p>
                        </div>
                    )}

                    {/* Grid de fotos */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-4">
                        {formData.images.map((imageUrl, index) => (
                            <div key={index} className="relative group">
                                <img
                                    src={imageUrl}
                                    alt={`Foto ${index + 1}`}
                                    className="w-full h-32 object-cover rounded-lg border border-gray-200"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeImage(imageUrl)}
                                    className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {/* Botón de upload */}
                        {currentImageCount < maxImages && (
                            <label className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                                <Upload className="w-8 h-8 text-gray-400" />
                                <span className="text-sm text-gray-500 mt-2">Subir foto</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                            </label>
                        )}
                    </div>

                    <p className="text-xs text-gray-500">
                        Máximo 2MB por foto. Formatos: JPG, PNG, WebP
                    </p>
                </section>

                {/* Botones de acción */}
                <div className="flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={() => navigate('/dashboard')}
                        className="px-6 py-3 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default BusinessEditPage;
