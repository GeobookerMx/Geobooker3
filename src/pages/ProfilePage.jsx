// src/pages/ProfilePage.jsx - VERSIÓN PROFESIONAL MEJORADA
import React, { useState, useEffect } from 'react';
import { useApp } from "../contexts/AppContext";
import { supabase } from "../lib/supabase";
import { toast } from 'react-hot-toast';

const ProfilePage = () => {
  const { state } = useApp();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    username: '',
    avatar_url: ''
  });

  // Cargar datos del usuario al montar el componente
  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Obtener perfil extendido desde la tabla profiles
        const { data: profile, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;

        setUserData({
          first_name: profile?.first_name || '',
          last_name: profile?.last_name || '',
          email: user.email || '',
          phone: profile?.phone || '',
          username: profile?.username || '',
          avatar_url: profile?.avatar_url || ''
        });
      }
    } catch (error) {
      console.error('Error cargando perfil:', error);
      toast.error('Error al cargar el perfil');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuario no autenticado');

      // Actualizar perfil en la tabla user_profiles
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          first_name: userData.first_name,
          last_name: userData.last_name,
          phone: userData.phone,
          username: userData.username,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      toast.success('Perfil actualizado correctamente');
      setIsEditing(false);
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setUserData({
      ...userData,
      [e.target.name]: e.target.value
    });
  };

  const getInitials = () => {
    return `${userData.first_name?.[0] || ''}${userData.last_name?.[0] || ''}`.toUpperCase() || 'US';
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header del Perfil */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Mi Perfil</h1>
        <p className="text-gray-600 text-lg">Gestiona tu información personal y preferencias</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Panel Lateral - Información de Cuenta */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 sticky top-6">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                <span className="text-white font-bold text-2xl">
                  {getInitials()}
                </span>
              </div>
              <h2 className="text-xl font-semibold text-gray-800">
                {userData.first_name} {userData.last_name}
              </h2>
              <p className="text-gray-500 text-sm mt-1">{userData.email}</p>
            </div>

            <div className="space-y-4 border-t border-gray-200 pt-6">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Miembro desde</span>
                <span className="text-gray-800 font-medium">2024</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Rol</span>
                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                  Usuario
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Negocios</span>
                <span className="text-blue-600 font-semibold">2</span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel Principal - Formulario */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            {/* Header del Formulario */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-white">Información Personal</h3>
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="bg-white text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-50 transition duration-300 font-semibold"
                >
                  {isEditing ? 'Cancelar' : 'Editar Perfil'}
                </button>
              </div>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Nombre <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="first_name"
                    value={userData.first_name}
                    onChange={handleChange}
                    disabled={!isEditing || loading}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition duration-200"
                    placeholder="Tu nombre"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Apellidos <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="last_name"
                    value={userData.last_name}
                    onChange={handleChange}
                    disabled={!isEditing || loading}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition duration-200"
                    placeholder="Tus apellidos"
                  />
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-semibold mb-2">
                  Nombre de Usuario
                </label>
                <input
                  type="text"
                  name="username"
                  value={userData.username}
                  onChange={handleChange}
                  disabled={!isEditing || loading}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition duration-200"
                  placeholder="tu_usuario"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={userData.email}
                    onChange={handleChange}
                    disabled={true} // Email no se puede editar directamente
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    placeholder="tu@email.com"
                  />
                  <p className="text-sm text-gray-500 mt-1">Contacta con soporte para cambiar el email</p>
                </div>

                <div>
                  <label className="block text-gray-700 font-semibold mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={userData.phone}
                    onChange={handleChange}
                    disabled={!isEditing || loading}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed transition duration-200"
                    placeholder="+52 55 1234 5678"
                  />
                </div>
              </div>

              {/* Sección de Acciones */}
              {isEditing && (
                <div className="flex flex-col sm:flex-row gap-4 justify-end pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    disabled={loading}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-300 font-semibold disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 font-semibold disabled:opacity-50 flex items-center justify-center"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        Guardando...
                      </>
                    ) : (
                      'Guardar Cambios'
                    )}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Sección de Negocios del Usuario */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 mt-6 p-6">
            <h3 className="text-xl font-semibold text-gray-800 mb-4">Mis Negocios</h3>
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-gray-400 text-2xl">🏢</span>
              </div>
              <p className="text-gray-600 mb-4">Aún no tienes negocios registrados</p>
              <a
                href="/add-business"
                className="inline-flex items-center bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition duration-300 font-semibold"
              >
                <span className="mr-2">+</span>
                Agregar Mi Primer Negocio
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;