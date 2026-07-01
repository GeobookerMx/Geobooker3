// src/components/agent/ChatWidget.jsx
/**
 * Widget de chat flotante con asistente AI de Geobooker
 * Usa Netlify Functions para consultar el asistente del lado servidor
 */
import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MessageCircle, X, Send, Loader2, Bot, User, Sparkles, ArrowRight, LifeBuoy, Megaphone, Search, ShieldCheck, Mail } from 'lucide-react';
import { sendMessageToGemini } from '../../services/geminiService';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';

function ChatWidget() {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showQuickReplies, setShowQuickReplies] = useState(true);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const isEnglish = (i18n.language || '').toLowerCase().startsWith('en');

    const [sessionId] = useState(() => {
        if (typeof window === 'undefined') return 'session_ssr';
        let sId = sessionStorage.getItem('geobot_session_id');
        if (!sId) {
            sId = 'session_' + Math.random().toString(36).substring(2, 15) + '_' + Date.now();
            sessionStorage.setItem('geobot_session_id', sId);
        }
        return sId;
    });

    const quickReplies = [
        t('chat.qr.register'),
        t('chat.qr.advertise'),
        t('chat.qr.invoicing'),
        t('chat.qr.search'),
        t('chat.qr.contact'),
        t('chat.qr.problem')
    ];

    const actionLinks = [
        {
            to: '/',
            icon: Search,
            label: t('chat.actions.searchBusinesses', { defaultValue: isEnglish ? 'Search businesses' : 'Buscar negocios' }),
            tone: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
        },
        {
            to: '/claim',
            icon: ShieldCheck,
            label: t('chat.actions.claimBusiness', { defaultValue: isEnglish ? 'Claim business' : 'Reclamar negocio' }),
            tone: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
        },
        {
            to: '/advertise',
            icon: Megaphone,
            label: t('chat.actions.advertise', { defaultValue: isEnglish ? 'Advertise' : 'Publicitar' }),
            tone: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
        },
        {
            to: '/faq',
            icon: LifeBuoy,
            label: t('chat.actions.faq', { defaultValue: 'FAQ' }),
            tone: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
        }
    ];

    useEffect(() => {
        if (isOpen && messages.length === 0) {
            setMessages([{
                id: 'welcome',
                role: 'assistant',
                content: t('chat.welcome'),
                timestamp: new Date()
            }]);
        }
    }, [isOpen, messages.length, t]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 120);
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

        setMessages((prev) => [...prev, userMessage]);
        setInputValue('');
        setShowQuickReplies(false);
        setIsLoading(true);

        try {
            const history = messages
                .filter((message) => message.id !== 'welcome')
                .map((message) => ({
                    role: message.role === 'user' ? 'user' : 'assistant',
                    content: message.content
                }));

            const result = await sendMessageToGemini(text.trim(), history, sessionId, user?.id);

            const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: result.success
                    ? result.response
                    : result.error || t('chat.error'),
                timestamp: new Date(),
                isError: !result.success
            };

            setMessages((prev) => [...prev, assistantMessage]);
        } catch (error) {
            console.error('Error en chat:', error);
            setMessages((prev) => [...prev, {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: t('chat.connError'),
                timestamp: new Date(),
                isError: true
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <>
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 md:bottom-6 md:right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 via-sky-500 to-cyan-500 text-white shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-blue-500/30"
                    aria-label={t('chat.openAssistant')}
                >
                    <MessageCircle className="h-7 w-7 group-hover:hidden" />
                    <span className="absolute -right-1 -top-1 flex h-4 w-4 rounded-full border-2 border-white bg-emerald-400"></span>
                </button>
            )}

            {isOpen && (
                <div className="fixed inset-x-2 bottom-2 top-auto z-50 flex h-[min(82vh,760px)] flex-col overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_20px_70px_rgba(15,23,42,0.25)] md:inset-x-auto md:bottom-6 md:right-6 md:w-[25rem] md:max-w-[calc(100vw-3rem)]">
                    <div className="bg-gradient-to-r from-slate-950 via-blue-900 to-cyan-700 px-4 py-4 text-white">
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
                                    <Bot className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold tracking-wide">{t('chat.title')}</h3>
                                    <p className="mt-1 flex items-center text-xs text-cyan-100">
                                        <span className="mr-2 h-2 w-2 rounded-full bg-emerald-400"></span>
                                        {t('chat.online')}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="rounded-full p-2 text-white/90 transition-colors hover:bg-white/15"
                                aria-label={t('common.close')}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="mt-3 rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-sm text-blue-50">
                            <p className="font-medium">{t('chat.helperTitle', { defaultValue: isEnglish ? 'I can help you with:' : 'Puedo ayudarte con:' })}</p>
                            <p className="mt-1 text-xs leading-5 text-blue-100/90">
                                {t('chat.helperSubtitle', {
                                    defaultValue: isEnglish
                                        ? 'Claiming your business, advertising, invoicing, support and how Geobooker works.'
                                        : 'Reclamar tu negocio, anunciarte, facturacion, soporte y como funciona Geobooker.'
                                })}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-3 md:px-4">
                        {messages.length <= 1 && (
                            <div className="mb-3 grid grid-cols-2 gap-2">
                                {actionLinks.map((action) => {
                                    const Icon = action.icon;
                                    return (
                                        <Link
                                            key={action.to}
                                            to={action.to}
                                            className={`flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs font-medium transition-colors ${action.tone}`}
                                        >
                                            <Icon className="h-4 w-4" />
                                            <span className="truncate">{action.label}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}

                        <div className="space-y-4">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`flex max-w-[92%] items-start gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
                                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${message.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'}`}>
                                            {message.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                                        </div>
                                        <div className={`rounded-2xl px-4 py-3 text-sm leading-6 ${message.role === 'user'
                                            ? 'rounded-br-sm bg-blue-600 text-white'
                                            : message.isError
                                                ? 'rounded-bl-sm border border-red-200 bg-red-50 text-red-700'
                                                : 'rounded-bl-sm border border-slate-200 bg-white text-slate-800 shadow-sm'
                                            }`}>
                                            <p className="whitespace-pre-wrap">{message.content}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="flex items-start gap-2">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                                            <Bot className="h-4 w-4" />
                                        </div>
                                        <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
                                            <div className="flex space-x-1">
                                                <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                                <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '120ms' }}></div>
                                                <div className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '240ms' }}></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {showQuickReplies && messages.length <= 1 && (
                                <div className="rounded-2xl border border-slate-200 bg-white px-3 py-3 shadow-sm">
                                    <p className="mb-2 text-center text-xs font-medium uppercase tracking-[0.18em] text-slate-500">
                                        {t('chat.quickRepliesTitle', { defaultValue: isEnglish ? 'Suggested questions' : 'Preguntas sugeridas' })}
                                    </p>
                                    <div className="flex flex-wrap gap-2 justify-center">
                                        {quickReplies.map((reply, index) => (
                                            <button
                                                key={`${reply}-${index}`}
                                                onClick={() => handleSendMessage(reply)}
                                                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition-colors hover:border-blue-300 hover:bg-blue-100"
                                            >
                                                {reply}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div ref={messagesEndRef} />
                    </div>

                    <div className="border-t border-slate-200 bg-white px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 md:px-4">
                        <div className="mb-2 flex items-center gap-2 overflow-x-auto pb-1">
                            <a
                                href="mailto:hola@geobooker.com.mx"
                                className="flex-shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100"
                            >
                                <span className="inline-flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> hola@geobooker.com.mx</span>
                            </a>
                            <Link
                                to="/advertise"
                                className="flex-shrink-0 rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-medium text-purple-700 transition-colors hover:bg-purple-100"
                            >
                                <span className="inline-flex items-center gap-1.5">{t('chat.ctaAdvertise', { defaultValue: isEnglish ? 'See advertising' : 'Ver publicidad' })}<ArrowRight className="h-3.5 w-3.5" /></span>
                            </Link>
                        </div>
                        <div className="flex items-end gap-2">
                            <input
                                ref={inputRef}
                                type="text"
                                value={inputValue}
                                onChange={(event) => setInputValue(event.target.value)}
                                onKeyDown={handleKeyPress}
                                placeholder={t('chat.placeholder')}
                                className="min-h-11 flex-1 rounded-2xl border border-slate-300 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                disabled={isLoading}
                            />
                            <button
                                onClick={() => handleSendMessage()}
                                disabled={!inputValue.trim() || isLoading}
                                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                            </button>
                        </div>
                        <p className="mt-2 text-center text-[11px] text-slate-400">
                            {t('chat.poweredBy')}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}

class ChatWidgetErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error) {
        console.warn('[ChatWidget] Error atrapado por boundary local:', error?.message);
    }

    render() {
        if (this.state.hasError) {
            return null;
        }

        return this.props.children;
    }
}

export default function ChatWidgetWithBoundary() {
    return (
        <ChatWidgetErrorBoundary>
            <ChatWidget />
        </ChatWidgetErrorBoundary>
    );
}
