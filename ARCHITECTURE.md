# 📁 Arquitectura de Carpetas - Geobooker

## 🎯 Análisis Completo: User vs Admin

---

## ✅ ESTRUCTURA ACTUAL (CORRECTA)

### 📂 `/dashboard` - Dashboard de USUARIOS
**Rutas:**
- `/dashboard` → Vista principal con tabs
- `/dashboard/business/:id/edit` → Editar negocio

**Ubicación de Archivos:**
```
src/
├── pages/
│   ├── DashboardPage.jsx ✅ (User Dashboard principal)
│   └── BusinessEditPage.jsx ✅ (Editar negocio del usuario)
│
├── components/
│   ├── dashboard/
│   │   └── UserProfile.jsx ✅ (Tab "Mi Perfil")
│   │
│   └── business/
│       └── BusinessList.jsx ✅ (Tab "Mis Negocios")
│
└── components/layout/
    └── DashboardLayout.jsx ✅ (Layout para /dashboard)
```

**Propósito:** Usuarios normales gestionan sus negocios

---

### 📂 `/admin/dashboard` - Dashboard de ADMINISTRADOR
**Rutas:**
- `/admin/login` → Login exclusivo admin
- `/admin/dashboard` → Panel de control admin
- `/admin/businesses` → Aprobar/rechazar negocios
- `/admin/users` → Gestionar usuarios
- `/admin/ads` → Gestionar anuncios

**Ubicación de Archivos:**
```
src/
├── pages/admin/
│   ├── AdminLogin.jsx ✅ (Login para admins)
│   ├── DashboardHome.jsx ✅ (Home del admin)
│   ├── DashboardLayout.jsx ✅ (Layout para /admin/*)
│   ├── AdsManagement.jsx ✅ (Gestión de anuncios)
│   ├── BusinessManager.jsx ✅ (Aprobar negocios - pendiente integrar)
│   └── UserManager.jsx ✅ (Gestionar usuarios - pendiente)
│
└── components/admin/
    ├── Sidebar.jsx ✅ (Admin sidebar)
    └── StatsCard.jsx ✅ (Cards de estadísticas)
```

**Propósito:** TÚ (administrador) gestionas la plataforma

---

## 🔍 HALLAZGOS

### ✅ Separación Correcta
- **User pages** están en `src/pages/` (raíz)
- **Admin pages** están en `src/pages/admin/`
- **User components** están en `src/components/dashboard/` y `src/components/business/`
- **Admin components** están en `src/components/admin/`
- **Layouts separados:**
  - `src/components/layout/DashboardLayout.jsx` → Para usuarios
  - `src/pages/admin/DashboardLayout.jsx` → Para admins

### ⚠️ Posible Confusión (MENOR)
**Hay 2 archivos llamados `DashboardLayout.jsx`:**
1. `src/components/layout/DashboardLayout.jsx` (User)
2. `src/pages/admin/DashboardLayout.jsx` (Admin)

**Recomendación:** Renombrar uno para claridad
- `src/components/layout/DashboardLayout.jsx` → **UserDashboardLayout.jsx**
- `src/pages/admin/DashboardLayout.jsx` → **AdminDashboardLayout.jsx** ✅ (Ya se importa con este nombre en router)

---

## 📋 MAPA DE RUTAS COMPLETO

### 🌐 Rutas Públicas (sin auth)
```
/welcome           → WelcomePage
/signup            → SignupPage
/login             → LoginPage
/privacy           → PrivacyPolicyPage
/terms             → TermsOfServicePage
/faq               → FAQPage
```

### 🔒 Rutas Autenticadas (usuarios normales)
```
/                  → HomePage (mapa + búsqueda)
/categories        → CategoriesPage
/business/register → BusinessFormPage (crear negocio)
```

### 👤 Rutas de Usuario Dashboard
```
/dashboard                        → DashboardPage (tabs: Negocios + Perfil)
/dashboard/business/:id/edit      → BusinessEditPage (editar negocio)
/dashboard/upgrade                → 🔜 UpgradePage (pricing premium)
```

### 👨‍💼 Rutas de Admin
```
/admin/login      → AdminLogin
/admin/dashboard  → DashboardHome (vista general)
/admin/businesses → 🔜 BusinessApprovals (aprobar negocios)
/admin/users      → 🔜 UserManager
/admin/ads        → AdsManagement
/admin/analytics  → 🔜 Analytics
/admin/revenue    → 🔜 Revenue
/admin/settings   → 🔜 Settings
```

---

## ✅ CONCLUSIÓN

### La estructura está BIEN ORGANIZADA ✓

**NO hay confusión real** entre user y admin. Los archivos están correctamente separados en:
- `pages/` vs `pages/admin/`
- `components/dashboard/` vs `components/admin/`

### Único Ajuste Sugerido (OPCIONAL)
**Renombrar para máxima claridad:**
```bash
# ANTES:
src/components/layout/DashboardLayout.jsx

# DESPUÉS:
src/components/layout/UserDashboardLayout.jsx
```

Y actualizar el import en `router.jsx`:
```javascript
import UserDashboardLayout from "./components/layout/UserDashboardLayout.jsx";
```

---

## 🚀 PRÓXIMOS ARCHIVOS A CREAR

### Para User Dashboard:
```
src/pages/UpgradePage.jsx              (Pricing premium)
src/components/dashboard/PricingCard.jsx (Componente de plan)
```

### Para Admin:
```
src/pages/admin/BusinessApprovals.jsx  (Aprobar negocios)
```

---

## 🎯 Decisión Final

¿Quieres que:
1. **OPCIÓN A:** Renombre `DashboardLayout.jsx` → `UserDashboardLayout.jsx` (más claro)
2. **OPCIÓN B:** Dejemos todo como está y continuemos (ya funciona bien)

Después de tu decisión, implemento `UpgradePage.jsx` con los precios premium.
