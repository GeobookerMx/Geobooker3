# 📋 Explicación: Formularios de Negocio

## 🔍 Diferencia Entre Registro vs Edición

### **BusinessFormPage** (`/business/register`)
**Propósito:** Alta rápida de negocio

**Campos MÍNIMOS (Solo lo esencial):**
- ✅ Nombre del negocio
- ✅ Categoría
- ✅ Ubicación en mapa (lat/lng)
- ✅ Dirección
- ✅ Teléfono

**NO incluye:**
- ❌ Nombre del encargado
- ❌ Facturación
- ❌ Vacantes
- ❌ Fotos
- ❌ Redes sociales
- ❌ Horarios

**Flujo:**
1. Usuario registra negocio rápido
2. Negocio queda como "Pendiente"
3. Usuario puede completar más tarde en el editor

---

### **BusinessEditPage** (`/dashboard/business/:id/edit`)
**Propósito:** Edición completa del negocio

**Secciones:**

#### 1. Información Básica
- Nombre del negocio
- **Nombre del encargado** ⭐
- Categoría
- Descripción

#### 2. Ubicación
- Mapa interactivo
- Dirección completa

#### 3. Contacto
- Teléfono
- WhatsApp
- Email
- Website
- Facebook, Instagram, TikTok

#### 4. Servicios Adicionales ⭐
- **¿Ofrece facturación?** (checkbox)
  - Si marca "Sí": Pide detalles (RFC, razón social)
- **¿Tiene vacantes?** (checkbox)
  - Si marca "Sí": Pide detalles de las vacantes

#### 5. Galería de Fotos
- 1 foto gratis / 10 premium

#### 6. Horarios de Apertura
- Lunes a Domingo
- Hora de apertura/cierre

---

## 🗄️ Campos en Base de Datos

### Campos Básicos (Siempre requeridos)
```sql
name TEXT NOT NULL
category TEXT NOT NULL
latitude DECIMAL NOT NULL
longitude DECIMAL NOT NULL
address TEXT NOT NULL
```

### Campos Opcionales
```sql
manager_name TEXT                -- Nombre del encargado
description TEXT                 -- Descripción
phone TEXT
whatsapp TEXT
website TEXT
email TEXT
facebook TEXT
instagram TEXT
tiktok TEXT
```

### Campos de Servicios
```sql
offers_invoicing BOOLEAN DEFAULT false
invoicing_details TEXT           -- RFC, razón social, etc
has_job_openings BOOLEAN DEFAULT false
job_openings_details TEXT        -- Descripción de vacantes
```

### Campos de Estado
```sql
status TEXT DEFAULT 'pending'    -- pending, approved, rejected
is_featured BOOLEAN DEFAULT false
images TEXT[]                    -- Array de URLs
opening_hours JSONB              -- {lunes: {open:'09:00', close:'18:00'}}
```

---

## 🎯 Estrategia de UX

### Por qué separar Registro de Edición?

**1. Reducir Fricción**
- Formulario de registro: 5 campos
- Tasa de abandono: BAJA
- Usuario registra rápido

**2. Completar Después**
- Usuario regresa al editor cuando quiera
- Agrega fotos, horarios, detalles
- No se siente abrumado

**3. Conversión Premium**
- En el editor: "Sube más fotos → Upgrade"
- Momento perfecto de conversión

---

## 📊 Ejemplo de Flujo

```
USUARIO NUEVO
  │
  ├─ /business/register (RÁPIDO - 2 min)
  │   └─ Nombre: "Tacos El Paisa"
  │   └─ Categoría: Restaurante
  │   └─ Ubicación: (pin en mapa)
  │   └─ Dirección: "Av. Reforma 123"
  │   └─ Teléfono: "555-1234"
  │   └─ SUBMIT → Negocio creado (Pendiente)
  │
  ├─ Ve su negocio en /dashboard
  │   └─ Estado: "Pendiente"
  │   └─ Click "Editar"
  │
  └─ /dashboard/business/1/edit (COMPLETO - 10 min)
      └─ Agrega encargado: "Juan Pérez"
      └─ Marca "Ofrece facturación" ✓
      └─ Detalles: "RFC: XXXX, Razón Social: ..."
      └─ Marca "Tiene vacantes" ✓
      └─ Detalles: "Se busca cocinero con experiencia"
      └─ Sube 1 foto
      └─ Agrega horarios
      └─ GUARDAR → Negocio actualizado
```

---

## 🔄 Actualización Requerida

**Debes ejecutar el nuevo SQL:**
```bash
# Archivo: businesses_schema.sql (VERSIÓN 2)
# Ahora incluye:
- manager_name
- offers_invoicing + invoicing_details
- has_job_openings + job_openings_details
- whatsapp, facebook, instagram, tiktok
```

**Luego actualizar:**
- `BusinessEditPage.jsx` → Agregar secciones de servicios
- `businessService.js` → Mapear nuevos campos

---

## ✅ To-Do Inmediato

1. [ ] Ejecutar `businesses_schema.sql` (VERSIÓN 2)
2. [ ] Actualizar `BusinessEditPage.jsx` con nuevos campos
3. [ ] Actualizar `businessService.js` para guardar todo
4. [ ] Probar registro + edición completa
