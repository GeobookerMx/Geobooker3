// Placeholder temporal - Wizard simplificado
import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function CampaignCreateWizard() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-md p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Crear Campaña Publicitaria
                </h1>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
                    <p className="text-yellow-700">
                        🚧 El wizard de creación está en mantenimiento.
                        Por favor, contacta al administrador para crear campañas.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/admin/ads')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
                >
                    Ir al Dashboard Admin
                </button>
            </div>
        </div>
    );
}
