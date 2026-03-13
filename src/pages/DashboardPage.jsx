import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import UserProfile from '../components/dashboard/UserProfile';
import BusinessList from '../components/business/BusinessList';
import InviteButton from '../components/referral/InviteButton';
import UserLevelCard from '../components/gamification/UserLevelCard';
import ReferralDashboard from '../components/referral/ReferralDashboard';
import { RecommendationForm } from '../components/recommendations';
import { Crown, Star, Plus, Clock, CheckCircle, XCircle } from 'lucide-react';


const DashboardPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('businesses');
  const [isPremium, setIsPremium] = useState(false);
  const [businessCount, setBusinessCount] = useState(0);
  const [referralCode, setReferralCode] = useState(null);
  const [showRecommendForm, setShowRecommendForm] = useState(false);
  const [myRecommendations, setMyRecommendations] = useState([]);
  const [loadingRecs, setLoadingRecs] = useState(false);

  useEffect(() => {
    if (user) {
      checkPremiumStatus();
      countBusinesses();
      loadReferralCode();
      loadMyRecommendations();
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

  const loadMyRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const { data, error } = await supabase
        .from('user_recommendations')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMyRecommendations(data || []);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoadingRecs(false);
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
          onClick={() => setActiveTab('recommendations')}
          className={`px-6 py-3 font-medium text-sm transition-colors duration-200 border-b-2 ${activeTab === 'recommendations'
            ? 'border-green-600 text-green-600'
            : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
        >
          ⭐ Mis Recomendaciones
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
        ) : activeTab === 'recommendations' ? (
          <div>
            {/* Header + CTA */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-gray-800">Tus Recomendaciones</h2>
                <p className="text-sm text-gray-500">Negocios que has recomendado a la comunidad</p>
              </div>
              <button
                onClick={() => setShowRecommendForm(true)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-md hover:shadow-lg active:scale-95"
              >
                <Plus className="w-5 h-5" />
                Recomendar
              </button>
            </div>

            {/* Lista */}
            {loadingRecs ? (
              <div className="flex justify-center py-12">
                <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full"></div>
              </div>
            ) : myRecommendations.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
                <div className="text-6xl mb-4">⭐</div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">Aún no has recomendado negocios</h3>
                <p className="text-gray-600 mb-6">Comparte los negocios que te gustan con la comunidad Geobooker</p>
                <button
                  onClick={() => setShowRecommendForm(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold transition-all inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Recomendar mi primer negocio
                </button>
              </div>
            ) : (
              <div className="grid gap-4">
                {myRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className={`bg-white rounded-xl border p-5 transition-shadow hover:shadow-md ${
                      rec.status === 'approved' ? 'border-green-200' :
                      rec.status === 'rejected' ? 'border-red-200' :
                      'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-bold text-gray-900 text-lg">{rec.name}</h3>
                        <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                          <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded capitalize">{rec.category}</span>
                          {rec.address && <span>📍 {rec.address}</span>}
                        </div>
                        {rec.rating > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} className={`w-4 h-4 ${s <= rec.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                            ))}
                          </div>
                        )}
                        {rec.pros && <p className="text-sm text-gray-600 mt-2">👍 {rec.pros}</p>}
                      </div>
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                        rec.status === 'approved' ? 'bg-green-100 text-green-700' :
                        rec.status === 'rejected' ? 'bg-red-100 text-red-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {rec.status === 'approved' && <CheckCircle className="w-3.5 h-3.5" />}
                        {rec.status === 'rejected' && <XCircle className="w-3.5 h-3.5" />}
                        {rec.status === 'pending' && <Clock className="w-3.5 h-3.5" />}
                        {rec.status === 'approved' ? 'Aprobada' : rec.status === 'rejected' ? 'Rechazada' : 'En revisión'}
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 mt-3">
                      {new Date(rec.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <UserProfile />
        )}
      </div>

      {/* Floating Action Button - Recomendar */}
      <button
        onClick={() => setShowRecommendForm(true)}
        className="fixed bottom-6 right-6 z-40 bg-gradient-to-r from-green-600 to-emerald-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center hover:from-green-700 hover:to-emerald-700 transition-all hover:scale-110 active:scale-95 group"
        title="Recomendar Negocio"
      >
        <Star className="w-6 h-6 fill-current group-hover:rotate-12 transition-transform" />
      </button>

      {/* Modal de Recomendar Negocio */}
      <RecommendationForm
        isOpen={showRecommendForm}
        onClose={() => setShowRecommendForm(false)}
        onSuccess={() => loadMyRecommendations()}
      />
    </div>
  );
};

export default DashboardPage;
