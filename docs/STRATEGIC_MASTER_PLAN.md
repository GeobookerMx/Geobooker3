# 🏗️ Plan Maestro Estratégico - Geobooker

## 📊 Análisis de tu Visión Completa

Basándome en tu conversación, identifico **5 pilares estratégicos** que quieres implementar:

---

## 🎯 PILAR 1: Guía de Negocios (Business Guide)

### Concepto
Una **plataforma educativa integrada** que acompañe a los dueños de negocios en todo su journey empresarial.

### Módulos Propuestos

#### 📚 1. Antes de Abrir
- **Adaptación de Espacio**
  - Checklist de requisitos legales
  - Cálculo de inversión inicial
  - Diseño de layout optimizado
- **Financiamiento**
  - Fuentes de capital (ahorro, préstamos, inversionistas)
  - Desmitificación de creencias sobre el dinero
  - ROI esperado por tipo de negocio

#### 👥 2. Gestión de Recursos Humanos
- **Reclutamiento de Personal/Familia**
  - Definición de roles
  - Delegación de responsabilidades
  - Quién lleva las cuentas
- **Capacitación**
  - Protocolos de atención al cliente
  - Manejo de caja
  - Higiene y seguridad

#### ⚖️ 3. Estructura Operativa
- **Reglas del Negocio**
  - Horarios y turnos
  - Políticas de devolución
  - Manejo de quejas
- **Conflictos y Confianza**
  - En qué etapa aparecen conflictos típicos
  - Cómo manejar desacuerdos familiares
  - Sistema de incentivos

#### 💰 4. Fiscalización y Legal
- **Facturación Electrónica**
  - ¿Cuándo es obligatorio facturar?
  - Cómo obtener RFC
  - Software recomendado (gratis y de pago)
- **Impuestos**
  - Régimen Simplificado de Confianza (RESICO)
  - Declaraciones mensuales
  - Contador vs autodidacta

#### 📈 5. Crecimiento
- **Herramientas de Ingreso**
  - Marketing digital básico
  - Programas de lealtad
  - Venta cruzada
- **Expansión**
  - Cuándo abrir una segunda sucursal
  - Franquiciar vs crecer orgánicamente

---

## 🤖 PILAR 2: Agent Builder (Asistente AI)

### Arquitectura Propuesta

#### **Dos Agentes Especializados**

##### 1️⃣ **Agente para Dueños de Negocios** (Business Agent)
**Propósito:** Asesoría estratégica y soporte operativo

**Capacidades:**
- **Consultoría:** "¿Cómo aumentar mis ventas?"
- **Troubleshooting:** "Mi empleado se equivocó en la caja"
- **Fiscalización:** "¿Cómo facturo a un cliente?"
- **Marketing:** "Ideas de promociones para mi restaurante"

**Base de Conocimiento:**
- Guía de Negocios (Pilar 1)
- Mejores prácticas por categoría de negocio
- Casos de éxito de otros usuarios Geobooker

##### 2️⃣ **Agente para Consumidores** (Customer Agent)
**Propósito:** Asistencia en búsqueda y reservas

**Capacidades:**
- **Búsqueda:** "Encuentra una farmacia 24hrs cerca de mí"
- **Recomendaciones:** "Restaurante romántico en Polanco"
- **Reservas:** "Agenda cita en estética para mañana"
- **Soporte:** "¿Cómo uso los cupones?"

---

### Canales de Comunicación (Multi-Channel)

#### Opción A: **GPT Agent Builder** (OpenAI)
✅ **Ventajas:**
- Integración nativa con ChatGPT
- Entrenar con tus propios datos
- Voz y texto
- API para incrustar en web/app

❌ **Desventajas:**
- Costo por token
- Requiere internet
- Menos control sobre datos

#### Opción B: **WhatsApp Business API**
✅ **Ventajas:**
- Canal donde YA ESTÁN tus usuarios mexicanos
- Familiaridad (todos usan WhatsApp)
- Pueden enviar fotos, ubicaciones, audios
- Gratis para recibir (solo pagas al enviar plantillas)

❌ **Desventajas:**
- API de WhatsApp tiene aprobación estricta
- Limitaciones de templates
- Costos por mensajes salientes

#### ✅ **MI RECOMENDACIÓN: Ambos (Híbrido)**

```
┌────────────────────────────────────────────┐
│         GEOBOOKER OMNICHANNEL              │
└────────────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
    📱 WhatsApp            🌐 Web/App Agent
   (Principal)              (Complemento)
        │                       │
   ┌────┴────┐            ┌─────┴─────┐
   │         │            │           │
Negocios  Clientes     AI Chat    Tickets
```

**Flujo Propuesto:**
1. **WhatsApp:** Canal principal de comunicación rápida
2. **Web Agent:** Para consultas profundas (guías, análisis)
3. **Tickets Email:** Para soporte técnico o legal

---

## 🔧 PILAR 3: Integración Técnica

### Stack Actual
- **Frontend:** React + Vite
- **Backend:** Supabase (DB + Auth + Storage)
- **Hosting:** Netlify
- **IA:** Antigravity (Google)
- **VCS:** GitHub

### Componentes Nuevos a Integrar

#### 3.1 Sistema de Agentes

**Tabla Supabase:**
```sql
CREATE TABLE agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  channel TEXT, -- 'whatsapp', 'web', 'email'
  agent_type TEXT, -- 'business' | 'customer'
  messages JSONB[], -- [{role:'user', content:'...'}, ...]
  status TEXT DEFAULT 'open', -- 'open', 'resolved', 'escalated'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Integración WhatsApp (Twilio/Meta):**
```javascript
// services/whatsappService.js
import twilio from 'twilio';

export async function sendWhatsAppMessage(to, message) {
  const client = twilio(accountSid, authToken);
  
  await client.messages.create({
    from: 'whatsapp:+14155238886', // Twilio sandbox
    to: `whatsapp:${to}`,
    body: message
  });
}

export async function handleIncomingWhatsApp(req, res) {
  const { From, Body } = req.body;
  
  // Determinar tipo de usuario
  const userType = await getUserType(From);
  
  // Enrutar a agente correspondiente
  let response;
  if (userType === 'business_owner') {
    response = await businessAgent.chat(Body);
  } else {
    response = await customerAgent.chat(Body);
  }
  
  // Responder
  await sendWhatsAppMessage(From, response);
}
```

#### 3.2 PWA/App Integration

**Service Worker (PWA):**
```javascript
// public/sw.js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: '/images/geobooker-logo.png',
    badge: '/images/badge.png',
    data: { url: data.url }
  });
});
```

**Push Notifications:**
- Notificar a negocios cuando hay nueva reserva
- Alertar a usuarios sobre promociones cercanas
- Recordatorios de citas

#### 3.3 Sistema de Tickets por Email

**Tabla Supabase:**
```sql
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_from TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  category TEXT, -- 'technical', 'billing', 'general'
  status TEXT DEFAULT 'new', -- 'new', 'in_progress', 'resolved'
  assigned_to UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Mailgun/SendGrid Webhook:**
```javascript
// api/webhooks/email.js
export async function handleInboundEmail(req, res) {
  const { from, subject, text } = req.body;
  
  // Crear ticket
  await supabase.from('support_tickets').insert({
    email_from: from,
    subject: subject,
    body: text,
    category: detectCategory(subject)
  });
  
  // Enviar auto-respuesta
  await sendEmail(from, 'Recibimos tu mensaje', '...');
}
```

**Categorización Automática:**
- **ventas@geobooker.com.mx** → Tickets de ventas (prospectos)
- **soporte@geobooker.com.mx** → Tickets técnicos
- **legal@geobooker.com.mx** → Consultas legales

---

## 💰 PILAR 4: Sistema de Publicidad

### Espacios Publicitarios

#### 1. **Banner Home Superior**
- **Ubicación:** Debajo del SearchBar en HomePage
- **Dimensiones:** 1200x150px (responsive)
- **Precio:** $999/mes

#### 2. **Carousel Lateral**
- **Ubicación:** Sidebar derecho del mapa
- **Rotación:** 5 negocios cada 10s
- **Precio:** $499/mes

#### 3. **Pin Destacado en Mapa**
- **Efecto:** Pin animado + mayor zIndex
- **Incluye:** Badge "PATROCINADO"
- **Precio:** $299/mes (solo premium)

#### 4. **Tarjeta Sugerida**
- **Ubicación:** Al hacer búsqueda, primeros 3 resultados
- **Precio:** $149/mes

### Integración con Premium

**Opción 1: Tab en UpgradePage**
```jsx
<Tabs>
  <Tab name="Premium">Plan mensual $299</Tab>
  <Tab name="Publicidad">Espacios desde $149</Tab>
</Tabs>
```

**Opción 2: Upsell Contextual**
- Al actualizar a Premium, mostrar modal:
  "¿Quieres destacar aún más? Agrega un banner por $999"

**Opción 3: Página Dedicada**
- `/dashboard/advertising` (para negocios premium)
- Gallery de ejemplos
- Simulador de alcance

---

## 🌍 PILAR 5: Internacionalización

### Implementación con i18next (ya tienes configurado)

**Archivos de traducción:**
```
src/locales/
├── es/
│   └── translation.json  (Español - México)
├── en/
│   └── translation.json  (English - USA)
├── pt/
│   └── translation.json  (Português - Brasil)
└── fr/
    └── translation.json  (Français - Canadá)
```

**Detectar País Automáticamente:**
```javascript
// utils/localeDetector.js
export function detectUserLocale() {
  // 1. IP Geolocation (ipapi.co)
  const response = await fetch('https://ipapi.co/json/');
  const { country_code } = await response.json();
  
  // 2. Mapeo de países a idiomas
  const countryLangMap = {
    'MX': 'es',
    'US': 'en',
    'BR': 'pt',
    'CA': 'fr', // o 'en' dependiendo de provincia
  };
  
  return countryLangMap[country_code] || 'es';
}
```

**Adaptaciones Regionales:**
- **Moneda:** MXN, USD, BRL, CAD
- **Formato de teléfono:** +52, +1, +55, +1
- **Categorías de negocios:** Localizadas por cultura

---

## 📋 Plan de Implementación en Fases

### FASE 3A: Fundamentos del Agent Builder (2-3 semanas)
- [ ] Crear tabla `agent_conversations` en Supabase
- [ ] Integrar OpenAI API para agente web
- [ ] Construir componente `<ChatWidget>` en React
- [ ] Entrenar agente con contenido de Guía de Negocios

### FASE 3B: WhatsApp (2 semanas)
- [ ] Registrar número de WhatsApp Business
- [ ] Configurar Twilio o Meta Business API
- [ ] Crear webhook para mensajes entrantes
- [ ] Sincronizar conversaciones con DB

### FASE 3C: Sistema de Tickets (1 semana)
- [ ] Configurar Mailgun/SendGrid
- [ ] Crear tabla `support_tickets`
- [ ] Dashboard admin para tickets
- [ ] Categorización automática

### FASE 4: Guía de Negocios (3-4 semanas)
- [ ] Escribir contenido de los 5 módulos
- [ ] Diseñar UI de learning platform
- [ ] Componentes: `<CourseModule>`, `<Checklist>`, `<Quiz>`
- [ ] Gamificación (progreso, badges)

### FASE 5: Publicidad (1-2 semanas)
- [ ] Tabla `ad_placements` en Supabase
- [ ] Componentes `<Banner>`, `<SponsoredPin>`
- [ ] Dashboard de compra de espacios
- [ ] Analytics de impresiones/clicks

### FASE 6: i18n (1 semana)
- [ ] Traducir todos los textos a EN, PT, FR
- [ ] Implementar selector de idioma
- [ ] Geo-detection automática
- [ ] Adaptaciones regionales

---

## 🎯 Recomendación de Prioridad

**AHORA (Corto Plazo):**
1. ✅ Terminar Admin Dashboard (aprobar negocios)
2. ✅ Configurar SQL y Storage
3. 🔄 Crear Guía de Negocios (MVP con 2-3 módulos)
4. 🔄 Agent Builder Web (ChatGPT + OpenAI API)

**SIGUIENTE (Mediano Plazo):**
5. WhatsApp Integration
6. Sistema de Publicidad
7. PWA notifications

**FUTURO (Largo Plazo):**
8. Internacionalización completa
9. App móvil nativa
10. Marketplace de servicios adicionales

---

## 💡 Respuesta a tus Preguntas Específicas

### ¿OpenAI Agent Builder o WhatsApp?
**Respuesta:** Ambos, pero empieza con OpenAI porque:
- Es más fácil de integrar (API simple)
- Puedes iterar rápido
- WhatsApp requiere aprobación de Meta (1-2 semanas)

### ¿Cómo integrar con PWA/App?
**Respuesta:** 
- Chat web: `<iframe>` o componente React nativo
- WhatsApp: Deep link `wa.me/52XXXXXXXXXX`
- Push Notifications: Service Workers

### ¿Dónde llegan los emails?
**Respuesta:** 
- `ventas@`: CRM integrado (Supabase + SendGrid)
- `soporte@`: Sistema de tickets interno
- Auto-respuestas + routing a admin dashboard

### ¿Cómo mostrar publicidad sin ser invasivo?
**Respuesta:**
- Tab separado en UpgradePage
- Banner sutil en dashboard (no modal popup)
- Sugerencias contextuales ("¿Sabías que puedes destacar tu negocio?")

---

## 📁 Estructura de Archivos Escalable

```
src/
├── pages/
│   ├── user/
│   │   ├── DashboardPage.jsx
│   │   ├── BusinessEditPage.jsx
│   │   └── UpgradePage.jsx
│   ├── admin/
│   │   ├── DashboardHome.jsx
│   │   ├── BusinessApprovals.jsx
│   │   └── TicketsManagement.jsx
│   ├── learning/
│   │   ├── BusinessGuidePage.jsx
│   │   ├── ModuleViewer.jsx
│   │   └── ProgressTracker.jsx
│   └── advertising/
│       ├── AdPlacementsPage.jsx
│       └── AdAnalytics.jsx
├── components/
│   ├── agent/
│   │   ├── ChatWidget.jsx
│   │   ├── AgentMessage.jsx
│   │   └── SuggestedActions.jsx
│   ├── ads/
│   │   ├── Banner.jsx
│   │   ├── SponsoredPin.jsx
│   │   └── CarouselAd.jsx
│   └── learning/
│       ├── CourseModule.jsx
│       ├── ProgressBar.jsx
│       └── CertificateBadge.jsx
├── services/
│   ├── agentService.js
│   ├── whatsappService.js
│   ├── emailService.js
│   └── advertisingService.js
└── locales/
    ├── es/
    ├── en/
    ├── pt/
    └── fr/
```

---

## 🚀 Siguiente Acción

Te propongo que creemos un **documento de arquitectura técnica detallada** para el Agent Builder primero, ya que es el que más impacto tendrá en la experiencia de usuario.

¿Quieres que:
1. Desarrolle el prompt completo para el Business Agent
2. Cree las tablas SQL necesarias
3. Implemente el componente `<ChatWidget>` en React

O prefieres que primero terminemos de pulir el Admin Dashboard y Storage antes de iniciar funcionalidades nuevas?
