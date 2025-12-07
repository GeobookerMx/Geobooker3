-- ==========================================================
-- SCRIPT DE REPARACIÓN: Espacios Publicitarios
-- Ejecuta esto si la página /advertise está vacía o da error.
-- ==========================================================

INSERT INTO ad_spaces (name, display_name, type, position, size_desktop, size_mobile, price_monthly, max_slots, is_active)
VALUES 
  ('hero_banner', 'Banner Principal', '1ra_plana', 'top', '728x90', '320x100', 1500.00, 5, true),
  ('featured_carousel', 'Carrusel Destacado', '1ra_plana', 'middle', '280x200', '280x200', 800.00, 10, true),
  ('sponsored_result', 'Resultados Patrocinados', '1ra_plana', 'list', '100%', '100%', 1.50, 3, true), -- CPC
  ('bottom_banner', 'Banner Inferior Sticky', '2da_plana', 'bottom', '728x90', '320x50', 1000.00, 1, true),
  ('interstitial', 'Pantalla Completa', 'interstitial', 'fullscreen', '800x600', 'fullscreen', 5000.00, 1, true)
ON CONFLICT (name) DO UPDATE SET 
  is_active = true,
  price_monthly = EXCLUDED.price_monthly,
  display_name = EXCLUDED.display_name;
