import { supabase } from "../lib/supabase";
import { getAttributionSummary } from "./attributionService";

function clean(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value.trim() || null;
  return value;
}

export function inferUserCountry() {
  if (typeof navigator === "undefined") return "MX";
  const locale = navigator.language || navigator.languages?.[0] || "es-MX";
  const region = locale.split("-")[1];
  return region && region.length === 2 ? region.toUpperCase() : "MX";
}

export async function searchBusinessesSemantically(searchQuery, userCountry = inferUserCountry()) {
  const normalizedQuery = clean(searchQuery);
  if (!normalizedQuery) return [];

  let semanticMatches = [];
  let matchSource = 'knowledge_graph';

  const { data: kgMatches, error: kgError } = await supabase.rpc(
    "search_businesses_knowledge_graph",
    {
      search_query: normalizedQuery,
      user_country: userCountry,
      user_language: typeof navigator !== "undefined" ? (navigator.language || "es-MX") : "es-MX",
    }
  );

  if (!kgError && Array.isArray(kgMatches) && kgMatches.length > 0) {
    semanticMatches = kgMatches;
  } else {
    if (kgError) {
      console.warn("Knowledge graph search RPC unavailable:", kgError.message);
    }

    const { data: synonymMatches, error: rpcError } = await supabase.rpc(
      "search_businesses_with_synonyms",
      {
        search_query: normalizedQuery,
        user_country: userCountry,
      }
    );

    if (rpcError) {
      console.warn("Semantic search RPC unavailable:", rpcError.message);
      return [];
    }

    semanticMatches = synonymMatches || [];
    matchSource = 'legacy_synonyms';
  }

  const orderedIds = [...new Set((semanticMatches || []).map((item) => item.business_id).filter(Boolean))];
  if (orderedIds.length === 0) return [];

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("*")
    .in("id", orderedIds)
    .eq("status", "approved")
    .eq("is_visible", true);

  if (error) {
    console.warn("Semantic search business lookup failed:", error.message);
    return [];
  }

  const scoreMap = new Map((semanticMatches || []).map((item) => [item.business_id, item.match_score]));
  const sourceMap = new Map((semanticMatches || []).map((item) => [item.business_id, item.match_source || matchSource]));
  const termMap = new Map((semanticMatches || []).map((item) => [item.business_id, item.matched_term || normalizedQuery]));
  const categorySlugMap = new Map((semanticMatches || []).map((item) => [item.business_id, item.category_slug || null]));
  const businessMap = new Map((businesses || []).map((item) => [item.id, item]));

  return orderedIds
    .map((id) => {
      const business = businessMap.get(id);
      if (!business) return null;
      return {
        ...business,
        semantic_match_score: scoreMap.get(id) || 0,
        semantic_match_source: sourceMap.get(id) || matchSource,
        semantic_matched_term: termMap.get(id) || normalizedQuery,
        semantic_category_slug: categorySlugMap.get(id) || null,
        isSemanticResult: true,
      };
    })
    .filter(Boolean);
}

export async function createBusiness(form, user) {
  if (!user?.id) {
    throw new Error("Debes iniciar sesion para registrar un negocio.");
  }

  if (!form.business_name || !form.category) {
    throw new Error("El nombre del negocio y la categoria son obligatorios.");
  }

  const normalizedAddress =
    clean(form.address) ||
    ((form.latitude || form.longitude)
      ? `Ubicacion marcada en mapa (${Number(form.latitude).toFixed(6)}, ${Number(form.longitude).toFixed(6)})`
      : null);

  if (!normalizedAddress) {
    throw new Error("La direccion del negocio es obligatoria.");
  }

  const payload = {
    owner_id: user?.id,
    name: clean(form.business_name),
    manager_name: clean(form.manager_name),
    description: clean(form.description),
    category: clean(form.category),
    subcategory: clean(form.subcategory),
    tags: form.tags || [],
    address: normalizedAddress,
    latitude: parseFloat(form.latitude) || 0,
    longitude: parseFloat(form.longitude) || 0,
    phone: clean(form.phone),
    whatsapp: clean(form.whatsapp),
    website: clean(form.website),
    email: user?.email,
    facebook: clean(form.facebook),
    instagram: clean(form.instagram),
    tiktok: clean(form.tiktok),
    offers_invoicing: form.offers_invoicing ?? false,
    invoicing_details: clean(form.invoicing_details),
    has_job_openings: form.has_job_openings ?? false,
    job_openings_details: clean(form.job_openings_details),
    status: "pending",
    images: form.images || [],
    opening_hours: form.opening_hours || null,
    created_at: new Date().toISOString(),
    attribution_text: getAttributionSummary(),
  };

  console.log("Enviando negocio a Supabase:", payload);

  let insertResponse = await supabase
    .from("businesses")
    .insert([payload])
    .select("*")
    .single();

  const columnErrorMessage = `${insertResponse.error?.message || ''} ${insertResponse.error?.details || ''}`.toLowerCase();
  if (insertResponse.error && (columnErrorMessage.includes('column') || columnErrorMessage.includes('schema cache') || columnErrorMessage.includes('does not exist'))) {
    const { attribution_text, ...fallbackPayload } = payload;
    insertResponse = await supabase
      .from("businesses")
      .insert([fallbackPayload])
      .select("*")
      .single();
  }

  const { data, error } = insertResponse;

  if (error) {
    console.error("Error desde Supabase:", {
      code: error.code,
      message: error.message,
      details: error.details,
    });
    throw new Error("No se pudo guardar el negocio en Supabase: " + error.message);
  }

  try {
    const { count, error: countError } = await supabase
      .from("businesses")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", user.id);

    if (countError) {
      throw countError;
    }

    if (count === 1) {
      await supabase.rpc("reward_referrer_business_added", {
        p_referred_id: user.id,
      });
    }
  } catch (refErr) {
    console.warn("Error al procesar conversion de referido:", refErr);
  }

  return data;
}
