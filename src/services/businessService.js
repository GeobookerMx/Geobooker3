// src/services/businessService.js
import { supabase } from "../lib/supabase";

// Función para normalizar strings evitando espacios dobles, nulls, etc.
function clean(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value.trim() || null;
  return value;
}

export async function createBusiness(form, user) {
  // Validación mínima ANTES de enviar
  if (!form.business_name || !form.category) {
    throw new Error("El nombre del negocio y la categoría son obligatorios.");
  }

  // Mapeo exacto a la tabla 'businesses' en Supabase
  const payload = {
    owner_id: user?.id,

    // Información Básica
    name: clean(form.business_name),
    manager_name: clean(form.manager_name),
    description: clean(form.description),
    category: clean(form.category),
    subcategory: clean(form.subcategory),

    // Tags/Características (Pet Friendly, 24hrs, etc.)
    tags: form.tags || [],

    // Dirección y Ubicación
    address: clean(form.address),
    latitude: parseFloat(form.latitude) || 0,
    longitude: parseFloat(form.longitude) || 0,

    // Contacto Principal
    phone: clean(form.phone),
    whatsapp: clean(form.whatsapp),
    website: clean(form.website),
    email: user?.email, // Email del dueño por defecto

    // Redes Sociales
    facebook: clean(form.facebook),
    instagram: clean(form.instagram),
    tiktok: clean(form.tiktok),

    // Servicios Adicionales
    offers_invoicing: form.offers_invoicing ?? false,
    invoicing_details: clean(form.invoicing_details),
    has_job_openings: form.has_job_openings ?? false,
    job_openings_details: clean(form.job_openings_details),

    // Status inicial
    status: "pending",

    // Multimedia
    images: form.images || [],
    opening_hours: form.opening_hours || null,

    created_at: new Date().toISOString(),
  };

  console.log("📤 Enviando datos a Supabase:", payload);

  const { data, error } = await supabase
    .from("businesses")
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    console.error("❌ Error desde Supabase:", {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    throw new Error("No se pudo guardar el negocio en Supabase: " + error.message);
  }

  console.log("✅ Negocio creado:", data);
  return data;
}
