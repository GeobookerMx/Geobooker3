export const EMPRENDE_CONTENT_VERSION = '2026.08.phase2';

export const EMPRENDE_BUSINESSES = [
  {
    id: 'cafeteria',
    name: 'Cafe de Barrio',
    badge: 'CAFE',
    description: 'Una cafeteria local que necesita mas visitas en horas bajas.',
    color: 'from-amber-500 to-orange-600'
  },
  {
    id: 'barberia',
    name: 'Barberia Urbana',
    badge: 'BARBER',
    description: 'Un negocio de servicio personal que vive de reputacion y recurrencia.',
    color: 'from-slate-800 to-blue-900'
  },
  {
    id: 'delivery-store',
    name: 'Tienda Delivery',
    badge: 'DELIVERY',
    description: 'Una tienda pequena que quiere convertir busquedas locales en pedidos.',
    color: 'from-emerald-500 to-teal-700'
  },
  {
    id: 'industrial-supplier',
    name: 'Proveedor Industrial',
    badge: 'B2B',
    description: 'Un proveedor que vende a talleres, flotillas y negocios con compras especificas.',
    color: 'from-indigo-600 to-slate-950'
  }
];

export const INITIAL_METRICS = {
  cash: 55,
  customers: 38,
  reputation: 45,
  capacity: 42
};

export const INITIAL_SKILLS = {
  strategy: 0,
  finance: 0,
  customers: 0,
  operations: 0,
  visibility: 0,
  leadership: 0,
  sustainability: 0
};

export const EMPRENDE_MISSIONS = [
  {
    id: 'm1-first-decision',
    slug: 'primera-decision-negocio-local',
    order: 1,
    title: 'Primera decision: aparecer o improvisar',
    subtitle: 'Tu negocio existe, pero los clientes cercanos aun no lo encuentran.',
    businessIds: ['cafeteria', 'barberia', 'delivery-store', 'industrial-supplier'],
    estimatedMinutes: 3,
    challengePrompt: 'Usted tiene poco presupuesto y necesita mas clientes esta semana. Que haria primero y por que?',
    intro: 'Geo te acompana en una decision sencilla: gastar energia persiguiendo clientes o preparar tu visibilidad local para que te encuentren mejor.',
    scenario: 'Tienes presupuesto limitado esta semana. Puedes invertir en descuento rapido, mejorar tu presencia digital o imprimir volantes sin segmentacion.',
    learning: 'La visibilidad local no es magia: necesita datos claros, categoria correcta, fotos, contacto y una razon para elegirte.',
    realAction: {
      label: 'Registrar o reclamar mi negocio',
      to: '/business/register?source=emprende_m1',
      secondaryLabel: 'Buscar negocios similares',
      secondaryTo: '/?q=negocios%20cerca%20de%20mi&source=emprende_m1'
    },
    decisions: [
      {
        id: 'visibility',
        label: 'Ordenar presencia local',
        description: 'Actualizas datos, categoria, horario y fotos para que el negocio sea mas confiable.',
        consequence: 'Empiezas lento, pero mejoras la probabilidad de contacto real.',
        delta: { cash: -6, customers: 8, reputation: 10, capacity: 2 },
        skills: { strategy: 2, visibility: 3, customers: 1 },
        xp: 120,
        quality: 'best'
      },
      {
        id: 'discount',
        label: 'Lanzar descuento urgente',
        description: 'Atraes personas rapido, aunque con menor margen y sin resolver tu presencia.',
        consequence: 'Suben visitas temporales, pero el margen se presiona.',
        delta: { cash: -10, customers: 12, reputation: 3, capacity: -4 },
        skills: { finance: 1, customers: 2 },
        xp: 85,
        quality: 'mixed'
      },
      {
        id: 'flyers',
        label: 'Imprimir volantes genericos',
        description: 'Sales a repartir sin medir zona, categoria ni intencion de busqueda.',
        consequence: 'Generas algo de ruido, pero aprendes que no toda visibilidad es buena visibilidad.',
        delta: { cash: -8, customers: 3, reputation: 1, capacity: -2 },
        skills: { operations: 1 },
        xp: 55,
        quality: 'risky'
      }
    ]
  },
  {
    id: 'm2-cash-margin',
    slug: 'precio-margen-y-caja-del-negocio',
    order: 2,
    title: 'Caja y margen: vender mas no siempre es ganar mas',
    subtitle: 'Un pedido grande puede ayudar o romper la operacion si no revisas margen.',
    businessIds: ['cafeteria', 'barberia', 'delivery-store', 'industrial-supplier'],
    estimatedMinutes: 4,
    challengePrompt: 'Llega una oportunidad grande, pero te pide descuento fuerte. Que condiciones pondria antes de aceptar?',
    intro: 'Muchos negocios se emocionan con una venta grande. Geo te recuerda revisar caja, margen, tiempos y capacidad antes de decir si.',
    scenario: 'Un cliente quiere comprar mucho hoy, pero pide precio bajo, entrega rapida y credito. Suena atractivo, aunque puede dejarte sin caja.',
    learning: 'Crecimiento sano significa vender con margen, cobrar a tiempo y no comprometer capacidad futura por una venta impulsiva.',
    realAction: {
      label: 'Ver planes para negocios',
      to: '/premium?source=emprende_m2',
      secondaryLabel: 'Leer guia fiscal basica',
      secondaryTo: '/guia-resico?source=emprende_m2'
    },
    decisions: [
      {
        id: 'conditions',
        label: 'Aceptar con anticipo y alcance claro',
        description: 'Negocias anticipo, fechas realistas y condiciones por escrito.',
        consequence: 'Ganas una venta defendible sin sacrificar toda tu caja.',
        delta: { cash: 8, customers: 6, reputation: 6, capacity: -2 },
        skills: { finance: 3, strategy: 2, operations: 1 },
        xp: 135,
        quality: 'best'
      },
      {
        id: 'accept-all',
        label: 'Aceptar todo para no perder la venta',
        description: 'Das descuento, credito y entrega rapida sin revisar costos.',
        consequence: 'Entras con volumen, pero la operacion queda presionada y el margen cae.',
        delta: { cash: -10, customers: 10, reputation: 2, capacity: -10 },
        skills: { customers: 2, finance: 1 },
        xp: 70,
        quality: 'mixed'
      },
      {
        id: 'reject-fast',
        label: 'Rechazar sin analizar',
        description: 'Proteges tu tiempo, pero no exploras una version viable del trato.',
        consequence: 'Evitas riesgo, aunque pierdes aprendizaje comercial.',
        delta: { cash: 0, customers: -4, reputation: 0, capacity: 4 },
        skills: { strategy: 1 },
        xp: 60,
        quality: 'risky'
      }
    ]
  },
  {
    id: 'm3-product-search',
    slug: 'producto-servicio-y-busqueda-real',
    order: 3,
    title: 'Producto especifico: entender como pide la gente',
    subtitle: 'El cliente no siempre sabe la categoria correcta, pero si sabe lo que necesita.',
    businessIds: ['delivery-store', 'industrial-supplier', 'cafeteria'],
    estimatedMinutes: 4,
    challengePrompt: 'Un usuario busca algo muy especifico como tornillo 3/8, omeprazol o patio para tracto. Como lo guiaria?',
    intro: 'Geobooker Emprende entrena la logica de busqueda por necesidad: producto, servicio, categoria cercana y ubicacion.',
    scenario: 'Un usuario escribe una busqueda rara o muy puntual. Puedes ignorarla, llevarla a categoria cercana o pedir mas contexto.',
    learning: 'Un buen buscador local no necesita tener cada producto exacto; debe acercar al usuario al negocio con mayor probabilidad de resolverlo.',
    realAction: {
      label: 'Probar busqueda inteligente',
      to: '/?q=tornillo%20de%203%2F8%20cerca%20de%20mi&source=emprende_m3',
      secondaryLabel: 'Explorar categorias',
      secondaryTo: '/categorias?source=emprende_m3'
    },
    decisions: [
      {
        id: 'map-intent',
        label: 'Traducir necesidad a negocios cercanos',
        description: 'Relacionas el producto con ferreterias, tornillerias, refaccionarias, farmacias o patios segun el caso.',
        consequence: 'El usuario recibe una ruta util aunque la busqueda no sea perfecta.',
        delta: { cash: -3, customers: 12, reputation: 10, capacity: 2 },
        skills: { visibility: 3, customers: 3, strategy: 2 },
        xp: 140,
        quality: 'best'
      },
      {
        id: 'ask-context',
        label: 'Pedir mas contexto antes de responder',
        description: 'Solicitas zona, urgencia o uso del producto para mejorar la recomendacion.',
        consequence: 'La respuesta mejora, aunque agregas un paso extra.',
        delta: { cash: -1, customers: 6, reputation: 6, capacity: 1 },
        skills: { customers: 2, operations: 1 },
        xp: 95,
        quality: 'mixed'
      },
      {
        id: 'exact-only',
        label: 'Buscar solo coincidencia exacta',
        description: 'Si no existe la palabra exacta, no muestras alternativas.',
        consequence: 'Pierdes usuarios que si podian ser ayudados por negocios relacionados.',
        delta: { cash: 0, customers: -8, reputation: -6, capacity: 0 },
        skills: { visibility: 1 },
        xp: 45,
        quality: 'risky'
      }
    ]
  },
  {
    id: 'm4-operations-peak',
    slug: 'operacion-en-hora-pico',
    order: 4,
    title: 'Hora pico: crecer sin romper el servicio',
    subtitle: 'La demanda sirve solo si tu negocio puede cumplir bien.',
    businessIds: ['cafeteria', 'barberia', 'delivery-store'],
    estimatedMinutes: 4,
    challengePrompt: 'Tiene mas clientes de los que puede atender en una hora. Que cambia primero: equipo, menu, agenda o comunicacion?',
    intro: 'Geo te pone ante una situacion comun: una promocion funciona, pero la operacion empieza a fallar.',
    scenario: 'Llegan mas pedidos y visitas. El equipo esta saturado, hay retrasos y los clientes empiezan a impacientarse.',
    learning: 'Capacidad no es solo trabajar mas. Es ordenar horarios, productos, expectativas y procesos para cuidar la experiencia.',
    realAction: {
      label: 'Actualizar horarios y datos',
      to: '/business/register?source=emprende_m4',
      secondaryLabel: 'Contactar soporte',
      secondaryTo: '/support?source=emprende_m4'
    },
    decisions: [
      {
        id: 'simplify-flow',
        label: 'Simplificar oferta y comunicar tiempos',
        description: 'Reduces opciones complejas, ordenas turnos y explicas tiempos reales.',
        consequence: 'Atiendes menos caos y sostienes mejor la reputacion.',
        delta: { cash: 3, customers: 5, reputation: 11, capacity: 10 },
        skills: { operations: 4, customers: 2, leadership: 1 },
        xp: 145,
        quality: 'best'
      },
      {
        id: 'push-more',
        label: 'Seguir vendiendo sin ajustar',
        description: 'Aprovechas la demanda, pero el servicio se vuelve irregular.',
        consequence: 'Entra dinero hoy, pero aumentan quejas y cansancio.',
        delta: { cash: 10, customers: 8, reputation: -8, capacity: -12 },
        skills: { finance: 1, operations: 1 },
        xp: 75,
        quality: 'mixed'
      },
      {
        id: 'close-suddenly',
        label: 'Cerrar de golpe para respirar',
        description: 'Pausas sin avisar y dejas clientes sin respuesta.',
        consequence: 'Recuperas capacidad, pero confundes al mercado.',
        delta: { cash: -8, customers: -8, reputation: -6, capacity: 12 },
        skills: { operations: 1 },
        xp: 50,
        quality: 'risky'
      }
    ]
  },
  {
    id: 'm5-local-visibility',
    slug: 'visibilidad-local-categoria-ciudad',
    order: 5,
    title: 'Visibilidad local: categoria, ciudad e intencion',
    subtitle: 'La gente no siempre busca por nombre; busca por necesidad.',
    businessIds: ['cafeteria', 'barberia', 'delivery-store', 'industrial-supplier'],
    estimatedMinutes: 4,
    challengePrompt: 'Si tuviera que aparecer ante clientes correctos, que palabras, zona y categoria usaria?',
    intro: 'Tu negocio ya tiene base. Ahora toca entender como busca la gente: cafe cerca, barberia abierta o delivery rapido.',
    scenario: 'Tienes tres opciones para aparecer mejor: elegir palabras por intuicion, optimizar por intencion real o pagar publicidad sin revisar segmentacion.',
    learning: 'Categoria + intencion + zona es una ventaja. Si Geobooker entiende lo que el usuario necesita, puede acercarlo al negocio correcto.',
    realAction: {
      label: 'Explorar publicidad por ciudad',
      to: '/enterprise?source=emprende_m5',
      secondaryLabel: 'Probar busqueda local',
      secondaryTo: '/?q=farmacia%2024%20horas&source=emprende_m5'
    },
    decisions: [
      {
        id: 'intent-map',
        label: 'Mapear intencion real',
        description: 'Conectas categoria, sinonimos, productos y ubicacion para captar busquedas naturales.',
        consequence: 'Tus oportunidades mejoran porque apareces ante usuarios con intencion mas clara.',
        delta: { cash: -5, customers: 14, reputation: 8, capacity: 1 },
        skills: { strategy: 2, visibility: 4, customers: 2 },
        xp: 145,
        quality: 'best'
      },
      {
        id: 'paid-fast',
        label: 'Pagar anuncios sin preparar ficha',
        description: 'Compras exposicion, pero la ficha no explica bien que vendes.',
        consequence: 'Consigues alcance, aunque desperdicias parte del presupuesto.',
        delta: { cash: -16, customers: 8, reputation: 1, capacity: -3 },
        skills: { finance: 1, visibility: 1 },
        xp: 75,
        quality: 'mixed'
      },
      {
        id: 'guess-keywords',
        label: 'Elegir palabras por intuicion',
        description: 'Usas terminos formales, pero el cliente busca con lenguaje cotidiano.',
        consequence: 'Aprendes que el buscador debe entender modismos y necesidades reales.',
        delta: { cash: -2, customers: 4, reputation: 2, capacity: 0 },
        skills: { strategy: 1 },
        xp: 65,
        quality: 'risky'
      }
    ]
  },
  {
    id: 'm6-team-leadership',
    slug: 'liderazgo-equipo-pequeno',
    order: 6,
    title: 'Equipo pequeno: liderar sin apagar incendios',
    subtitle: 'Un negocio local se rompe cuando todo depende de una sola persona.',
    businessIds: ['cafeteria', 'barberia', 'delivery-store', 'industrial-supplier'],
    estimatedMinutes: 4,
    challengePrompt: 'Un colaborador comete errores repetidos. Como corrige sin humillar y sin ignorar el problema?',
    intro: 'La operacion mejora cuando el lider crea claridad, no miedo. Geo te pone frente a una conversacion dificil.',
    scenario: 'Hay errores en atencion, pedidos o seguimiento. El equipo esta cansado y nadie sabe quien debe decidir.',
    learning: 'Liderar en pequena escala significa explicar expectativas, escuchar causas, asignar responsables y medir mejoras.',
    realAction: {
      label: 'Leer Biblioteca de liderazgo',
      to: '/biblioteca/liderar-sin-cargo?source=emprende_m6',
      secondaryLabel: 'Ver Comunidad',
      secondaryTo: '/community?source=emprende_m6'
    },
    decisions: [
      {
        id: 'weekly-talk',
        label: 'Conversacion semanal de mejora',
        description: 'Hablas con evidencia, acuerdan un siguiente paso y revisan avances.',
        consequence: 'El equipo entiende el problema y se siente parte de la solucion.',
        delta: { cash: -2, customers: 4, reputation: 8, capacity: 9 },
        skills: { leadership: 4, operations: 2, customers: 1 },
        xp: 150,
        quality: 'best'
      },
      {
        id: 'do-it-yourself',
        label: 'Hacerlo todo usted mismo',
        description: 'Resuelves rapido, pero el equipo aprende menos y tu carga sube.',
        consequence: 'El negocio avanza hoy, pero queda mas dependiente de ti.',
        delta: { cash: 0, customers: 3, reputation: 3, capacity: -8 },
        skills: { operations: 1, leadership: 1 },
        xp: 70,
        quality: 'mixed'
      },
      {
        id: 'public-blame',
        label: 'Reclamar en publico',
        description: 'Descargas frustracion frente al equipo o clientes.',
        consequence: 'Baja la confianza interna y el error se puede repetir por miedo.',
        delta: { cash: 0, customers: -5, reputation: -10, capacity: -6 },
        skills: { leadership: 1 },
        xp: 35,
        quality: 'risky'
      }
    ]
  },
  {
    id: 'm7-sustainable-growth',
    slug: 'crecimiento-sostenible-negocio-local',
    order: 7,
    title: 'Sostenibilidad: crecer sin agotarte ni desperdiciar',
    subtitle: 'Un negocio fuerte cuida recursos, personas, reputacion y comunidad.',
    businessIds: ['cafeteria', 'barberia', 'delivery-store', 'industrial-supplier'],
    estimatedMinutes: 4,
    challengePrompt: 'Que pequena decision sostenible podria bajar costos y mejorar confianza del cliente?',
    intro: 'La sostenibilidad no es solo discurso. En negocio local aparece en compras, desperdicio, energia, entregas y trato humano.',
    scenario: 'Tus costos suben y notas desperdicio. Puedes subir precios sin explicar, reducir calidad o redisenar procesos.',
    learning: 'Sostener un negocio implica tomar decisiones que protejan margen, calidad, equipo y confianza a largo plazo.',
    realAction: {
      label: 'Explorar guia para negocios',
      to: '/biblioteca?source=emprende_m7',
      secondaryLabel: 'Registrar mejoras del negocio',
      secondaryTo: '/business/register?source=emprende_m7'
    },
    decisions: [
      {
        id: 'reduce-waste',
        label: 'Reducir desperdicio y explicar valor',
        description: 'Mides merma, ajustas compras y comunicas por que el cambio cuida calidad.',
        consequence: 'Mejora margen y reputacion porque la decision tiene sentido.',
        delta: { cash: 9, customers: 3, reputation: 10, capacity: 5 },
        skills: { sustainability: 4, finance: 2, operations: 2 },
        xp: 150,
        quality: 'best'
      },
      {
        id: 'raise-price-only',
        label: 'Subir precio sin explicar',
        description: 'Recuperas margen, pero algunos clientes no entienden el cambio.',
        consequence: 'La caja mejora, aunque la confianza puede resentirse.',
        delta: { cash: 10, customers: -5, reputation: -2, capacity: 0 },
        skills: { finance: 2 },
        xp: 75,
        quality: 'mixed'
      },
      {
        id: 'lower-quality',
        label: 'Bajar calidad para ahorrar',
        description: 'Reduces costo inmediato sacrificando experiencia.',
        consequence: 'Ahorras hoy, pero danar confianza sale mas caro.',
        delta: { cash: 6, customers: -10, reputation: -14, capacity: -2 },
        skills: { finance: 1 },
        xp: 40,
        quality: 'risky'
      }
    ]
  },
  {
    id: 'm10-reputation-crisis',
    slug: 'crisis-reputacion-postventa',
    order: 8,
    title: 'Crisis de reputacion: responder o esconderse',
    subtitle: 'Un comentario negativo puede ser riesgo o aprendizaje.',
    businessIds: ['cafeteria', 'barberia', 'delivery-store', 'industrial-supplier'],
    estimatedMinutes: 4,
    challengePrompt: 'Un cliente se queja publicamente. Que responderia para cuidar confianza sin prometer de mas?',
    intro: 'Un cliente deja una queja publica. Geo te ayuda a decidir sin reaccionar con enojo ni ignorar el problema.',
    scenario: 'La queja menciona demora, mala atencion y falta de seguimiento. Puedes borrarla, responder con proceso o compensar sin investigar.',
    learning: 'La postventa protege reputacion. Responder con claridad, evidencia y solucion medible aumenta confianza.',
    realAction: {
      label: 'Ver herramientas para negocios',
      to: '/dashboard?source=emprende_m10',
      secondaryLabel: 'Leer politicas y soporte',
      secondaryTo: '/support?source=emprende_m10'
    },
    decisions: [
      {
        id: 'service-recovery',
        label: 'Responder con proceso',
        description: 'Agradeces, investigas, propones solucion y registras aprendizaje interno.',
        consequence: 'No todos quedan felices, pero la confianza publica mejora.',
        delta: { cash: -4, customers: 4, reputation: 16, capacity: 5 },
        skills: { operations: 3, customers: 3, strategy: 1 },
        xp: 155,
        quality: 'best'
      },
      {
        id: 'over-discount',
        label: 'Compensar sin investigar',
        description: 'Ofreces descuento amplio para cerrar el problema rapido.',
        consequence: 'Calmas la situacion, pero no corriges la causa y afectas margen.',
        delta: { cash: -14, customers: 2, reputation: 7, capacity: -2 },
        skills: { customers: 2, finance: 1 },
        xp: 85,
        quality: 'mixed'
      },
      {
        id: 'ignore',
        label: 'Ignorar la queja',
        description: 'Esperas que pase el ruido y sigues operando igual.',
        consequence: 'La crisis no explota hoy, pero la confianza baja y se repite el problema.',
        delta: { cash: 0, customers: -8, reputation: -12, capacity: -4 },
        skills: { operations: 1 },
        xp: 35,
        quality: 'risky'
      }
    ]
  }
];

export const MISSION_STATE = {
  INTRO: 'INTRO',
  SCENARIO: 'SCENARIO',
  DECISION: 'DECISION',
  CONFIRMATION: 'CONFIRMATION',
  OUTCOME: 'OUTCOME',
  LEARNING: 'LEARNING',
  REAL_ACTION: 'REAL_ACTION',
  REWARD: 'REWARD',
  COMPLETED: 'COMPLETED'
};
