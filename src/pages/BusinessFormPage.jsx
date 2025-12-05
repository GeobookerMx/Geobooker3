import React, { useState, useCallback, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { createBusiness } from "../services/businessService";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { GoogleMap, LoadScript, Marker } from "@react-google-maps/api";

const mapContainerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "0.75rem",
};

const defaultCenter = {
  lat: 19.4326,
  lng: -99.1332, // CDMX default
};

export default function BusinessFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const mapRef = useRef(null);

  const [form, setForm] = useState({
    business_name: "",
    category: "",
    description: "",
    address: "",
    phone: "",
    website: "",
    latitude: null,
    longitude: null,
    // Images placeholder
    images: []
  });

  const [submitting, setSubmitting] = useState(false);
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  // Manejo de cambios en inputs de texto
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Manejo del mapa
  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    // Intentar obtener ubicación actual del usuario
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setMapCenter(pos);
          setForm(prev => ({
            ...prev,
            latitude: pos.lat,
            longitude: pos.lng
          }));
        },
        () => {
          console.log("Error obteniendo ubicación");
        }
      );
    }
  }, []);

  const onMarkerDragEnd = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setForm(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };

  const onMapClick = (e) => {
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setForm(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.business_name.trim() || !form.category.trim()) {
      toast.error("Nombre y categoría son obligatorios");
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

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 px-8 py-6">
          <h1 className="text-3xl font-bold text-white">Registra tu Negocio</h1>
          <p className="text-blue-100 mt-2">
            Únete a Geobooker y haz que miles de clientes te encuentren.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Sección 1: Información Básica */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
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
                  name="business_name"
                  value={form.business_name}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ej. Tacos El Paisa"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoría *
                </label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Describe tu negocio..."
                />
              </div>
            </div>
          </section>

          {/* Sección 2: Ubicación */}
          <section>
            <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
              <span className="bg-blue-100 text-blue-600 w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm">2</span>
              Ubicación Exacta
            </h2>
            <p className="text-sm text-gray-500 mb-4">
              Arrastra el pin rojo hasta la ubicación exacta de tu negocio.
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
                  {form.latitude && form.longitude && (
                    <Marker
                      position={{ lat: form.latitude, lng: form.longitude }}
                      draggable={true}
                      onDragEnd={onMarkerDragEnd}
                      animation={window.google?.maps?.Animation?.DROP}
                    />
                  )}
                </GoogleMap>
              </LoadScript>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección Escrita
                </label>
                <input
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Calle, número, colonia..."
                />
              </div>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="+52..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sitio Web (Opcional)
                </label>
                <input
                  type="url"
                  name="website"
                  value={form.website}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://..."
                />
              </div>
            </div>
          </section>

          <div className="pt-6 border-t border-gray-200 flex justify-end">
            <button
              type="button"
              onClick={() => navigate("/dashboard")}
              className="mr-4 px-6 py-3 text-gray-700 font-medium hover:bg-gray-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-lg shadow-lg hover:bg-blue-700 hover:shadow-xl transition transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Registrando..." : "Registrar Negocio"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}