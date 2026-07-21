import { supabase } from "../lib/supabase";
import { getAttributionSummary } from "./attributionService";
import { matchesSemanticText } from "../utils/semanticDictionary";
import { analyzeSearchIntent, getIntentSearchHaystack } from "../utils/searchIntentEngine";

const TT_INTENT_TERMS = [
  'todo transporte',
  'tt',
  'logistica',
  'logistico',
  'proveedor logistico',
  'bodega',
  'storage',
  'warehouse',
  'patio',
  'patio logistico',
  'almacen',
  'flete',
  'freight',
  'grua',
  'arrastre',
  'carga pesada',
  'carga',
  'mudanza',
  'operador logistico',
  'refacciones',
  'refaccionaria',
  'servicio industrial',
  'industrial',
  'taller pesado',
  'transporte',
  'material',
  'materiales',
  'materiales de construccion',
  'cemento',
  'concreto',
  'block',
  'varilla',
  'acero',
  'lamina',
  'placa',
  'perfil',
  'tarimas',
  'pallets',
  'empaque',
  'embalaje',
  'componentes',
  'componentes industriales',
  'insumos industriales',
  'proveedor de alimentos',
  'alimentos mayoreo',
  'insumos para restaurante',
  'quimicos',
  'productos quimicos',
  'maquinaria',
  'equipo industrial',
  'tornilleria',
  'tornillo',
  'tornillos',
  'tuerca',
  'rondana',
  'fasteners',
  'screws',
  'bolts',
  'truck parking',
  'truck yard',
  'drop yard',
  'secure yard',
  'pension para tracto',
  'pension para tractocamion',
  'patio para mercancia',
  'resguardo de mercancia',
  'estacionamiento de trailer',
  'tractocamion',
  'trailer parking',
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
    pickFirst(row, ['products', 'product', 'inventory', 'items', 'cargo_types', 'equipment', 'vehicle_types', 'yard_type', 'security_features', 'access_hours']),
    pickFirst(row, ['industries_served', 'served_industries', 'coverage_notes']),
    pickFirst(row, ['city', 'ciudad']),
    pickFirst(row, ['state', 'estado']),
    pickFirst(row, ['country', 'pais'])
  ].filter(Boolean);
}

function hasLogisticsIntent(searchQuery = '') {
  const normalizedQuery = normalizeText(searchQuery);
  if (!normalizedQuery) return false;
  const intent = analyzeSearchIntent(searchQuery);
  return Boolean(intent?.isLogistics) || TT_INTENT_TERMS.some((term) => normalizedQuery.includes(normalizeText(term))) || matchesSemanticText(searchQuery, TT_INTENT_TERMS);
}

function distanceKm(userLocation, business) {
  if (!userLocation?.lat || !userLocation?.lng) return null;

  const lat = Number(business?.latitude ?? business?.lat);
  const lng = Number(business?.longitude ?? business?.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const toRad = (value) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(lat - userLocation.lat);
  const dLng = toRad(lng - userLocation.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(userLocation.lat)) * Math.cos(toRad(lat)) * Math.sin(dLng / 2) ** 2;

  return earthKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getBusinessTrustScore(business) {
  let score = 0;
  if (business?.is_verified || business?.verification_status === 'verified') score += 18;
  if (business?.is_premium || business?.premium_status === 'active') score += 12;
  if (business?.phone || business?.whatsapp) score += 8;
  if (business?.website) score += 5;
  if (Number(business?.rating) >= 4.5) score += 8;
  if (Number(business?.rating) >= 4) score += 4;
  if (Number(business?.review_count || business?.reviews_count) >= 10) score += 5;
  if (business?.source_type?.startsWith?.('tt_')) score += 6;
  return score;
}

function getIntentMatchScore(searchQuery, business) {
  const haystack = [
    business?.name,
    business?.category,
    business?.subcategory,
    business?.description,
    business?.address,
    business?.source_label,
    business?.semantic_matched_term,
    business?.semantic_category_slug,
    ...(Array.isArray(business?.tags) ? business.tags : []),
    ...(Array.isArray(business?.search_aliases) ? business.search_aliases : [])
  ];

  const intentHaystack = getIntentSearchHaystack(searchQuery);
  const normalizedBusiness = haystack.filter(Boolean).map(normalizeText).join(' | ');
  const matchedTerms = intentHaystack.filter((term) => normalizedBusiness.includes(normalizeText(term)));
  return Math.min(35, matchedTerms.length * 7);
}

function rankSearchResults(results = [], searchQuery = '', userLocation = null) {
  const intent = analyzeSearchIntent(searchQuery);

  return [...results]
    .map((business, index) => {
      const distance = distanceKm(userLocation, business);
      const distanceScore = distance === null ? 0 : Math.max(0, 35 - Math.min(distance, 35));
      const semanticScore = Number(business?.semantic_match_score || 0) * 30;
      const intentScore = getIntentMatchScore(searchQuery, business);
      const trustScore = getBusinessTrustScore(business);
      const sourceBoost = intent?.isLogistics && business?.source_type?.startsWith?.('tt_') ? 20 : 0;
      const rankScore = semanticScore + intentScore + trustScore + distanceScore + sourceBoost - (index * 0.05);

      return {
        ...business,
        search_intent_id: intent?.id || null,
        search_intent_label: intent?.label || null,
        search_rank_score: Number(rankScore.toFixed(2)),
        distance_km: distance === null ? business?.distance_km : Number(distance.toFixed(2)),
        availability_note: intent ? 'Resultado relacionado por categoria/intencion. Confirma precio, stock y disponibilidad con el negocio.' : business?.availability_note
      };
    })
    .sort((a, b) => (b.search_rank_score || 0) - (a.search_rank_score || 0));
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
  const description = pickFirst(row, ['description', 'summary', 'notes', 'service_description', 'products', 'inventory', 'materials']) || subcategory;
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

function matchesTTIntent(searchQuery, row) {
  const rowText = buildTTSearchText(row);
  if (matchesSemanticText(searchQuery, rowText)) return true;

  const intent = analyzeSearchIntent(searchQuery);
  if (!intent) return false;

  const intentTerms = [
    intent.label,
    intent.googleQuery,
    ...(intent.fallbackQueries || []),
    ...(intent.categoryHints || []),
    ...(intent.trustSignals || [])
  ].filter(Boolean);

  return intentTerms.some((term) => matchesSemanticText(term, rowText));
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
        return matchesTTIntent(searchQuery, row);
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

export async function searchBusinessesSemantically(searchQuery, userCountry = inferUserCountry(), userLocation = null) {
  const normalizedQuery = clean(searchQuery);
  if (!normalizedQuery) return [];

  const intentAnalysis = analyzeSearchIntent(normalizedQuery);
  const rpcSearchQuery = intentAnalysis?.expandedQuery || normalizedQuery;
  let semanticMatches = [];
  let matchSource = 'knowledge_graph';

  const { data: kgMatches, error: kgError } = await supabase.rpc(
    "search_businesses_knowledge_graph",
    {
      search_query: rpcSearchQuery,
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
        search_query: rpcSearchQuery,
        user_country: userCountry,
      }
    );

    if (rpcError) {
      console.warn("Semantic search RPC unavailable:", rpcError.message);
      const ttOnlyMatches = await searchTodoTransporteMatches(normalizedQuery);
      return rankSearchResults(ttOnlyMatches, normalizedQuery, userLocation);
    }

    semanticMatches = synonymMatches || [];
    matchSource = 'legacy_synonyms';
  }

  const ttMatches = await searchTodoTransporteMatches(normalizedQuery);
  const orderedIds = [...new Set((semanticMatches || []).map((item) => item.business_id).filter(Boolean))];

  if (orderedIds.length === 0) {
    return rankSearchResults(ttMatches, normalizedQuery, userLocation);
  }

  const { data: businesses, error } = await supabase
    .from("businesses")
    .select("*")
    .in("id", orderedIds)
    .eq("status", "approved")
    .eq("is_visible", true);

  if (error) {
    console.warn("Semantic search business lookup failed:", error.message);
    return rankSearchResults(ttMatches, normalizedQuery, userLocation);
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

  if (ttMatches.length === 0) return rankSearchResults(nativeResults, normalizedQuery, userLocation);

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

  return rankSearchResults(merged, normalizedQuery, userLocation);
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
