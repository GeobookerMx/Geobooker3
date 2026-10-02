-- Migration: seed 20 Mexico pilot prospects and safe CSV import helpers.
--
-- CSV/open-data records are research prospects by default. They are not eligible
-- for WhatsApp marketing until a real phone number and evidenced opt-in exist.

CREATE OR REPLACE FUNCTION crm.normalize_lead_name(p_value TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT lower(regexp_replace(btrim(COALESCE(p_value, '')), '\s+', ' ', 'g'));
$$;

DO $$
DECLARE
  v_model_id UUID;
BEGIN
  SELECT id INTO v_model_id
  FROM crm.score_models
  WHERE model_key = 'default_lead_score'
  LIMIT 1;

  IF v_model_id IS NULL THEN
    INSERT INTO crm.score_models (
      model_key, version, entity_type, display_name, rules, is_active, activated_at
    ) VALUES (
      'default_lead_score',
      1,
      'contact',
      'Default Lead Scoring Model',
      '{"weights": {"tier_aaa": 90, "tier_aa": 75}}'::jsonb,
      TRUE,
      now()
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION crm.import_lead_prospect(
  p_account_name TEXT,
  p_contact_name TEXT,
  p_job_title TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone_e164 TEXT DEFAULT NULL,
  p_industry TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_source_tier TEXT DEFAULT 'AAA',
  p_country_code TEXT DEFAULT 'MX',
  p_score NUMERIC DEFAULT 85,
  p_source_ref TEXT DEFAULT 'CSV_IMPORT'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  v_account_id UUID;
  v_contact_id UUID;
  v_model_id UUID;
  v_normalized_account TEXT := crm.normalize_lead_name(p_account_name);
  v_normalized_contact TEXT := crm.normalize_lead_name(p_contact_name);
  v_normalized_phone TEXT;
  v_normalized_email TEXT := lower(NULLIF(btrim(COALESCE(p_email, '')), ''));
BEGIN
  IF NULLIF(v_normalized_account, '') IS NULL THEN
    RAISE EXCEPTION 'account_name_required' USING ERRCODE = '22023';
  END IF;

  IF p_source_tier IS NOT NULL AND p_source_tier NOT IN ('AAA', 'AA', 'A', 'B') THEN
    RAISE EXCEPTION 'invalid_source_tier' USING ERRCODE = '22023';
  END IF;

  IF p_country_code IS NOT NULL AND upper(p_country_code) !~ '^[A-Z]{2}$' THEN
    RAISE EXCEPTION 'invalid_country_code' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_account_id
  FROM crm.accounts
  WHERE normalized_name = v_normalized_account
    AND COALESCE(country_code, '') = COALESCE(upper(p_country_code), '')
  LIMIT 1;

  IF v_account_id IS NULL THEN
    INSERT INTO crm.accounts (
      display_name,
      normalized_name,
      industry,
      source_tier,
      country_code,
      city,
      city_raw,
      account_status,
      source_metadata
    ) VALUES (
      btrim(p_account_name),
      v_normalized_account,
      NULLIF(btrim(COALESCE(p_industry, '')), ''),
      p_source_tier,
      upper(p_country_code),
      NULLIF(btrim(COALESCE(p_city, '')), ''),
      NULLIF(btrim(COALESCE(p_city, '')), ''),
      'active',
      jsonb_build_object('source', 'csv_or_open_data_import', 'source_ref', p_source_ref, 'imported_at', now())
    )
    RETURNING id INTO v_account_id;
  END IF;

  SELECT c.id INTO v_contact_id
  FROM crm.contacts c
  JOIN crm.account_contacts ac ON ac.contact_id = c.id
  WHERE ac.account_id = v_account_id
    AND COALESCE(c.normalized_name, crm.normalize_lead_name(c.full_name)) = v_normalized_contact
  LIMIT 1;

  IF v_contact_id IS NULL THEN
    INSERT INTO crm.contacts (
      full_name,
      normalized_name,
      job_title,
      country_code,
      language_code,
      contact_status,
      source_metadata
    ) VALUES (
      NULLIF(btrim(COALESCE(p_contact_name, '')), ''),
      NULLIF(v_normalized_contact, ''),
      NULLIF(btrim(COALESCE(p_job_title, '')), ''),
      upper(p_country_code),
      CASE WHEN upper(p_country_code) = 'MX' THEN 'es_mx' ELSE NULL END,
      'active',
      jsonb_build_object('source', 'csv_or_open_data_import', 'source_ref', p_source_ref, 'imported_at', now())
    )
    RETURNING id INTO v_contact_id;

    INSERT INTO crm.account_contacts (account_id, contact_id, relationship_type, is_primary)
    VALUES (v_account_id, v_contact_id, 'employee', TRUE)
    ON CONFLICT DO NOTHING;
  END IF;

  IF v_normalized_email IS NOT NULL THEN
    INSERT INTO crm.contact_points (
      contact_id,
      point_type,
      raw_value,
      normalized_value,
      country_code,
      validation_status,
      is_primary,
      source_metadata
    ) VALUES (
      v_contact_id,
      'email',
      p_email,
      v_normalized_email,
      upper(p_country_code),
      'unverified',
      FALSE,
      jsonb_build_object('source', 'csv_or_open_data_import', 'source_ref', p_source_ref)
    )
    ON CONFLICT (contact_id, account_id, point_type, normalized_value) DO NOTHING;
  END IF;

  IF NULLIF(btrim(COALESCE(p_phone_e164, '')), '') IS NOT NULL THEN
    v_normalized_phone := regexp_replace(p_phone_e164, '[^\+0-9]', '', 'g');
    IF v_normalized_phone NOT LIKE '+%' THEN
      v_normalized_phone := '+' || v_normalized_phone;
    END IF;

    INSERT INTO crm.contact_points (
      contact_id,
      point_type,
      raw_value,
      normalized_value,
      country_code,
      normalization_confidence,
      validation_status,
      is_primary,
      source_metadata
    ) VALUES (
      v_contact_id,
      'whatsapp',
      p_phone_e164,
      v_normalized_phone,
      upper(p_country_code),
      'medium',
      'unverified',
      TRUE,
      jsonb_build_object('source', 'csv_or_open_data_import', 'source_ref', p_source_ref)
    )
    ON CONFLICT (contact_id, account_id, point_type, normalized_value) DO NOTHING;
  END IF;

  SELECT id INTO v_model_id
  FROM crm.score_models
  WHERE model_key = 'default_lead_score' AND is_active
  LIMIT 1;

  IF v_model_id IS NOT NULL THEN
    INSERT INTO crm.score_snapshots (
      score_model_id,
      contact_id,
      score,
      factors,
      source
    ) VALUES (
      v_model_id,
      v_contact_id,
      LEAST(GREATEST(COALESCE(p_score, 0), 0), 100),
      jsonb_build_object('tier', p_source_tier, 'source_ref', p_source_ref, 'consent_state', 'not_requested'),
      'imported'
    );
  END IF;

  INSERT INTO crm.channel_permissions (
    contact_id,
    channel,
    purpose,
    status,
    legal_basis,
    jurisdiction,
    consent_source,
    source_metadata
  ) VALUES (
    v_contact_id,
    'whatsapp',
    'marketing',
    'unknown',
    NULL,
    upper(p_country_code),
    'csv_or_open_data_research',
    jsonb_build_object('source_ref', p_source_ref, 'eligible_for_campaign', false)
  )
  ON CONFLICT (contact_id, channel, purpose) DO NOTHING;

  RETURN v_contact_id;
END;
$$;

CREATE OR REPLACE FUNCTION crm.import_lead_with_whatsapp_consent(
  p_account_name TEXT,
  p_contact_name TEXT,
  p_job_title TEXT,
  p_phone_e164 TEXT,
  p_email TEXT,
  p_industry TEXT,
  p_city TEXT,
  p_source_tier TEXT DEFAULT 'AAA',
  p_country_code TEXT DEFAULT 'MX',
  p_score NUMERIC DEFAULT 85,
  p_consent_ref TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public, crm
AS $$
DECLARE
  v_contact_id UUID;
  v_permission_id UUID;
  v_normalized_phone TEXT;
BEGIN
  IF NULLIF(btrim(COALESCE(p_phone_e164, '')), '') IS NULL THEN
    RAISE EXCEPTION 'verified_phone_required' USING ERRCODE = '22023';
  END IF;

  IF NULLIF(btrim(COALESCE(p_consent_ref, '')), '') IS NULL THEN
    RAISE EXCEPTION 'consent_evidence_reference_required' USING ERRCODE = '22023';
  END IF;

  IF upper(COALESCE(p_consent_ref, '')) LIKE 'CSV_%'
     OR upper(COALESCE(p_consent_ref, '')) LIKE 'OPEN_DATA_%' THEN
    RAISE EXCEPTION 'csv_or_open_data_is_not_consent' USING ERRCODE = '22023';
  END IF;

  v_normalized_phone := regexp_replace(p_phone_e164, '[^\+0-9]', '', 'g');
  IF v_normalized_phone NOT LIKE '+%' THEN
    v_normalized_phone := '+' || v_normalized_phone;
  END IF;

  IF v_normalized_phone !~ '^\+[1-9][0-9]{7,14}$' THEN
    RAISE EXCEPTION 'invalid_e164_phone' USING ERRCODE = '22023';
  END IF;

  v_contact_id := crm.import_lead_prospect(
    p_account_name,
    p_contact_name,
    p_job_title,
    p_email,
    v_normalized_phone,
    p_industry,
    p_city,
    p_source_tier,
    p_country_code,
    p_score,
    p_consent_ref
  );

  INSERT INTO crm.channel_permissions (
    contact_id,
    channel,
    purpose,
    status,
    legal_basis,
    jurisdiction,
    consent_source,
    consent_text_version,
    consented_at,
    source_metadata
  ) VALUES (
    v_contact_id,
    'whatsapp',
    'marketing',
    'opted_in',
    'consent',
    upper(p_country_code),
    'verified_opt_in',
    'v1.0',
    now(),
    jsonb_build_object('consent_ref', p_consent_ref)
  )
  ON CONFLICT (contact_id, channel, purpose) DO UPDATE
  SET status = 'opted_in',
      legal_basis = 'consent',
      consent_source = 'verified_opt_in',
      consent_text_version = 'v1.0',
      consented_at = now(),
      opted_out_at = NULL,
      source_metadata = crm.channel_permissions.source_metadata || EXCLUDED.source_metadata,
      updated_at = now()
  RETURNING id INTO v_permission_id;

  INSERT INTO crm.consent_evidence (
    channel_permission_id,
    contact_id,
    channel,
    purpose,
    evidence_type,
    evidence_reference,
    consent_text_version,
    captured_at,
    captured_country_code,
    source_metadata
  ) VALUES (
    v_permission_id,
    v_contact_id,
    'whatsapp',
    'marketing',
    'manual_verified',
    p_consent_ref,
    'v1.0',
    now(),
    upper(p_country_code),
    jsonb_build_object('verified_batch', p_consent_ref, 'created_at', now())
  )
  ON CONFLICT DO NOTHING;

  RETURN v_contact_id;
END;
$$;

DO $$
BEGIN
  PERFORM crm.import_lead_prospect('AUTOMOTORES AMERICAS, S.A. DE C.V.', 'Sr. Jorge Antonio Chidan Charur', 'Director General', '1324rcvwv1@vw-concesionarios.com.mx', NULL, 'Empresa comercial', 'Guadalajara, Jal.', 'AAA', 'MX', 95, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('AEROLINEAS EJECUTIVAS, S.A. DE C.V.', 'Lic. Alejandro Alonso Olivares', 'CEO', 'a.alonso@aerolineasejecutivas.com', NULL, 'Empresa de servicio', 'Toluca, Mex.', 'AAA', 'MX', 95, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('ELICAMEX, S.A. DE C.V.', 'Ing. Arturo Faccineto', 'Director de Sistemas', 'a.faccineto@elica.com', NULL, 'Industria metalmecanica', 'Santa Rosa de Jauregui, Qro.', 'AAA', 'MX', 90, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('MEXICANA DE LUBRICANTES, S.A. DE C.V.', 'Lic. Joel Corona Coronado', 'Director General', 'a.fernandez@akron.com.mx', NULL, 'Industria quimica', 'Guadalajara, Jal.', 'AAA', 'MX', 92, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('LASTUR, S.A. DE C.V.', 'Lic. Arturo Garcia', 'Director General', 'a.garcia@lastur.com.mx', NULL, 'Industria alimentaria', 'Mexico, CDMX', 'AAA', 'MX', 94, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('AGENCIAS MERCANTILES, S.A. DE C.V.', 'Lic. Rodrigo Lopez Ruiz', 'Director General', 'a.hernandez@bepensamotriz.com.mx', NULL, 'Empresa comercial', 'Merida, Yuc.', 'AAA', 'MX', 90, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('SUNTAK PROJECT MANAGEMENT, S.A. DE C.V.', 'Ing. Armando Hernandez Alvizu', 'Director de Construccion', 'a.hernandez@suntak.com.mx', NULL, 'Constructora', 'Monterrey, N.L.', 'AAA', 'MX', 91, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('BANCO INMOBILIARIO MEXICANO, S.A.', 'Lic. Angelica Roa', 'Director de Administracion', 'a.roa@bim.mx', NULL, 'Banco o aseguradora', 'Mexico, CDMX', 'AAA', 'MX', 96, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('CITELIS, S.A. DE C.V.', 'Lic. Alejandro Ulloa', 'Director de Finanzas', 'a.ulloa@citelis.com', NULL, 'Empresa de servicio', 'Morelia, Mich.', 'AAA', 'MX', 88, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('MAREL DE MEXICO, S.A. DE C.V.', 'Lic. Alberto Adissi Cohen', 'Director General', 'aadissi@marel.com.mx', NULL, 'Industria textil', 'Mexico, CDMX', 'AAA', 'MX', 93, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('IMPORTADORA Y MANUFACTURERA BRULUART, S.A.', 'C.P. Andres Guillermo Aguirre Diaz', 'Director General', 'aaguirre@imbruluart.com', NULL, 'Industria quimica', 'Tultitlan, Mex.', 'AAA', 'MX', 89, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('INDELPRO, S.A. DE C.V.', 'Ing. Alejandro Alanis', 'Director Comercial', 'aalanis@indelpro.com', NULL, 'Industria quimica', 'San Pedro Garza Garcia, N.L.', 'AAA', 'MX', 92, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('REGIOMONTANA DE CONSTRUCCION Y SERVICIOS', 'Ing. Andres Alanis Pena', 'Director General', 'aalanis@recsa.biz', NULL, 'Constructora', 'Mexico, CDMX', 'AAA', 'MX', 94, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('CONSTRUCTORA GARZA PONCE, S.A. DE C.V.', 'Arq. Adthzimba Almanza', 'Director de Compras', 'aalmanza@ggp.com.mx', NULL, 'Constructora', 'Monterrey, N.L.', 'AAA', 'MX', 91, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('NATURE SWEET INVERNADEROS, S. DE R.L.', 'Lic. Adrian Almeida Sosa', 'Vicepresidente de Manufactura', 'aalmeida@naturesweet.com.mx', NULL, 'Industria alimentaria', 'Guadalajara, Jal.', 'AAA', 'MX', 90, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('ENSENANZA E INVESTIGACION SUPERIOR, A.C.', 'Ing. Alfredo Altamirano', 'Director de Ventas', 'aaltamir@itesm.mx', NULL, 'Empresa de servicio', 'Monterrey, N.L.', 'AAA', 'MX', 88, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('PLAMI, S.A. DE C.V.', 'Ing. Javier Miguel Checa', 'Director General', 'aalvarado@plami.com.mx', NULL, 'Industria', 'Naucalpan, Mex.', 'AAA', 'MX', 90, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('ACEROS ANGLO, S.A. DE C.V.', 'Ing. Angel Alvarez Carril', 'Director de Operaciones', 'aalvarez@palmexico.com.mx', NULL, 'Industria siderurgica', 'Mexico, CDMX', 'AAA', 'MX', 93, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('TOSHIBA DE MEXICO, S.A. DE C.V.', 'Srita. Alejandra Alvarez', 'Director de Logistica', 'aalvarez@toshiba.com.mx', NULL, 'Empresa comercial', 'Mexico, CDMX', 'AAA', 'MX', 95, 'CSV_TIER_AAA_MX_2026');
  PERFORM crm.import_lead_prospect('ROTOPLAS, S.A.B. DE C.V.', 'Ing. Alfonso Alva Suarez', 'Director de Cadena de Suministro', 'aalvas@rotoplas.com.mx', NULL, 'Industria', 'Mexico, CDMX', 'AAA', 'MX', 96, 'CSV_TIER_AAA_MX_2026');
END $$;
