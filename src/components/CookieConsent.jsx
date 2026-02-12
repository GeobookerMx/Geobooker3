// src/components/CookieConsent.jsx
import React, { useState, useEffect } from 'react';
import { Shield, X } from 'lucide-react';

/**
 * GDPR/ePrivacy Cookie Consent Banner
 * Implements GA4 Consent Mode v2 for EU compliance
 * Required for: EEA visitors, GA4 tracking, remarketing
 */
const CookieConsent = () => {
    const [visible, setVisible] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        // Only show if no consent decision has been made
        const consent = localStorage.getItem('gb_cookie_consent');
        if (!consent) {
            // Delay slightly to avoid layout shift on page load
            const timer = setTimeout(() => setVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, []);

    const updateGtagConsent = (granted) => {
        if (typeof window.gtag === 'function') {
            window.gtag('consent', 'update', {
                analytics_storage: granted ? 'granted' : 'denied',
                ad_storage: granted ? 'granted' : 'denied',
                ad_user_data: granted ? 'granted' : 'denied',
                ad_personalization: granted ? 'granted' : 'denied',
            });
        }
    };

    const handleAcceptAll = () => {
        localStorage.setItem('gb_cookie_consent', JSON.stringify({
            analytics: true,
            marketing: true,
            timestamp: new Date().toISOString()
        }));
        updateGtagConsent(true);
        setVisible(false);
    };

    const handleRejectAll = () => {
        localStorage.setItem('gb_cookie_consent', JSON.stringify({
            analytics: false,
            marketing: false,
            timestamp: new Date().toISOString()
        }));
        updateGtagConsent(false);
        setVisible(false);
    };

    const handleAcceptNecessary = () => {
        localStorage.setItem('gb_cookie_consent', JSON.stringify({
            analytics: false,
            marketing: false,
            timestamp: new Date().toISOString()
        }));
        updateGtagConsent(false);
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-slideUp">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                <div className="p-5 md:p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-1">
                            <Shield className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">
                                🍪 We use cookies
                            </h3>
                            <p className="text-sm text-gray-600 leading-relaxed">
                                We use cookies and similar technologies to analyze traffic, improve your experience,
                                and show relevant content. You can choose which cookies to allow.
                            </p>

                            {showDetails && (
                                <div className="mt-4 space-y-3 text-sm">
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium text-gray-800">Essential Cookies</span>
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Always Active</span>
                                        </div>
                                        <p className="text-gray-500 text-xs mt-1">Required for the site to work: authentication, security, preferences.</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="font-medium text-gray-800">Analytics Cookies</div>
                                        <p className="text-gray-500 text-xs mt-1">Google Analytics 4, Microsoft Clarity — help us understand how visitors use our site.</p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3">
                                        <div className="font-medium text-gray-800">Marketing Cookies</div>
                                        <p className="text-gray-500 text-xs mt-1">Used for advertising targeting and measuring campaign effectiveness.</p>
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3 mt-4">
                                <button
                                    onClick={handleAcceptAll}
                                    className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 transition shadow-sm"
                                >
                                    Accept All
                                </button>
                                <button
                                    onClick={handleAcceptNecessary}
                                    className="px-5 py-2.5 bg-gray-100 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-200 transition"
                                >
                                    Necessary Only
                                </button>
                                <button
                                    onClick={() => setShowDetails(!showDetails)}
                                    className="px-5 py-2.5 text-gray-500 text-sm font-medium hover:text-gray-700 transition underline-offset-2 hover:underline"
                                >
                                    {showDetails ? 'Hide Details' : 'Cookie Details'}
                                </button>
                            </div>
                        </div>
                        <button
                            onClick={handleRejectAll}
                            className="text-gray-400 hover:text-gray-600 transition flex-shrink-0"
                            aria-label="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideUp {
          animation: slideUp 0.4s ease-out;
        }
      `}</style>
        </div>
    );
};

export default CookieConsent;
