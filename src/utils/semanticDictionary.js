const normalize = (value = '') =>
  String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const SEMANTIC_GROUPS = [
  ['hot_dog', ['hot dog', 'perro caliente', 'pancho', 'jocho', 'dogo', 'completo']],
  ['tire_service', ['vulcanizadora', 'llantera', 'talachera', 'talachas', 'talacha', 'vulca', 'ponchadura', 'llanta ponchada', 'reparar llanta', 'cambio de llanta', 'neumatico pinchado', 'flat tire', 'tire shop', 'tire repair', '24 hour tire repair']],
  ['locksmith', ['cerrajero', 'abrir puerta', 'perdi mis llaves', 'duplicado de llaves', 'cambio de chapa', 'locksmith', 'key copy', 'locked out', 'emergency locksmith']],
  ['plumber', ['plomero', 'fontanero', 'fuga de agua', 'se rompio una tuberia', 'destapar drenaje', 'plumbing', 'plumber near me', 'water leak', 'clogged drain']],
  ['electrician', ['electricista', 'no tengo luz', 'corto circuito', 'instalacion electrica', 'breaker', 'fuse', 'electrician', 'emergency electrician', 'wiring']],
  ['mechanic', ['mecanico', 'taller mecanico', 'mi carro no prende', 'revision de motor', 'cambio de aceite', 'mechanic', 'auto repair', 'car service']],
  ['tow_truck', ['grua', 'mi carro se quedo', 'auxilio vial', 'towing', 'tow truck', 'roadside assistance', 'arrastre']],
  ['pharmacy', ['farmacia', 'medicina cerca', 'farmacia abierta', 'farmacia 24 horas', 'drugstore', 'pharmacy near me', 'medicine', 'botica', 'drogueria', 'chemist', 'omeprazol', 'paracetamol', 'ibuprofeno', 'loratadina', 'antigripal', 'suero oral', 'vitaminas', 'medicamento', 'medicine store', 'over the counter medicine']],
  ['doctor', ['doctor', 'medico cerca', 'consulta medica', 'doctor general', 'physician', 'medical office', 'urgent care']],
  ['dentist', ['dentista', 'me duele una muela', 'limpieza dental', 'ortodoncia', 'dental clinic', 'dentist', 'toothache']],
  ['veterinarian', ['veterinario', 'veterinaria', 'mi perro esta enfermo', 'veterinaria cerca', 'vacunas mascotas', 'vet', 'animal hospital', 'pet clinic']],
  ['restaurant', ['restaurante', 'donde comer', 'comida cerca', 'restaurante cercano', 'food near me', 'restaurant near me', 'lunch', 'dinner', 'restaurants near me']],
  ['coffee_shop', ['cafe', 'cafeteria', 'cafe cerca', 'coffee shop', 'espresso', 'espresso bar', 'desayunos', 'brunch', 'cowork cafe']],
  ['barbershop', ['barberia', 'corte de cabello', 'fade', 'barber', 'barbershop', 'peluquero', 'barberia cerca de mi']],
  ['beauty_salon', ['estetica', 'unas', 'maquillaje', 'maquillista', 'maquillaje social', 'maquillaje de novia', 'makeup artist', 'makeup service', 'cabello', 'peinado', 'pestanas', 'cejas', 'depilacion', 'beauty salon', 'nail salon', 'hair salon', 'salon de belleza']],
  ['dry_cleaning', ['lavanderia', 'lavar ropa', 'laundromat', 'laundry', 'tintoreria', 'dry cleaning']],
  ['hardware_store', ['ferreteria', 'tornilleria', 'tornillos', 'tuercas', 'rondanas', 'arandelas', 'pijas', 'taquetes', 'birlos', 'esparragos', 'anclas', 'cuerda 3/8', 'rosca', 'herramientas', 'tlapaleria', 'hardware store', 'fasteners', 'screws', 'bolts', 'nuts', 'washers', 'threaded rod', 'tools', 'construction supplies', 'casa de materiales']],
  ['construction_supplies', ['materiales de construccion', 'material para construccion', 'cemento', 'concreto', 'block', 'ladrillo', 'varilla', 'grava', 'arena', 'yeso', 'cal', 'construction materials', 'building supplies', 'cement', 'concrete', 'rebar', 'bricks']],
  ['industrial_supplies', ['insumos industriales', 'suministros industriales', 'componentes industriales', 'refacciones industriales', 'refaccionaria industrial', 'maquinaria', 'equipo industrial', 'mro', 'consumibles industriales', 'industrial supplies', 'industrial components', 'spare parts', 'machine parts', 'mro supplies']],
  ['metal_supplies', ['acero', 'lamina', 'placa', 'perfil', 'ptr', 'tubo', 'aluminio industrial', 'metal', 'metal supplier', 'steel supplier', 'steel', 'sheet metal', 'metal profiles']],
  ['packaging_supplies', ['empaque', 'embalaje', 'cajas', 'carton', 'tarimas', 'pallets', 'stretch film', 'packaging', 'packing supplies', 'corrugated boxes']],
  ['food_suppliers', ['proveedor de alimentos', 'alimentos mayoreo', 'abarrotes mayoreo', 'insumos para restaurante', 'carne mayoreo', 'pollo mayoreo', 'frutas mayoreo', 'verduras mayoreo', 'food supplier', 'wholesale food', 'restaurant supplies', 'produce supplier']],
  ['chemical_supplies', ['quimicos', 'quimica', 'productos quimicos', 'limpieza industrial', 'solventes', 'resinas', 'chemical supplier', 'industrial chemicals', 'cleaning chemicals']],
  ['truck_parking_logistics', ['patio logistico', 'pension para tracto', 'pension para tractocamion', 'pension para trailer', 'patio para mercancia', 'resguardo de mercancia', 'estacionamiento de trailer', 'estacionamiento para tractocamion', 'drop yard', 'truck yard', 'secure yard', 'truck parking', 'yard storage']],
  ['warehouse_storage', ['bodega', 'bodegas', 'storage', 'warehouse', 'almacen', 'almacenaje', 'mini bodega', 'mini storage', 'renta de bodega', 'logistics warehouse']],
  ['heavy_truck_parts', ['refacciones diesel', 'refaccionaria diesel', 'refacciones tractocamion', 'taller pesado', 'taller diesel', 'truck parts', 'diesel repair', 'heavy truck repair']],
  ['iron_works', ['herreria', 'portones', 'rejas', 'soldadura', 'iron works', 'welding', 'metal gate']],
  ['aluminum_works', ['aluminio', 'ventanas de aluminio', 'canceleria', 'puertas de aluminio', 'aluminum works', 'aluminum fabrication']],
  ['carpenter', ['carpinteria', 'muebles a medida', 'puertas de madera', 'carpintero', 'woodwork', 'carpenter']],
  ['pest_control', ['fumigacion', 'cucarachas', 'chinches', 'ratas', 'termitas', 'pest control', 'exterminator', 'fumigator']],
  ['cleaning_service', ['limpieza', 'limpieza de casa', 'limpieza profunda', 'cleaning service', 'house cleaning', 'office cleaning']],
  ['moving_service', ['mudanza', 'flete', 'fletes', 'transporte de muebles', 'transporte de carga', 'carga pesada', 'fletera', 'moving service', 'movers', 'freight', 'cargo transport', 'relocation']],
  ['stationery_store', ['papeleria', 'copias', 'impresiones', 'utiles escolares', 'stationery', 'copy center', 'printing']],
  ['print_shop', ['imprenta', 'tarjetas', 'flyers', 'lonas', 'printing', 'print shop', 'business cards']],
  ['advertising_agency', ['publicidad', 'anuncios', 'marketing', 'agencia', 'social media', 'ads', 'advertising agency']],
  ['real_estate', ['inmobiliaria', 'renta de casas', 'venta de casas', 'departamentos', 'real estate', 'realtor', 'property']],
  ['hotel', ['hotel', 'hospedaje', 'motel', 'lodging', 'hotel near me', 'rooms']],
  ['travel_agency', ['turismo', 'tours', 'guia turistico', 'travel agency', 'local guide', 'vacation packages']],
  ['gas_station', ['gasolinera', 'gasolina cerca', 'diesel', 'fuel station', 'gas station near me']],
  ['atm', ['cajero', 'atm', 'cajero automatico', 'cash machine', 'banco cerca']],
  ['fast_food', ['comida rapida', 'hamburguesas', 'pizza', 'tacos', 'fast food', 'takeout', 'delivery']],
  ['taco_shop', ['taqueria', 'tacos', 'tacos cerca', 'taco restaurant', 'mexican food', 'tacos al pastor', 'trompo']],
  ['bakery', ['panaderia', 'pan', 'pasteles', 'bakery', 'pastries', 'cake shop']],
  ['butcher_shop', ['carniceria', 'carne', 'pollo', 'butcher', 'meat market']],
  ['fruit_shop', ['fruteria', 'frutas y verduras', 'produce', 'fruit shop', 'local market']],
  ['seafood_restaurant', ['marisqueria', 'cevicheria', 'cebicheria', 'seafood', 'mariscos', 'ceviche']],
  ['tattoo_studio', ['tattoo', 'tattoo studio', 'tattoo shop', 'tatuaje', 'tatuajes', 'tatuador', 'estudio de tatuajes']],
  ['nail_salon', ['nails', 'nail salon', 'unas acrilicas', 'manicure', 'pedicure', 'manicura', 'pedicura']],
  ['spa_wellness', ['spa', 'spa massage', 'wellness', 'masajes', 'masaje relajante', 'facial', 'skin care', 'skincare']],
  ['fine_dining', ['fine dining', 'alta cocina', 'chef table', 'menu degustacion', 'tasting menu']],
  ['michelin', ['michelin', 'estrella michelin', 'estrella verde', 'restaurante premiado']],
  ['mexican_food', ['comida mexicana', 'mexicana', 'antojitos', 'torteria']],
  ['international_cuisine', ['cocina internacional', 'ramen', 'sushi', 'shawarma', 'kebab', 'curry house', 'izakaya', 'trattoria', 'bistro']],
  ['arepa_shop', ['arepas', 'areperia', 'comida venezolana', 'comida colombiana']],
  ['pupusa_shop', ['pupusas', 'pupuseria', 'comida salvadorena']],
  ['tapas_bar', ['tapas', 'tapas bar', 'comida espanola']],
  ['sandwich_shop', ['sandwich', 'torta', 'bocadillo', 'sanduche', 'emparedado', 'sub', 'hoagie']],
  ['dumplings', ['dumplings', 'gyoza', 'momo', 'mandu', 'pierogi', 'wonton']],
  ['grill_house', ['parrilla', 'asado', 'churrasco', 'steakhouse', 'barbecue', 'bbq']],
  ['street_food', ['street food', 'food truck', 'warung', 'hawker stall', 'puesto de comida']],
  ['voice_search', ['negocios cerca de mi', 'servicios cerca de mi', 'que hay cerca de mi', 'donde encuentro un plomero', 'donde hay una farmacia abierta', 'necesito una vulcanizadora', 'busco un cerrajero urgente', 'comida cerca de mi', 'barberia cerca de mi', 'taller mecanico cerca', 'tornillo de cuerda 3/8 cerca de mi', 'patio para tracto con mercancia', 'pension para tractocamion', 'businesses near me', 'services near me', 'restaurants near me', 'tire repair near me', 'plumber near me', 'locksmith near me', 'pharmacy near me', 'coffee shop near me', 'truck parking near me', 'fasteners near me']],
  ['regional_search', ['mexicano', 'mexicana', 'mexico', 'cdmx', 'chilango', 'tapatio', 'regio', 'poblano', 'yucateco', 'mexiquense', 'colombiano', 'bogotano', 'paisa', 'argentino', 'porteno', 'chileno', 'peruano', 'limeno', 'espanol', 'madrileno', 'barcelones', 'estadounidense', 'latino', 'hispano', 'local', 'nearby', 'near me']]
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
