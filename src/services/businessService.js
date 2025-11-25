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

  const payload = {
    business_name: clean(form.business_name),
    manager_name: clean(form.manager_name),

    category: clean(form.category),
    subcategory: clean(form.subcategory),
    description: clean(form.description),

    address: clean(form.address),
    city: clean(form.city),
    state: clean(form.state),
    country: clean(form.country) || "México",
    postal_code: clean(form.postal_code),

    phone: clean(form.phone),
    whatsapp: clean(form.whatsapp),
    website: clean(form.website),
    facebook: clean(form.facebook),
    instagram: clean(form.instagram),
    tiktok: clean(form.tiktok),

    offers_invoicing: form.offers_invoicing ?? false,
    invoicing_details: clean(form.invoicing_details),
    has_job_openings: form.has_job_openings ?? false,

    // Si no hay usuario, se guarda "anon"
    owner_id: user?.id ?? "anon",

    status: "pending",

    // Si en el futuro agregas mapa + coordenadas:
    latitude: form.latitude ?? null,
    longitude: form.longitude ?? null,

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
    throw new Error("No se pudo guardar el negocio en Supabase.");
  }

  console.log("✅ Negocio creado:", data);
  return data;
}
