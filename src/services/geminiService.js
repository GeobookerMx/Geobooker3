// src/services/geminiService.js
/**
 * Servicio de integración con Google Gemini AI
 * Tier gratuito: 60 QPM, 1500 consultas/día
 */

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';

// Contexto del sistema para el agente de Geobooker
const SYSTEM_CONTEXT = `Eres el asistente virtual de Geobooker, una plataforma mexicana de directorio de negocios locales.

Tu rol es ayudar a:
1. **Dueños de negocios**: Con consejos de marketing, fiscalización, operaciones y crecimiento
2. **Clientes/Usuarios**: Con búsqueda de negocios, recomendaciones y uso de la plataforma

Información clave de Geobooker:
- Plataforma para encontrar negocios cercanos por geolocalización
- Los negocios pueden registrarse gratis (1 negocio) o Premium ($299 MXN/mes, negocios ilimitados)
- Ofrecemos espacios publicitarios para negocios
- Operamos principalmente en México

Reglas de comportamiento:
- Responde siempre en español mexicano
- Sé amable, profesional y conciso
- Si no sabes algo, sugiere contactar a soporte@geobooker.com.mx
- Evita dar consejos legales o fiscales específicos, sugiere consultar un profesional
- Límite de respuesta: 200 palabras max`;

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
                    temperature: 0.7,
                    maxOutputTokens: 500,
                    topP: 0.9,
                    topK: 40
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
