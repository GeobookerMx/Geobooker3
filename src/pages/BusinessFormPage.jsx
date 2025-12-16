import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { createBusiness } from "../services/businessService";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";
import {
  Utensils, Coffee, ShoppingBag, Briefcase, Wrench, HeartPulse, Film, GraduationCap,
  MapPin, Clock, Dog, CreditCard, Truck, Wifi, Accessibility, Star
} from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import { supabase } from '../lib/supabase';
import UpgradeRequiredModal from '../components/modals/UpgradeRequiredModal';

const mapContainerStyle = {
  width: "100%",
  height: "350px",
  borderRadius: "0.75rem",
};

const defaultCenter = {
  lat: 19.4326,
  lng: -99.1332,
};

// 8 Categorías con subcategorías (igual que CategoriesPage)
const CATEGORIES = {
  restaurantes: {
    name: 'Restaurantes & Comida',
    icon: Utensils,
    subcategories: ['Taquerías', 'Comida Corrida', 'Comida Rápida', 'Pizzerías', 'Mariscos', 'Comida Mexicana', 'Internacional', 'Postres/Heladerías']
  },
  bares: {
    name: 'Bares y Cafeterías',
    icon: Coffee,
    subcategories: ['Cafeterías', 'Bares/Cantinas', 'Cervecerías', 'Coctelerías', 'Antros/Clubs']
  },
  tiendas: {
    name: 'Tiendas & Comercios',
    icon: ShoppingBag,
    subcategories: ['Abarrotes', 'Minisúper', 'Ropa y Calzado', 'Papelerías', 'Electrónicos', 'Ferreterías', 'Mueblerías', 'Mascotas']
  },
  servicios: {
    name: 'Servicios Profesionales',
    icon: Briefcase,
    subcategories: ['Abogados', 'Contadores', 'Consultoría', 'Diseñadores', 'Notarías', 'Arquitectos', 'Recursos Humanos']
  },
  hogar_autos: {
    name: 'Hogar, Reparaciones & Autos',
    icon: Wrench,
    subcategories: [
      'Taller Mecánico', 'Vulcanizadora', 'Alineación y Balanceo', 'Taller Eléctrico',
      'Motos', 'Tracto/Camiones', 'Diesel', 'Boutique Automotriz', 'Lavado de Autos',
      'Plomería', 'Electricista', 'Cerrajero', 'Carpintería', 'Herrería', 'Vidriería', 'Limpieza'
    ]
  },
  salud: {
    name: 'Salud y Belleza',
    icon: HeartPulse,
    subcategories: ['Consultorios', 'Clínicas', 'Dentistas', 'Psicología', 'Spa/Masajes', 'Gimnasios', 'Barberías', 'Salones de Belleza', 'Farmacias']
  },
  entretenimiento: {
    name: 'Entretenimiento',
    icon: Film,
    subcategories: ['Cines', 'Teatros', 'Parques', 'Boliche/Billar', 'Karaoke', 'Canchas Deportivas', 'Eventos']
  },
  educacion: {
    name: 'Educación',
    icon: GraduationCap,
    subcategories: ['Escuelas', 'Guarderías', 'Cursos y Talleres', 'Idiomas', 'Capacitación', 'Música/Danza']
  }
};

// Tags/Características
const FEATURE_TAGS = [
  { id: 'pet_friendly', label: 'Pet Friendly', icon: Dog, color: 'amber' },
  { id: '24_hours', label: 'Abierto 24 hrs', icon: Clock, color: 'green' },
  { id: 'accepts_card', label: 'Acepta tarjeta', icon: CreditCard, color: 'blue' },
  { id: 'delivery', label: 'Entrega a domicilio', icon: Truck, color: 'purple' },
  { id: 'wifi', label: 'WiFi gratis', icon: Wifi, color: 'cyan' },
  { id: 'accessible', label: 'Accesible', icon: Accessibility, color: 'indigo' },
  { id: 'parking', label: 'Estacionamiento', icon: MapPin, color: 'gray' },
  { id: 'factura', label: 'Facturación', icon: Star, color: 'orange' },
];

export default function BusinessFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  // Estado para el modal de upgrade
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [businessCount, setBusinessCount] = useState(0);
  const [checkingLimit, setCheckingLimit] = useState(true);

  const [form, setForm] = useState({
    business_name: "",
    category: "",
    subcategory: "",
    description: "",
    address: "",
    phone: "",
    website: "",
    latitude: null,
    longitude: null,
    images: [],
    // Redes sociales (Premium)
    instagram: "",
    facebook: "",
    tiktok: "",
    whatsapp: "",
    // Tags de características
    tags: []
  });

  const [submitting, setSubmitting] = useState(false);
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  // Verificar límite de negocios al cargar
  useEffect(() => {
    if (user) {
      checkBusinessLimit();
    }
  }, [user]);

  const checkBusinessLimit = async () => {
    try {
      setCheckingLimit(true);

      // Contar negocios del usuario
      const { count } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      setBusinessCount(count || 0);

      // Si ya tiene 1+ negocio, verificar si es premium
      if (count >= 1) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('is_premium')
          .eq('id', user.id)
          .maybeSingle();

        // Si NO es premium y ya tiene 1 negocio, mostrar modal
        if (!profile?.is_premium) {
          setShowUpgradeModal(true);
        }
      }
    } catch (error) {
      console.error('Error checking business limit:', error);
    } finally {
      setCheckingLimit(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
      // Reset subcategory cuando cambia la categoría
      ...(name === 'category' ? { subcategory: '' } : {})
    }));
  };

  const toggleTag = (tagId) => {
    setForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tagId)
        ? prev.tags.filter(t => t !== tagId)
        : [...prev.tags, tagId]
    }));
  };

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setMapCenter(pos);
          setForm(prev => ({ ...prev, latitude: pos.lat, longitude: pos.lng }));
        },
        () => console.log("Error obteniendo ubicación")
      );
    }
  }, []);

  const onMarkerDragEnd = (e) => {
    setForm(prev => ({
      ...prev,
      latitude: e.latLng.lat(),
      longitude: e.latLng.lng()
    }));
  };

  const onMapClick = (e) => {
    setForm(prev => ({
      ...prev,
      latitude: e.latLng.lat(),
      longitude: e.latLng.lng()
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación de campos requeridos
    if (!form.business_name.trim()) {
      toast.error("El nombre del negocio es obligatorio");
      return;
    }
    if (!form.category) {
      toast.error("Selecciona una categoría");
      return;
    }
    if (!form.latitude || !form.longitude) {
      toast.error("Por favor selecciona la ubicación en el mapa");
      return;
    }

    try {
      setSubmitting(true);
      await createBusiness(form, user);
      toast.success("¡Negocio registrado exitosamente!");
      navigate("/dashboard");
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al registrar el negocio: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedCategoryData = form.category ? CATEGORIES[form.category] : null;

  // Componente para label con asterisco rojo
  const RequiredLabel = ({ children }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children} <span className="text-red-500">*</span>
    </label>
  );

  const OptionalLabel = ({ children }) => (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children} <span className="text-gray-400 text-xs">(opcional)</span>
    </label>
  );

  // Loading state mientras verifica límites
  if (checkingLimit) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando tu cuenta...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Modal de Upgrade */}
      <UpgradeRequiredModal
        isOpen={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          navigate('/dashboard');
        }}
        currentBusinessCount={businessCount}
      />

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-6">
            <h1 className="text-3xl font-bold text-white">Registra tu Negocio</h1>
            <p className="text-blue-100 mt-2">
              Únete a Geobooker y haz que miles de clientes te encuentren.
            </p>
          </div>

          {/* Barra de progreso de campos */}
          <div className="bg-blue-50 px-8 py-3 border-b">
            <div className="flex items-center text-sm text-blue-700">
              <span className="mr-2">📌</span>
              <span>Los campos marcados con <span className="text-red-500 font-bold">*</span> son obligatorios</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Sección 1: Información Básica */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                Información Básica
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div>
                  <RequiredLabel>Nombre del Negocio</RequiredLabel>
                  <input
                    type="text"
                    name="business_name"
                    value={form.business_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Ej. Tacos El Paisa"
                  />
                </div>

                {/* Categoría */}
                <div>
                  <RequiredLabel>Categoría</RequiredLabel>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecciona una categoría</option>
                    {Object.entries(CATEGORIES).map(([key, cat]) => (
                      <option key={key} value={key}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Subcategoría (dinámica) */}
                {selectedCategoryData && (
                  <div>
                    <RequiredLabel>Subcategoría</RequiredLabel>
                    <select
                      name="subcategory"
                      value={form.subcategory}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Selecciona una subcategoría</option>
                      {selectedCategoryData.subcategories.map(sub => (
                        <option key={sub} value={sub}>{sub}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Descripción */}
                <div className="md:col-span-2">
                  <OptionalLabel>Descripción</OptionalLabel>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Describe tu negocio, productos o servicios..."
                  />
                </div>
              </div>
            </section>

            {/* Sección 2: Ubicación */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
                Ubicación <span className="text-red-500 ml-1">*</span>
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                📍 Arrastra el pin rojo hasta la ubicación exacta de tu negocio.
              </p>

              <div className="rounded-xl overflow-hidden border border-gray-300 shadow-sm mb-4">
                <LoadScript googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}>
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter}
                    zoom={15}
                    onLoad={onMapLoad}
                    onClick={onMapClick}
                    options={{ streetViewControl: false, mapTypeControl: false }}
                  >
                    {form.latitude && form.longitude && (
                      <Marker
                        position={{ lat: form.latitude, lng: form.longitude }}
                        draggable={true}
                        onDragEnd={onMarkerDragEnd}
                      />
                    )}
                  </GoogleMap>
                </LoadScript>
              </div>

              <div>
                <OptionalLabel>Dirección escrita</OptionalLabel>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Calle, número, colonia..."
                />
              </div>
            </section>

            {/* Sección 3: Contacto */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">3</span>
                Contacto
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <OptionalLabel>Teléfono</OptionalLabel>
                  <PhoneInput
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="55 1234 5678"
                  />
                </div>
                <div>
                  <OptionalLabel>Sitio Web</OptionalLabel>
                  <input
                    type="url"
                    name="website"
                    value={form.website}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </section>

            {/* Sección 4: Características (Tags) */}
            <section className="bg-gradient-to-r from-green-50 to-emerald-50 p-6 rounded-xl border border-green-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="bg-green-500 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">4</span>
                Características de tu Negocio
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Selecciona las características que apliquen a tu negocio:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {FEATURE_TAGS.map(tag => {
                  const Icon = tag.icon;
                  const isSelected = form.tags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all ${isSelected
                        ? 'border-green-500 bg-green-100 text-green-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                        }`}
                    >
                      <Icon className={`w-5 h-5 ${isSelected ? 'text-green-600' : 'text-gray-400'}`} />
                      <span className="text-sm font-medium">{tag.label}</span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Sección 5: Redes Sociales (Premium) */}
            <section className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-xl border border-purple-100">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">5</span>
                Redes Sociales
                <span className="ml-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-0.5 rounded-full">PREMIUM</span>
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Conecta tus redes para que tus clientes te sigan.
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <span className="text-pink-500 mr-2">📸</span> Instagram
                  </label>
                  <input
                    type="text"
                    name="instagram"
                    value={form.instagram}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500"
                    placeholder="@tunegocio"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <span className="text-blue-600 mr-2">👥</span> Facebook
                  </label>
                  <input
                    type="text"
                    name="facebook"
                    value={form.facebook}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="facebook.com/tunegocio"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <span className="mr-2">🎵</span> TikTok
                  </label>
                  <input
                    type="text"
                    name="tiktok"
                    value={form.tiktok}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-500"
                    placeholder="@tunegocio"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <span className="text-green-500 mr-2">💬</span> WhatsApp
                  </label>
                  <PhoneInput
                    name="whatsapp"
                    value={form.whatsapp}
                    onChange={handleChange}
                    placeholder="55 1234 5678"
                  />
                </div>
              </div>
            </section>

            {/* Botones */}
            <div className="pt-6 border-t border-gray-200 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                <span className="text-red-500">*</span> Campos obligatorios
              </p>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => navigate("/dashboard")}
                  className="px-6 py-3 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? "Registrando..." : "Registrar Negocio 🚀"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}