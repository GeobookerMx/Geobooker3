import { supabase } from "../lib/supabase";
import { getAttributionSummary } from "./attributionService";
import { matchesSemanticText } from "../utils/semanticDictionary";

const TT_INTENT_TERMS = [
  'todo transporte',
  'tt',
  'logistica',
  'logístico',
  'logistico',
  'proveedor logistico',
  'proveedor logístico',
  'bodega',
  'storage',
  'warehouse',
  'patio',
  'patio logistico',
  'patio logístico',
  'almacen',
  'almacén',
  'flete',
  'freight',
  'grua',
  'grúa',
  'arrastre',
  'carga pesada',
  'carga',
  'mudanza',
  'operador logistico',
  'operador logístico',
  'refacciones',
  'refaccionaria',
  'servicio industrial',
  'industrial',
  'taller pesado',
  'transporte'
];

const TT_ROW_LIMIT = 120;
const TT_RESULT_LIMIT = 16;

function clean(value) {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") return value.trim() || null;
  return value;
}

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function pickFirst(row, keys = []) {
  for (const key of keys) {
    const value = clean(row?.[key]);
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
}

function pickNumber(row, keys = []) {
  for (const key of keys) {
    const value = Number(row?.[key]);
    if (!Number.isNaN(value) && Number.isFinite(value)) return value;
  }
  return null;
}

function buildAddress(row) {
  const direct = pickFirst(row, ['address', 'full_address', 'direccion', 'formatted_address']);
  if (direct) return direct;

  const parts = [
    pickFirst(row, ['street', 'calle']),
    pickFirst(row, ['neighborhood', 'colonia']),
    pickFirst(row, ['city', 'ciudad']),
    pickFirst(row, ['state', 'estado']),
    pickFirst(row, ['country', 'pais'])
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(', ') : 'Cobertura logistica por validar';
}

function buildTTSearchText(row) {
  return [
    pickFirst(row, ['name', 'company_name', 'provider_name', 'title']),
    pickFirst(row, ['description', 'summary', 'notes', 'service_description']),
    pickFirst(row, ['service_type', 'provider_type', 'category', 'subcategory']),
    pickFirst(row, ['specialties', 'services', 'materials']),
    pickFirst(row, ['city', 'ciudad']),
    pickFirst(row, ['state', 'estado']),
    pickFirst(row, ['country', 'pais'])
  ].filter(Boolean);
}

function hasLogisticsIntent(searchQuery = '') {
  const normalizedQuery = normalizeText(searchQuery);
  if (!normalizedQuery) return false;
  return TT_INTENT_TERMS.some((term) => normalizedQuery.includes(normalizeText(term))) || matchesSemanticText(searchQuery, TT_INTENT_TERMS);
}

function normalizeTTEntity(row, entityType) {
  const latitude = pickNumber(row, ['latitude', 'lat', 'location_lat', 'y']);
  const longitude = pickNumber(row, ['longitude', 'lng', 'lon', 'location_lng', 'x']);
  if (latitude === null || longitude === null) return null;

  const name = pickFirst(row, ['name', 'company_name', 'provider_name', 'title']) || (entityType === 'storage' ? 'Bodega / Storage' : 'Proveedor logistico');
  const phone = pickFirst(row, ['phone', 'contact_phone', 'mobile', 'telephone']);
  const whatsapp = pickFirst(row, ['whatsapp', 'whatsapp_phone', 'phone']);
  const website = pickFirst(row, ['website', 'url', 'company_website']);
  const category = entityType === 'storage' ? 'Bodega y storage' : 'Proveedor logistico';
  const subcategory = pickFirst(row, ['service_type', 'provider_type', 'category', 'subcategory']) || (entityType === 'storage' ? 'Storage y patio logistico' : 'Logistica y transporte');
  const description = pickFirst(row, ['description', 'summary', 'notes', 'service_description']) || subcategory;
  const city = pickFirst(row, ['city', 'ciudad']);
  const state = pickFirst(row, ['state', 'estado']);
  const country = pickFirst(row, ['country', 'pais']) || 'MX';
  const address = buildAddress(row);
  const rawId = pickFirst(row, ['id', 'provider_id', 'storage_id']) || `${name}-${latitude}-${longitude}`;
  const entityLabel = entityType === 'storage' ? 'tt_storage' : 'tt_provider';

  return {
    id: `${entityLabel}-${rawId}`,
    original_id: rawId,
    name,
    address,
    latitude,
    longitude,
    lat: latitude,
    lng: longitude,
    phone,
    whatsapp,
    website,
    category,
    subcategory,
    description,
    city,
    state,
    country,
    rating: null,
    source_type: entityLabel,
    source_name: 'todo_transporte',
    source_label: entityType === 'storage' ? 'TT Storage' : 'TT Proveedor',
    tt_entity_type: entityType,
    isSyntheticProfile: true,
    isSemanticResult: true,
    status: pickFirst(row, ['status']) || 'active'
  };
}

async function fetchTTMatchesFromTable(tableName, entityType, searchQuery, limit = TT_RESULT_LIMIT) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(TT_ROW_LIMIT);

    if (error) {
      const message = String(error.message || '').toLowerCase();
      if (error.code === '42P01' || message.includes('does not exist') || message.includes('schema cache')) {
        return [];
      }
      console.warn(`[TT] Error reading ${tableName}:`, error.message);
      return [];
    }

    const rows = (data || [])
      .filter((row) => {
        const status = normalizeText(pickFirst(row, ['status']) || 'active');
        if (status && ['inactive', 'archived', 'draft', 'deleted'].includes(status)) return false;
        return matchesSemanticText(searchQuery, buildTTSearchText(row));
      })
      .map((row) => normalizeTTEntity(row, entityType))
      .filter(Boolean)
      .slice(0, limit);

    return rows;
  } catch (error) {
    console.warn(`[TT] Exception reading ${tableName}:`, error.message || error);
    return [];
  }
}

export async function searchTodoTransporteMatches(searchQuery) {
  const normalizedQuery = clean(searchQuery);
  if (!normalizedQuery || !hasLogisticsIntent(normalizedQuery)) return [];

  const [providerMatches, storageMatches] = await Promise.all([
    fetchTTMatchesFromTable('providers', 'provider', normalizedQuery, TT_RESULT_LIMIT),
    fetchTTMatchesFromTable('storage_spaces', 'storage', normalizedQuery, TT_RESULT_LIMIT)
  ]);

  const deduped = [];
  const seen = new Set();

  [...providerMatches, ...storageMatches].forEach((item) => {
    const key = `${normalizeText(item.name)}|${normalizeText(item.address)}|${item.latitude}|${item.longitude}`;
    if (seen.has(key)) return;
    seen.add(key);
    deduped.push(item);
  });

  return deduped;
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
      const ttOnlyMatches = await searchTodoTransporteMatches(normalizedQuery);
      return ttOnlyMatches;
    }

    semanticMatches = synonymMatches || [];
    matchSource = 'legacy_synonyms';
  }

  const ttMatches = await searchTodoTransporteMatches(normalizedQuery);
  const orderedIds = [...new Set((semanticMatches || []).map((item) => item.business_id).filter(Boolean))];

  if (orderedIds.length === 0) {
    return ttMatches;
  }

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("*")
    .in("id", orderedIds)
    .eq("status", "approved")
    .eq("is_visible", true);

  if (error) {
    console.warn("Semantic search business lookup failed:", error.message);
    return ttMatches;
  }

  const scoreMap = new Map((semanticMatches || []).map((item) => [item.business_id, item.match_score]));
  const sourceMap = new Map((semanticMatches || []).map((item) => [item.business_id, item.match_source || matchSource]));
  const termMap = new Map((semanticMatches || []).map((item) => [item.business_id, item.matched_term || normalizedQuery]));
  const categorySlugMap = new Map((semanticMatches || []).map((item) => [item.business_id, item.category_slug || null]));
  const businessMap = new Map((businesses || []).map((item) => [item.id, item]));

  const nativeResults = orderedIds
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

  if (ttMatches.length === 0) return nativeResults;

  const seen = new Set();
  const merged = [];
  const prioritizedResults = hasLogisticsIntent(normalizedQuery)
    ? [...ttMatches, ...nativeResults]
    : [...nativeResults, ...ttMatches];

  prioritizedResults.forEach((item) => {
    const key = `${normalizeText(item.name)}|${normalizeText(item.address)}|${item.latitude ?? item.lat}|${item.longitude ?? item.lng}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(item);
  });

  return merged;
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
