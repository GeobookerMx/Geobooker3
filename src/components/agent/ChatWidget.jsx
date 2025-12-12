// src/components/agent/ChatWidget.jsx
/**
 * Widget de chat flotante con asistente AI de Geobooker
 * Usa Google Gemini para respuestas inteligentes
 */
import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles } from 'lucide-react';
import { sendMessageToGemini, QUICK_REPLIES } from '../../services/geminiService';

export default function ChatWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Mensaje inicial de bienvenida
    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: '¡Hola! 👋 Soy el asistente virtual de Geobooker. ¿En qué puedo ayudarte hoy?',
                timestamp: new Date()
            }]);
        }
    }, [isOpen, messages.length]);

    // Auto-scroll al último mensaje
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Focus en input cuando se abre
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    const handleSendMessage = async (text = inputValue) => {
        if (!text.trim() || isLoading) return;

        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: text.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInputValue('');
        setShowQuickReplies(false);
        setIsLoading(true);

        try {
            // Filtrar mensajes para historial (excluir welcome)
            const history = messages
                .filter(m => m.id !== 'welcome')
                .map(m => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    content: m.content
                }));

            const result = await sendMessageToGemini(text.trim(), history);

            const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: result.success
                    ? result.response
                    : result.error || 'Lo siento, hubo un error. Intenta de nuevo.',
                timestamp: new Date(),
                isError: !result.success
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error en chat:', error);
            setMessages(prev => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Lo siento, hubo un problema de conexión. Intenta de nuevo.',
                timestamp: new Date(),
                isError: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const handleQuickReply = (reply) => {
        handleSendMessage(reply);
    };

    return (
        <>
            {/* Botón flotante para abrir chat */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-blue-500/30 hover:scale-110 transition-all duration-300 flex items-center justify-center group"
                    aria-label="Abrir asistente"
                >
                    <MessageCircle className="w-7 h-7 group-hover:hidden" />
                    <Sparkles className="w-7 h-7 hidden group-hover:block animate-pulse" />

                    {/* Badge con punto de notificación */}
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>
                </button>
            )}

            {/* Panel de chat */}
            {isOpen && (
                <div className="fixed bottom-0 right-0 md:bottom-6 md:right-6 z-50 w-full md:w-96 h-[100dvh] md:h-[70vh] md:max-h-[600px] bg-white md:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in border border-gray-200">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                                <Bot className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">Asistente Geobooker</h3>
                                <p className="text-xs text-blue-100 flex items-center">
                                    <span className="w-2 h-2 bg-green-400 rounded-full mr-1 animate-pulse"></span>
                                    En línea
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="p-2 hover:bg-white/20 rounded-full transition-colors"
                            aria-label="Cerrar chat"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mensajes */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div className={`flex items-start space-x-2 max-w-[85%] ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                                    {/* Avatar */}
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gradient-to-r from-blue-500 to-purple-500 text-white'
                                        }`}>
                                        {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                                    </div>

                                    {/* Bubble */}
                                    <div className={`rounded-2xl px-4 py-2 ${message.role === 'user'
                                            ? 'bg-blue-600 text-white rounded-br-sm'
                                            : message.isError
                                                ? 'bg-red-50 text-red-700 border border-red-200 rounded-bl-sm'
                                                : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                                        }`}>
                                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                        {/* Loading indicator */}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="flex items-start space-x-2">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-white" />
                                    </div>
                                    <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Quick replies */}
                        {showQuickReplies && messages.length <= 1 && (
                            <div className="space-y-2">
                                <p className="text-xs text-gray-500 text-center">Preguntas frecuentes:</p>
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {[...QUICK_REPLIES.business.slice(0, 2), ...QUICK_REPLIES.customer.slice(0, 2)].map((reply, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleQuickReply(reply)}
                                            className="text-xs bg-white border border-blue-200 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-50 hover:border-blue-400 transition-colors"
                                        >
                                            {reply}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="p-3 bg-white border-t border-gray-200 flex-shrink-0">
                        <div className="flex items-center space-x-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Escribe tu mensaje..."
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={!inputValue.trim() || isLoading}
                                className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <Send className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                        <p className="text-center text-xs text-gray-400 mt-2">
                            Potenciado por AI 🤖
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
