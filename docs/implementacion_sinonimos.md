# 🔍 Sistema de Sinónimos Regionales - Plan de Implementación

## 📋 Qué es

Sistema de búsqueda SEO-friendly que permite encontrar negocios usando **términos regionales** (jerga local) en lugar de solo categorías genéricas.

**Ejemplo:**
- Usuario escribe: **"talachas"**
- Sistema reconoce: **"vulcanizadora"** (tire_service)
- Muestra: Todos los talleres de llantas

---

## ✅ Lo que YA está hecho

### 1. SQL Schema Completo ✅
- Tabla `category_synonyms` creada
- Función `normalize_search_term()` para quitar acentos
- Función `search_businesses_with_synonyms()` RPC
- **80+ sinónimos** cargados para México/LATAM

### 2. Categorías Cubiertas ✅
- 🚗 Llantas: talachas, vulcanizadora, gomería, borracharia
- 🏪 Abarrotes: pulpería, colmado, ultramarinos
- 🔧 Ferretería: tlapalería
- 💊 Farmacia: botica, droguería
- 🔩 Refacciones: refaccionaria, repuestos
- 🍽️ Comida: fonda, comida corrida
- 🦐 Mariscos: marisquería, cevichería
- 🌮 Tacos: taquería
- 🌽 Tortillas: tortillería
- 🍦 Helados: nevería, nieves
- 🥪 Tortas: tortería
- 🍞 Pan: panadería
- 🥩 Carne: carnicería
- 💇 Estética: salón de belleza, peluquería
- 👔 Lavandería: tintorería

---

## 🔧 Lo que FALTA implementar

### 1. Integrar en Frontend

**Archivo a modificar:** `src/components/SearchBar.jsx`

```javascript
// ANTES (búsqueda simple)
const results = await supabase
    .from('businesses')
    .select('*')
    .ilike('name', `%${query}%`);

// DESPUÉS (búsqueda con sinónimos)
const { data: results } = await supabase
    .rpc('search_businesses_with_synonyms', {
        search_query: query,
        user_country: 'MX'
    });
```

### 2. Normalización de Input

Agregar función helper:

```javascript
const normalizeInput = (text) => {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, ''); // Quitar acentos
};
```

---

## 🎯 Beneficios SEO

### Antes:
- Usuario busca "talachas" → **0 resultados**
- Usuario busca "nevería" → **0 resultados**

### Después:
- Usuario busca "talachas" → **15 vulcanizadoras encontradas** ✅
- Usuario busca "nevería" → **8 heladerías encontradas** ✅

---

## 📊 Expansión Futura

### Agregar más regiones:
```sql
INSERT INTO category_synonyms VALUES
('grocery_store_small', 'tiendita', 'tiendita', 'es-MX', 'MX', 85, NULL),
('car_wash', 'autolavado', 'autolavado', 'es-MX', 'MX', 90, NULL),
('beauty_salon', 'ñoño', 'nono', 'es-GT', 'GT', 80, 'Guatemala - salón'),
-- etc.
```

---

## 🚀 Deployment Checklist

- [x] Crear tabla y funciones SQL
- [x] Cargar datos iniciales (80+ sinónimos)
- [ ] Ejecutar SQL en Supabase producción
- [ ] Actualizar SearchBar.jsx frontend
- [ ] Testing con términos regionales
- [ ] Commit y push
- [ ] Validar en producción

---

## 🎨 UX Sugerido

Cuando usuario busca con sinónimo, mostrar mensaje:

```
🔍 Mostrando resultados para "vulcanizadoras" 
(búsqueda original: "talachas")
```

Esto educa al usuario y mejora confianza en el sistema.

---

**Archivos creados:**
- ✅ `supabase/create_category_synonyms_system.sql`
- ✅ `docs/implementacion_sinonimos.md` (este archivo)

**Siguiente paso:** Ejecutar SQL y actualizar SearchBar.jsx
