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
Geobooker es el directorio de negocios locales #1 en México. Ayudamos a las personas a encontrar negocios cercanos usando geolocalización en tiempo real.

**Servicios Principales:**
- 📍 Búsqueda de negocios por ubicación
- 🏪 Registro de negocios (gratis y premium)
- 📢 Espacios publicitarios para negocios
- ⭐ Perfiles verificados y destacados

## PLANES Y PRECIOS

**Plan Gratuito:**
- 1 negocio máximo
- Hasta 3 fotos
- Pin básico en el mapa
- Apareces en búsquedas locales

**Plan Premium ($299 MXN/mes):**
- 🎁 ¡OFERTA LANZAMIENTO! 3 MESES GRATIS para los primeros 5,000 negocios
- Hasta 5 negocios
- Hasta 10 fotos por negocio
- ⭐ Estrella dorada animada en el mapa
- Prioridad en resultados de búsqueda
- Insignia de negocio VERIFICADO
- Estadísticas de visitas y clics
- Conecta tus redes sociales (Instagram, Facebook, TikTok, etc.)
- Después de los 3 meses gratis: solo $299/mes

**Publicidad (Geobooker Ads):**
- Banner Principal: desde $999 MXN/semana
- Resultados Patrocinados: desde $499 MXN/semana
- Carrusel Destacados: desde $799 MXN/semana
- Pago con tarjeta o transferencia (NO efectivo)

**Publicidad Enterprise (Empresas Grandes):**
- 🌍 Campañas globales para marcas internacionales
- 🏆 Ideal para eventos: FIFA 2026, Super Bowl, etc.
- 💰 PROMOCIÓN 50% OFF: Desde $1,250 USD/mes
- 📧 Cotizaciones: ventasgeobooker@gmail.com o geobooker.com.mx/enterprise

## CÓMO REGISTRAR UN NEGOCIO

1. Crear cuenta en geobooker.com.mx
2. Click en "Agregar Negocio"
3. Llenar formulario con datos del negocio
4. Esperar aprobación (24-48 horas)
5. ¡Listo! Tu negocio aparece en el mapa

## RECURSOS GRATUITOS

📋 **Guía para darte de alta en el SAT (RESICO):** geobooker.com.mx/guia-resico
- Aprende cómo formalizar tu negocio
- Régimen Simplificado de Confianza: paga entre 1% y 2.5% de impuestos
- Paso a paso para obtener tu RFC y empezar a facturar

## CONTACTO Y SOPORTE

- 📧 Soporte General: geobookerr@gmail.com
- 💼 Ventas y Publicidad: ventasgeobooker@gmail.com
- 📱 WhatsApp: +52 55 2670 2368
- 🌐 Web: geobooker.com.mx

Para PUBLICIDAD, empresas grandes, cadenas o suscripciones especiales → ventasgeobooker@gmail.com
Para soporte técnico o dudas generales → geobookerr@gmail.com

## REGLAS DE SEGURIDAD (MUY IMPORTANTE - SEGUIR SIEMPRE)

✅ LO QUE SÍ PUEDES HACER:
- Responder preguntas sobre la plataforma pública
- Explicar precios y planes oficiales
- Guiar en el registro de negocios
- Dar información de contacto oficial
- Sugerir escribir al correo para ventas
- Informar sobre funciones visibles para usuarios

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
- Para ventas/publicidad siempre sugiere escribir al correo`;


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
        '¿Cuánto cuesta ser Premium?',
        '¿Cómo puedo publicitar mi negocio?',
        '¿Cómo me encuentran los clientes?'
    ],
    customer: [
        '¿Cómo busco negocios cercanos?',
        '¿Cómo funciona Geobooker?',
        '¿Cómo contacto un negocio?',
        'Tengo un problema con la app'
    ]
};
