export const COMMERCIAL_SPACE_TYPES = Object.freeze({
  retail: 'Local comercial',
  office: 'Oficina',
  consulting_room: 'Consultorio',
  warehouse: 'Bodega comercial',
  commercial_land: 'Terreno comercial',
  event_space: 'Espacio para eventos',
  pop_up: 'Espacio temporal / pop-up'
});

export const COMMERCIAL_SPACE_AMENITIES = Object.freeze([
  ['parking', 'Estacionamiento'],
  ['accessible', 'Accesibilidad'],
  ['security', 'Control de acceso'],
  ['cctv', 'Cámaras declaradas'],
  ['electricity', 'Electricidad'],
  ['water', 'Agua'],
  ['internet', 'Internet'],
  ['restrooms', 'Sanitarios'],
  ['loading_access', 'Acceso de carga ligera'],
  ['furnished', 'Amueblado']
]);

export const COMMERCIAL_SPACE_STATUSES = Object.freeze({
  draft: 'Borrador',
  pending_review: 'En revisión',
  documents_required: 'Documentos requeridos',
  published: 'Publicado',
  paused: 'Pausado',
  rented: 'Rentado',
  rejected: 'Rechazado',
  archived: 'Archivado'
});
