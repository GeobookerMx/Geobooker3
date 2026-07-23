const normalize = (value = '') =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const hasAny = (normalizedQuery, terms = []) =>
  terms.some((term) => normalizedQuery.includes(normalize(term)));

export const SEARCH_INTENT_RULES = [
  {
    id: 'fasteners_hardware',
    label: 'Tornilleria y ferreteria',
    confidence: 0.94,
    categoryHints: ['hardware-store', 'industrial-supplies', 'construction-supplies'],
    googleQuery: 'tornilleria ferreteria tlapaleria',
    fallbackQueries: ['ferreteria cerca', 'tornilleria cerca', 'tlapaleria cerca', 'refaccionaria industrial'],
    trustSignals: ['stock especializado', 'atencion por medidas', 'venta mostrador', 'mayoreo'],
    keywords: [
      'tornillo', 'tornillos', 'tuerca', 'tuercas', 'rondana', 'rondanas', 'arandela', 'pija', 'pijas', 'taquete',
      'taquetes', 'birlo', 'birlos', 'esparrago', 'esparragos', 'ancla', 'anclaje', 'cuerda', 'rosca', '3/8', '5/16',
      '1/2', 'milimetrico', 'grado 5', 'grado 8', 'allen', 'hexagonal', 'inoxidable', 'galvanizado', 'fastener',
      'fasteners', 'screw', 'screws', 'bolt', 'bolts', 'nut', 'nuts', 'washer', 'threaded rod'
    ]
  },
  {
    id: 'truck_parking_secure_yard',
    label: 'Patio logistico / pension de tractocamiones',
    confidence: 0.96,
    categoryHints: ['truck-parking-logistics', 'storage-spaces', 'transport-logistics'],
    googleQuery: 'patio logistico pension tractocamiones trailer parking',
    fallbackQueries: ['patio logistico cerca', 'pension para tractocamiones', 'truck parking secure yard', 'bodega storage carga pesada'],
    isLogistics: true,
    trustSignals: ['seguridad', 'acceso 24/7', 'resguardo', 'maniobras', 'carga pesada'],
    keywords: [
      'patio', 'pension', 'pension para tracto', 'pension para trailer', 'tracto', 'tractocamion', 'tractocamiones',
      'trailer', 'trailers', 'caja seca', 'full', 'mercancia', 'resguardo', 'custodia', 'estacionamiento de trailer',
      'estacionamiento para trailer', 'drop yard', 'truck yard', 'truck parking', 'secure yard', 'freight yard',
      'yard storage', 'parking for trucks'
    ]
  },
  {
    id: 'warehouse_storage',
    label: 'Bodega, storage y almacenaje',
    confidence: 0.9,
    categoryHints: ['storage-spaces', 'warehouse-storage', 'transport-logistics'],
    googleQuery: 'bodega storage almacen logistico',
    fallbackQueries: ['bodega cerca', 'warehouse storage near me', 'almacen logistico', 'mini bodegas'],
    isLogistics: true,
    trustSignals: ['ubicacion', 'capacidad', 'seguridad', 'maniobras'],
    keywords: ['bodega', 'bodegas', 'storage', 'warehouse', 'almacen', 'almacenaje', 'mini bodega', 'mini storage', 'renta de bodega']
  },
  {
    id: 'heavy_parts_service',
    label: 'Refacciones y taller pesado',
    confidence: 0.9,
    categoryHints: ['auto-parts-heavy', 'industrial-supplies', 'mechanic'],
    googleQuery: 'refaccionaria diesel taller pesado',
    fallbackQueries: ['refacciones diesel', 'refaccionaria tractocamion', 'taller pesado', 'truck parts'],
    isLogistics: true,
    trustSignals: ['especialidad diesel', 'partes disponibles', 'atencion a flotillas'],
    keywords: ['refaccionaria', 'refacciones', 'diesel', 'tractocamion', 'camion pesado', 'taller pesado', 'truck parts', 'diesel repair']
  },
  {
    id: 'construction_materials',
    label: 'Materiales de construccion',
    confidence: 0.88,
    categoryHints: ['construction-supplies', 'hardware-store'],
    googleQuery: 'materiales de construccion casa de materiales',
    fallbackQueries: ['cemento cerca', 'varilla cerca', 'casa de materiales', 'building supplies'],
    trustSignals: ['entrega local', 'mayoreo', 'stock de obra'],
    keywords: ['cemento', 'concreto', 'varilla', 'block', 'ladrillo', 'arena', 'grava', 'yeso', 'cal', 'rebar', 'cement', 'concrete']
  },
  {
    id: 'metal_supplies',
    label: 'Acero, metales y perfiles',
    confidence: 0.86,
    categoryHints: ['metal-supplies', 'industrial-supplies'],
    googleQuery: 'acero perfiles lamina metal supplier',
    fallbackQueries: ['acero cerca', 'perfiles de acero', 'lamina acero', 'steel supplier'],
    trustSignals: ['corte a medida', 'mayoreo', 'inventario industrial'],
    keywords: ['acero', 'lamina', 'placa', 'ptr', 'perfil', 'perfiles', 'tubo', 'solera', 'angulo', 'steel', 'sheet metal']
  },
  {
    id: 'restaurant_supplies',
    label: 'Insumos para restaurante',
    confidence: 0.86,
    categoryHints: ['food-suppliers', 'packaging-supplies'],
    googleQuery: 'insumos para restaurante proveedor alimentos mayoreo',
    fallbackQueries: ['restaurant supplies', 'proveedor de alimentos', 'abarrotes mayoreo', 'empaque para alimentos'],
    trustSignals: ['mayoreo', 'entrega programada', 'cobertura local'],
    keywords: ['insumos para restaurante', 'proveedor de alimentos', 'alimentos mayoreo', 'abarrotes mayoreo', 'restaurant supplies', 'food supplier']
  },

  {
    id: 'medical_supplies',
    label: 'Insumos medicos y equipo de salud',
    confidence: 0.88,
    categoryHints: ['medical-supplies', 'pharmacy', 'doctor'],
    googleQuery: 'insumos medicos equipo medico proveedor salud',
    fallbackQueries: ['insumos medicos cerca', 'equipo medico cerca', 'medical supplies near me', 'surgical supplies'],
    trustSignals: ['proveedor especializado', 'facturacion', 'stock validable', 'atencion profesional'],
    keywords: ['jeringa', 'jeringas', 'guantes nitrilo', 'guantes latex', 'cubrebocas', 'gasas', 'vendas', 'oximetro', 'baumanometro', 'silla de ruedas', 'material de curacion', 'equipo medico', 'insumos medicos', 'medical supplies', 'surgical supplies']
  },
  {
    id: 'beauty_supplies',
    label: 'Belleza, cosmeticos y servicios esteticos',
    confidence: 0.87,
    categoryHints: ['beauty-salon', 'beauty-supplies', 'nail-salon'],
    googleQuery: 'cosmeticos belleza salon makeup nails',
    fallbackQueries: ['cosmeticos cerca', 'maquillista cerca', 'nail supply', 'beauty supply store'],
    trustSignals: ['portafolio', 'citas', 'productos profesionales', 'resenas'],
    keywords: ['maquillista', 'maquillaje', 'base maquillaje', 'pestanas', 'unas acrilicas', 'gelish', 'tinte cabello', 'cosmeticos', 'beauty supply', 'makeup artist', 'nail supplies']
  },
  {
    id: 'office_print_supplies',
    label: 'Papeleria, oficina e impresion',
    confidence: 0.86,
    categoryHints: ['stationery-store', 'print-shop', 'office-supplies'],
    googleQuery: 'papeleria impresiones copias office supplies print shop',
    fallbackQueries: ['papeleria cerca', 'copias cerca', 'imprenta cerca', 'office supplies near me'],
    trustSignals: ['entrega rapida', 'impresion local', 'facturacion', 'mayoreo'],
    keywords: ['hojas carta', 'toner', 'cartucho', 'impresiones', 'copias', 'engargolado', 'papeleria', 'utiles oficina', 'office supplies', 'printing', 'copy center']
  },
  {
    id: 'pet_supplies_vet',
    label: 'Mascotas, alimento y veterinaria',
    confidence: 0.87,
    categoryHints: ['pet-supplies', 'veterinarian'],
    googleQuery: 'veterinaria alimento mascotas pet supplies',
    fallbackQueries: ['alimento para perro cerca', 'veterinaria cerca', 'pet supplies near me', 'animal hospital'],
    trustSignals: ['horario', 'urgencias', 'stock de alimento', 'servicio veterinario'],
    keywords: ['croquetas', 'alimento para perro', 'alimento para gato', 'arena para gato', 'vacunas mascotas', 'veterinaria', 'veterinario', 'pet food', 'pet supplies', 'animal hospital']
  },
  {
    id: 'auto_parts_general',
    label: 'Refacciones automotrices y autopartes',
    confidence: 0.88,
    categoryHints: ['auto-parts', 'mechanic', 'tire-service'],
    googleQuery: 'refaccionaria autopartes auto parts',
    fallbackQueries: ['refaccionaria cerca', 'autopartes cerca', 'auto parts near me', 'taller mecanico cerca'],
    trustSignals: ['compatibilidad', 'modelo del vehiculo', 'garantia', 'stock'],
    keywords: ['balatas', 'bujias', 'filtro de aceite', 'amortiguador', 'bateria auto', 'refaccionaria', 'autopartes', 'auto parts', 'brake pads', 'car battery']
  },
  {
    id: 'electronics_repair_parts',
    label: 'Electronica, celulares y reparacion',
    confidence: 0.86,
    categoryHints: ['electronics-repair', 'electronics-store'],
    googleQuery: 'reparacion celulares electronica accesorios',
    fallbackQueries: ['reparacion de celulares cerca', 'electronica cerca', 'phone repair near me', 'electronics store'],
    trustSignals: ['garantia', 'diagnostico', 'refacciones', 'tiempo de entrega'],
    keywords: ['pantalla iphone', 'display celular', 'cargador', 'cable usb', 'reparacion celular', 'electronica', 'componentes electronicos', 'phone repair', 'electronics repair']
  },
  {
    id: 'cleaning_janitorial_supplies',
    label: 'Limpieza, sanitizacion e insumos',
    confidence: 0.86,
    categoryHints: ['cleaning-service', 'cleaning-supplies', 'chemical-supplies'],
    googleQuery: 'productos de limpieza sanitizacion janitorial supplies',
    fallbackQueries: ['productos de limpieza cerca', 'limpieza industrial', 'janitorial supplies', 'cleaning service near me'],
    trustSignals: ['mayoreo', 'ficha tecnica', 'entrega local', 'servicio programado'],
    keywords: ['cloro', 'desinfectante', 'detergente industrial', 'sanitizante', 'limpieza profunda', 'limpieza industrial', 'janitorial supplies', 'cleaning chemicals']
  },
  {
    id: 'safety_ppe_supplies',
    label: 'Equipo de seguridad industrial',
    confidence: 0.87,
    categoryHints: ['safety-equipment', 'industrial-supplies'],
    googleQuery: 'equipo de seguridad industrial epp ppe',
    fallbackQueries: ['equipo de seguridad cerca', 'botas industriales', 'ppe supplier', 'industrial safety equipment'],
    trustSignals: ['normas', 'tallas', 'mayoreo', 'ficha tecnica'],
    keywords: ['casco seguridad', 'chaleco reflejante', 'botas industriales', 'guantes seguridad', 'lentes seguridad', 'arnes', 'epp', 'ppe', 'safety equipment']
  },
  {
    id: 'restaurant_equipment',
    label: 'Equipo e insumos para cocina/restaurante',
    confidence: 0.87,
    categoryHints: ['restaurant-equipment', 'food-suppliers', 'restaurant-supplies'],
    googleQuery: 'equipo para restaurante cocina industrial',
    fallbackQueries: ['equipo para restaurante cerca', 'cocina industrial', 'restaurant equipment', 'commercial kitchen supplies'],
    trustSignals: ['instalacion', 'garantia', 'mayoreo', 'servicio tecnico'],
    keywords: ['freidora industrial', 'refrigerador comercial', 'mesa acero inoxidable', 'campana cocina', 'equipo restaurante', 'cocina industrial', 'restaurant equipment', 'commercial kitchen']
  },
  {
    id: 'event_supplies_services',
    label: 'Eventos, mobiliario y produccion',
    confidence: 0.84,
    categoryHints: ['event-services', 'party-supplies'],
    googleQuery: 'renta mobiliario eventos sonido iluminacion',
    fallbackQueries: ['renta de mesas y sillas cerca', 'sonido para eventos', 'party rentals near me', 'event production'],
    trustSignals: ['disponibilidad por fecha', 'montaje', 'paquetes', 'cobertura'],
    keywords: ['renta mesas', 'renta sillas', 'carpa', 'inflables', 'sonido eventos', 'iluminacion eventos', 'mobiliario eventos', 'party rental', 'event production']
  },
  {
    id: 'agro_supplies',
    label: 'Agroinsumos y suministros rurales',
    confidence: 0.85,
    categoryHints: ['agro-supplies', 'hardware-store', 'chemical-supplies'],
    googleQuery: 'agroinsumos fertilizantes semillas veterinaria rural',
    fallbackQueries: ['agroinsumos cerca', 'fertilizantes cerca', 'farm supplies near me', 'agricultural supplies'],
    trustSignals: ['temporada', 'asesoria tecnica', 'mayoreo', 'entrega regional'],
    keywords: ['fertilizante', 'semillas', 'herbicida', 'insecticida agricola', 'riego agricola', 'forraje', 'agroinsumos', 'agricultural supplies', 'farm supplies']
  },

  {
    id: 'industrial_components_power_transmission',
    label: 'Componentes industriales y transmision de potencia',
    confidence: 0.89,
    categoryHints: ['industrial-supplies', 'hardware-store', 'auto-parts-heavy'],
    googleQuery: 'rodamientos bandas industriales mangueras hidraulicas proveedor industrial',
    fallbackQueries: ['rodamientos cerca', 'mangueras hidraulicas cerca', 'bandas industriales', 'industrial components near me'],
    trustSignals: ['medidas tecnicas', 'stock especializado', 'compatibilidad', 'venta industrial'],
    keywords: ['balero', 'baleros', 'rodamiento', 'rodamientos', 'chumacera', 'chumaceras', 'banda industrial', 'bandas industriales', 'polea', 'poleas', 'engrane', 'engranes', 'reten', 'retenes', 'manguera hidraulica', 'mangueras hidraulicas', 'conexiones hidraulicas', 'valvula hidraulica', 'hydraulic hose', 'bearings', 'power transmission', 'industrial belt']
  },
  {
    id: 'electrical_supplies',
    label: 'Material electrico y componentes',
    confidence: 0.88,
    categoryHints: ['hardware-store', 'industrial-supplies', 'electrician'],
    googleQuery: 'material electrico proveedor electrico ferreteria electrica',
    fallbackQueries: ['material electrico cerca', 'cable electrico cerca', 'electric supplies near me', 'electricista cerca'],
    trustSignals: ['calibre correcto', 'norma electrica', 'stock por medida', 'asesoria tecnica'],
    keywords: ['cable electrico', 'cable calibre', 'apagador', 'contacto', 'breaker', 'centro de carga', 'pastilla termica', 'conduit', 'tubo conduit', 'caja registro', 'material electrico', 'electric supplies', 'electrical supply', 'wire', 'circuit breaker']
  },
  {
    id: 'plumbing_supplies',
    label: 'Plomeria, tuberia y conexiones',
    confidence: 0.88,
    categoryHints: ['hardware-store', 'plumber', 'construction-supplies'],
    googleQuery: 'plomeria tuberia conexiones valvulas ferreteria',
    fallbackQueries: ['material de plomeria cerca', 'tuberia pvc cerca', 'plumbing supplies near me', 'plomero cerca'],
    trustSignals: ['medida correcta', 'tipo de conexion', 'presion/uso', 'stock local'],
    keywords: ['tuberia pvc', 'cpvc', 'pex', 'cobre', 'valvula', 'valvulas', 'cople', 'codos', 'tinaco', 'bomba de agua', 'flotador', 'llave mezcladora', 'material de plomeria', 'plumbing supplies', 'pipe fittings', 'water pump']
  },
  {
    id: 'hvac_refrigeration',
    label: 'Aire acondicionado y refrigeracion',
    confidence: 0.87,
    categoryHints: ['industrial-supplies', 'electronics-repair', 'restaurant-equipment'],
    googleQuery: 'aire acondicionado refrigeracion comercial refacciones hvac',
    fallbackQueries: ['refrigeracion comercial cerca', 'minisplit cerca', 'hvac supplies near me', 'tecnico aire acondicionado'],
    trustSignals: ['instalacion', 'garantia', 'refacciones', 'diagnostico tecnico'],
    keywords: ['minisplit', 'aire acondicionado', 'clima', 'compresor refrigeracion', 'gas refrigerante', 'refrigeracion comercial', 'camara fria', 'evaporador', 'condensador', 'hvac', 'air conditioning', 'commercial refrigeration']
  },
  {
    id: 'lab_dental_supplies',
    label: 'Laboratorio, dental e insumos clinicos',
    confidence: 0.86,
    categoryHints: ['medical-supplies', 'doctor', 'dentist'],
    googleQuery: 'insumos laboratorio dental material clinico proveedor medico',
    fallbackQueries: ['material dental cerca', 'insumos laboratorio cerca', 'dental supplies near me', 'medical supplies near me'],
    trustSignals: ['uso profesional', 'lote/caducidad', 'facturacion', 'stock validable'],
    keywords: ['material dental', 'resina dental', 'guantes nitrilo', 'reactivos laboratorio', 'tubos vacutainer', 'material clinico', 'instrumental dental', 'dental supplies', 'laboratory supplies', 'clinical supplies']
  },
  {
    id: 'uniforms_textiles',
    label: 'Uniformes, textiles y bordado',
    confidence: 0.84,
    categoryHints: ['office-supplies', 'print-shop', 'business-services'],
    googleQuery: 'uniformes bordados serigrafia textiles',
    fallbackQueries: ['uniformes cerca', 'bordados cerca', 'serigrafia cerca', 'custom uniforms near me'],
    trustSignals: ['tallas', 'bordado/logo', 'volumen minimo', 'tiempo de entrega'],
    keywords: ['uniforme', 'uniformes', 'bordado', 'bordados', 'serigrafia', 'sublimacion', 'playeras personalizadas', 'textiles', 'telas', 'mandiles', 'uniformes industriales', 'custom uniforms', 'embroidery', 'screen printing']
  },
  {
    id: 'solar_energy_supplies',
    label: 'Paneles solares y energia',
    confidence: 0.84,
    categoryHints: ['industrial-supplies', 'electrical-supplies'],
    googleQuery: 'paneles solares inversores baterias instalacion solar',
    fallbackQueries: ['paneles solares cerca', 'instalacion solar cerca', 'solar panels near me', 'solar installer near me'],
    trustSignals: ['dimensionamiento', 'garantia', 'instalacion certificada', 'ahorro estimado'],
    keywords: ['panel solar', 'paneles solares', 'inversor solar', 'bateria solar', 'microinversor', 'estructura solar', 'energia solar', 'solar panels', 'solar installer', 'solar battery']
  },
  {
    id: 'professional_services',
    label: 'Servicios profesionales y administrativos',
    confidence: 0.83,
    categoryHints: ['accounting', 'legal-services', 'business-services'],
    googleQuery: 'contador abogado asesoria fiscal servicios profesionales',
    fallbackQueries: ['contador cerca', 'abogado cerca', 'asesoria fiscal cerca', 'accountant near me'],
    trustSignals: ['cedula/experiencia', 'especialidad', 'confidencialidad', 'cotizacion clara'],
    keywords: ['contador', 'contadora', 'resico', 'facturacion', 'declaracion anual', 'abogado', 'notaria', 'contrato', 'asesoria fiscal', 'accountant', 'lawyer', 'tax advisor', 'legal services']
  },
  {
    id: 'pharmacy_product',
    label: 'Farmacia y medicamento',
    confidence: 0.82,
    categoryHints: ['pharmacy'],
    googleQuery: 'farmacia drugstore pharmacy',
    fallbackQueries: ['farmacia cerca', 'pharmacy near me', 'drugstore'],
    trustSignals: ['horario', 'cercania', 'confirmar disponibilidad'],
    keywords: ['omeprazol', 'paracetamol', 'ibuprofeno', 'loratadina', 'antigripal', 'suero oral', 'medicamento', 'medicine']
  }
];

export const analyzeSearchIntent = (query = '') => {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return null;

  const matches = SEARCH_INTENT_RULES
    .filter((rule) => hasAny(normalizedQuery, rule.keywords))
    .map((rule) => {
      const matchedTerms = rule.keywords.filter((term) => normalizedQuery.includes(normalize(term)));
      const specificityBoost = Math.min(0.05, matchedTerms.length * 0.01);
      return {
        ...rule,
        matchedTerms,
        score: Math.min(0.99, rule.confidence + specificityBoost)
      };
    })
    .sort((a, b) => b.score - a.score);

  if (matches.length === 0) return null;

  const best = matches[0];
  return {
    id: best.id,
    label: best.label,
    confidence: best.score,
    googleQuery: best.googleQuery,
    fallbackQueries: best.fallbackQueries,
    categoryHints: best.categoryHints,
    trustSignals: best.trustSignals,
    isLogistics: Boolean(best.isLogistics),
    matchedTerms: best.matchedTerms,
    expandedQuery: [query, best.googleQuery, ...best.fallbackQueries].filter(Boolean).join(' ')
  };
};

export const buildIntentSearchQueries = (query = '') => {
  const analysis = analyzeSearchIntent(query);
  if (!analysis) return [query];

  return [query, analysis.googleQuery, ...analysis.fallbackQueries]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .filter((item, index, arr) => arr.indexOf(item) === index)
    .slice(0, 4);
};

export const getIntentSearchHaystack = (query = '') => {
  const analysis = analyzeSearchIntent(query);
  if (!analysis) return [query];
  return [query, analysis.label, analysis.googleQuery, ...analysis.fallbackQueries, ...analysis.categoryHints, ...analysis.trustSignals];
};

export { normalize as normalizeSearchIntentText };
