# 🛠️ Mantenimiento y Buenas Prácticas de Geobooker

Este documento detalla las lecciones aprendidas de errores previos y las reglas de oro para mantener la estabilidad del proyecto Geobooker.

## 📍 Google Maps & React 18

Geobooker utiliza `@react-google-maps/api` sobre **React 18**. Debido al modo estricto y el nuevo motor de renderizado de React 18, los componentes estándar (`Marker`, `Circle`, `InfoWindow`) suelen volverse **invisibles** o no renderizarse tras actualizaciones de estado.

> [!IMPORTANT]
> **REGLA DE ORO:** Utiliza siempre las versiones funcionales **(F)** de los componentes de mapa.

### ✅ Correcto
```javascript
import { GoogleMap, MarkerF, CircleF, InfoWindowF } from '@react-google-maps/api';

<MarkerF position={coords} />
<CircleF center={coords} radius={100} />
```

### ❌ Incorrecto
```javascript
import { Marker, Circle, InfoWindow } from '@react-google-maps/api';

<Marker position={coords} /> // ⚠️ Se volverá invisible aleatoriamente en React 18
```

---

## 🗄️ Base de Datos & Supabase

### 1. Nombres de Tablas
Evita la confusión entre tablas de sistema y tablas de aplicación.
- **`user_profiles`**: TABLA CORRECTA. Contiene nombres, fotos, puntos y códigos de referido.
- **`profiles`**: ❌ TABLA OBSOLETA/INEXISTENTE. No la uses.
- **`auth.users`**: Solo para autenticación técnica. No contiene metadatos de usuario (nombres).

### 2. Relaciones y Joins en el Frontend
Si necesitas cargar datos de usuario relacionados (ej: quién invitó a quién), no confíes ciegamente en los Joins automáticos de Supabase (`.select('*, user_profiles(...)')`) si la relación no está explícitamente definida con una FK en el esquema público.

**Patrón Recomendado (Two-Step Fetching):**
1. Carga los datos de la tabla principal (ej: `referrals`).
2. Extrae todos los IDs únicos de usuario.
3. Haz una sola consulta a `user_profiles` usando `.in('id', arrayDeIds)`.
4. Mapea los resultados en el frontend.

Esto es mucho más robusto que los joins complejos que se rompen al cambiar el esquema.

---

## 🎨 UI & Iconos

### 1. Importación de Iconos
Geobooker utiliza `lucide-react`. 
- Verifica siempre que el icono que usas esté en el bloque de `import { ... } from 'lucide-react'`.
- Un solo icono faltante hará que **toda la página se ponga rosa (crash de React)**.

### 2. Coordenadas Numéricas
Google Maps falla silenciosamente si recibe una coordenada como `string`.
- **SIEMPRE** envuelve `latitude` y `longitude` en `Number()` antes de pasarlos a componentes de mapa.
- Ejemplo: `position={{ lat: Number(b.latitude), lng: Number(b.longitude) }}`

---

## 📧 Comunicación Post-Venta
Para el panel de administración:
- Las plantillas de correo están en `src/components/admin/PostSaleEmailModal.jsx`. 
- Al editar, asegúrate de mantener las variables `${...}` para que los datos de la campaña se inserten correctamente.

---

> [!TIP]
> Si el panel de administración se ve "rosa", abre la consola del navegador (F12). El 99% de las veces es un error de importación de un icono o una variable `undefined`.
