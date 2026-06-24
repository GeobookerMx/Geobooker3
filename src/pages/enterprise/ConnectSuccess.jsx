import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Mail, ShieldCheck, Workflow } from 'lucide-react';
import SEO from '../../components/SEO';
import { supabase } from '../../lib/supabase';

export default function ConnectSuccess() {
  const [searchParams] = useSearchParams();
  const campaignId = searchParams.get('campaign');
  const [campaign, setCampaign] = useState(null);

  useEffect(() => {
    const loadCampaign = async () => {
      if (!campaignId) return;

      const { data } = await supabase
        .from('connect_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (data) setCampaign(data);
    };

    loadCampaign();
  }, [campaignId]);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-10">
      <SEO title="Reserva recibida - Geobooker Connect" />

      <div className="max-w-3xl w-full rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10">
        <div className="w-20 h-20 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-12 h-12 text-emerald-400" />
        </div>

        <h1 className="text-center text-4xl font-bold mt-6">
          Reserva de lanzamiento recibida
        </h1>
        <p className="text-center text-slate-300 mt-4 max-w-2xl mx-auto">
          Tu anticipo para Geobooker Connect ya quedo registrado. El equipo revisara el brief,
          validara la viabilidad del segmento y preparara el piloto gestionado antes de ejecutar
          cualquier outreach.
        </p>

        {campaign && (
          <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5 mt-8 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Paquete</span>
              <span className="font-semibold text-right">{campaign.package_name}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Estado de pago</span>
              <span className="font-semibold text-right">{campaign.payment_status || 'pending'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">Batch objetivo</span>
              <span className="font-semibold text-right">
                {(campaign.batch_size || 0).toLocaleString('es-MX')} contactos
              </span>
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <Workflow className="w-5 h-5 text-emerald-300 mb-3" />
            <h2 className="font-semibold">1. Brief + validacion</h2>
            <p className="text-sm text-slate-400 mt-2">
              Revisamos audiencia, fuentes, propuesta comercial y riesgos de cumplimiento.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <ShieldCheck className="w-5 h-5 text-emerald-300 mb-3" />
            <h2 className="font-semibold">2. Setup operativo</h2>
            <p className="text-sm text-slate-400 mt-2">
              Preparamos copy, remitente, secuencia y lote controlado para no afectar reputacion.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
            <Mail className="w-5 h-5 text-emerald-300 mb-3" />
            <h2 className="font-semibold">3. Reporte + follow-up</h2>
            <p className="text-sm text-slate-400 mt-2">
              Te contactamos para kickoff y te entregamos trazabilidad real del piloto.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mt-8">
          <Link
            to="/b2b-connect"
            className="flex-1 rounded-2xl bg-emerald-500 px-5 py-3 text-center font-bold text-slate-950 hover:bg-emerald-400 transition"
          >
            Volver a Geobooker Connect
          </Link>
          <a
            href="mailto:hola@geobooker.com.mx"
            className="flex-1 rounded-2xl border border-white/15 px-5 py-3 text-center font-semibold text-white hover:bg-white/5 transition"
          >
            Escribir a Connect
          </a>
        </div>
      </div>
    </div>
  );
}
