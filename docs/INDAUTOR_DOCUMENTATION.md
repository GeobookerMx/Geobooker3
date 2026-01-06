# DOCUMENTACIÓN PARA REGISTRO DE DERECHOS DE AUTOR
## GEOBOOKER - Plataforma de Directorio de Negocios Locales

**Para uso en: INDAUTOR México y organismos internacionales de propiedad intelectual**

---

## 1. INFORMACIÓN GENERAL DE LA OBRA

### Título de la Obra
**Geobooker** - Plataforma Web de Directorio de Negocios con Geolocalización

### Tipo de Obra
- Software de aplicación web (Frontend + Backend)
- Programa de computación (fuente y objeto)
- Base de datos estructurada
- Interfaz gráfica de usuario (GUI)

### URL de Producción
- **Sitio Web:** https://geobooker.com.mx
- **Repositorio:** https://github.com/GeobookerMx/Geobooker3

### Datos del Proyecto
- **Fecha de inicio desarrollo:** 24 de noviembre de 2025
- **Fecha de corte documental:** 5 de enero de 2026
- **Total de commits:** 169+
- **Líneas de código estimadas:** 50,000+

---

## 2. DESCRIPCIÓN DE LA OBRA

### ¿Qué es Geobooker?
Geobooker es una plataforma web progresiva (PWA) que funciona como directorio de negocios locales con capacidades de geolocalización en tiempo real. Permite a los usuarios:

1. **Buscar negocios** cercanos a su ubicación
2. **Registrar y gestionar** sus propios negocios
3. **Anunciarse** mediante espacios publicitarios pagados
4. **Obtener verificación Premium** con beneficios exclusivos

### Características Originales Distintivas

#### Sistema de Geolocalización Dual
- Integración con Google Places API para búsquedas externas
- Base de datos propia de negocios nativos verificados
- Visualización combinada en mapa interactivo

#### Sistema de Publicidad Geobooker Ads
- 6 tipos de espacios publicitarios diferenciados
- Sistema de precios dinámico con IVA automático
- Panel de administración para gestión de campañas

#### Asistente Virtual con IA
- Chatbot integrado con Google Gemini AI
- Contexto personalizado para Geobooker
- Reglas de seguridad para protección de información sensible

#### Progressive Web App (PWA)
- Instalable en dispositivos móviles
- Funciona offline parcialmente
- Notificaciones push

---

## 3. ARQUITECTURA TÉCNICA (KNOW-HOW)

### Stack Tecnológico

| Capa | Tecnología | Propósito |
|------|------------|-----------|
| Frontend | React 18, Vite | Interfaz de usuario |
| Estilos | TailwindCSS | Sistema de diseño |
| Maps | Google Maps JavaScript API | Visualización de mapa |
| Places | Google Places API | Búsqueda de negocios externos |
| Backend | Supabase (PostgreSQL) | Base de datos y autenticación |
| Pagos | Stripe API | Procesamiento de pagos |
| AI | Google Gemini API | Asistente virtual |
| Hosting | Netlify | Despliegue y funciones serverless |
| CDN | Netlify Edge | Distribución de contenido |

### Estructura del Código Fuente

```
geobooker3/
├── src/                    # Código fuente principal
│   ├── components/         # 68 componentes React
│   │   ├── admin/          # Componentes de administración
│   │   ├── ads/            # Sistema publicitario
│   │   ├── agent/          # Chatbot AI
│   │   ├── business/       # Gestión de negocios
│   │   ├── common/         # Componentes reutilizables
│   │   ├── layout/         # Layouts y navegación
│   │   └── referral/       # Sistema de referidos
│   ├── pages/              # 56 páginas únicas
│   │   ├── admin/          # Panel de administración
│   │   ├── advertiser/     # Dashboard de anunciantes
│   │   ├── ad-wizard/      # Wizard de creación de campañas
│   │   └── enterprise/     # Publicidad empresarial
│   ├── services/           # 9 servicios de negocio
│   │   ├── analyticsService.js
│   │   ├── geminiService.js
│   │   ├── googlePlacesService.js
│   │   ├── navigationService.js
│   │   └── reportService.js
│   ├── contexts/           # 3 contextos de estado global
│   ├── hooks/              # 7 hooks personalizados
│   └── locales/            # Internacionalización ES/EN
├── netlify/functions/      # 7 funciones serverless
├── supabase/               # 82 scripts SQL
├── public/                 # Assets estáticos
└── docs/                   # Documentación técnica
```

---

## 4. INVENTARIO DE COMPONENTES ORIGINALES

### Páginas Principales (56 archivos)

| Archivo | Líneas ~aprox | Descripción |
|---------|---------------|-------------|
| HomePage.jsx | 850 | Mapa principal con búsqueda |
| BusinessProfilePage.jsx | 400 | Perfil de negocio nativo |
| PlaceProfilePage.jsx | 330 | Perfil de negocio de Google |
| AdvertisePage.jsx | 650 | Catálogo de espacios publicitarios |
| CampaignCreateWizard.jsx | 640 | Wizard de creación de campañas |
| DashboardPage.jsx | 300 | Panel de usuario |

### Componentes Clave (68 archivos)

| Componente | Descripción |
|------------|-------------|
| BusinessMap.jsx | Mapa interactivo con markers |
| ChatWidget.jsx | Widget de chat flotante |
| InstallPWAButton.jsx | Botón de instalación PWA |
| HeroBanner.jsx | Banner publicitario hero |
| SponsoredResult.jsx | Resultado patrocinado |

### Servicios de Negocio (9 archivos)

| Servicio | Líneas | Descripción |
|----------|--------|-------------|
| geminiService.js | 230 | Integración AI con contexto |
| googlePlacesService.js | 480 | Búsqueda y caché de Places |
| navigationService.js | 170 | Tracking y navegación |
| analyticsService.js | 200 | Analytics y métricas |
| reportService.js | 230 | Generación de reportes PDF |

---

## 5. FUNCIONALIDADES ORIGINALES PROTEGIBLES

### 5.1 Sistema de Caché Inteligente
Algoritmo propietario para caché de búsquedas:
- Agrupación por ubicación redondeada (precisión configurable)
- TTL diferenciado por tipo de datos
- Limpieza automática de entradas expiradas

### 5.2 Detección Dual de Negocios
Lógica para distinguir entre negocios de Google Places y negocios nativos de Geobooker:
- Identificación por `isFromGoogle` flag
- Rutas diferenciadas `/business/:id` vs `/place/:placeId`

### 5.3 Sistema de Publicidad Multi-Nivel
- 6 espacios publicitarios con pricing diferenciado
- Sistema Enterprise para marcas internacionales
- Cálculo automático de IVA por país

### 5.4 Asistente AI con Contexto Controlado
- Prompt de sistema con conocimiento de la plataforma
- Reglas de seguridad que previenen filtración de información técnica
- Historial de conversación persistente por sesión

### 5.5 Progressive Web App con Instalación Guiada
- Detección de plataforma (iOS/Android/Desktop)
- Instrucciones específicas para Safari
- Manifest.json con shortcuts personalizados

---

## 6. BASE DE DATOS (ESTRUCTURA)

### Tablas Principales

| Tabla | Propósito | Campos clave |
|-------|-----------|--------------|
| businesses | Negocios registrados | id, name, category, latitude, longitude, is_premium |
| user_profiles | Perfiles de usuario | id, full_name, is_premium_owner, referral_code |
| ad_campaigns | Campañas publicitarias | id, status, budget, ad_space_type |
| ad_spaces | Tipos de espacios | id, name, price_monthly, max_ads |
| ad_creatives | Creativos | id, image_url, headline, cta_url |
| ad_reports | Reportes de anuncios | id, campaign_id, reason, status |

### Políticas de Seguridad (RLS)
- Row Level Security habilitado en todas las tablas
- Políticas diferenciadas para usuarios, administradores y anónimos
- Triggers automáticos para auditoría

---

## 7. SEGURIDAD DE INFORMACIÓN

### El chatbot tiene las siguientes restricciones:

**PROHIBIDO revelar:**
- Arquitectura técnica (código, servidores, APIs)
- Tecnologías utilizadas (React, Supabase, etc.)
- Información de base de datos
- Datos de empleados, fundadores o inversores
- APIs, claves o credenciales
- Métricas internas, usuarios registrados o ingresos
- Información de anunciantes o campañas activas

### Protección de Datos Sensibles
- Variables de entorno para credenciales
- Claves en Netlify Environment Variables
- .gitignore configurado para .env files

---

## 8. HISTÓRICO DE DESARROLLO

### Commits Significativos (muestra)

| Fecha | Descripción |
|-------|-------------|
| 2025-11-24 | Commit inicial del proyecto |
| 2025-12-XX | Implementación de sistema de autenticación |
| 2025-12-XX | Sistema de publicidad Geobooker Ads |
| 2026-01-02 | Sistema de reportes de anuncios |
| 2026-01-05 | PlaceProfilePage para Google Places |
| 2026-01-05 | navigationService con tracking |

---

## 9. PROPIEDAD INTELECTUAL

### Elementos Protegibles

1. **Código Fuente** - Todo el código en /src es original
2. **Algoritmos** - Sistema de caché, detección dual, pricing
3. **Diseño de Base de Datos** - Esquema completo de 82+ tablas
4. **Interfaz de Usuario** - Diseño visual y experiencia de usuario
5. **Marca** - "Geobooker" y logotipos asociados
6. **Contenido** - Textos, traducciones, documentación

### Licencias de Terceros (Open Source)

| Librería | Licencia | Uso |
|----------|----------|-----|
| React | MIT | Framework de UI |
| TailwindCSS | MIT | Estilos |
| Lucide Icons | ISC | Iconos |
| Google Maps JS | Propietaria (API Key) | Mapas |
| Stripe JS | MIT | Pagos |

---

## 10. ANEXOS RECOMENDADOS PARA INDAUTOR

1. **Anexo A:** Impresión completa del código fuente (ordenar por carpeta)
2. **Anexo B:** Capturas de pantalla de la aplicación en producción
3. **Anexo C:** Diagrama de arquitectura
4. **Anexo D:** Manual de usuario
5. **Anexo E:** Bitácora de desarrollo (git log)
6. **Anexo F:** Certificado de dominio geobooker.com.mx

---

## DECLARACIÓN

Este documento describe una obra original de software desarrollada por el titular de los derechos. Todo el código, diseño y arquitectura descritos son creación original, excepto las librerías de terceros debidamente identificadas bajo licencias open source compatibles.

**Fecha de generación:** 5 de enero de 2026

