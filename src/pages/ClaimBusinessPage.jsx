// src/pages/ClaimBusinessPage.jsx
// Landing page para buscar y reclamar negocios DENUE / existentes
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { Search, Shield, Building2, MapPin, ChevronRight, CheckCircle, ArrowRight } from 'lucide-react';
import ClaimBusinessForm from '../components/business/ClaimBusinessForm';
import { trackEvent } from '../services/analyticsService';
import SEO from '../components/SEO';

const ClaimBusinessPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [showClaimForm, setShowClaimForm] = useState(false);

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim() || query.trim().length < 3) return;

    setLoading(true);
    setSearched(true);

    try {
      // Buscar en negocios nativos + DENUE que NO estén reclamados
      const { data, error } = await supabase
        .from('businesses')
        .select('id, name, category, address, source_type, is_claimed, latitude, longitude')
        .ilike('name', `%${query.trim()}%`)
        .eq('is_claimed', false)
        .limit(20);

      if (error) throw error;

      setResults(data || []);

      trackEvent('claim_search', {
        query: query.trim(),
        results_count: data?.length || 0,
      });
    } catch (err) {
      console.error('Error searching businesses:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBusiness = (business) => {
    setSelectedBusiness(business);
    setShowClaimForm(true);

    trackEvent('claim_business_start', {
      business_id: business.id,
      business_name: business.name,
      source_type: business.source_type || 'native',
    });
  };

  const handleClaimSuccess = () => {
    trackEvent('claim_business_complete', {
      business_id: selectedBusiness?.id,
      business_name: selectedBusiness?.name,
    });
    setShowClaimForm(false);
    setSelectedBusiness(null);
    // Re-search to update list
    handleSearch();
  };

  const getSourceLabel = (sourceType) => {
    switch (sourceType) {
      case 'seed_denue': return { label: 'DENUE / INEGI', color: 'bg-blue-100 text-blue-700' };
      case 'seed_overture': return { label: 'Overture Places', color: 'bg-purple-100 text-purple-700' };
      case 'bulk_import': return { label: 'Directorio', color: 'bg-gray-100 text-gray-700' };
      default: return { label: 'Geobooker', color: 'bg-green-100 text-green-700' };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <SEO
        title="Reclamar mi Negocio — Geobooker"
        description="¿Tu negocio ya aparece en Geobooker? Reclámalo gratis y toma control de tu perfil digital."
      />

      {/* Hero */}
      <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full mb-6">
            <Shield className="w-5 h-5" />
            <span className="font-semibold text-sm">Verificación gratuita</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 leading-tight">
            ¿Tu negocio ya está en{' '}
            <span className="text-yellow-300">Geobooker</span>?
          </h1>
          <p className="text-lg md:text-xl text-orange-100 max-w-2xl mx-auto mb-2">
            Miles de negocios del DENUE e INEGI ya aparecen en nuestro mapa.
            Busca el tuyo y toma control de tu perfil digital.
          </p>
          <p className="text-sm text-orange-200 max-w-xl mx-auto">
            Al reclamar tu negocio podrás editar la información, subir fotos, recibir reseñas y aparecer verificado ✅
          </p>
        </div>
      </div>

      {/* Search Section */}
      <div className="max-w-3xl mx-auto px-4 -mt-8">
        <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6">
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Busca tu negocio por nombre
          </label>
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ej: Farmacia San José, Taquería El Rincón..."
                className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 text-lg"
                minLength={3}
              />
            </div>
            <button
              type="submit"
              disabled={loading || query.trim().length < 3}
              className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-4 rounded-xl font-bold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
            >
              {loading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <Search className="w-5 h-5" />
              )}
              Buscar
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        {loading && (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-10 h-10 border-4 border-amber-600 border-t-transparent rounded-full" />
          </div>
        )}

        {searched && !loading && results.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-gray-800 mb-2">
              No encontramos "{query}" disponible para reclamar
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Puede que el nombre sea diferente en la base de datos del DENUE, o quizá tu negocio aún no esté registrado.
            </p>
            <Link
              to="/business/register"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
            >
              + Registrar mi negocio nuevo
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        )}

        {results.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-800 mb-4">
              {results.length} negocio{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
            </h2>
            <div className="space-y-3">
              {results.map((biz) => {
                const source = getSourceLabel(biz.source_type);
                return (
                  <div
                    key={biz.id}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-amber-300 transition-all group cursor-pointer"
                    onClick={() => handleSelectBusiness(biz)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Building2 className="w-6 h-6 text-amber-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-gray-900 truncate text-lg">{biz.name}</h3>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {biz.category && (
                              <span className="text-sm text-gray-500 capitalize">{biz.category}</span>
                            )}
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${source.color}`}>
                              {source.label}
                            </span>
                          </div>
                          {biz.address && (
                            <p className="text-sm text-gray-400 mt-1 flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              {biz.address}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        {user ? (
                          <button className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition group-hover:scale-105">
                            <Shield className="w-4 h-4" />
                            Reclamar
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        ) : (
                          <Link
                            to="/login"
                            onClick={(e) => e.stopPropagation()}
                            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition"
                          >
                            Inicia sesión
                            <ChevronRight className="w-4 h-4" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* How it works section */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
          ¿Cómo funciona reclamar tu negocio?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-amber-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">1. Busca tu negocio</h3>
            <p className="text-sm text-gray-600">
              Escribe el nombre de tu negocio. Muchos ya están listados desde la base de datos del DENUE.
            </p>
          </div>
          <div className="text-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-7 h-7 text-blue-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">2. Verifica tu identidad</h3>
            <p className="text-sm text-gray-600">
              Completa el formulario con tus datos y sube una foto o documento como evidencia.
            </p>
          </div>
          <div className="text-center p-6 bg-white rounded-2xl border border-gray-200 shadow-sm">
            <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-600" />
            </div>
            <h3 className="font-bold text-gray-900 mb-2">3. Toma control</h3>
            <p className="text-sm text-gray-600">
              Una vez aprobado, podrás editar info, subir fotos, recibir reseñas y aparecer como verificado ✅
            </p>
          </div>
        </div>
      </div>

      {/* Benefits */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-10">
            Beneficios de reclamar tu negocio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { icon: '✏️', title: 'Edita tu información', desc: 'Actualiza nombre, dirección, horarios, teléfono y más.' },
              { icon: '📸', title: 'Sube fotos', desc: 'Agrega fotos de tu negocio para atraer más clientes.' },
              { icon: '⭐', title: 'Recibe reseñas', desc: 'Los clientes podrán calificar y recomendar tu negocio.' },
              { icon: '✅', title: 'Badge de Verificado', desc: 'Tu negocio aparecerá con un badge de verificación.' },
              { icon: '📊', title: 'Métricas', desc: 'Ve cuántas personas visitan, llaman o piden ruta a tu negocio.' },
              { icon: '📢', title: 'Promociones', desc: 'Publica ofertas y promociones para tus clientes cercanos.' },
            ].map((benefit, idx) => (
              <div key={idx} className="flex items-start gap-4 bg-white/10 backdrop-blur rounded-xl p-5">
                <span className="text-3xl">{benefit.icon}</span>
                <div>
                  <h4 className="font-bold text-white mb-1">{benefit.title}</h4>
                  <p className="text-gray-300 text-sm">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-12 px-4 text-center">
        <p className="text-gray-500 mb-4">
          ¿Tu negocio no aparece? Regístralo gratis
        </p>
        <Link
          to="/business/register"
          className="inline-flex items-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-blue-700 transition text-lg"
        >
          + Registrar mi negocio nuevo
          <ArrowRight className="w-5 h-5" />
        </Link>
      </div>

      {/* Claim Form Modal */}
      <ClaimBusinessForm
        isOpen={showClaimForm}
        onClose={() => setShowClaimForm(false)}
        business={selectedBusiness}
        onSuccess={handleClaimSuccess}
      />
    </div>
  );
};

export default ClaimBusinessPage;
