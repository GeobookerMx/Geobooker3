// src/components/referral/InviteButton.jsx
/**
 * Referral Invite Button Component
 * Shows a motivational CTA that opens WhatsApp with pre-filled message
 * 
 * Usage: <InviteButton referralCode="ABC123" />
 */
import React, { useState } from 'react';
import {
    Gift, Share2, MessageCircle, Copy, Check,
    Sparkles, Users, X
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function InviteButton({ referralCode, variant = 'default', className = '' }) {
    const [showModal, setShowModal] = useState(false);
    const [copied, setCopied] = useState(false);

    const referralLink = `https://geobooker.com.mx/r/${referralCode}`;

    // WhatsApp message in Spanish
    const whatsappMessage = encodeURIComponent(
        `¡Hola! 👋\n\n` +
        `¿Tienes un negocio y quieres conseguir más clientes? 🚀\n\n` +
        `Te invito a registrar tu negocio GRATIS en Geobooker, ` +
        `una plataforma donde la gente encuentra negocios cerca de ellos.\n\n` +
        `📍 Apareces en el mapa\n` +
        `📱 Los clientes te encuentran fácil\n` +
        `💰 Es 100% gratis\n\n` +
        `Usa mi link para registrarte:\n` +
        `${referralLink}\n\n` +
        `¡Te lo recomiendo! 🌟`
    );

    const whatsappUrl = `https://wa.me/?text=${whatsappMessage}`;

    const handleCopy = () => {
        navigator.clipboard.writeText(referralLink);
        setCopied(true);
        toast.success('¡Link copiado!');
        setTimeout(() => setCopied(false), 3000);
    };

    const handleWhatsApp = () => {
        window.open(whatsappUrl, '_blank');
    };

    // Compact button variant
    if (variant === 'compact') {
        return (
            <button
                onClick={handleWhatsApp}
                className={`flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all ${className}`}
            >
                <MessageCircle className="w-4 h-4" />
                Invitar por WhatsApp
            </button>
        );
    }

    // Full CTA Card variant
    return (
        <>
            {/* Main CTA Card */}
            <div className={`bg-gradient-to-br from-purple-900/50 to-blue-900/50 border border-purple-500/30 rounded-2xl p-6 ${className}`}>
                <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                        <Gift className="w-7 h-7 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-white mb-1">
                            🎁 ¿Conoces a alguien que busque más ventas?
                        </h3>
                        <p className="text-gray-300 text-sm mb-4">
                            Invita amigos con negocio a Geobooker.
                            <span className="text-yellow-400 font-semibold"> ¡Por cada 5 negocios registrados, ganas 30 días Premium!</span>
                        </p>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleWhatsApp}
                                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2.5 rounded-xl font-medium hover:from-green-600 hover:to-green-700 transition-all shadow-lg hover:shadow-green-500/30"
                            >
                                <MessageCircle className="w-5 h-5" />
                                Enviar por WhatsApp
                            </button>

                            <button
                                onClick={() => setShowModal(true)}
                                className="flex items-center gap-2 bg-gray-700 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-gray-600 transition-all"
                            >
                                <Share2 className="w-5 h-5" />
                                Más opciones
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats Badge */}
                <div className="mt-4 pt-4 border-t border-gray-700/50 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <Users className="w-4 h-4" />
                        Tu código: <span className="text-yellow-400 font-mono font-bold">{referralCode}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                        <Sparkles className="w-4 h-4 inline mr-1" />
                        +30 días por cada 5 negocios
                    </div>
                </div>
            </div>

            {/* Share Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-2xl max-w-md w-full p-6 relative">
                        {/* Close Button */}
                        <button
                            onClick={() => setShowModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-white"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                            <Share2 className="w-5 h-5 text-blue-400" />
                            Comparte tu link de invitación
                        </h3>

                        {/* Link Copy Box */}
                        <div className="bg-gray-900 border border-gray-700 rounded-xl p-3 flex items-center gap-3 mb-4">
                            <input
                                type="text"
                                value={referralLink}
                                readOnly
                                className="flex-1 bg-transparent text-white text-sm outline-none"
                            />
                            <button
                                onClick={handleCopy}
                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${copied
                                    ? 'bg-green-500/20 text-green-400'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                    }`}
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4" />
                                        Copiado
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4" />
                                        Copiar
                                    </>
                                )}
                            </button>
                        </div>

                        {/* Share Options */}
                        <div className="space-y-2">
                            <button
                                onClick={handleWhatsApp}
                                className="w-full flex items-center gap-3 bg-green-600 text-white px-4 py-3 rounded-xl hover:bg-green-700 transition-all"
                            >
                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                                    <MessageCircle className="w-5 h-5" />
                                </div>
                                <span className="font-medium">Compartir por WhatsApp</span>
                            </button>

                            <a
                                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('¡Registra tu negocio GRATIS en Geobooker y consigue más clientes! 🚀')}&url=${encodeURIComponent(referralLink)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-3 bg-gray-700 text-white px-4 py-3 rounded-xl hover:bg-gray-600 transition-all"
                            >
                                <div className="w-10 h-10 bg-blue-400/20 rounded-lg flex items-center justify-center">
                                    <span className="text-lg">𝕏</span>
                                </div>
                                <span className="font-medium">Compartir en X</span>
                            </a>

                            <a
                                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full flex items-center gap-3 bg-gray-700 text-white px-4 py-3 rounded-xl hover:bg-gray-600 transition-all"
                            >
                                <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                                    <span className="text-lg font-bold text-blue-400">f</span>
                                </div>
                                <span className="font-medium">Compartir en Facebook</span>
                            </a>
                        </div>

                        {/* Reward Info */}
                        <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                            <p className="text-yellow-200 text-sm text-center">
                                🎁 Por cada <strong>5 amigos</strong> que registren su negocio,
                                <strong> ganas 30 días de Premium gratis</strong>
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
