// src/components/recommendations/RecommendButton.jsx
// Botón flotante para recomendar negocios

import React, { useState } from 'react';
import { ThumbsUp, Plus, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import RecommendationForm from './RecommendationForm';

const RecommendButton = ({ userLocation }) => {
    const { user } = useAuth();
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [showTooltip, setShowTooltip] = useState(false);

    if (!user) return null; // Solo mostrar para usuarios autenticados

    return (
        <>
            {/* Botón flotante */}
            <div className="fixed bottom-24 right-4 z-40">
                <div className="relative">
                    {/* Tooltip */}
                    {showTooltip && (
                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-2 shadow-lg">
                            <div className="flex items-center gap-2 mb-1">
                                <ThumbsUp className="w-3 h-3" />
                                <span className="font-bold">Los Usuarios Recomiendan</span>
                            </div>
                            <p className="opacity-80">Recomienda un negocio que visitaste</p>
                            <div className="absolute -bottom-1 right-4 w-2 h-2 bg-gray-900 rotate-45"></div>
                        </div>
                    )}

                    {/* Botón principal */}
                    <button
                        onClick={() => setIsFormOpen(true)}
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                        className="
              flex items-center gap-2 
              bg-gradient-to-r from-green-500 to-emerald-600 
              text-white px-4 py-3 rounded-full 
              shadow-lg hover:shadow-xl 
              hover:scale-105 transition-all duration-300
              font-semibold text-sm
            "
                    >
                        <div className="bg-white/20 p-1 rounded-full">
                            <Plus className="w-4 h-4" />
                        </div>
                        <span className="hidden sm:inline">Recomendar</span>
                    </button>

                    {/* Pulso de atención (se muestra solo las primeras veces) */}
                    <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                    </span>
                </div>
            </div>

            {/* Modal de formulario */}
            <RecommendationForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                userLocation={userLocation}
                onSuccess={() => {
                    // Opcional: refresh data or show success message
                }}
            />
        </>
    );
};

export default RecommendButton;
