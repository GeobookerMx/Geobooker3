// src/pages/BusinessFormPage.jsx
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { createBusiness } from "../services/businessService";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export default function BusinessFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    business_name: "",
    manager_name: "",      // Encargado del negocio (opcional)
    category: "",
    subcategory: "",
    description: "",
    address: "",
    city: "",
    state: "",
    country: "México",
    postal_code: "",
    phone: "",
    whatsapp: "",
    website: "",
    facebook: "",
    instagram: "",
    tiktok: "",
    offers_invoicing: false,
    invoicing_details: "",
    has_job_openings: false,
  });

  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Manejo genérico de cambios
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validación mínima manual
    if (!form.business_name.trim() || !form.category.trim()) {
      toast.error("Por favor, completa al menos el nombre del negocio y la categoría.");
      return;
    }

    try {
      setSubmitting(true);

      console.log("➡️ Enviando payload a Supabase:", form);

      const result = await createBusiness(form, user);

      console.log("✅ Respuesta de Supabase (createBusiness):", result);

      toast.success("🎉 Tu negocio ha sido enviado. Revisaremos la información.");
      setSuccess(true);

      // Limpiar formulario
      setForm({
        business_name: "",
        manager_name: "",
        category: "",
        subcategory: "",
        description: "",
        address: "",
        city: "",
        state: "",
        country: "México",
        postal_code: "",
        phone: "",
        whatsapp: "",
        website: "",
        facebook: "",
        instagram: "",
        tiktok: "",
        offers_invoicing: false,
        invoicing_details: "",
        has_job_openings: false,
      });
    } catch (error) {
      console.error("❌ Error al enviar negocio:", error);
      toast.error("Hubo un error al enviar tu negocio. Revisa la consola.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewBusiness = () => {
    setSuccess(false);
  };

  // ✅ Pantalla de éxito
  if (success) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
          <span className="text-4xl">✅</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-800 mb-4">
          ¡Tu negocio fue registrado!
        </h1>
        <p className="text-slate-600 mb-8">
          Hemos recibido la información de tu negocio.
          En breve será revisado y, una vez aprobado, aparecerá en Geobooker.
        </p>
        <div className="flex flex-col md:flex-row justify-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="px-6 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm shadow-md hover:bg-blue-700 hover:shadow-lg transition"
          >
            Volver al inicio
          </button>
          <button
            onClick={handleNewBusiness}
            className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition"
          >
            Registrar otro negocio
          </button>
        </div>
      </div>
    );
  }

  // 🧾 Formulario
  const isBasicInvalid =
    !form.business_name.trim() || !form.category.trim();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-4 text-slate-800">
        Sube tu negocio a Geobooker
      </h1>
      <p className="text-slate-600 mb-8">
        Completa la información de tu negocio. Por ahora el alta es{" "}
        <strong>100% gratuita</strong>.
      </p>

      <form
        noValidate                 // 👈 Desactiva la validación HTML y usamos la nuestra
        onSubmit={handleSubmit}
        className="space-y-6 bg-white rounded-xl shadow-md p-6"
      >
        {/* Nombre + encargado */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nombre del negocio <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="business_name"
              value={form.business_name}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ej. Barbería El Buen Corte"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Encargado del negocio <span className="text-xs text-slate-400">(opcional)</span>
            </label>
            <input
              type="text"
              name="manager_name"
              value={form.manager_name}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nombre del encargado"
            />
          </div>
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Categoría <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="category"
            value={form.category}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej. Barbería, Taller, Farmacia..."
          />
        </div>

        {/* Subcategoría */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Subcategoría
          </label>
          <input
            type="text"
            name="subcategory"
            value={form.subcategory}
            onChange={handleChange}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Ej. Barbería clásica, Vulcanizadora 24h..."
          />
        </div>

        {/* Descripción */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Descripción breve
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Cuenta brevemente qué ofrece tu negocio."
          />
        </div>

        {/* Dirección */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              name="address"
              value={form.address}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Calle y número"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Ciudad
            </label>
            <input
              type="text"
              name="city"
              value={form.city}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ciudad"
            />
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Estado
            </label>
            <input
              type="text"
              name="state"
              value={form.state}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Estado"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Código postal
            </label>
            <input
              type="text"
              name="postal_code"
              value={form.postal_code}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="CP"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              País
            </label>
            <input
              type="text"
              name="country"
              value={form.country}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Contacto */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Teléfono
            </label>
            <input
              type="text"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Teléfono del negocio"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              WhatsApp
            </label>
            <input
              type="text"
              name="whatsapp"
              value={form.whatsapp}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Número de WhatsApp"
            />
          </div>
        </div>

        {/* Redes */}
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Sitio web
            </label>
            <input
              type="text"
              name="website"
              value={form.website}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://tusitio.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Facebook
            </label>
            <input
              type="text"
              name="facebook"
              value={form.facebook}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="URL o usuario"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Instagram
            </label>
            <input
              type="text"
              name="instagram"
              value={form.instagram}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="@usuario o URL"
            />
          </div>
        </div>

        {/* Opciones extra: facturación y empleo (para futuro, ya guardan en DB) */}
        <div className="grid md:grid-cols-2 gap-4 border-t border-slate-200 pt-4">
          <div className="flex items-start space-x-2">
            <input
              id="offers_invoicing"
              type="checkbox"
              name="offers_invoicing"
              checked={form.offers_invoicing}
              onChange={handleChange}
              className="mt-1"
            />
            <div>
              <label
                htmlFor="offers_invoicing"
                className="text-sm font-medium text-slate-700"
              >
                ¿Tu negocio emite facturas?
              </label>
              <textarea
                name="invoicing_details"
                value={form.invoicing_details}
                onChange={handleChange}
                rows={2}
                className="mt-1 w-full border rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Datos importantes sobre facturación (RFC, horario, etc.)"
              />
            </div>
          </div>

          <div className="flex items-start space-x-2">
            <input
              id="has_job_openings"
              type="checkbox"
              name="has_job_openings"
              checked={form.has_job_openings}
              onChange={handleChange}
              className="mt-1"
            />
            <div>
              <label
                htmlFor="has_job_openings"
                className="text-sm font-medium text-slate-700"
              >
                ¿Actualmente tienes vacantes?
              </label>
              <p className="text-xs text-slate-500 mt-1">
                Más adelante podremos mostrar los negocios que están contratando.
              </p>
            </div>
          </div>
        </div>

        {/* Botón */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={submitting || isBasicInvalid}
            className="w-full md:w-auto px-6 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-sm shadow-md hover:bg-blue-700 hover:shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Enviando..." : "Enviar negocio"}
          </button>
        </div>
      </form>

      <p className="text-xs text-slate-500 mt-4">
        Al enviar tu negocio aceptas nuestros{" "}
        <span className="underline">términos de servicio</span> y{" "}
        <span className="underline">política de privacidad</span>.
      </p>
    </div>
  );
} 