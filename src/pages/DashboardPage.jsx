import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import UserProfile from '../components/dashboard/UserProfile';
import BusinessList from '../components/business/BusinessList';
import InviteButton from '../components/referral/InviteButton';
import UserLevelCard from '../components/gamification/UserLevelCard';
import ReferralDashboard from '../components/referral/ReferralDashboard';
import { Crown } from 'lucide-react';


const DashboardPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('businesses');
  const [isPremium, setIsPremium] = useState(false);
  const [businessCount, setBusinessCount] = useState(0);
  const [referralCode, setReferralCode] = useState(null);

  useEffect(() => {
    if (user) {
      checkPremiumStatus();
      countBusinesses();
      loadReferralCode();
    }
  }, [user]);

  const checkPremiumStatus = async () => {
    try {
      const { data, error } = await supabase.rpc('get_user_premium_status', { user_id: user.id });
      if (error) throw error;
      setIsPremium(data || false);
    } catch (error) {
      console.error('Error checking premium:', error);
    }
  };

  const countBusinesses = async () => {
    try {
      const { data } = await supabase
        .from('businesses')
        .select('id')
        .eq('owner_id', user.id);

      setBusinessCount(data?.length || 0);
    } catch (error) {
      console.error('Error counting businesses:', error);
    }
  };

  const loadReferralCode = async () => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('referral_code')
        .eq('id', user.id)
        .maybeSingle();

      if (data?.referral_code) {
        setReferralCode(data.referral_code);
      } else {
        // Generate new code if not exists
        const newCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        await supabase
          .from('user_profiles')
          .update({ referral_code: newCode })
          .eq('id', user.id);
        setReferralCode(newCode);
      }
    } catch (error) {
      console.error('Error loading referral code:', error);
      // Fallback code
      setReferralCode(user.id?.substring(0, 6).toUpperCase() || 'GEOBKR');
    }
  };

  const showUpgradeBanner = !isPremium && businessCount >= 2;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header del Dashboard */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Hola, {user?.user_metadata?.full_name || 'Usuario'} 👋
              {isPremium && (
                <span className="ml-3 inline-flex items-center bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                  <Crown className="w-4 h-4 mr-1 fill-yellow-500" />
                  Premium
                </span>
              )}
            </h1>
            <p className="text-gray-600">Bienvenido a tu panel de control</p>
          </div>
          {!isPremium && (
            <Link
              to="/dashboard/upgrade"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 transition flex items-center"
            >
              <Crown className="w-5 h-5 mr-2" />
              Actualizar a Premium
            </Link>
          )}
        </div>
      </div>

      {/* Banner de Límite Alcanzado */}
      {showUpgradeBanner && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-xl p-6 mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                🎉 ¡Llegaste al límite de negocios gratuitos!
              </h3>
              <p className="text-gray-700 mb-4">
                Has registrado <strong>2 negocios</strong> en el plan gratuito.
                Actualiza a Premium para registrar negocios ilimitados y desbloquear más funciones.
              </p>
              <ul className="text-sm text-gray-600 mb-4 space-y-1">
                <li>✓ Negocios ilimitados</li>
                <li>✓ Hasta 10 fotos por negocio</li>
                <li>✓ Estadísticas de visitas</li>
                <li>✓ Prioridad en búsquedas</li>
              </ul>
              <Link
                to="/dashboard/upgrade"
                className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
              >
                Ver Planes Premium →
              </Link>
            </div>
            <div className="ml-6">
              <Crown className="w-24 h-24 text-yellow-500" />
            </div>
          </div>
        </div>
      )}

      {/* ===== LEVEL & REFERRAL SECTION ===== */}
      {referralCode && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            🎮 Tu Progreso y Recompensas
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* User Level Card */}
            <UserLevelCard />

            {/* Invite Button */}
            <InviteButton referralCode={referralCode} />
          </div>
        </div>
      )}

      {/* Tabs de Navegación */}
      <div className="flex border-b border-gray-200 mb-8">
        <button
          onClick={() => setActiveTab('businesses')}
          className={`px-6 py-3 font-medium text-sm transition-colors duration-200 border-b-2 ${activeTab === 'businesses'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          Mis Negocios
        </button>
        <button
          onClick={() => setActiveTab('referrals')}
          className={`px-6 py-3 font-medium text-sm transition-colors duration-200 border-b-2 ${activeTab === 'referrals'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          🎁 Referidos
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-6 py-3 font-medium text-sm transition-colors duration-200 border-b-2 ${activeTab === 'profile'
            ? 'border-blue-600 text-blue-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          Mi Perfil
        </button>
      </div>

      {/* Contenido */}
      <div className="min-h-[400px]">
        {activeTab === 'businesses' ? (
          <BusinessList />
        ) : activeTab === 'referrals' ? (
          <ReferralDashboard />
        ) : (
          <UserProfile />
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
