// src/components/modals/UpgradeRequiredModal.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { Crown, X, Store, Check, ArrowRight } from 'lucide-react';

const UpgradeRequiredModal = ({ isOpen, onClose, currentBusinessCount = 1 }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-fade-in">
                {/* Header */}
                <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/20 rounded-full">
                            <Crown className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">¡Actualiza a Premium!</h2>
                            <p className="text-white/80">Desbloquea negocios ilimitados</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-3">
                            <Store className="w-6 h-6 text-yellow-600" />
                            <div>
                                <p className="font-semibold text-gray-900">
                                    Ya tienes {currentBusinessCount} negocio{currentBusinessCount > 1 ? 's' : ''} registrado{currentBusinessCount > 1 ? 's' : ''}
                                </p>
                                <p className="text-sm text-gray-600">
                                    El plan gratuito permite solo 1 negocio
                                </p>
                            </div>
                        </div>
                    </div>

                    <h3 className="font-bold text-gray-900 mb-4">Con Premium obtienes:</h3>

                    <ul className="space-y-3 mb-6">
                        <li className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-gray-700">Negocios ilimitados</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-gray-700">Pin destacado en el mapa</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-gray-700">Badge de verificación ✓</span>
                        </li>
                        <li className="flex items-center gap-3">
                            <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                <Check className="w-4 h-4 text-green-600" />
                            </div>
                            <span className="text-gray-700">Estadísticas avanzadas</span>
                        </li>
                    </ul>

                    {/* CTA */}
                    <div className="space-y-3">
                        <Link
                            to="/dashboard/upgrade"
                            className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white py-3 px-6 rounded-lg font-bold hover:from-yellow-500 hover:to-orange-600 transition flex items-center justify-center gap-2"
                        >
                            <Crown className="w-5 h-5" />
                            Actualizar a Premium
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <button
                            onClick={onClose}
                            className="w-full bg-gray-100 text-gray-600 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 transition"
                        >
                            Quizás después
                        </button>
                    </div>
                </div>

                {/* Footer Note */}
                <div className="bg-gray-50 px-6 py-3 text-center border-t">
                    <p className="text-xs text-gray-500">
                        💰 Precio especial de lanzamiento: <span className="font-bold text-green-600">$119/mes</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default UpgradeRequiredModal;
