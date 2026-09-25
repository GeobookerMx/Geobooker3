import { createClient } from 'npm:@supabase/supabase-js@2.83.0';

const DEFAULT_ORIGINS = new Set([
  'https://www.geobooker.com.mx',
  'https://geobooker.com.mx',
  'http://localhost:5173'
]);

const BUSINESS_TYPE_ALIASES: Record<string, string> = {
  cafeteria: 'cafe',
  coffee: 'cafe',
  cafe: 'cafe',
  restaurante: 'restaurant',
  restaurant: 'restaurant',
  comida: 'restaurant',
  gimnasio: 'gym',
  gimnasios: 'gym',
  gym: 'gym',
  fitness: 'gym',
  farmacia: 'pharmacy',
  pharmacy: 'pharmacy',
  autolavado: 'car_wash',
  carwash: 'car_wash',
  car_wash: 'car_wash',
  retail: 'local_retail',
  tienda: 'local_retail',
  comercio: 'local_retail'
};

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing server configuration: ${name}`);
  return value;
}

function corsHeaders(origin: string | null) {
  const allowed = origin || '*';
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin'
  };
}

function response(status: number, body: Record<string, unknown>, cors: Record<string, string> | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...(cors || {})
    }
  });
}

function safeDetail(value: unknown) {
  if (!value) return null;
  return String(value)
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, 'Bearer [redacted]')
    .slice(0, 500);
}

function normalizeBusinessType(value: unknown) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9_ -]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 80);
  return BUSINESS_TYPE_ALIASES[normalized] || normalized;
}

function normalizeCountry(value: unknown) {
  const country = String(value || 'MX').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
  return /^[A-Z]{2}$/.test(country) ? country : 'MX';
}

function boundedNumber(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

function extractWeights(profile: Record<string, unknown> | null) {
  const weights = (profile?.weights && typeof profile.weights === 'object')
    ? profile.weights as Record<string, unknown>
    : {};
  return {
    demand_potential: Number(weights.demand_potential || 0),
    competition: Number(weights.competition || 0),
    complementarity: Number(weights.complementarity || 0),
    accessibility: Number(weights.accessibility || 0),
    commercial_centrality: Number(weights.commercial_centrality || 0),
    data_quality: Number(weights.data_quality || 0)
  };
}

function plannedFactors(profile: Record<string, unknown> | null) {
  const weights = extractWeights(profile);
  return Object.entries(weights).map(([key, weight]) => ({
    key,
    configured_weight: weight,
    status: 'pending_data_ingestion',
    explanation: {
      demand_potential: 'Requires aggregated population/demand context for the selected trade area.',
      competition: 'Requires nearby businesses by mapped category and distance bands.',
      complementarity: 'Requires compatible nearby categories and source provenance.',
      accessibility: 'Requires road/walkability/access context from approved geographic sources.',
      commercial_centrality: 'Requires density and centrality metrics calibrated per city.',
      data_quality: 'Requires coverage, freshness, source agreement and sample sufficiency.'
    }[key] || 'Requires approved source data.'
  }));
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function getAdminUser(admin: ReturnType<typeof createClient>, token: string) {
  const { data: authData, error: authError } = await admin.auth.getUser(token);
  if (authError || !authData.user) return { user: null, adminUser: null, error: 'invalid_session' };
  const { data: adminUser } = await admin
    .from('admin_users')
    .select('id,role')
    .eq('id', authData.user.id)
    .maybeSingle();
  return { user: authData.user, adminUser: adminUser || { id: authData.user.id, role: 'authenticated' }, error: null };
}

async function getStatus(admin: ReturnType<typeof createClient>) {
  const [flagsResult, sourcesResult, profilesResult, analysesResult] = await Promise.all([
    admin.from('location_intelligence_feature_flags')
      .select('feature_key,enabled,kill_switch,change_reason,updated_at')
      .order('feature_key'),
    admin.from('geo_source_registry')
      .select('source_key,dataset_key,dataset_version,country_code,status,commercial_use_allowed,updated_at')
      .order('source_key')
      .order('dataset_key'),
    admin.from('location_score_profiles')
      .select('business_type_key,country_code,model_version,is_active,minimum_confidence,updated_at')
      .order('country_code')
      .order('business_type_key'),
    admin.from('location_analyses')
      .select('id', { count: 'exact', head: true })
  ]);

  for (const result of [flagsResult, sourcesResult, profilesResult, analysesResult]) {
    if (result.error) throw result.error;
  }

  const flags = flagsResult.data || [];
  const enabled = flags.some((flag: any) => flag.feature_key === 'LOCATION_INTELLIGENCE_ENABLED' && flag.enabled && !flag.kill_switch);
  const mxEnabled = flags.some((flag: any) => flag.feature_key === 'LOCATION_INTELLIGENCE_MX_ENABLED' && flag.enabled && !flag.kill_switch);

  return {
    mode: enabled ? 'enabled' : 'disabled_fail_closed',
    mxMode: mxEnabled ? 'enabled' : 'disabled_fail_closed',
    flags,
    sourceCounts: {
      total: sourcesResult.data?.length || 0,
      active: (sourcesResult.data || []).filter((source: any) => source.status === 'active').length,
      draft: (sourcesResult.data || []).filter((source: any) => source.status === 'draft').length
    },
    profileCounts: {
      total: profilesResult.data?.length || 0,
      active: (profilesResult.data || []).filter((profile: any) => profile.is_active).length,
      draft: (profilesResult.data || []).filter((profile: any) => !profile.is_active).length
    },
    analysesCount: analysesResult.count || 0,
    sources: sourcesResult.data || [],
    profiles: profilesResult.data || []
  };
}

async function getProfile(admin: ReturnType<typeof createClient>, businessTypeKey: string, countryCode: string) {
  const activeResult = await admin.from('location_score_profiles')
    .select('id,business_type_key,country_code,model_version,weights,normalization_config,minimum_confidence,is_active,updated_at')
    .eq('business_type_key', businessTypeKey)
    .eq('country_code', countryCode)
    .eq('is_active', true)
    .maybeSingle();
  if (activeResult.error) throw activeResult.error;
  if (activeResult.data) return { profile: activeResult.data, profileStatus: 'active' };

  const draftResult = await admin.from('location_score_profiles')
    .select('id,business_type_key,country_code,model_version,weights,normalization_config,minimum_confidence,is_active,updated_at')
    .eq('business_type_key', businessTypeKey)
    .eq('country_code', countryCode)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (draftResult.error) throw draftResult.error;
  return { profile: draftResult.data || null, profileStatus: draftResult.data ? 'draft_inactive' : 'missing' };
}

Deno.serve(async (request: Request) => {
  const origin = request.headers.get('origin');
  const cors = corsHeaders(origin);
  if (origin && !cors) return response(403, { error: 'origin_not_allowed' }, null);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors || {} });
  if (request.method !== 'POST') return response(405, { error: 'method_not_allowed' }, cors);

  try {
    const authorization = request.headers.get('authorization') || '';
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return response(401, { error: 'authentication_required' }, cors);

    const admin = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { user, adminUser, error: authError } = await getAdminUser(admin, token);
    if (authError === 'invalid_session') return response(401, { error: 'invalid_session' }, cors);
    if (authError || !user || !adminUser) return response(403, { error: 'admin_required' }, cors);

    const body = await request.json().catch(() => ({}));
    const action = String(body.action || 'status');

    if (action === 'status') {
      return response(200, {
        status: await getStatus(admin),
        checkedAt: new Date().toISOString()
      }, cors);
    }

    if (action === 'model_preview') {
      const countryCode = normalizeCountry(body.countryCode);
      const businessTypeKey = normalizeBusinessType(body.businessTypeKey || body.businessType || body.category);
      const lat = boundedNumber(body.lat ?? body.latitude, -90, 90);
      const lng = boundedNumber(body.lng ?? body.longitude, -180, 180);
      if (!businessTypeKey) return response(400, { error: 'business_type_required' }, cors);
      if (lat === null || lng === null) return response(400, { error: 'valid_coordinates_required' }, cors);

      const { profile, profileStatus } = await getProfile(admin, businessTypeKey, countryCode);
      return response(200, {
        mode: 'preview_no_write',
        countryCode,
        businessTypeKey,
        locationAccepted: true,
        profileStatus,
        modelVersion: profile?.model_version || null,
        minimumConfidence: profile?.minimum_confidence || null,
        factors: plannedFactors(profile),
        warnings: [
          'GeoScore is not active for production decisions.',
          'This preview does not create an analysis and does not produce a commercial recommendation.',
          'External datasets must be ingested, licensed and QA-approved before real scoring.'
        ],
        checkedAt: new Date().toISOString()
      }, cors);
    }

    if (action === 'business_metrics_preview') {
      const countryCode = normalizeCountry(body.countryCode);
      const businessTypeKey = normalizeBusinessType(body.businessTypeKey || body.businessType || body.category);
      const lat = boundedNumber(body.lat ?? body.latitude, -90, 90);
      const lng = boundedNumber(body.lng ?? body.longitude, -180, 180);
      const radiusMeters = boundedNumber(body.radiusMeters ?? body.radius_meters, 100, 10000) || 1000;
      if (!businessTypeKey) return response(400, { error: 'business_type_required' }, cors);
      if (lat === null || lng === null) return response(400, { error: 'valid_coordinates_required' }, cors);

      const { data, error } = await admin.rpc('geoscore_geobooker_business_metrics_preview', {
        p_lat: lat,
        p_lng: lng,
        p_country_code: countryCode,
        p_business_type_key: businessTypeKey,
        p_radius_meters: radiusMeters
      });
      if (error) throw error;

      return response(200, {
        metrics: data,
        checkedAt: new Date().toISOString()
      }, cors);
    }

    if (action === 'source_coverage_preview') {
      const countryCode = body.countryCode ? normalizeCountry(body.countryCode) : null;
      const category = body.category || body.businessTypeKey || body.businessType || null;
      const city = body.city ? String(body.city).trim().slice(0, 120) : null;
      const limit = boundedNumber(body.limit, 1, 100) || 20;

      const { data, error } = await admin.rpc('geoscore_source_coverage_preview', {
        p_country_code: countryCode,
        p_city: city,
        p_category: category,
        p_limit: limit
      });
      if (error) throw error;

      return response(200, {
        coverage: data,
        checkedAt: new Date().toISOString()
      }, cors);
    }

    if (action === 'calculate_score' || action === 'score_preview') {
      const businessTypeKey = normalizeBusinessType(body.businessTypeKey || body.businessType || body.category) || 'restaurant';
      const lat = boundedNumber(body.lat ?? body.latitude, -90, 90);
      const lng = boundedNumber(body.lng ?? body.longitude, -180, 180);
      const countryCode = normalizeCountry(body.countryCode) || 'MX';
      const radiusMeters = boundedNumber(body.radiusMeters, 100, 5000) || 1000;

      if (lat === null || lng === null) {
        return response(400, { error: 'valid_coordinates_required' }, cors);
      }

      const { data, error } = await admin.rpc('geoscore_calculate_location_score', {
        p_business_type_key: businessTypeKey,
        p_lat: lat,
        p_lng: lng,
        p_country_code: countryCode,
        p_radius_meters: Math.round(radiusMeters),
        p_save_analysis: false
      });

      if (error) throw error;

      return response(200, {
        scoreResult: data,
        calculatedAt: new Date().toISOString()
      }, cors);
    }

    if (action === 'analyze') {
      const status = await getStatus(admin);
      const countryCode = normalizeCountry(body.countryCode);
      const countryFlagOk = countryCode === 'MX' ? status.mxMode === 'enabled' : false;
      if (status.mode !== 'enabled' || !countryFlagOk) {
        return response(423, {
          error: 'location_intelligence_disabled_fail_closed',
          message: 'GeoScore analysis is disabled by server-side feature flags.',
          requiredFlags: countryCode === 'MX'
            ? ['LOCATION_INTELLIGENCE_ENABLED', 'LOCATION_INTELLIGENCE_MX_ENABLED']
            : ['LOCATION_INTELLIGENCE_ENABLED'],
          currentMode: status.mode,
          currentCountryMode: countryCode === 'MX' ? status.mxMode : 'unsupported_country',
          sendingOrCampaignsAffected: false
        }, cors);
      }

      const businessTypeKey = normalizeBusinessType(body.businessTypeKey || body.businessType || body.category);
      const lat = boundedNumber(body.lat ?? body.latitude, -90, 90);
      const lng = boundedNumber(body.lng ?? body.longitude, -180, 180);
      if (!businessTypeKey) return response(400, { error: 'business_type_required' }, cors);
      if (lat === null || lng === null) return response(400, { error: 'valid_coordinates_required' }, cors);

      const { profile, profileStatus } = await getProfile(admin, businessTypeKey, countryCode);
      if (!profile || profileStatus !== 'active') {
        return response(409, {
          error: 'active_score_profile_required',
          businessTypeKey,
          countryCode,
          profileStatus
        }, cors);
      }

      const idempotencySource = `${user.id}|${businessTypeKey}|${countryCode}|${lat.toFixed(6)}|${lng.toFixed(6)}|${profile.model_version}`;
      const idempotencyKey = await sha256Hex(idempotencySource);
      const cacheKey = await sha256Hex(`${businessTypeKey}|${countryCode}|${lat.toFixed(4)}|${lng.toFixed(4)}|${profile.model_version}`);

      const { data, error } = await admin.from('location_analyses')
        .upsert({
          owner_user_id: user.id,
          business_type_key: businessTypeKey,
          country_code: countryCode,
          analysis_location: `POINT(${lng} ${lat})`,
          address_label: body.addressLabel ? String(body.addressLabel).slice(0, 240) : null,
          status: 'failed',
          idempotency_key: idempotencyKey,
          cache_key: cacheKey,
          score_model_version: profile.model_version,
          data_snapshot_version: 'no-dataset-snapshot',
          input_snapshot: {
            business_type_key: businessTypeKey,
            country_code: countryCode,
            address_label: body.addressLabel || null,
            requested_by: 'location-intelligence-edge-function',
            runtime_mode: 'fail_closed_engine_placeholder'
          },
          result_snapshot: {
            classification: 'insufficient_data',
            factors: plannedFactors(profile),
            warnings: [
              'Approved geographic datasets have not been ingested for this score profile.',
              'No GeoScore number was generated.'
            ]
          },
          failure_code: 'insufficient_data_sources',
          failure_detail: 'Engine shell is active, but data ingestion and scoring adapters are not approved yet.',
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString()
        }, { onConflict: 'owner_user_id,idempotency_key' })
        .select('id,status,business_type_key,country_code,score_model_version,data_snapshot_version,failure_code,created_at,updated_at')
        .single();
      if (error) throw error;

      return response(202, {
        analysis: data,
        scoreProduced: false,
        reason: 'insufficient_data_sources',
        nextRequiredPhase: 'data_ingestion_and_scoring_adapters'
      }, cors);
    }

    return response(400, { error: 'unsupported_action' }, cors);
  } catch (error) {
    return response(500, {
      error: 'location_intelligence_failed',
      message: safeDetail(error instanceof Error ? error.message : error)
    }, cors);
  }
});
