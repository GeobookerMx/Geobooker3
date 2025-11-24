// src/services/businessService.js
import { supabase } from "../lib/supabase";

export async function createBusiness(form, user) {
  const payload = {
    business_name: form.business_name,
    manager_name: form.manager_name || null,
    category: form.category,
    subcategory: form.subcategory || null,
    description: form.description || null,

    address: form.address || null,
    city: form.city || null,
    state: form.state || null,
    country: form.country || "México",
    postal_code: form.postal_code || null,

    phone: form.phone || null,
    whatsapp: form.whatsapp || null,
    website: form.website || null,
    facebook: form.facebook || null,
    instagram: form.instagram || null,
    tiktok: form.tiktok || null,

    offers_invoicing: form.offers_invoicing ?? false,
    invoicing_details: form.invoicing_details || null,
    has_job_openings: form.has_job_openings ?? false,

    owner_id: user?.id ?? null,
    status: "pending",
  };

  console.log("➡️ Enviando payload a Supabase:", payload);

  const { data, error } = await supabase
    .from("businesses")   // 👈 nombre de la tabla
    .insert([payload])
    .select("*")
    .single();

  if (error) {
    console.error("❌ Error desde Supabase:", {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code,
    });
    throw error;
  }

  console.log("✅ Negocio creado en Supabase:", data);
  return data;
}
