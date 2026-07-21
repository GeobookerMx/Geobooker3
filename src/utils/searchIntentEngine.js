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
