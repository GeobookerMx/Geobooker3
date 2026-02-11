// src/components/recommendations/GeobookersRecommend.jsx
// Prompt para recomendar negocios

import React, { useState, useEffect } from 'react';
import { ThumbsUp, Plus, X, Star } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import RecommendationForm from './RecommendationForm';

const GeobookersRecommend = ({ userLocation }) => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Mostrar el prompt 5 segundos después de que el usuario carga la página y está logueado
        if (user) {
            const hasSeenPrompt = sessionStorage.getItem('recommend_prompt_seen');
            if (!hasSeenPrompt) {
                const timer = setTimeout(() => {
                    setIsVisible(true);
                }, 5000);
                return () => clearTimeout(timer);
            }
        }
    }, [user]);

    const handleClose = () => {
        setIsVisible(false);
        sessionStorage.setItem('recommend_prompt_seen', 'true');
    };

    const handleRecommend = () => {
        setIsFormOpen(true);
        setIsVisible(false);
        sessionStorage.setItem('recommend_prompt_seen', 'true');
    };

    if (!user || (!isVisible && !isFormOpen)) return null;

    return (
        <>
            {/* Prompt tipo Card a la izquierda (para no solapar con Chat) */}
            {isVisible && (
                <div className="fixed bottom-24 left-4 z-40 animate-fade-in-up">
                    <div className="bg-white rounded-2xl shadow-2xl border border-indigo-100 p-5 w-72 relative overflow-hidden group">
                        {/* Decoración */}
                        <div className="absolute -top-6 -right-6 w-16 h-16 bg-indigo-50 rounded-full group-hover:scale-150 transition-transform duration-500"></div>

                        <button
                            onClick={handleClose}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <div className="flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center mb-3 shadow-lg group-hover:rotate-12 transition-transform">
                                <Star className="w-6 h-6 fill-current" />
                            </div>

                            <h3 className="font-bold text-gray-900 mb-1">
                                {t('recommendations.title')}
                            </h3>
                            <p className="text-gray-600 text-xs mb-4">
                                {t('recommendations.prompt')}
                            </p>

                            <button
                                onClick={handleRecommend}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2.5 rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                {t('recommendations.cta')}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de formulario (el original) */}
            <RecommendationForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                userLocation={userLocation}
                onSuccess={() => {
                    // Opcional: toast de éxito
                }}
            />
        </>
    );
};

export default GeobookersRecommend;
