-- ============================================================================
-- GEOBOOKER SEO INTENT DICTIONARY EXPANSION
-- Expande alias, modismos, voice search e intenciones de alta conversion.
-- Ejecutar despues de business_knowledge_graph_phase1.sql y business_knowledge_graph_seed_core.sql
-- ============================================================================

with categories as (
  select id, slug from public.business_categories
), aliases(slug, alias, language, country, alias_type, weight, notes) as (
  values
    ('tire-service', 'reparar llanta', 'es', 'MX', 'problem', 94, 'Servicio solicitado'),
    ('tire-service', 'cambio de llanta', 'es', 'MX', 'problem', 95, 'Servicio solicitado'),
    ('tire-service', 'neumatico pinchado', 'es', 'ES', 'problem', 90, 'Variante internacional'),
    ('tire-service', '24 hour tire repair', 'en', 'US', 'voice_search', 97, 'Busqueda urgente'),

    ('locksmith', 'duplicado de llaves', 'es', 'MX', 'synonym', 94, 'Servicio comun'),
    ('locksmith', 'cambio de chapa', 'es', 'MX', 'problem', 93, 'Servicio comun'),
    ('locksmith', 'key copy', 'en', 'US', 'translation', 92, 'Servicio comun'),
    ('locksmith', 'emergency locksmith', 'en', 'US', 'emergency', 98, 'Busqueda urgente'),

    ('plumber', 'se rompio una tuberia', 'es', 'MX', 'problem', 95, 'Urgencia comun'),
    ('plumber', 'plumbing', 'en', 'US', 'translation', 90, 'Categoria amplia'),
    ('plumber', 'plumber near me', 'en', 'US', 'voice_search', 98, 'Busqueda por voz'),
    ('plumber', 'water leak', 'en', 'US', 'problem', 94, 'Problema frecuente'),
    ('plumber', 'clogged drain', 'en', 'US', 'problem', 92, 'Problema frecuente'),

    ('electrician', 'instalacion electrica', 'es', 'MX', 'synonym', 90, 'Servicio solicitado'),
    ('electrician', 'breaker', 'en', 'US', 'product', 85, 'Termino tecnico'),
    ('electrician', 'fuse', 'en', 'US', 'product', 82, 'Termino tecnico'),
    ('electrician', 'wiring', 'en', 'US', 'product', 88, 'Instalacion electrica'),

    ('mechanic', 'revision de motor', 'es', 'MX', 'problem', 90, 'Servicio solicitado'),
    ('mechanic', 'cambio de aceite', 'es', 'MX', 'product', 91, 'Servicio solicitado'),
    ('mechanic', 'mechanic', 'en', 'US', 'translation', 97, 'Canonico ingles'),
    ('mechanic', 'car service', 'en', 'US', 'synonym', 90, 'Busqueda comun'),

    ('tow-truck', 'towing', 'en', 'US', 'translation', 96, 'Servicio canonico'),
    ('tow-truck', 'arrastre', 'es', 'MX', 'synonym', 93, 'Servicio solicitado'),

    ('pharmacy', 'medicina cerca', 'es', 'MX', 'voice_search', 93, 'Busqueda por voz'),
    ('pharmacy', 'drugstore', 'en', 'US', 'translation', 90, 'Sinonimo ingles'),

    ('doctor', 'medico cerca', 'es', 'MX', 'voice_search', 93, 'Busqueda por voz'),
    ('doctor', 'consulta medica', 'es', 'MX', 'synonym', 92, 'Servicio solicitado'),
    ('doctor', 'doctor general', 'es', 'MX', 'profession', 90, 'Busqueda comun'),
    ('doctor', 'physician', 'en', 'US', 'translation', 94, 'Canonico ingles'),
    ('doctor', 'medical office', 'en', 'US', 'translation', 88, 'Variante comun'),
    ('doctor', 'urgent care', 'en', 'US', 'emergency', 92, 'Atencion inmediata'),

    ('dentist', 'me duele una muela', 'es', 'MX', 'problem', 96, 'Dolor dental'),
    ('dentist', 'limpieza dental', 'es', 'MX', 'product', 92, 'Servicio frecuente'),
    ('dentist', 'ortodoncia', 'es', 'MX', 'product', 90, 'Especialidad dental'),
    ('dentist', 'dental clinic', 'en', 'US', 'translation', 94, 'Canonico ingles'),
    ('dentist', 'toothache', 'en', 'US', 'problem', 95, 'Problema comun'),

    ('veterinarian', 'mi perro esta enfermo', 'es', 'MX', 'problem', 96, 'Urgencia mascota'),
    ('veterinarian', 'veterinaria cerca', 'es', 'MX', 'voice_search', 94, 'Busqueda comun'),
    ('veterinarian', 'vacunas mascotas', 'es', 'MX', 'product', 90, 'Servicio frecuente'),
    ('veterinarian', 'vet', 'en', 'US', 'translation', 92, 'Abreviacion comun'),
    ('veterinarian', 'animal hospital', 'en', 'US', 'translation', 92, 'Variante inglesa'),
    ('veterinarian', 'pet clinic', 'en', 'US', 'translation', 94, 'Canonico ingles'),

    ('restaurant', 'restaurante cercano', 'es', null, 'voice_search', 92, 'Busqueda por voz'),
    ('restaurant', 'food near me', 'en', 'US', 'voice_search', 97, 'Busqueda por voz'),
    ('restaurant', 'lunch', 'en', 'US', 'product', 85, 'Momento de consumo'),
    ('restaurant', 'dinner', 'en', 'US', 'product', 85, 'Momento de consumo'),

    ('coffee-shop', 'espresso', 'en', 'US', 'product', 86, 'Producto frecuente'),
    ('coffee-shop', 'desayunos', 'es', 'MX', 'product', 86, 'Momento de consumo'),
    ('coffee-shop', 'cowork cafe', 'en', null, 'regionalism', 82, 'Busqueda moderna'),

    ('barbershop', 'peluquero', 'es', null, 'profession', 84, 'Rol relacionado'),

    ('beauty-salon', 'maquillaje', 'es', null, 'product', 84, 'Servicio frecuente'),
    ('beauty-salon', 'cabello', 'es', null, 'product', 82, 'Servicio frecuente'),
    ('beauty-salon', 'beauty salon', 'en', 'US', 'translation', 94, 'Canonico ingles'),
    ('beauty-salon', 'hair salon', 'en', 'US', 'translation', 93, 'Subvertical habitual'),

    ('laundry', 'lavar ropa', 'es', null, 'problem', 86, 'Intencion directa'),
    ('laundry', 'laundry', 'en', 'US', 'translation', 90, 'Canonico ingles'),

    ('hardware-store', 'tornillos', 'es', null, 'product', 80, 'Producto buscado'),
    ('hardware-store', 'hardware store', 'en', 'US', 'translation', 95, 'Canonico ingles'),
    ('hardware-store', 'construction supplies', 'en', 'US', 'product', 82, 'Producto general'),

    ('pest-control', 'chinches', 'es', null, 'problem', 94, 'Plaga comun'),
    ('pest-control', 'ratas', 'es', null, 'problem', 94, 'Plaga comun'),
    ('pest-control', 'termitas', 'es', null, 'problem', 93, 'Plaga comun'),
    ('pest-control', 'exterminator', 'en', 'US', 'translation', 94, 'Canonico ingles'),
    ('pest-control', 'fumigator', 'en', 'US', 'translation', 90, 'Variante inglesa'),

    ('moving-service', 'transporte de muebles', 'es', null, 'synonym', 90, 'Intencion directa'),
    ('moving-service', 'moving service', 'en', 'US', 'translation', 95, 'Canonico ingles'),
    ('moving-service', 'relocation', 'en', 'US', 'translation', 85, 'Variante inglesa'),

    ('restaurant', 'comida rapida', 'es', null, 'regionalism', 82, 'Busqueda generica food'),
    ('restaurant', 'fast food', 'en', 'US', 'regionalism', 84, 'Busqueda generica food'),
    ('restaurant', 'delivery', 'en', 'US', 'product', 82, 'Modo de consumo'),
    ('restaurant', 'takeout', 'en', 'US', 'product', 82, 'Modo de consumo'),

    ('restaurant', 'taqueria', 'es', 'MX', 'regionalism', 89, 'Subvertical relevante food'),
    ('restaurant', 'tacos cerca', 'es', 'MX', 'voice_search', 88, 'Busqueda food local'),
    ('restaurant', 'mexican food', 'en', 'US', 'translation', 88, 'Subvertical relevante'),

    ('coffee-shop', 'coffee shop near me', 'en', 'US', 'voice_search', 98, 'Busqueda por voz')
), intents(slug, phrase, language, country, weight, intent_type) as (
  values
    ('tire-service', 'necesito una vulcanizadora', 'es', 'MX', 99, 'voice_search'),
    ('tire-service', 'tire repair near me', 'en', 'US', 99, 'voice_search'),
    ('locksmith', 'busco un cerrajero urgente', 'es', 'MX', 100, 'emergency'),
    ('locksmith', 'locksmith near me', 'en', 'US', 97, 'voice_search'),
    ('plumber', 'donde encuentro un plomero', 'es', 'MX', 98, 'voice_search'),
    ('plumber', 'plumber near me', 'en', 'US', 98, 'voice_search'),
    ('pharmacy', 'donde hay una farmacia abierta', 'es', 'MX', 100, 'voice_search'),
    ('pharmacy', 'pharmacy near me', 'en', 'US', 100, 'voice_search'),
    ('restaurant', 'comida cerca de mi', 'es', null, 98, 'voice_search'),
    ('restaurant', 'restaurants near me', 'en', 'US', 98, 'voice_search'),
    ('coffee-shop', 'coffee shop near me', 'en', 'US', 98, 'voice_search'),
    ('barbershop', 'barberia cerca de mi', 'es', null, 97, 'voice_search'),
    ('mechanic', 'taller mecanico cerca', 'es', 'MX', 96, 'voice_search'),
    ('restaurant', 'negocios cerca de mi', 'es', null, 84, 'discovery'),
    ('restaurant', 'servicios cerca de mi', 'es', null, 84, 'discovery'),
    ('restaurant', 'que hay cerca de mi', 'es', null, 83, 'discovery'),
    ('restaurant', 'businesses near me', 'en', 'US', 84, 'discovery'),
    ('restaurant', 'services near me', 'en', 'US', 84, 'discovery')
)
insert into public.business_category_aliases (
  category_id, alias, alias_normalized, language, country, alias_type, weight, notes
)
select
  bc.id,
  a.alias,
  public.gbk_normalize_text(a.alias),
  a.language,
  a.country,
  a.alias_type,
  a.weight,
  a.notes
from aliases a
join categories bc on bc.slug = a.slug
where not exists (
  select 1
  from public.business_category_aliases existing
  where existing.category_id = bc.id
    and existing.alias_normalized = public.gbk_normalize_text(a.alias)
    and coalesce(existing.language, '') = coalesce(a.language, '')
    and coalesce(existing.country, '') = coalesce(a.country, '')
);

insert into public.business_search_intents (
  category_id, intent_phrase, intent_normalized, language, country, weight, intent_type
)
select
  bc.id,
  i.phrase,
  public.gbk_normalize_text(i.phrase),
  i.language,
  i.country,
  i.weight,
  i.intent_type
from intents i
join categories bc on bc.slug = i.slug
where not exists (
  select 1
  from public.business_search_intents existing
  where existing.category_id = bc.id
    and existing.intent_normalized = public.gbk_normalize_text(i.phrase)
    and coalesce(existing.language, '') = coalesce(i.language, '')
    and coalesce(existing.country, '') = coalesce(i.country, '')
);

select
  'seo_intent_dictionary_expansion_applied' as status,
  (select count(*) from public.business_category_aliases) as total_aliases,
  (select count(*) from public.business_search_intents) as total_intents;
