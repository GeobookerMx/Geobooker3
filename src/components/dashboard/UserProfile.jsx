import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'react-hot-toast';

const UserProfile = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        email: '' // Read only
    });

    useEffect(() => {
        if (user) {
            fetchProfile();
            setFormData(prev => ({ ...prev, email: user.email }));
        }
    }, [user]);

    const fetchProfile = async () => {
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setFormData(prev => ({
                    ...prev,
                    full_name: data.full_name || '',
                    phone: data.phone || ''
                }));
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone,
                    updated_at: new Date()
                })
                .eq('id', user.id);

            if (error) throw error;
            toast.success('Perfil actualizado correctamente');
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error('Error al actualizar perfil');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Mi Perfil</h2>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
                {/* Email (Read Only) */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Correo Electrónico
                    </label>
                    <input
                        type="email"
                        value={formData.email}
                        disabled
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                    />
                    <p className="text-xs text-gray-400 mt-1">El correo electrónico no se puede cambiar.</p>
                </div>

                {/* Nombre Completo */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre Completo
                    </label>
                    <input
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="Tu nombre completo"
                    />
                </div>

                {/* Teléfono */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                    </label>
                    <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                        placeholder="+52 55 1234 5678"
                    />
                </div>

                <div className="pt-4 border-t border-gray-100 mt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Notificaciones Push</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Recibe actualizaciones sobre tus negocios, campañas y recompensas directamente en tu dispositivo.
                    </p>
                    <button
                        type="button"
                        onClick={async () => {
                            try {
                                const permission = await Notification.requestPermission();
                                if (permission === 'granted') {
                                    toast.success('¡Notificaciones activadas!');
                                    // Aquí se podría guardar el subscription token en la DB
                                } else {
                                    toast.error('Permiso de notificaciones denegado');
                                }
                            } catch (error) {
                                console.error('Error requesting notification permission:', error);
                            }
                        }}
                        className="flex items-center gap-2 px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition"
                    >
                        Activar Notificaciones en este dispositivo
                    </button>
                </div>

                <div className="pt-6 border-t border-gray-100 flex gap-4">
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200 font-semibold disabled:opacity-50"
                    >
                        {loading ? 'Guardando...' : 'Guardar Perfil'}
                    </button>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                        Cancelar
                    </button>
                </div>

                {/* Sección de Eliminar Cuenta */}
                <div className="pt-6 mt-6 border-t border-red-100">
                    <h3 className="text-lg font-semibold text-red-600 mb-2">Zona de Peligro</h3>
                    <p className="text-sm text-gray-500 mb-4">
                        Una vez eliminada, tu cuenta y todos tus datos serán borrados permanentemente.
                    </p>
                    <a
                        href="/delete-account"
                        className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition"
                    >
                        🗑️ Eliminar mi cuenta
                    </a>
                </div>
            </form>
        </div>
    );
};

export default UserProfile;
