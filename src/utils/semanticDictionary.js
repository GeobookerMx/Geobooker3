const normalize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const SEMANTIC_GROUPS = [
  ['hot_dog', ['hot dog', 'perro caliente', 'pancho', 'jocho', 'dogo', 'completo']],
  ['tire_service', ['vulcanizadora', 'llantera', 'talachera', 'talachas', 'gomeria', 'tire shop', 'tire repair']],
  ['seafood_restaurant', ['marisqueria', 'cevicheria', 'cebicheria', 'seafood', 'mariscos', 'ceviche']],
  ['taco_shop', ['taqueria', 'tacos', 'tacos al pastor', 'trompo']],
  ['bakery', ['panaderia', 'bakery', 'pan', 'boulangerie']],
  ['beauty_salon', ['barberia', 'barbershop', 'peluqueria', 'salon de belleza', 'estetica']],
  ['tattoo_studio', ['tattoo', 'tattoo studio', 'tattoo shop', 'tatuaje', 'tatuajes', 'tatuador', 'estudio de tatuajes']],
  ['nail_salon', ['nails', 'nail salon', 'unas', 'unas acrilicas', 'manicure', 'pedicure', 'manicura', 'pedicura']],
  ['spa_wellness', ['spa', 'spa massage', 'wellness', 'masajes', 'masaje relajante', 'facial', 'skin care', 'skincare']],
  ['pharmacy', ['farmacia', 'botica', 'drogueria', 'pharmacy']],
  ['hardware_store', ['ferreteria', 'tlapaleria', 'casa de materiales', 'hardware']],
  ['dry_cleaning', ['lavanderia', 'tintoreria', 'laundry', 'dry cleaning']],
  ['fine_dining', ['fine dining', 'alta cocina', 'chef table', 'menu degustacion', 'tasting menu']],
  ['michelin', ['michelin', 'estrella michelin', 'estrella verde', 'restaurante premiado']],
  ['mexican_food', ['comida mexicana', 'mexicana', 'taqueria', 'antojitos', 'torteria']],
  ['international_cuisine', ['cocina internacional', 'ramen', 'sushi', 'shawarma', 'kebab', 'curry house', 'izakaya', 'trattoria', 'bistro']],
  ['arepa_shop', ['arepas', 'areperia', 'comida venezolana', 'comida colombiana']],
  ['pupusa_shop', ['pupusas', 'pupuseria', 'comida salvadorena']],
  ['tapas_bar', ['tapas', 'tapas bar', 'comida espanola']],
  ['coffee_shop', ['cafe', 'cafeteria', 'coffee shop', 'espresso bar', 'cafe de especialidad']],
  ['sandwich_shop', ['sandwich', 'torta', 'bocadillo', 'sanduche', 'emparedado', 'sub', 'hoagie']],
  ['dumplings', ['dumplings', 'gyoza', 'momo', 'mandu', 'pierogi', 'wonton']],
  ['grill_house', ['parrilla', 'asado', 'churrasco', 'steakhouse', 'barbecue', 'bbq']],
  ['street_food', ['street food', 'food truck', 'warung', 'hawker stall', 'puesto de comida']]
];

const TERM_TO_GROUP = new Map();
const GROUP_TO_TERMS = new Map();

SEMANTIC_GROUPS.forEach(([group, terms]) => {
  const normalizedTerms = terms.map(normalize);
  GROUP_TO_TERMS.set(group, normalizedTerms);
  normalizedTerms.forEach((term) => TERM_TO_GROUP.set(term, group));
});

const tokenize = (value = '') =>
  normalize(value)
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);

export const expandSemanticTerms = (value = '') => {
  const normalizedValue = normalize(value);
  const tokens = new Set(tokenize(normalizedValue));
  tokens.add(normalizedValue);

  const expanded = new Set(tokens);

  for (const [group, terms] of GROUP_TO_TERMS.entries()) {
    const hasGroupMatch = terms.some((term) => normalizedValue.includes(term) || tokens.has(term));
    if (hasGroupMatch) {
      terms.forEach((term) => expanded.add(term));
      expanded.add(group);
    }
  }

  return [...expanded];
};

export const matchesSemanticText = (query = '', haystackValues = []) => {
  const expandedQuery = expandSemanticTerms(query);
  if (expandedQuery.length === 0) return true;

  const normalizedHaystack = haystackValues
    .filter(Boolean)
    .map((value) => normalize(value))
    .join(' | ');

  return expandedQuery.some((term) => normalizedHaystack.includes(term));
};
