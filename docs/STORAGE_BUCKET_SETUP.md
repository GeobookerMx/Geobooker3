# 📦 Guía Rápida: Crear Storage Bucket en Supabase

## ⏱️ Tiempo: 5 minutos

---

## 📍 Paso 1: Crear Bucket

1. Abre **Supabase Dashboard**
2. Ve a **Storage** (menú lateral izquierdo)
3. Click **"New bucket"**
4. Configura:
   - **Name:** `business-assets`
   - **Public bucket:** ✅ **Marcar como público**
   - Click **"Create bucket"**

---

## 🔐 Paso 2: Configurar Policies (4 policies)

### Policy 1: Lectura Pública ✅

1. Click en el bucket `business-assets` que acabas de crear
2. Ve a la pestaña **"Policies"**
3. Click **"New Policy"**
4. En la ventana que aparece, selecciona **"For full customization" (Custom)**
5. Configurar:

```
Policy name: public_read
Allowed operation: SELECT
Policy definition - USING expression:
bucket_id = 'business-assets'
```

6. Click **"Save"**

---

### Policy 2: Upload Autenticado 📤

1. Click **"New Policy"** otra vez
2. Configurar:

```
Policy name: authenticated_upload
Allowed operation: INSERT
Policy definition - WITH CHECK expression:
bucket_id = 'business-assets'
```

3. Click **"Save"**

---

### Policy 3: Update Propio ✏️

1. Click **"New Policy"**
2. Configurar:

```
Policy name: user_update_own
Allowed operation: UPDATE
Policy definition - USING expression:
bucket_id = 'business-assets'
```

3. Click **"Save"**

---

### Policy 4: Delete Propio 🗑️

1. Click **"New Policy"**
2. Configurar:

```
Policy name: user_delete_own
Allowed operation: DELETE
Policy definition - USING expression:
bucket_id = 'business-assets'
```

3. Click **"Save"**

---

## ✅ Verificación

Una vez configurado, deberías ver:

- ✅ 1 bucket: `business-assets` (público)
- ✅ 4 policies activas

Para probar:

```javascript
// En consola del navegador o en tu app:
const { data, error } = await supabase.storage
    .from('business-assets')
    .list();

console.log('Bucket funciona:', !error);
```

---

## 📁 Estructura Automática

Los componentes crearán esta estructura automáticamente:

```
business-assets/
├── business-logos/
│   └── {business-id}-{timestamp}.png
└── business-photos/
    └── {business-id}-{timestamp}-{index}.jpg
```

---

## 🎯 Componentes Que Usarán Este Bucket:

- ✅ `LogoUploadSection.jsx` - Subir logos
- ✅ `PhotoGallery.jsx` - Galería de fotos

---

**Una vez completado, el sistema estará 100% funcional** 🎉
