import React, { useState, useCallback, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { createBusiness } from "../services/businessService";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { GoogleMap, MarkerF } from "@react-google-maps/api";
import { useSharedGoogleMaps } from "../hooks/useSharedGoogleMaps";

const MAPS_LIBRARIES = ['places'];
import {
  Utensils, Coffee, ShoppingBag, Briefcase, Wrench, HeartPulse, Film, GraduationCap,
  MapPin, Clock, Dog, CreditCard, Truck, Wifi, Accessibility, Star,
  Hotel, Home, Banknote, Smartphone, PartyPopper, ImagePlus, X, Store
} from 'lucide-react';
import PhoneInput from '../components/PhoneInput';
import { supabase } from '../lib/supabase';
import { GOOGLE_MAPS_API_KEY } from '../config/supabase';
import UpgradeRequiredModal from '../components/modals/UpgradeRequiredModal';
import { isPremiumPromoActive } from '../config/promotions';
import { trackBusinessCreated } from '../services/analyticsService';

const mapContainerStyle = {
  width: "100%",
  height: "350px",
  borderRadius: "0.75rem",
};

const defaultCenter = {
  lat: 19.4326,
  lng: -99.1332,
};

// 13 Categorías con subcategorías expandidas
const CATEGORIES = {
  restaurantes: {
    name: 'Restaurantes & Comida',
    icon: Utensils,
    subcategories: ['Taquerías', 'Comida Corrida', 'Comida Rápida', 'Pizzerías', 'Mariscos', 'Comida Mexicana', 'Internacional', 'Postres/Heladerías', 'Vegano', 'Sushi', 'Bufet', 'Food Trucks']
  },
  bares: {
    name: 'Bares y Cafeterías',
    icon: Coffee,
    subcategories: ['Cafeterías', 'Bares/Cantinas', 'Cervecerías', 'Coctelerías', 'Antros/Clubs']
  },
  tiendas: {
    name: 'Tiendas & Comercios',
    icon: ShoppingBag,
    subcategories: ['Abarrotes', 'Minisúper', 'Ropa y Calzado', 'Papelerías', 'Electrónicos', 'Ferreterías', 'Tlapalerías', 'Tornillerías', 'Material Eléctrico', 'Plomería y Tubería', 'Materiales de Construcción', 'Suministros Industriales', 'Pinturas y Barnices', 'Mueblerías', 'Tiendas de Mascotas', 'Joyerías', 'Floristerías', 'Jugueterías', 'Ópticas']
  },
  servicios: {
    name: 'Servicios Profesionales',
    icon: Briefcase,
    subcategories: ['Abogados', 'Contadores', 'Consultoría', 'Diseñadores', 'Notarías', 'Arquitectos', 'Recursos Humanos', 'Seguros', 'Fotografía', 'Marketing Digital', 'Proveedores Industriales', 'Logística y Transporte', 'Distribuidores Mayoristas', 'Mantenimiento Industrial']
  },
  hogar_autos: {
    name: 'Hogar, Reparaciones & Autos',
    icon: Wrench,
    subcategories: [
      'Taller Mecánico', 'Vulcanizadora', 'Alineación y Balanceo', 'Taller Eléctrico',
      'Motos', 'Tracto/Camiones', 'Servicios a Tractocamiones', 'Diesel', 'Boutique Automotriz', 'Lavado de Autos',
      'Plomería', 'Electricista', 'Cerrajero', 'Carpintería', 'Herrería', 'Vidriería', 'Limpieza', 'Aire Acondicionado y Refrigeración', 'Fumigación', 'Mudanzas y Fletes'
    ]
  },
  salud: {
    name: 'Salud y Belleza',
    icon: HeartPulse,
    subcategories: ['Hospitales', 'Clínicas', 'Consultorios', 'Dentistas', 'Psicología', 'Veterinarias', 'Hospitales Veterinarios', 'Urgencias Veterinarias', 'Estéticas Caninas', 'Nutriólogos', 'Fisioterapia', 'Laboratorios', 'Farmacias', 'Insumos Médicos', 'Spa/Masajes', 'Masajes', 'Gimnasios', 'Barberías', 'Salones de Belleza', 'Uñas', 'SkinCare']
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
  },
  // NUEVAS CATEGORÍAS
  alojamiento: {
    name: 'Alojamiento & Turismo',
    icon: Hotel,
    subcategories: ['Hoteles', 'Moteles', 'Airbnbs/Hospedaje', 'Cabañas', 'Tours', 'Agencias de Viaje', 'Balnearios']
  },
  inmobiliarias: {
    name: 'Inmobiliarias',
    icon: Home,
    subcategories: ['Locales Comerciales', 'Oficinas', 'Bodegas', 'Consultorios', 'Coworking', 'Naves Industriales', 'Terrenos Comerciales', 'Salones para Eventos', 'Renta de Casas', 'Departamentos', 'Venta de Casas']
  },
  finanzas: {
    name: 'Finanzas & Seguros',
    icon: Banknote,
    subcategories: ['Bancos', 'Casas de Cambio', 'Préstamos', 'Seguros', 'Créditos', 'Inversiones', 'Contabilidad Fiscal']
  },
  tecnologia: {
    name: 'Tecnología',
    icon: Smartphone,
    subcategories: ['Reparación de Celulares', 'Cibercafés', 'Impresión/Copias', 'Desarrollo Web', 'Soporte Técnico', 'Venta de Equipos', 'Accesorios']
  },
  eventos: {
    name: 'Eventos & Fiestas',
    icon: PartyPopper,
    subcategories: ['Salones de Fiestas', 'Quinceañeras', 'Bodas', 'Catering', 'Fotógrafos', 'DJ/Música', 'Decoración', 'Piñatas', 'Pastelerías para Eventos']
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
  const location = useLocation();
  const mapRef = useRef(null);

  const { isLoaded } = useSharedGoogleMaps();
  const [publicationType, setPublicationType] = useState(location.pathname.startsWith('/space/') ? 'space_rental' : 'business');
  const [imageFiles, setImageFiles] = useState([]);

  // Estado para el modal de upgrade
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [businessCount, setBusinessCount] = useState(0);
  const [checkingLimit, setCheckingLimit] = useState(true);

  const [form, setForm] = useState({
    business_name: "",
    category: publicationType === 'space_rental' ? 'inmobiliarias' : '',
    subcategory: publicationType === 'space_rental' ? 'Locales Comerciales' : '',
    description: "",
    address: "",
    phone: "",
    website: "",
    latitude: null,
    longitude: null,
    images: [],
    listing_type: publicationType,
    space_type: publicationType === 'space_rental' ? 'Local comercial' : '',
    monthly_rent: '',
    rent_currency: 'MXN',
    area_sqm: '',
    available_from: '',
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
  const [mapLoaded, setMapLoaded] = useState(false);

  const checkBusinessLimit = useCallback(async () => {
    if (!user?.id) return;
    try {
      setCheckingLimit(true);

      // Contar negocios del usuario
      const { count } = await supabase
        .from('businesses')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      setBusinessCount(count || 0);
    } catch (error) {
      console.error('Error checking business limit:', error);
    } finally {
      setCheckingLimit(false);
    }
  }, [user]);

  // Verificar el limite sin bloquear la opcion de publicar espacios.
  useEffect(() => {
    if (user) checkBusinessLimit();
  }, [user, checkBusinessLimit]);

  const selectPublicationType = (type) => {
    setPublicationType(type);
    setImageFiles([]);
    setForm((previous) => ({
      ...previous,
      listing_type: type,
      ...(type === 'space_rental'
        ? { category: 'inmobiliarias', subcategory: 'Locales Comerciales', space_type: 'Local comercial' }
        : { category: '', subcategory: '', space_type: '', monthly_rent: '', area_sqm: '', available_from: '' })
    }));
  };

  const handleImageSelection = (event) => {
    const selected = Array.from(event.target.files || []);
    if (selected.length > 5) {
      toast.error('Puedes subir hasta 5 fotos por espacio.');
      event.target.value = '';
      return;
    }
    const invalid = selected.find((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024);
    if (invalid) {
      toast.error('Usa fotos JPG, PNG o WebP de hasta 5 MB cada una.');
      event.target.value = '';
      return;
    }
    setImageFiles(selected);
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
    setMapLoaded(true);
    window.google?.maps?.event?.addListenerOnce(map, 'idle', () => {
      const mapDiv = map.getDiv();
      if (mapDiv) {
        mapDiv.querySelectorAll('[tabindex]').forEach(el => {
          el.setAttribute('tabindex', '-1');
        });
      }
    });
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

    if (!user?.id) {
      toast.error("Debes iniciar sesión para registrar tu negocio");
      navigate('/login');
      return;
    }

    if (publicationType === 'business' && businessCount >= 1 && !isPremiumPromoActive()) {
      const { data: isPremium, error: premiumError } = await supabase.rpc('get_user_premium_status', { user_id: user.id });
      if (premiumError || !isPremium) {
        setShowUpgradeModal(true);
        return;
      }
    }

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
    if (!form.address.trim()) {
      toast.error("Escribe la direccion de tu negocio");
      return;
    }
    if (!form.subcategory) {
      toast.error("Selecciona una subcategoria");
      return;
    }
    if (publicationType === 'space_rental' && (!form.space_type || !form.monthly_rent || Number(form.monthly_rent) < 0)) {
      toast.error('Indica el tipo de espacio y su renta mensual.');
      return;
    }

    try {
      setSubmitting(true);
      const createdBusiness = await createBusiness({ ...form, listing_type: publicationType }, user, { imageFiles });
      if (createdBusiness?.id) {
        trackBusinessCreated(createdBusiness.id, createdBusiness.name || form.business_name, {
          category: createdBusiness.category || form.category,
          subcategory: createdBusiness.subcategory || form.subcategory,
          city: localStorage.getItem('userCity') || null
        });
      }
      if (createdBusiness?.image_upload_warning) {
        toast.success('El espacio fue registrado. Podras agregar las fotos desde tu panel.');
      } else {
        toast.success(publicationType === 'space_rental' ? '¡Espacio enviado a revision!' : '¡Negocio registrado exitosamente!');
      }
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
            <h1 className="text-3xl font-bold text-white">
              {publicationType === 'space_rental' ? 'Publica un local o espacio en renta' : 'Registra tu Negocio'}
            </h1>
            <p className="text-blue-100 mt-2">
              {publicationType === 'space_rental'
                ? 'Cualquier usuario registrado puede enviar un espacio. Geobooker lo revisara antes de publicarlo.'
                : 'Únete a Geobooker y haz que miles de clientes te encuentren.'}
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
            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">¿Que quieres publicar?</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => selectPublicationType('business')}
                  className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${publicationType === 'business' ? 'border-blue-600 bg-blue-50 text-blue-900' : 'border-gray-200 hover:border-blue-300'}`}
                >
                  <Store className="h-6 w-6" />
                  <span><strong className="block">Negocio o servicio</strong><span className="text-sm">Perfil comercial en el directorio</span></span>
                </button>
                <button
                  type="button"
                  onClick={() => selectPublicationType('space_rental')}
                  className={`flex items-center gap-3 rounded-xl border-2 p-4 text-left transition ${publicationType === 'space_rental' ? 'border-emerald-600 bg-emerald-50 text-emerald-900' : 'border-gray-200 hover:border-emerald-300'}`}
                >
                  <Home className="h-6 w-6" />
                  <span><strong className="block">Local o espacio en renta</strong><span className="text-sm">Local, oficina, bodega, consultorio y mas</span></span>
                </button>
              </div>
            </section>
            {/* Sección 1: Información Básica */}
            <section>
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">1</span>
                Información Básica
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {/* Nombre */}
                <div>
                  <RequiredLabel>{publicationType === 'space_rental' ? 'Titulo del espacio' : 'Nombre del Negocio'}</RequiredLabel>
                  <input
                    type="text"
                    name="business_name"
                    value={form.business_name}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={publicationType === 'space_rental' ? 'Ej. Local comercial en el centro' : 'Ej. Tacos El Paisa'}
                  />
                </div>

                {/* Categoría */}
                <div>
                  <RequiredLabel>Categoría</RequiredLabel>
                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    disabled={publicationType === 'space_rental'}
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
                {publicationType === 'space_rental' && (
                  <>
                    <div>
                      <RequiredLabel>Tipo de espacio</RequiredLabel>
                      <select name="space_type" value={form.space_type} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500">
                        <option value="">Selecciona el tipo</option>
                        {['Local comercial', 'Oficina', 'Bodega', 'Consultorio', 'Coworking', 'Nave industrial', 'Terreno comercial', 'Salon para eventos', 'Otro espacio'].map((type) => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <RequiredLabel>Renta mensual</RequiredLabel>
                      <div className="flex gap-2">
                        <input type="number" min="0" step="0.01" name="monthly_rent" value={form.monthly_rent} onChange={handleChange} className="min-w-0 flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="15000" />
                        <select name="rent_currency" value={form.rent_currency} onChange={handleChange} className="w-28 px-3 py-3 border border-gray-300 rounded-lg">
                          {['MXN', 'USD', 'CAD', 'EUR'].map((currency) => <option key={currency}>{currency}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <OptionalLabel>Superficie en m²</OptionalLabel>
                      <input type="number" min="0" step="0.01" name="area_sqm" value={form.area_sqm} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" placeholder="85" />
                    </div>
                    <div>
                      <OptionalLabel>Disponible desde</OptionalLabel>
                      <input type="date" name="available_from" value={form.available_from} onChange={handleChange} className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500" />
                    </div>
                  </>
                )}

                <div className="md:col-span-2">
                  <OptionalLabel>Descripción</OptionalLabel>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder={publicationType === 'space_rental' ? 'Describe dimensiones, servicios, acceso, estacionamiento y condiciones generales...' : 'Describe tu negocio, productos o servicios...'}
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
                {isLoaded ? (
                  <GoogleMap
                    mapContainerStyle={mapContainerStyle}
                    center={mapCenter}
                    zoom={15}
                    onLoad={onMapLoad}
                    onClick={onMapClick}
                    options={{ streetViewControl: false, mapTypeControl: false }}
                  >
                    {mapLoaded && form.latitude && form.longitude && (
                      <MarkerF
                        position={{
                          lat: parseFloat(form.latitude),
                          lng: parseFloat(form.longitude)
                        }}
                        draggable={true}
                        onDragEnd={onMarkerDragEnd}
                      />
                    )}
                  </GoogleMap>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-gray-50">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>

              <div>
                <RequiredLabel>Dirección escrita</RequiredLabel>
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

            {publicationType === 'space_rental' ? (
              <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
                <h2 className="mb-2 flex items-center text-lg font-semibold text-emerald-900">
                  <ImagePlus className="mr-2 h-5 w-5" /> Fotos del espacio
                </h2>
                <p className="mb-4 text-sm text-emerald-800">Sube hasta 5 fotos JPG, PNG o WebP. Maximo 5 MB por imagen.</p>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800">
                  <ImagePlus className="h-4 w-4" /> Seleccionar fotos
                  <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageSelection} className="hidden" />
                </label>
                {imageFiles.length > 0 && (
                  <div className="mt-4 flex items-center justify-between rounded-lg bg-white px-4 py-3 text-sm text-emerald-900">
                    <span>{imageFiles.length} foto(s) listas para subir</span>
                    <button type="button" onClick={() => setImageFiles([])} className="rounded p-1 hover:bg-emerald-100" aria-label="Quitar fotos"><X className="h-4 w-4" /></button>
                  </div>
                )}
              </section>
            ) : (
              <section className="bg-blue-50 border border-blue-200 rounded-xl p-5">
                <h2 className="text-lg font-semibold text-blue-800 mb-2 flex items-center">
                  <span className="mr-2">📸</span> Fotos de tu Negocio
                </h2>
                <p className="text-sm text-blue-700">
                  Podrás subir fotos de tu negocio <strong>después de registrarlo</strong>, desde tu panel de control en "Editar negocio".
                  El plan gratuito incluye <strong>1 foto</strong>, y Premium hasta <strong>10 fotos</strong>.
                </p>
              </section>
            )}

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
                  {submitting ? "Registrando..." : publicationType === 'space_rental' ? 'Enviar espacio a revision' : "Registrar Negocio 🚀"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
