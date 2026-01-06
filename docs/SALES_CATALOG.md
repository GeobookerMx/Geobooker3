# PRODUCTOS VENDIBLES Y GARANTÍAS
## Geobooker - Catálogo Comercial v1.0

---

## 1. PRODUCTOS VENDIBLES

### 📦 1.1 Plan Premium ($299 MXN/mes)

**Lo que incluye:**
- Hasta 5 negocios registrados
- 10 fotos por negocio
- ⭐ Estrella dorada animada en mapa
- Prioridad en búsquedas
- Insignia "VERIFICADO"
- Estadísticas de visitas/clics
- Redes sociales vinculadas

**Promoción Lanzamiento:** 3 meses GRATIS (primeros 5,000)

**¿Qué garantizamos?**
✅ Pin visible y destacado en mapa  
✅ Aparición en resultados  
✅ Estadísticas reales  
⚠️ NO garantizamos número específico de clientes  

---

### 📢 1.2 Geobooker Ads (Publicidad)

| Espacio | Precio/Mes | ¿Qué es? |
|---------|------------|----------|
| Hero Banner | $4,999 MXN | Banner principal al abrir app |
| Carousel | $2,999 MXN | Rotativo de 5 anuncios |
| Sticky Banner | $1,999 MXN | Banner fijo inferior |
| Sponsored Results | $999 MXN | Primeros resultados búsqueda |
| Interstitial | $3,999 MXN | Pantalla completa ocasional |
| Fullwidth | $5,999 MXN | Banner ancho completo |

**¿Qué garantizamos?**
✅ Impresiones visibles en la plataforma  
✅ Métricas reales de clics  
✅ 15 días extensión si hay fallas técnicas  
⚠️ NO garantizamos ventas específicas  
⚠️ NO garantizamos CTR mínimo  

---

### 🌍 1.3 Enterprise/Global ($1,250+ USD/mes)

**Ideal para:**
- Marcas internacionales
- Franquicias
- Eventos (FIFA 2026, Super Bowl, etc.)

**¿Qué garantizamos?**
✅ Presencia en toda la plataforma  
✅ Manager de cuenta dedicado  
✅ Reportes personalizados  

---

## 2. LO QUE NO VENDEMOS / NO GARANTIZAMOS

| ❌ NO vendemos | Razón |
|----------------|-------|
| Clientes garantizados | Imposible controlar conversión |
| CTR mínimo | Depende del creativo del cliente |
| Posición #1 Google | No controlamos Google |
| Base de datos de usuarios | Violación de privacidad |
| Exclusividad total | Modelo abierto |

---

## 3. PLAN "DÍA 0" - LIMPIEZA DE DATOS

### 📅 Fecha sugerida: [TU DECIDES]

### Tareas a ejecutar:

#### Base de Datos (Supabase)
```sql
-- 1. Borrar campañas de prueba
DELETE FROM ad_campaigns WHERE status = 'draft' OR advertiser_name ILIKE '%test%';

-- 2. Borrar creativos huérfanos
DELETE FROM ad_creatives WHERE campaign_id NOT IN (SELECT id FROM ad_campaigns);

-- 3. Borrar reportes de prueba
DELETE FROM ad_reports WHERE created_at < '2026-01-01';

-- 4. Resetear contadores de prueba
UPDATE ad_spaces SET current_ads = 0;
```

#### Storage (ad-creatives bucket)
- Revisar y borrar imágenes de prueba
- Mantener solo creativos de campañas reales

#### Stripe
- Verificar que no hay suscripciones de prueba activas
- Modo LIVE confirmado ✅

---

## 4. BANNERS "TU MARCA AQUÍ"

### Necesito generar:

| Espacio | Dimensiones | Texto sugerido |
|---------|-------------|----------------|
| Hero Banner | 1200x400 | "🚀 TU MARCA AQUÍ - Llega a miles de usuarios" |
| Carousel | 400x300 | "📢 ESPACIO DISPONIBLE - Anúnciate" |
| Sticky | 728x90 | "TU NEGOCIO AQUÍ → geobooker.com.mx/advertise" |
| Fullwidth | 1200x200 | "¿TIENES UNA MARCA? Este espacio puede ser tuyo" |

---

## 5. RESUMEN VENDIBLE

| Producto | Precio | Margen estimado |
|----------|--------|-----------------|
| Premium | $299/mes | ~85% |
| Ads básico | $999-5,999/mes | ~90% |
| Enterprise | $1,250+ USD/mes | ~95% |

**Costos operativos:** ~$500 USD/mes (Supabase, APIs, hosting)

