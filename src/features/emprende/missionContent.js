export const EMPRENDE_CONTENT_VERSION = '2026.07.phase1';

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
  visibility: 0
};

export const EMPRENDE_MISSIONS = [
  {
    id: 'm1-first-decision',
    slug: 'primera-decision-negocio-local',
    order: 1,
    title: 'Primera decision: aparecer o improvisar',
    subtitle: 'Tu negocio existe, pero los clientes cercanos aun no lo encuentran.',
    businessIds: ['cafeteria', 'barberia', 'delivery-store'],
    estimatedMinutes: 3,
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
    id: 'm5-local-visibility',
    slug: 'visibilidad-local-categoria-ciudad',
    order: 5,
    title: 'Visibilidad local: categoria, ciudad e intencion',
    subtitle: 'La gente no siempre busca por nombre; busca por necesidad.',
    businessIds: ['cafeteria', 'barberia', 'delivery-store'],
    estimatedMinutes: 4,
    intro: 'Tu negocio ya tiene base. Ahora toca entender como busca la gente: "cafe cerca", "barberia abierta" o "delivery rapido".',
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
    id: 'm10-reputation-crisis',
    slug: 'crisis-reputacion-postventa',
    order: 10,
    title: 'Crisis de reputacion: responder o esconderse',
    subtitle: 'Un comentario negativo puede ser riesgo o aprendizaje.',
    businessIds: ['cafeteria', 'barberia', 'delivery-store'],
    estimatedMinutes: 4,
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


