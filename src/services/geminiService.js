// src/services/geminiService.js
/**
 * Cliente ligero para el asistente de Geobooker.
 * La llamada real al modelo vive en Netlify Functions para no exponer la API key.
 */

const CHAT_ASSISTANT_ENDPOINT = '/.netlify/functions/chat-assistant';

export async function sendMessageToGemini(userMessage, conversationHistory = [], sessionId = null, userId = null) {
    const trimmedMessage = typeof userMessage === 'string' ? userMessage.trim() : '';

    if (!trimmedMessage) {
        return {
            success: false,
            error: 'Escribe un mensaje para continuar.'
        };
    }

    try {
        const response = await fetch(CHAT_ASSISTANT_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userMessage: trimmedMessage,
                conversationHistory: Array.isArray(conversationHistory) ? conversationHistory.slice(-8) : [],
                pathname: typeof window !== 'undefined' ? window.location.pathname : '/',
                hostname: typeof window !== 'undefined' ? window.location.hostname : 'geobooker.com.mx',
                language: typeof window !== 'undefined'
                    ? (localStorage.getItem('language') || navigator.language || 'es-MX')
                    : 'es-MX',
                sessionId,
                userId
            })
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            return {
                success: false,
                error: data?.error || 'No pudimos responder en este momento. Intenta de nuevo.'
            };
        }

        return {
            success: Boolean(data?.success),
            response: data?.response,
            error: data?.error
        };
    } catch (error) {
        console.error('Error enviando mensaje al asistente:', error);
        return {
            success: false,
            error: 'Error de conexion. Verifica tu internet e intenta de nuevo.'
        };
    }
}

export const QUICK_REPLIES = {
    business: [],
    customer: []
};
