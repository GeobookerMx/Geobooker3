// src/utils/categoryIcons.js
// Mapeo centralizado de categorías DENUE → emoji + color para el mapa y tarjetas

export const CATEGORY_CONFIG = {
  // Comida y bebida
  restaurantes:     { emoji: '🍽️', label: 'Restaurante',     color: '#EF4444', bg: '#FEE2E2' },
  cafeterias:       { emoji: '☕', label: 'Cafetería',        color: '#92400E', bg: '#FEF3C7' },
  bares:            { emoji: '🍺', label: 'Bar / Cantina',   color: '#7C3AED', bg: '#EDE9FE' },

  // Salud
  salud:            { emoji: '🏥', label: 'Salud',           color: '#059669', bg: '#D1FAE5' },
  belleza:          { emoji: '💅', label: 'Belleza / Spa',   color: '#EC4899', bg: '#FCE7F3' },

  // Comercio
  tiendas:          { emoji: '🛒', label: 'Tienda',          color: '#2563EB', bg: '#DBEAFE' },
  hoteles:          { emoji: '🏨', label: 'Hotel',           color: '#0891B2', bg: '#CFFAFE' },

  // Finanzas
  bancos:           { emoji: '🏦', label: 'Banco / ATM',    color: '#1D4ED8', bg: '#DBEAFE' },

  // Automotriz y combustible
  gasolineras:      { emoji: '⛽', label: 'Gasolinera',      color: '#D97706', bg: '#FEF3C7' },
  hogar_autos:      { emoji: '🔧', label: 'Autos / Hogar',  color: '#374151', bg: '#F3F4F6' },

  // Educación y entretenimiento
  educacion:        { emoji: '🎓', label: 'Educación',       color: '#7C3AED', bg: '#EDE9FE' },
  entretenimiento:  { emoji: '🎮', label: 'Entretenimiento', color: '#F59E0B', bg: '#FEF3C7' },

  // Servicios
  servicios:        { emoji: '💼', label: 'Servicios',       color: '#6B7280', bg: '#F9FAFB' },

  // Default
  default:          { emoji: '📍', label: 'Negocio',         color: '#3B82F6', bg: '#EFF6FF' },
};

// Subcategorías con íconos específicos (override sobre la categoría)
export const SUBCATEGORY_CONFIG = {
  farmacia:         { emoji: '💊', label: 'Farmacia',        color: '#16A34A', bg: '#DCFCE7' },
  dentista:         { emoji: '🦷', label: 'Dentista',        color: '#0EA5E9', bg: '#E0F2FE' },
  hospital:         { emoji: '🏥', label: 'Hospital',        color: '#DC2626', bg: '#FEE2E2' },
  veterinaria:      { emoji: '🐾', label: 'Veterinaria',     color: '#059669', bg: '#D1FAE5' },
  optica:           { emoji: '👓', label: 'Óptica',          color: '#6366F1', bg: '#EEF2FF' },
  barberia:         { emoji: '💈', label: 'Barbería',        color: '#1E40AF', bg: '#DBEAFE' },
  salon:            { emoji: '💇', label: 'Salón de Belleza',color: '#DB2777', bg: '#FCE7F3' },
  supermercado:     { emoji: '🏪', label: 'Supermercado',    color: '#2563EB', bg: '#DBEAFE' },
  abarrotes:        { emoji: '🏬', label: 'Abarrotes',       color: '#16A34A', bg: '#DCFCE7' },
  panaderia:        { emoji: '🥐', label: 'Panadería',       color: '#D97706', bg: '#FEF3C7' },
  mecanico:         { emoji: '🔩', label: 'Mecánico',        color: '#374151', bg: '#F3F4F6' },
  autolavado:       { emoji: '🚿', label: 'Autolavado',      color: '#0891B2', bg: '#CFFAFE' },
  agencia_autos:    { emoji: '🚗', label: 'Agencia de Autos',color: '#1D4ED8', bg: '#DBEAFE' },
  ferreteria:       { emoji: '🪛',  label: 'Ferretería',      color: '#92400E', bg: '#FEF3C7' },
  electronica:      { emoji: '📱', label: 'Electrónica',     color: '#4F46E5', bg: '#EEF2FF' },
  gimnasio:         { emoji: '💪', label: 'Gimnasio',        color: '#DC2626', bg: '#FEE2E2' },
  cine_teatro:      { emoji: '🎬', label: 'Cine / Teatro',   color: '#7C3AED', bg: '#EDE9FE' },
  cajero:           { emoji: '🏧', label: 'Cajero ATM',      color: '#1D4ED8', bg: '#DBEAFE' },
  banco:            { emoji: '🏦', label: 'Banco',           color: '#1D4ED8', bg: '#DBEAFE' },
  legal:            { emoji: '⚖️', label: 'Despacho Legal',  color: '#374151', bg: '#F3F4F6' },
  contable:         { emoji: '📊', label: 'Contabilidad',    color: '#374151', bg: '#F3F4F6' },
  inmobiliaria:     { emoji: '🏡', label: 'Inmobiliaria',    color: '#059669', bg: '#D1FAE5' },
  construccion:     { emoji: '🏗️', label: 'Construcción',    color: '#92400E', bg: '#FEF3C7' },
};

/**
 * Obtiene el ícono, color y label de un negocio por su categoría y subcategoría.
 * @param {string} category - Categoría normalizada (ej: 'restaurantes')
 * @param {string} subcategory - Subcategoría (ej: 'farmacia')
 * @returns {{ emoji: string, label: string, color: string, bg: string }}
 */
export const getCategoryIcon = (category, subcategory) => {
  // Primero intentar subcategoría específica
  if (subcategory && SUBCATEGORY_CONFIG[subcategory]) {
    return SUBCATEGORY_CONFIG[subcategory];
  }
  // Luego la categoría principal
  if (category && CATEGORY_CONFIG[category]) {
    return CATEGORY_CONFIG[category];
  }
  return CATEGORY_CONFIG.default;
};

/**
 * Lista de categorías principales para filtros de búsqueda
 */
export const MAIN_CATEGORIES = [
  { key: 'restaurantes',    ...CATEGORY_CONFIG.restaurantes },
  { key: 'salud',           ...CATEGORY_CONFIG.salud },
  { key: 'tiendas',         ...CATEGORY_CONFIG.tiendas },
  { key: 'bancos',          ...CATEGORY_CONFIG.bancos },
  { key: 'gasolineras',     ...CATEGORY_CONFIG.gasolineras },
  { key: 'hoteles',         ...CATEGORY_CONFIG.hoteles },
  { key: 'educacion',       ...CATEGORY_CONFIG.educacion },
  { key: 'entretenimiento', ...CATEGORY_CONFIG.entretenimiento },
  { key: 'belleza',         ...CATEGORY_CONFIG.belleza },
  { key: 'hogar_autos',     ...CATEGORY_CONFIG.hogar_autos },
  { key: 'servicios',       ...CATEGORY_CONFIG.servicios },
];
