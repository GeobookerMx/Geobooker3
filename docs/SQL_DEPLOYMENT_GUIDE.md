# 🚀 Guía de Despliegue SQL - Geobooker

## Paso a Paso para Configurar la Base de Datos

### ✅ PASO 1: Ejecutar `businesses_schema.sql`

1. **Abre Supabase Dashboard:**
   - Ve a [supabase.com](https://supabase.com)
   - Login con tu cuenta
   - Selecciona tu proyecto Geobooker

2. **Ve al SQL Editor:**
   - Click en **"SQL Editor"** en el menú lateral (ícono de terminal)
   - Click en **"New Query"**

3. **Copia y Pega el Script:**
   - Abre el archivo: `supabase/businesses_schema.sql`
   - **Selecciona TODO** (Ctrl+A)
   - **Copia** (Ctrl+C)
   - **Pega** en el editor de Supabase

4. **Ejecuta:**
   - Click en el botón **"Run"** (esquina inferior derecha)
   - O presiona **Ctrl + Enter**

5. **Verificación:**
   - Deberías ver al final una tabla con ~25 columnas
   - Busca columnas como: `name`, `manager_name`, `offers_invoicing`, `has_job_openings`, `whatsapp`, etc.
   - Si ves errores, cópialos y me los pasas

---

### ✅ PASO 2: Ejecutar `premium_system.sql`

1. **Nueva Query:**
   - Click en **"New Query"** de nuevo

2. **Copia el Script Premium:**
   - Abre: `supabase/premium_system.sql`
   - Copia TODO

3. **Pega y Ejecuta:**
   - Pega en editor
   - Click **"Run"**

4. **Verificación:**
   - Al final debería mostrar las columnas premium:
     - `is_premium` (boolean)
     - `premium_since` (timestamp)
     - `premium_until` (timestamp)

---

### ✅ PASO 3: Configurar Supabase Storage

#### 3.1 Crear Bucket

1. **Ve a Storage:**
   - Click en **"Storage"** en menú lateral

2. **Crear Nuevo Bucket:**
   - Click en **"Create a new bucket"**
   - **Name:** `business-images`
   - **Public:** ✅ **ACTIVADO** (muy importante)
   - Click **"Create bucket"**

#### 3.2 Configurar Policies (RLS)

1. **Selecciona el Bucket:**
   - Click en `business-images`

2. **Ve a Policies:**
   - Click en la pestaña **"Policies"**

3. **Crear Policy #1 - SELECT (Ver fotos):**
   - Click **"New Policy"**
   - Click **"For full customization"**
   - **Policy name:** `Public can view business images`
   - **Allowed operation:** SELECT
   - **Target roles:** `public`
   - **USING expression:**
   ```sql
   true
   ```
   - Click **"Review"** → **"Save policy"**

4. **Crear Policy #2 - INSERT (Subir fotos):**
   - Click **"New Policy"**
   - **Policy name:** `Owners can upload images to their businesses`
   - **Allowed operation:** INSERT
   - **Target roles:** `authenticated`
   - **WITH CHECK expression:**
   ```sql
   (storage.foldername(name))[1] IN (
     SELECT id::text FROM businesses WHERE owner_id = auth.uid()
   )
   ```
   - Click **"Review"** → **"Save policy"**

5. **Crear Policy #3 - DELETE (Eliminar fotos):**
   - Click **"New Policy"**
   - **Policy name:** `Owners can delete their own images`
   - **Allowed operation:** DELETE
   - **Target roles:** `authenticated`
   - **USING expression:**
   ```sql
   (storage.foldername(name))[1] IN (
     SELECT id::text FROM businesses WHERE owner_id = auth.uid()
   )
   ```
   - Click **"Review"** → **"Save policy"**

---

### ✅ PASO 4: Verificación Final

Ejecuta este SQL para verificar que TODO esté correcto:

```sql
-- 1. Verificar tabla businesses
SELECT COUNT(*) as total_columns
FROM information_schema.columns 
WHERE table_name = 'businesses';
-- Debería devolver ~25 columnas

-- 2. Verificar columnas premium
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles'
AND column_name LIKE '%premium%';
-- Debería mostrar: is_premium, premium_since, premium_until

-- 3. Verificar trigger de límite
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_name = 'enforce_business_limit';
-- Debería mostrar: enforce_business_limit

-- 4. Verificar policies de Storage
SELECT policyname 
FROM pg_policies 
WHERE tablename = 'objects';
-- Debería mostrar las 3 policies
```

---

## 🎯 ¿Qué Sigue Después de Esto?

Una vez completados estos 4 pasos, podrás:

1. ✅ **Registrar negocios** con todos los campos nuevos
2. ✅ **Subir fotos** desde BusinessEditPage
3. ✅ **Límite automático** de 2 negocios para usuarios gratuitos
4. ✅ **Aprobar negocios** desde `/admin/businesses`
5. ✅ **Ver negocios aprobados** en el mapa con pin dorado

---

## 🐛 Troubleshooting

### Error: "relation businesses does not exist"
**Solución:** El script `businesses_schema.sql` no se ejecutó correctamente. Vuélvelo a ejecutar.

### Error: "column is_premium does not exist"
**Solución:** El script `premium_system.sql` no se ejecutó. Ejecuta ese script.

### Error al subir fotos: "new row violates row-level security policy"
**Solución:** Las policies de Storage no están configuradas correctamente. Revisa el Paso 3.2.

### Las fotos se suben pero no se ven
**Solución:** El bucket no está configurado como público. Ve a Storage → business-images → Settings → Public: ON.

---

## 📞 Si Necesitas Ayuda

Copia el error exacto que te salga y me lo pasas. Necesito ver:
- El mensaje de error completo
- En qué paso estabas
- Captura de pantalla si es posible
