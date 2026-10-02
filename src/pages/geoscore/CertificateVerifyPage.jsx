import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  MapPin,
  Building2,
  Award,
  Clock,
  Hash,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Globe2
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

const GRADE_COLORS = {
  'A+': 'from-emerald-500 to-green-500',
  'A': 'from-emerald-400 to-teal-500',
  'B': 'from-blue-500 to-indigo-500',
  'C': 'from-amber-500 to-orange-500',
  'D': 'from-red-500 to-rose-600'
};

const GRADE_BG = {
  'A+': 'bg-emerald-500 text-slate-950',
  'A': 'bg-emerald-400 text-slate-950',
  'B': 'bg-blue-500 text-white',
  'C': 'bg-amber-500 text-slate-950',
  'D': 'bg-red-500 text-white'
};

const BUSINESS_NAMES = {
  restaurant: 'Restaurante / Alimentos',
  cafe: 'Cafetería / Coffee Shop',
  pharmacy: 'Farmacia / Salud',
  gym: 'Gimnasio / Fitness',
  car_wash: 'Autolavado / Taller',
  local_retail: 'Comercio / Retail Local'
};

export default function CertificateVerifyPage() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [cert, setCert] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) {
      setError('No se proporcionó un token de certificado.');
      setLoading(false);
      return;
    }

    async function verify() {
      try {
        const { data, error: rpcError } = await supabase.rpc('geoscore_verify_certificate', {
          p_token: token.toUpperCase()
        });

        if (rpcError) throw rpcError;

        if (!data || data.error) {
          setError(data?.error === 'certificate_not_found'
            ? 'Certificado no encontrado. Verifica que el código sea correcto.'
            : data?.error === 'certificate_revoked'
            ? `Certificado revocado: ${data.revokedReason || 'Sin motivo especificado.'}`
            : 'Error al verificar el certificado.');
        } else {
          setCert(data);
        }
      } catch (err) {
        console.error('Certificate verification error:', err);
        setError('Error de conexión. Intenta nuevamente.');
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-cyan-400 mx-auto" />
          <p className="mt-4 text-slate-300 text-sm">Verificando certificado...</p>
        </div>
      </div>
    );
  }

  if (error || !cert) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-3xl border border-red-500/30 bg-slate-900/90 p-8 text-center backdrop-blur-xl shadow-2xl">
          <ShieldX className="h-16 w-16 text-red-400 mx-auto" />
          <h1 className="mt-4 text-2xl font-black text-white">Certificado No Válido</h1>
          <p className="mt-2 text-sm text-slate-300">{error || 'No se encontró el certificado.'}</p>
          <p className="mt-1 text-xs text-slate-500">Token consultado: {token || '—'}</p>
          <Link
            to="/geoscore"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-500 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Generar un Estudio GeoScore
          </Link>
        </div>
      </div>
    );
  }

  const isExpired = cert.status === 'expired' || !cert.valid;
  const formattedIssuedAt = cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';
  const formattedExpiresAt = cert.expiresAt ? new Date(cert.expiresAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }) : '—';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-12">

        {/* Verification Header */}
        <div className="text-center mb-8">
          <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold mb-4 ${
            isExpired
              ? 'bg-amber-500/10 border border-amber-500/40 text-amber-300'
              : 'bg-emerald-500/10 border border-emerald-500/40 text-emerald-300'
          }`}>
            {isExpired ? <ShieldAlert className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            {isExpired ? 'CERTIFICADO EXPIRADO' : 'CERTIFICADO VERIFICADO ✓'}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black">Geobooker GeoScore™</h1>
          <p className="text-sm text-slate-400 mt-1">Verificación de Certificado de Viabilidad Comercial</p>
        </div>

        {/* Certificate Card */}
        <div className="rounded-3xl border border-slate-700 bg-slate-900/90 backdrop-blur-xl shadow-2xl overflow-hidden">
          
          {/* Certificate Header Bar */}
          <div className={`px-6 py-4 bg-gradient-to-r ${isExpired ? 'from-amber-900/40 to-amber-950/40' : 'from-emerald-900/40 to-emerald-950/40'}`}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Certificado Nº</span>
                <p className="text-lg font-black text-white tracking-wide">{cert.certificateToken}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">GeoScore</span>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-black text-white">{cert.score}</span>
                  <span className="text-sm text-slate-400">/100</span>
                  <span className={`px-2.5 py-1 rounded-lg text-sm font-black ${GRADE_BG[cert.grade] || 'bg-slate-600 text-white'}`}>
                    {cert.grade}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Certificate Body */}
          <div className="p-6 space-y-5">

            {/* Location Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-800/50 rounded-2xl p-4 border border-slate-700/50">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-cyan-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400">Ubicación Evaluada</span>
                  <p className="text-sm font-bold text-white">{cert.locationName}</p>
                  <p className="text-[11px] text-slate-500">{cert.lat?.toFixed(6)}, {cert.lng?.toFixed(6)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 text-indigo-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-400">Giro Comercial</span>
                  <p className="text-sm font-bold text-white">{BUSINESS_NAMES[cert.businessTypeKey] || cert.businessTypeKey}</p>
                  <p className="text-[11px] text-slate-500">Radio: {cert.radiusMeters}m · País: {cert.countryCode}</p>
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-4">
              <p className="text-xs font-bold uppercase text-cyan-300 flex items-center gap-1.5">
                <Award className="h-4 w-4" /> Diagnóstico Estratégico
              </p>
              <p className="mt-1 text-sm text-slate-200">{cert.recommendation}</p>
            </div>

            {/* Pillars Breakdown */}
            {cert.breakdown && (
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Pilares de Análisis</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                    <span className="text-[11px] text-slate-400">Competencia</span>
                    <p className="text-lg font-black text-white">{cert.breakdown?.competition?.score ?? '—'}<span className="text-xs text-slate-500"> pts</span></p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                    <span className="text-[11px] text-slate-400">Sinergia</span>
                    <p className="text-lg font-black text-white">{cert.breakdown?.complementarity?.score ?? '—'}<span className="text-xs text-slate-500"> pts</span></p>
                  </div>
                  <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700/50">
                    <span className="text-[11px] text-slate-400">Densidad</span>
                    <p className="text-lg font-black text-white">{cert.breakdown?.density?.score ?? '—'}<span className="text-xs text-slate-500"> pts</span></p>
                  </div>
                </div>
              </div>
            )}

            {/* Strengths & Risks */}
            {((cert.strengths?.length > 0) || (cert.risks?.length > 0)) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {cert.strengths?.length > 0 && (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-[11px] font-bold uppercase text-emerald-400 flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" /> Fortalezas</p>
                    <ul className="mt-1.5 space-y-1 text-xs text-emerald-200">
                      {cert.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                    </ul>
                  </div>
                )}
                {cert.risks?.length > 0 && (
                  <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-[11px] font-bold uppercase text-amber-400 flex items-center gap-1"><AlertTriangle className="h-3.5 w-3.5" /> Riesgos</p>
                    <ul className="mt-1.5 space-y-1 text-xs text-amber-200">
                      {cert.risks.map((r, i) => <li key={i}>• {r}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Certification Metadata */}
            <div className="grid grid-cols-2 gap-3 bg-slate-800/30 rounded-2xl p-4 border border-slate-700/30">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Emitido</span>
                  <p className="text-xs text-slate-300">{formattedIssuedAt}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-slate-500" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Válido hasta</span>
                  <p className={`text-xs ${isExpired ? 'text-amber-400' : 'text-slate-300'}`}>{formattedExpiresAt}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Hash className="h-4 w-4 text-slate-500" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-slate-500">Hash de Integridad (SHA-256)</span>
                  <p className="text-[10px] text-slate-400 font-mono break-all">{cert.verificationHash}</p>
                </div>
              </div>
              {cert.issuedToName && (
                <div className="flex items-center gap-2 col-span-2">
                  <Globe2 className="h-4 w-4 text-slate-500" />
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-500">Emitido a</span>
                    <p className="text-xs text-slate-300">{cert.issuedToName}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-slate-800/30 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[10px] text-slate-500">
              Verificado por Geobooker · geobooker.com.mx · {new Date().toISOString().split('T')[0]}
            </p>
            <Link
              to="/geoscore"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Generar tu propio GeoScore <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
