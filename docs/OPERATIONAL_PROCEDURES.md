# MANUAL DE PROCEDIMIENTOS OPERATIVOS
## Geobooker - Know-How Técnico y Operacional

**Versión:** 1.0  
**Fecha:** 5 de enero de 2026  
**Clasificación:** CONFIDENCIAL - USO INTERNO

---

## 1. PROCEDIMIENTOS DE DESARROLLO

### 1.1 Configuración del Entorno Local

```bash
# 1. Clonar repositorio
git clone https://github.com/GeobookerMx/Geobooker3.git
cd Geobooker3

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con las credenciales

# 4. Iniciar servidor de desarrollo
npm run dev
```

### 1.2 Variables de Entorno Requeridas

| Variable | Descripción | Dónde obtenerla |
|----------|-------------|-----------------|
| VITE_SUPABASE_URL | URL de Supabase | Dashboard Supabase → Settings → API |
| VITE_SUPABASE_ANON_KEY | Clave pública | Dashboard Supabase → Settings → API |
| VITE_GOOGLE_MAPS_API_KEY | API Key de Google Maps | Google Cloud Console |
| VITE_STRIPE_PUBLIC_KEY | Clave pública Stripe | Dashboard Stripe → Developers → API keys |
| VITE_GEMINI_API_KEY | Clave de Gemini AI | Google AI Studio |
| STRIPE_SECRET_KEY | Clave secreta Stripe | Dashboard Stripe (solo en Netlify) |

### 1.3 Flujo de Despliegue

1. **Desarrollo local** → `npm run dev`
2. **Build de producción** → `npm run build`
3. **Commit y push** → `git add -A && git commit -m "mensaje" && git push origin main`
4. **Auto-deploy** → Netlify detecta el push y despliega automáticamente

---

## 2. PROCEDIMIENTOS DE ADMINISTRACIÓN

### 2.1 Aprobar Negocios

1. Acceder a `/admin/businesses`
2. Revisar lista de "Pendientes"
3. Verificar información del negocio
4. Click en ✅ para aprobar o ❌ para rechazar
5. Si rechaza, seleccionar motivo

### 2.2 Gestionar Campañas Publicitarias

1. Acceder a `/admin/ads`
2. Ver campañas por estado (Pendiente, Activa, Pausada)
3. Aprobar creativos antes de activar
4. Monitorear métricas de impresiones y clics

### 2.3 Moderar Reportes de Anuncios

1. Acceder a `/admin/ad-reports`
2. Revisar reportes de usuarios
3. Tomar acción: Pausar campaña / Contactar anunciante / Desestimar

---

## 3. PROCEDIMIENTOS FINANCIEROS

### 3.1 Facturación de Campañas

1. Campaña aprobada → Estado cambia a "active"
2. Sistema calcula IVA automáticamente (16% México, 0% internacional)
3. Acceder a `/admin/revenue` → Tab "Facturación"
4. Generar factura con datos fiscales del cliente
5. Enviar por correo electrónico

### 3.2 Procesamiento de Pagos (Stripe)

1. Cliente selecciona campaña y método de pago
2. Stripe procesa el pago
3. Webhook (`stripe-webhook.js`) recibe confirmación
4. Base de datos actualiza estado de campaña
5. Cliente recibe confirmación por email

---

## 4. PROCEDIMIENTOS DE SOPORTE

### 4.1 Respuesta a Usuarios

**Canal principal:** geobookerr@gmail.com

**Tiempos de respuesta:**
- Urgente (pago fallido): 2 horas
- Normal (dudas): 24 horas
- Bajo (sugerencias): 48 horas

### 4.2 Escalamiento

1. Primer nivel: Email de soporte
2. Segundo nivel: WhatsApp directo
3. Tercer nivel: Llamada telefónica

---

## 5. PROCEDIMIENTOS DE SEGURIDAD

### 5.1 Manejo de Credenciales

- NUNCA commitear archivos .env
- Rotar claves cada 90 días
- Usar claves diferentes para desarrollo y producción

### 5.2 Backup de Base de Datos

- Supabase realiza backups automáticos diarios
- Exportar manualmente antes de cambios grandes
- Guardar copia en drive seguro

### 5.3 Monitoreo

- Revisar logs de Netlify diariamente
- Monitorear errores en consola de Supabase
- Alertas de Stripe para pagos fallidos

---

## 6. GESTIÓN DEL CHATBOT (GEMINI)

### 6.1 Actualizar Información del Chatbot

Archivo: `src/services/geminiService.js`

Editar la constante `SYSTEM_CONTEXT` con información actualizada sobre:
- Precios y planes
- Promociones vigentes
- Información de contacto
- Nuevas funcionalidades

### 6.2 Reglas de Seguridad del Chatbot

El chatbot tiene instrucciones de NUNCA revelar:
- Tecnologías usadas (React, Supabase, etc.)
- Estructura de base de datos
- Información de clientes o anunciantes
- Métricas internas
- Planes no anunciados públicamente

---

## 7. CICLO DE VIDA DE ENTIDADES

### 7.1 Negocio

```
[Registro] → [Pendiente] → [Aprobado/Rechazado] → [Activo] → [Inactivo]
                              ↓
                     [Mover a Pendiente]
```

### 7.2 Campaña Publicitaria

```
[Creada] → [Pago Pendiente] → [Pagada] → [En Revisión] → [Activa] → [Completada]
                                              ↓
                                         [Rechazada]
```

### 7.3 Usuario

```
[Registro] → [Email Verificado] → [Activo] → [Premium] → [Inactivo]
```

---

## 8. MÉTRICAS CLAVE (KPIs)

| Métrica | Descripción | Meta |
|---------|-------------|------|
| Negocios registrados | Total de negocios en plataforma | +100/mes |
| Tasa de aprobación | Negocios aprobados / registrados | >80% |
| Conversión Premium | Usuarios gratuitos → Premium | >5% |
| Ingresos publicitarios | Revenue de Geobooker Ads | Crecimiento 20%/mes |
| Satisfacción chatbot | Conversaciones exitosas | >90% |

---

## 9. CONTACTOS CLAVE

| Rol | Contacto |
|-----|----------|
| Soporte General | geobookerr@gmail.com |
| Ventas/Publicidad | ventasgeobooker@gmail.com |
| WhatsApp | +52 55 2670 2368 |
| Desarrollo Apps | dev@geobooker.com.mx |

---

## 10. GLOSARIO

| Término | Definición |
|---------|------------|
| Negocio nativo | Registrado directamente en Geobooker |
| Negocio de Places | Datos de Google Places API |
| Premium | Suscripción pagada con beneficios |
| Enterprise | Publicidad para grandes marcas |
| PIN | Marcador en el mapa |
| Creativos | Imágenes y textos de anuncios |

---

**NOTA:** Este documento contiene información confidencial. No compartir externamente.

