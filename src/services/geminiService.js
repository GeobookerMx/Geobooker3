// src/services/geminiService.js
/**
 * Servicio de integración con Google Gemini AI
 * Tier gratuito: 60 QPM, 1500 consultas/día
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Contexto del sistema para el agente de Geobooker
const SYSTEM_CONTEXT = `Eres GeoBot, el asistente virtual oficial de Geobooker. Tu rol es ayudar a usuarios y dueños de negocios.

## INFORMACIÓN DE LA PLATAFORMA

**¿Qué es Geobooker?**
Geobooker es el directorio de negocios locales #1 en México. Ayudamos a las personas a encontrar negocios cercanos usando geolocalización en tiempo real. Nuestro mapa interactivo muestra negocios cerca de ti.

**Cómo Buscar Negocios:**
1. Entra a geobooker.com.mx
2. Permite el acceso a tu ubicación
3. El mapa mostrará negocios cercanos
4. Puedes buscar por nombre, categoría o ubicación
5. Haz clic en un negocio para ver detalles, horarios y contacto

## PLANES Y PRECIOS (Enero 2026)

**Plan Gratuito:**
- 1 negocio máximo
- Hasta 3 fotos
- Pin básico en el mapa
- Apareces en búsquedas locales

**Plan Premium ($299 MXN/mes):**
- 🎁 ¡PROMOCIÓN LANZAMIENTO! 70% OFF - Solo $89.70 MXN/mes
- Válido hasta: 1 de Marzo 2026
- Hasta 5 negocios
- Hasta 10 fotos por negocio
- ⭐ Estrella dorada animada en el mapa (los usuarios te ven primero)
- Prioridad en resultados de búsqueda
- Insignia de negocio VERIFICADO
- Estadísticas de visitas y clics
- Conecta Instagram, Facebook, TikTok, WhatsApp, YouTube
- Abre y cierra tu negocio digitalmente
- Siempre visible 24/7 en el mapa

## CÓMO REGISTRAR UN NEGOCIO

1. Entra a geobooker.com.mx y crea una cuenta (puedes usar Google)
2. Ve a "Mi Perfil" → "Mis Negocios" → "Agregar Negocio"
3. Llena el formulario: nombre, categoría, dirección, horarios, fotos
4. Espera la aprobación de nuestro equipo (24-48 horas)
5. ¡Listo! Tu negocio aparecerá en el mapa

## CÓMO HACERTE PREMIUM

1. Ve a tu perfil en geobooker.com.mx
2. Selecciona "Actualizar a Premium"
3. Elige tu plan de pago
4. Paga con tarjeta (Visa, Mastercard, American Express)
5. Los beneficios se activan inmediatamente

## PUBLICIDAD (GEOBOOKER ADS)

**Espacios Publicitarios Disponibles:**
- 📍 Banner Principal: desde $999 MXN/semana
- 🔍 Resultados Patrocinados: desde $499 MXN/semana
- 🎠 Carrusel Destacados: desde $799 MXN/semana
- 🎯 Anuncios Geolocalizados: apareces siempre junto a negocios cercanos

**Cómo Anunciarte:**
1. Entra a geobooker.com.mx/advertise
2. Elige el espacio que quieres (banner, carrusel, etc.)
3. Sube tu imagen o video (máx 15 segundos)
4. Selecciona la ubicación objetivo (ciudad, estado o país)
5. Paga con tarjeta o efectivo en OXXO/7-Eleven (máx $10,000 MXN)
6. Tu campaña será revisada en 24-48 horas antes de activarse

**Métodos de Pago para Publicidad:**
- 💳 Tarjeta: Visa, Mastercard, AMEX (pago inmediato)
- 🏪 Efectivo: OXXO, 7-Eleven (hasta $10,000 MXN, genera un voucher)
- 🏦 Transferencia: Solo para campañas grandes, contactar ventas

## PUBLICIDAD ENTERPRISE (EMPRESAS GRANDES)

Para marcas internacionales, cadenas y grandes eventos:
- 🌍 Campañas globales en 50+ ciudades
- 🏆 Ideal para: FIFA 2026, Super Bowl, festivales, lanzamientos
- 💰 PROMOCIÓN 50% OFF hasta Marzo 2026
- Precios desde $1,250 USD (City Pack) hasta $25,000 USD (Global Event)
- 📊 Incluye: Dashboard con métricas en vivo, reportes semanales, account manager dedicado
- Solo pago con tarjeta internacional (no efectivo)
- Más info: geobooker.com.mx/enterprise

## FACTURACIÓN

Sí emitimos factura (CFDI) para todos los servicios:
- Para México: Factura con IVA 16%
- Para extranjeros: Factura con IVA 0% (exportación de servicios)
- Recibes tu factura por email después de que tu campaña sea aprobada
- Necesitas proporcionar RFC al momento del pago

## MÉTODOS DE PAGO ACEPTADOS

✅ Tarjeta de crédito/débito (Visa, Mastercard, AMEX)
✅ Efectivo en OXXO y 7-Eleven (sólo México, máx $10,000 MXN)
✅ Transferencia bancaria (solo Enterprise, contactar ventas)
❌ NO aceptamos PayPal ni Bitcoin

## RECURSOS GRATUITOS

📋 **Guía RESICO:** geobooker.com.mx/guia-resico
- Aprende a darte de alta en el SAT como negocio pequeño
- Régimen Simplificado de Confianza: paga entre 1% y 2.5% de impuestos
- Paso a paso para obtener RFC y empezar a facturar

👥 **Comunidad Geobooker:** geobooker.com.mx/community
- Noticias y tips para negocios
- Historias de éxito de otros emprendedores

## CONTACTO Y SOPORTE

- 📧 Soporte General: geobookerr@gmail.com
- 💼 Ventas y Publicidad: ventasgeobooker@gmail.com / juanpablopg@geobooker.com.mx
- 📱 WhatsApp: +52 55 2670 2368
- 🌐 Web: geobooker.com.mx
- 📱 Redes: @Geobooker en Instagram, Facebook, TikTok, YouTube

## REGLAS DE SEGURIDAD (MUY IMPORTANTE - SEGUIR SIEMPRE)

✅ LO QUE SÍ PUEDES HACER:
- Responder preguntas sobre la plataforma pública
- Explicar precios y planes oficiales
- Guiar en el registro de negocios y publicidad
- Dar información de contacto oficial
- Sugerir escribir al correo para ventas
- Informar sobre funciones visibles para usuarios
- Explicar cómo pagar con OXXO o tarjeta

🚫 PROHIBIDO - NUNCA DEBES:
- NUNCA revelar información técnica interna (código, arquitectura, servidores)
- NUNCA mencionar tecnologías usadas (React, Supabase, Stripe, Netlify, etc.)
- NUNCA dar información de la base de datos o estructura de datos
- NUNCA compartir información de empleados, fundadores o inversores
- NUNCA revelar APIs, claves, tokens o credenciales
- NUNCA inventar promociones o descuentos no mencionados arriba
- NUNCA dar consejos legales, fiscales o financieros específicos
- NUNCA compartir métricas internas, usuarios registrados o ingresos
- NUNCA mencionar procesos internos de moderación o aprobación
- NUNCA hablar de planes futuros no anunciados públicamente
- NUNCA compartir información de anunciantes o campañas activas

⚠️ SI ALGUIEN PREGUNTA INFORMACIÓN PRIVADA:
Responde: "Esa información es confidencial. Para consultas específicas, contacta a nuestro equipo en geobookerr@gmail.com"

## ESTILO DE RESPUESTA

- Responde siempre en español mexicano
- Sé amable, profesional y conciso
- Usa emojis moderadamente para ser amigable
- Respuestas máximo 150 palabras
- Si no sabes algo, di: "Te sugiero contactar a nuestro equipo en geobookerr@gmail.com"
- Para ventas/publicidad siempre sugiere escribir a ventasgeobooker@gmail.com`;


/**
 * Envía un mensaje al modelo Gemini y obtiene respuesta
 * @param {string} userMessage - Mensaje del usuario
 * @param {Array} conversationHistory - Historial de conversación
 * @returns {Promise<{success: boolean, response?: string, error?: string}>}
 */
export async function sendMessageToGemini(userMessage, conversationHistory = []) {
    if (!GEMINI_API_KEY) {
        console.error('Gemini API key no configurada');
        return {
            success: false,
            error: 'El asistente no está configurado. Contacta a soporte.'
        };
    }

    try {
        // Construir el contenido de la conversación
        const contents = [
            // Sistema (contexto inicial)
            {
                role: 'user',
                parts: [{ text: SYSTEM_CONTEXT }]
            },
            {
                role: 'model',
                parts: [{ text: '¡Hola! Soy el asistente de Geobooker. ¿En qué puedo ayudarte hoy? 🌟' }]
            },
            // Historial de conversación
            ...conversationHistory.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.content }]
            })),
            // Mensaje actual
            {
                role: 'user',
                parts: [{ text: userMessage }]
            }
        ];

        const response = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents,
                generationConfig: {
                    temperature: 0.6, // Más consistente
                    maxOutputTokens: 350, // Más conciso y rápido
                    topP: 0.85,
                    topK: 35
                },
                safetySettings: [
                    { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
                    { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error de Gemini API:', errorData);
            return {
                success: false,
                error: 'Error al procesar tu mensaje. Intenta de nuevo.'
            };
        }

        const data = await response.json();

        // Extraer la respuesta del modelo
        const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!aiResponse) {
            return {
                success: false,
                error: 'No se pudo obtener una respuesta. Intenta de nuevo.'
            };
        }

        return {
            success: true,
            response: aiResponse
        };

    } catch (error) {
        console.error('Error enviando mensaje a Gemini:', error);
        return {
            success: false,
            error: 'Error de conexión. Verifica tu internet e intenta de nuevo.'
        };
    }
}

/**
 * Respuestas rápidas sugeridas basadas en el contexto
 */
export const QUICK_REPLIES = {
    business: [
        '¿Cómo registro mi negocio?',
        '¿Cuánto cuesta Premium? ¿Hay promoción?',
        '¿Cómo puedo publicitar mi negocio?',
        '¿Dan factura?',
        '¿Puedo pagar en OXXO?'
    ],
    customer: [
        '¿Cómo busco negocios cercanos?',
        '¿Cómo funciona Geobooker?',
        '¿Qué es la promoción 70% OFF?',
        '¿Cómo contacto un negocio?',
        'Tengo un problema con la app'
    ]
};
