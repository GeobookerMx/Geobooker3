-- ============================================================================
-- GEOBOOKER BUSINESS KNOWLEDGE GRAPH - CORE SEED
-- Semilla inicial de categorias, alias e intenciones de alta intencion.
-- Ejecutar despues de business_knowledge_graph_phase1.sql
-- ============================================================================

insert into public.business_categories (
  slug, name_es, name_en, description_es, description_en, schema_org_type, icon, sort_order, search_priority
)
values
  ('tire-service', 'Vulcanizadora', 'Tire Repair Shop', 'Reparacion de llantas, ponchaduras, talacha y servicio de neumaticos.', 'Flat tire repair, tire change, roadside tire assistance and tire shop services.', 'AutomotiveBusiness', 'wrench', 10, 100),
  ('locksmith', 'Cerrajeria', 'Locksmith', 'Apertura de puertas, duplicado de llaves y cambio de chapas.', 'Door opening, key duplication and lock replacement.', 'Locksmith', 'key-round', 20, 100),
  ('plumber', 'Plomeria', 'Plumber', 'Fugas de agua, tuberias, drenaje y servicios de plomeria.', 'Water leaks, pipes, drain cleaning and plumbing services.', 'Plumber', 'droplets', 30, 100),
  ('electrician', 'Electricista', 'Electrician', 'Instalaciones electricas, corto circuito y reparaciones de energia.', 'Electrical wiring, power failures and emergency electrician services.', 'Electrician', 'zap', 40, 100),
  ('mechanic', 'Taller mecanico', 'Auto Repair Shop', 'Mecanica general, motor, afinacion y servicio automotriz.', 'Auto repair, engine diagnostics, tune-ups and mechanic services.', 'AutoRepair', 'car', 50, 95),
  ('tow-truck', 'Grua', 'Tow Truck', 'Arrastre, auxilio vial y remolque vehicular.', 'Towing, roadside assistance and vehicle transport.', 'AutomotiveBusiness', 'truck', 60, 95),
  ('pharmacy', 'Farmacia', 'Pharmacy', 'Medicamentos, farmacia abierta y farmacia 24 horas.', 'Pharmacy, medicine, late night and 24 hour pharmacy services.', 'Pharmacy', 'pill', 70, 100),
  ('doctor', 'Doctor', 'Doctor', 'Consulta medica, medico general y atencion primaria.', 'General doctor, medical consultation and primary care.', 'MedicalBusiness', 'stethoscope', 80, 90),
  ('dentist', 'Dentista', 'Dentist', 'Clinica dental, dolor de muela y tratamientos dentales.', 'Dental clinic, toothache and dentist services.', 'Dentist', 'smile', 90, 90),
  ('veterinarian', 'Veterinaria', 'Veterinarian', 'Atencion para mascotas, vacunas y clinica veterinaria.', 'Pet clinic, vaccines and veterinary services.', 'VeterinaryCare', 'paw-print', 100, 90),
  ('restaurant', 'Restaurante', 'Restaurant', 'Restaurantes, comida cerca y lugares para comer.', 'Restaurants, places to eat and food nearby.', 'Restaurant', 'utensils-crossed', 110, 95),
  ('coffee-shop', 'Cafeteria', 'Coffee Shop', 'Cafe, brunch, desayunos y coffee shop.', 'Coffee, breakfast, brunch and specialty coffee shop.', 'CafeOrCoffeeShop', 'coffee', 120, 90),
  ('barbershop', 'Barberia', 'Barbershop', 'Corte de cabello, barber shop y fade.', 'Haircut, fade and barbershop services.', 'HairSalon', 'scissors', 130, 90),
  ('beauty-salon', 'Estetica', 'Beauty Salon', 'Salon de belleza, unas, maquillaje y cabello.', 'Beauty salon, nails, makeup and hair styling.', 'BeautySalon', 'sparkles', 140, 85),
  ('laundry', 'Lavanderia', 'Laundry', 'Lavado de ropa, tintoreria y lavanderia.', 'Laundry, laundromat and dry cleaning services.', 'Laundry', 'shirt', 150, 85),
  ('hardware-store', 'Ferreteria', 'Hardware Store', 'Herramientas, tlapaleria y materiales.', 'Hardware, tools and construction supplies.', 'HardwareStore', 'hammer', 160, 90),
  ('pest-control', 'Fumigacion', 'Pest Control', 'Control de plagas, cucarachas, ratas y termitas.', 'Pest control, exterminator and fumigation services.', 'HomeAndConstructionBusiness', 'bug', 170, 85),
  ('moving-service', 'Mudanza', 'Moving Service', 'Mudanzas, fletes y transporte de muebles.', 'Moving service, movers and relocation.', 'MovingCompany', 'package', 180, 85),
  ('auto-parts', 'Refaccionaria', 'Auto Parts Store', 'Autopartes, refacciones y repuestos.', 'Auto parts, spare parts and replacement components.', 'AutoPartsStore', 'cog', 190, 85),
  ('warehouse', 'Bodega', 'Warehouse', 'Bodega, almacen y espacios de almacenamiento.', 'Warehouse, storage and commercial storage space.', 'SelfStorage', 'warehouse', 200, 80)
on conflict (slug) do update
set
  name_es = excluded.name_es,
  name_en = excluded.name_en,
  description_es = excluded.description_es,
  description_en = excluded.description_en,
  schema_org_type = excluded.schema_org_type,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  search_priority = excluded.search_priority,
  updated_at = now();

with categories as (
  select id, slug from public.business_categories
), aliases(slug, alias, language, country, alias_type, weight, notes) as (
  values
    ('tire-service', 'vulcanizadora', 'es', 'MX', 'synonym', 100, 'Termino principal MX'),
    ('tire-service', 'talacha', 'es', 'MX', 'slang', 98, 'Modismo MX'),
    ('tire-service', 'vulca', 'es', 'MX', 'slang', 95, 'Abreviacion coloquial'),
    ('tire-service', 'ponchadura', 'es', 'MX', 'problem', 92, 'Problema frecuente'),
    ('tire-service', 'llanta ponchada', 'es', 'MX', 'problem', 96, 'Intencion fuerte'),
    ('tire-service', 'flat tire', 'en', 'US', 'problem', 96, 'Busqueda en ingles'),
    ('tire-service', 'tire repair', 'en', 'US', 'translation', 100, 'Busqueda canonica en ingles'),
    ('locksmith', 'cerrajero', 'es', 'MX', 'profession', 100, 'Profesion'),
    ('locksmith', 'abrir puerta', 'es', 'MX', 'problem', 95, 'Caso de uso'),
    ('locksmith', 'perdi mis llaves', 'es', 'MX', 'problem', 95, 'Caso de uso'),
    ('locksmith', 'locksmith', 'en', 'US', 'translation', 100, 'Canonico ingles'),
    ('locksmith', 'locked out', 'en', 'US', 'problem', 94, 'Intencion fuerte'),
    ('plumber', 'plomero', 'es', 'MX', 'profession', 100, 'Canonico MX'),
    ('plumber', 'fontanero', 'es', 'ES', 'regionalism', 96, 'Variante ES'),
    ('plumber', 'fuga de agua', 'es', 'MX', 'problem', 98, 'Urgencia comun'),
    ('plumber', 'destapar drenaje', 'es', 'MX', 'problem', 92, 'Servicio comun'),
    ('plumber', 'plumber', 'en', 'US', 'translation', 100, 'Canonico ingles'),
    ('electrician', 'electricista', 'es', 'MX', 'profession', 100, 'Canonico'),
    ('electrician', 'no tengo luz', 'es', 'MX', 'problem', 97, 'Urgencia comun'),
    ('electrician', 'corto circuito', 'es', 'MX', 'problem', 95, 'Urgencia comun'),
    ('electrician', 'electrician', 'en', 'US', 'translation', 100, 'Canonico ingles'),
    ('mechanic', 'mecanico', 'es', 'MX', 'profession', 100, 'Canonico'),
    ('mechanic', 'taller mecanico', 'es', 'MX', 'synonym', 98, 'Busqueda habitual'),
    ('mechanic', 'mi carro no prende', 'es', 'MX', 'problem', 95, 'Intencion fuerte'),
    ('mechanic', 'auto repair', 'en', 'US', 'translation', 96, 'Busqueda habitual'),
    ('tow-truck', 'grua', 'es', 'MX', 'profession', 100, 'Canonico'),
    ('tow-truck', 'auxilio vial', 'es', 'MX', 'synonym', 97, 'Servicio relacionado'),
    ('tow-truck', 'tow truck', 'en', 'US', 'translation', 100, 'Canonico ingles'),
    ('tow-truck', 'roadside assistance', 'en', 'US', 'problem', 94, 'Intencion fuerte'),
    ('pharmacy', 'farmacia', 'es', 'MX', 'synonym', 100, 'Canonico'),
    ('pharmacy', 'farmacia abierta', 'es', 'MX', 'voice_search', 99, 'Busqueda comun'),
    ('pharmacy', 'farmacia 24 horas', 'es', 'MX', 'voice_search', 99, 'Busqueda comun'),
    ('pharmacy', 'medicine', 'en', 'US', 'problem', 85, 'Intencion de compra'),
    ('pharmacy', 'pharmacy near me', 'en', 'US', 'voice_search', 99, 'Busqueda por voz'),
    ('restaurant', 'restaurante', 'es', null, 'synonym', 100, 'Canonico'),
    ('restaurant', 'comida cerca', 'es', null, 'voice_search', 97, 'Busqueda por voz'),
    ('restaurant', 'donde comer', 'es', null, 'voice_search', 96, 'Intencion fuerte'),
    ('restaurant', 'restaurant near me', 'en', 'US', 'voice_search', 99, 'Busqueda por voz'),
    ('coffee-shop', 'cafeteria', 'es', null, 'synonym', 100, 'Canonico'),
    ('coffee-shop', 'cafe cerca', 'es', null, 'voice_search', 96, 'Busqueda comun'),
    ('coffee-shop', 'coffee shop', 'en', 'US', 'translation', 100, 'Canonico ingles'),
    ('coffee-shop', 'brunch', 'en', null, 'product', 82, 'Intencion habitual'),
    ('barbershop', 'barberia', 'es', 'MX', 'synonym', 100, 'Canonico'),
    ('barbershop', 'corte de cabello', 'es', null, 'problem', 92, 'Intencion comun'),
    ('barbershop', 'fade', 'en', null, 'product', 88, 'Modismo del servicio'),
    ('barbershop', 'barbershop', 'en', 'US', 'translation', 100, 'Canonico ingles'),
    ('beauty-salon', 'estetica', 'es', 'MX', 'synonym', 100, 'Canonico MX'),
    ('beauty-salon', 'unas', 'es', null, 'product', 85, 'Intencion comun'),
    ('beauty-salon', 'nail salon', 'en', 'US', 'translation', 92, 'Subvertical frecuente'),
    ('laundry', 'lavanderia', 'es', null, 'synonym', 100, 'Canonico'),
    ('laundry', 'tintoreria', 'es', null, 'regionalism', 92, 'Servicio relacionado'),
    ('laundry', 'laundromat', 'en', 'US', 'translation', 100, 'Canonico ingles'),
    ('hardware-store', 'ferreteria', 'es', null, 'synonym', 100, 'Canonico'),
    ('hardware-store', 'tlapaleria', 'es', 'MX', 'regionalism', 98, 'Mexicanismo'),
    ('hardware-store', 'tools', 'en', 'US', 'product', 78, 'Intencion de producto'),
    ('pest-control', 'fumigacion', 'es', null, 'synonym', 100, 'Canonico'),
    ('pest-control', 'cucarachas', 'es', null, 'problem', 93, 'Plaga comun'),
    ('pest-control', 'pest control', 'en', 'US', 'translation', 100, 'Canonico ingles'),
    ('moving-service', 'mudanza', 'es', null, 'synonym', 100, 'Canonico'),
    ('moving-service', 'flete', 'es', 'MX', 'regionalism', 95, 'Uso regional MX'),
    ('moving-service', 'movers', 'en', 'US', 'translation', 100, 'Canonico ingles'),
    ('auto-parts', 'refaccionaria', 'es', 'MX', 'synonym', 100, 'Canonico MX'),
    ('auto-parts', 'autopartes', 'es', null, 'synonym', 94, 'Uso general'),
    ('auto-parts', 'auto parts', 'en', 'US', 'translation', 100, 'Canonico ingles'),
    ('warehouse', 'bodega', 'es', null, 'synonym', 100, 'Canonico'),
    ('warehouse', 'almacen', 'es', null, 'regionalism', 90, 'Sin acento frecuente'),
    ('warehouse', 'warehouse', 'en', 'US', 'translation', 100, 'Canonico ingles')
), intents(slug, phrase, language, country, weight, intent_type) as (
  values
    ('tire-service', 'se me poncho la llanta', 'es', 'MX', 100, 'need_state'),
    ('tire-service', 'necesito una vulcanizadora', 'es', 'MX', 98, 'voice_search'),
    ('tire-service', 'tire repair near me', 'en', 'US', 99, 'voice_search'),
    ('locksmith', 'quien me abre la puerta', 'es', 'MX', 98, 'need_state'),
    ('locksmith', 'busco un cerrajero urgente', 'es', 'MX', 100, 'emergency'),
    ('plumber', 'quien arregla una fuga', 'es', 'MX', 98, 'need_state'),
    ('plumber', 'donde encuentro un plomero', 'es', 'MX', 96, 'voice_search'),
    ('electrician', 'necesito un electrico', 'es', 'MX', 97, 'slang_like'),
    ('electrician', 'emergency electrician', 'en', 'US', 95, 'emergency'),
    ('mechanic', 'mi carro no prende', 'es', 'MX', 100, 'need_state'),
    ('tow-truck', 'mi carro se quedo', 'es', 'MX', 100, 'need_state'),
    ('pharmacy', 'donde hay una farmacia abierta', 'es', 'MX', 100, 'voice_search'),
    ('pharmacy', 'pharmacy near me', 'en', 'US', 100, 'voice_search'),
    ('restaurant', 'comida cerca de mi', 'es', null, 98, 'voice_search'),
    ('restaurant', 'restaurants near me', 'en', 'US', 98, 'voice_search'),
    ('coffee-shop', 'best coffee shop near me', 'en', 'US', 94, 'voice_search'),
    ('barbershop', 'barberia cerca de mi', 'es', null, 96, 'voice_search'),
    ('pest-control', 'tengo cucarachas en mi casa', 'es', null, 96, 'need_state'),
    ('moving-service', 'necesito una mudanza', 'es', null, 95, 'voice_search'),
    ('warehouse', 'busco una bodega', 'es', null, 92, 'voice_search')
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
on conflict do nothing;

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
on conflict do nothing;
