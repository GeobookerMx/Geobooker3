import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { toast } from 'react-hot-toast';

const AccountDeletionPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [reason, setReason] = useState('');

  const handleDeleteRequest = async (e) => {
    e.preventDefault();

    if (confirmText.trim().toUpperCase() !== 'ELIMINAR') {
      toast.error('Escribe ELIMINAR para confirmar');
      return;
    }

    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const user = userData?.user;
      if (!user?.id) {
        toast.error('No se encontró la sesión del usuario');
        return;
      }

      const { error } = await supabase
        .from('account_deletion_requests')
        .insert({
          user_id: user.id,
          email: user.email,
          reason: reason.trim() || null,
          status: 'pending'
        });

      if (error) throw error;

      await supabase.auth.signOut();

      toast.success('Tu solicitud de eliminación de cuenta fue enviada correctamente.');
      navigate('/login');
    } catch (error) {
      console.error('Error al solicitar eliminación de cuenta:', error);
      toast.error(error.message || 'No se pudo procesar la solicitud');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center px-4 py-12">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">Eliminar cuenta</h1>
        <p className="text-gray-600 mb-6">
          Esta acción iniciará la eliminación de tu cuenta y la revisión de tus datos asociados.
        </p>

        <div className="rounded-xl border border-red-200 bg-red-50 p-4 mb-6">
          <p className="text-sm text-red-800">
            Una vez solicitada la eliminación, cerraremos tu sesión y el proceso quedará registrado.
          </p>
        </div>

        <form onSubmit={handleDeleteRequest} className="space-y-5">
          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Motivo de eliminación (opcional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              placeholder="Cuéntanos el motivo, si lo deseas"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-2">
              Escribe <span className="font-bold">ELIMINAR</span> para confirmar
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
              placeholder="ELIMINAR"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 transition duration-300 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Procesando...' : 'Solicitar eliminación de cuenta'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/" className="text-blue-600 hover:underline text-sm">
            ← Volver
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AccountDeletionPage;