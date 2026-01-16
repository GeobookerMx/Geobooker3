# Configuración de Storage Bucket - Método Correcto (Dashboard)

## ⚠️ Importante
Las policies de Storage NO se pueden crear con SQL. Deben configurarse desde el Dashboard de Supabase.

---

## 📋 Pasos en Supabase Dashboard

### **PASO 1: Crear Bucket**

1. Ve a **Storage** en el menú lateral
2. Click en **"New bucket"**
3. Configurar:
   - **Name:** `business-assets`
   - **Public bucket:** ✅ **SÍ** (marcado)
   - **File size limit:** 5 MB (opcional)
   - **Allowed MIME types:** image/* (opcional)
4. Click **"Create bucket"**

---

### **PASO 2: Configurar Policies**

#### **Policy 1: Lectura Pública**
1. En la lista de buckets, click en `business-assets`
2. Ve a la pestaña **"Policies"**
3. Click **"New Policy"**
4. Selecciona **"Custom"**
5. Configurar:
   ```
   Policy Name: Anyone can view business assets
   Allowed operation: SELECT
   Target roles: public
   
   USING expression:
   bucket_id = 'business-assets'
   ```
6. Click **"Save"**

---

#### **Policy 2: Upload para Autenticados**
1. Click **"New Policy"** otra vez
2. Configurar:
   ```
   Policy Name: Authenticated users can upload
   Allowed operation: INSERT
   Target roles: authenticated
   
   WITH CHECK expression:
   bucket_id = 'business-assets'
   ```
3. Click **"Save"**

---

#### **Policy 3: Update Propio**
1. Click **"New Policy"**
2. Configurar:
   ```
   Policy Name: Users can update own assets
   Allowed operation: UPDATE
   Target roles: authenticated
   
   USING expression:
   bucket_id = 'business-assets' AND auth.uid()::text = (storage.foldername(name))[1]
   ```
3. Click **"Save"**

---

#### **Policy 4: Delete Propio**
1. Click **"New Policy"**
2. Configurar:
   ```
   Policy Name: Users can delete own assets
   Allowed operation: DELETE
   Target roles: authenticated
   
   USING expression:
   bucket_id = 'business-assets' AND auth.uid()::text = (storage.foldername(name))[1]
   ```
3. Click **"Save"**

---

## ✅ Verificación

Una vez configurado, verifica:

```javascript
// En consola del navegador o en tu app:
const { data, error } = await supabase.storage
    .from('business-assets')
    .list();

console.log('Bucket accesible:', !error);
```

---

## 🎯 Configuración Simplificada (Alternativa)

Si solo quieres configuración básica:

**SOLO Policy 1 y 2:**
- ✅ Lectura pública (SELECT)
- ✅ Upload autenticado (INSERT)

Las policies de UPDATE y DELETE son opcionales para empezar.

---

## 📸 Estructura de Carpetas Recomendada

El bucket quedará así:

```
business-assets/
├── business-logos/
│   ├── {business-id}-{timestamp}.png
│   └── {business-id}-{timestamp}.jpg
└── business-photos/
    ├── {business-id}-{timestamp}-1.jpg
    ├── {business-id}-{timestamp}-2.jpg
    └── ...
```

Los componentes (`LogoUploadSection.jsx` y `PhotoGallery.jsx`) ya están configurados para usar estas rutas automáticamente.

---

## 🚨 Si Tienes Problemas

**Error: "Bucket already exists"**
- ✅ No pasa nada, solo configura las policies

**Error: "new row violates row-level security policy"**
- ❌ Falta configurar las policies, revisa PASO 2

**No puedo ver las imágenes**
- ❌ Asegúrate que "Public bucket" esté marcado
- ❌ Verifica que la policy de SELECT esté activa

---

**Tiempo estimado: 5 minutos** ⏱️

Una vez configurado, los componentes `LogoUploadSection` y `PhotoGallery` funcionarán automáticamente.
