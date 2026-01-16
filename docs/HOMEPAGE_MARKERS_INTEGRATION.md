# Guía de Integración: Custom Business Markers en HomePage

## Objetivo
Integrar `CustomBusinessMarker` en HomePage.jsx para mostrar markers personalizados en el mapa con logos, badges y tooltips interactivos.

---

## Paso 1: Agregar Import

En `src/pages/HomePage.jsx`, agregar al inicio:

```jsx
// Después de los otros imports
import CustomBusinessMarker from '../components/map/CustomBusinessMarker';
```

---

## Paso 2: Agregar Estado para Hover

Buscar la sección de `useState` (alrededor de línea 50-65) y agregar:

```jsx
const [hoveredBusiness, setHoveredBusiness] = useState(null);
```

---

## Paso 3: Integrar en el Render del Mapa

Buscar donde se renderizan los markers en el mapa. Probablemente hay algo como:

```jsx
{businesses.map(business => (
    <Marker
        key={business.id}
        position={[business.latitude, business.longitude]}
        // ...
    />
))}
```

**Reemplazar con:**

```jsx
{businesses.map(business => (
    <CustomBusinessMarker
        key={business.id}
        business={{
            ...business,
            // Asegurar que tenga los campos necesarios
            active_badges: business.active_badges || [],
            logo_url: business.logo_url,
            marker_style: business.marker_style || 'pin',
            average_rating: business.average_rating || business.rating || 0,
            total_reviews: business.total_reviews || business.review_count || 0,
            is_verified: business.is_verified || business.is_premium || false
        }}
        onClick={(b) => handleViewBusinessProfile(b)}
        onHover={(b) => setHoveredBusiness(b)}
        isHovered={hoveredBusiness?.id === business.id}
    />
))}
```

---

## Paso 4: Ajustar Query de Businesses

Asegurar que el query de Supabase incluya los campos nuevos:

```jsx
const { data, error } = await supabase
    .from('businesses')
    .select(`
        *,
        active_badges:business_badges!inner(badge_type)
    `)
    .eq('is_active', true)
    // ... otros filtros
```

Y procesar active_badges:

```jsx
const processedBusinesses = data.map(b => ({
    ...b,
    active_badges: b.active_badges?.map(ab => ab.badge_type) || []
}));
```

---

## Paso 5: Importar CSS

Asegurar que el CSS de CustomBusinessMarker esté disponible:

```jsx
import '../components/map/CustomBusinessMarker.css';
```

O agregar el import inline en el componente si usa styled-jsx.

---

## Paso 6: Testing

1. **Recargar la página**
2. **Verificar que los markers aparecen**
3. **Hover sobre un marker** → debe mostrar tooltip
4. **Click en un marker** → debe abrir perfil del negocio
5. **Verificar diferentes estilos**:
   - Negocios con logo deberían mostrar `logo_pin` o `logo_circle`
   - Negocios sin logo muestran `pin` estándar por categoría
   - Badges flotantes aparecen en markers

---

## Troubleshooting

### Error: "Cannot read property 'map' of undefined"
**Solución:** Asegurar que `active_badges` siempre sea un array:
```jsx
active_badges: business.active_badges || []
```

### Markers no aparecen
**Verificar:**
1. Import correcto de `CustomBusinessMarker`
2. CSS importado
3. Business tiene `latitude` y `longitude`

### Tooltip no se muestra
**Verificar:**
1. Estado `hoveredBusiness` está declarado
2. Event handler `onHover` está conectado

---

## Alternativa: Integración Mínima

Si hay problemas con la integración completa, usar solo el marker estándar con badges básicos:

```jsx
{businesses.map(business => (
    <Marker
        key={business.id}
        position={[business.latitude, business.longitude]}
        icon={business.logo_url ? createLogoMarker(business.logo_url) : defaultIcon}
    >
        <Popup>
            <div>
                <h3>{business.name}</h3>
                {business.active_badges && (
                    <BadgeDisplay badges={business.active_badges} layout="horizontal" />
                )}
            </div>
        </Popup>
    </Marker>
))}
```

---

## Configuración Netlify (Cron Job)

Agregar al `netlify.toml`:

```toml
[[functions]]
  directory = "netlify/functions/"

[functions."check-outdated-businesses"]
  # Cron schedule: Diario a las 9am Mexico City time (UTC-6)
  schedule = "0 15 * * *"  # 15:00 UTC = 9:00 AM CST
```

O crear archivo `netlify/functions/check-outdated-businesses.json`:

```json
{
  "schedule": "0 15 * * *"
}
```

---

**Integración completa estimada: 15-20 minutos**
