# 📸 Configuración de Supabase Storage para Fotos

## Paso 1: Crear el Bucket en Supabase

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Click en **"Storage"** en el menú lateral
3. Click en **"Create a new bucket"**
4. Configuración:
   - **Name:** `business-images`
   - **Public:** ✅ Activado (para que las URLs sean públicas)
   - **File size limit:** 2 MB
   - **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`
5. Click en **"Create bucket"**

---

## Paso 2: Configurar RLS Policies para el Bucket

Ve a **Storage** → **Policies** → **New Policy** para `business-images`:

### Policy 1: Upload de Imágenes
```sql
CREATE POLICY "Usuarios pueden subir imágenes a sus negocios"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'business-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
);
```

### Policy 2: Leer Imágenes (Público)
```sql
CREATE POLICY "Cualquiera puede ver imágenes públicas"
ON storage.objects FOR SELECT
USING (bucket_id = 'business-images');
```

### Policy 3: Eliminar Imágenes
```sql
CREATE POLICY "Usuarios pueden eliminar sus propias imágenes"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'business-images' AND
  (storage.foldername(name))[1] IN (
    SELECT id::text FROM businesses WHERE owner_id = auth.uid()
  )
);
```

---

## Paso 3: Ejecutar Scripts SQL

### 1. Ejecuta `premium_system.sql`
Esto agregará:
- Columnas `is_premium`, `premium_since`, `premium_until` a `user_profiles`
- Trigger que limita a 2 negocios para usuarios gratuitos

### 2. Verifica que todo funcione
```sql
-- Ver estructura de user_profiles
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_profiles';

-- Debería mostrar las nuevas columnas premium
```

---

## Paso 4: Probar el Sistema

### A. Registra un negocio
1. Ve a `/dashboard`
2. Click "Registrar Negocio"
3. Llena el formulario y guarda

###B. Edita y agrega fotos
1. En "Mis Negocios", click "Edit Editar"
2. Sube 1 foto (límite gratis)
3. Intenta subir una 2da → Debería mostrar mensaje de upgrade

### C. Verifica límite de negocios
1. Registra negocio #2
2. Intenta registrar negocio #3
3. Debería bloquearse con mensaje "Máximo 2 negocios"

---

## ✅ Checklist Final

- [ ] Bucket `business-images` creado
- [ ] Bucket es público
- [ ] Policies RLS configuradas
- [ ] Script `premium_system.sql` ejecutado
- [ ] Columnas premium en `user_profiles`
- [ ] Trigger de límite funciona
- [ ] Puedes subir 1 foto gratis
- [ ] 2da foto pide upgrade
- [ ] No puedes crear negocio #3

---

## 🔜 Próximo Paso

Crear la página `/dashboard/upgrade` para vender el plan Premium!
