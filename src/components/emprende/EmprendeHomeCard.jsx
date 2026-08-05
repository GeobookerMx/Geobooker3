import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BookOpen, MapPinned, Store } from 'lucide-react';
import { trackEmprendeEvent } from '../../features/emprende/analytics';

export default function EmprendeHomeCard() {
  const handleClick = (cta) => {
    trackEmprendeEvent('emprende_home_card_click', {
      cta,
      placement: 'home_below_map'
    });
  };

  return (
    <section className="container mx-auto px-4 pb-8">
      <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-gradient-to-br from-slate-950 via-blue-950 to-cyan-950 text-white shadow-2xl">
        <div className="grid gap-6 p-6 md:p-8 lg:grid-cols-[1.2fr,0.8fr] lg:items-center">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-xs font-black uppercase tracking-[0.22em] text-cyan-200">
              <BookOpen className="h-4 w-4" />
              Nuevo: Geobooker Emprende
            </p>
            <h2 className="mt-4 max-w-3xl text-3xl font-black leading-tight tracking-tight md:text-4xl">
              Practica decisiones de negocio antes de invertir tiempo o presupuesto real.
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              Aprende con retos cortos, preguntas tipo "Usted que haria?", XP y medallas sobre visibilidad, clientes, reputacion y operacion.
              Despues conecta cada aprendizaje con acciones reales dentro de Geobooker.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/emprende?source=home_below_map"
                onClick={() => handleClick('start')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-200"
              >
                Empezar retos
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/business/register?source=emprende_home_card"
                onClick={() => handleClick('register_business')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/15"
              >
                Registrar negocio
              </Link>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
              <MapPinned className="h-7 w-7 text-cyan-200" />
              <p className="mt-3 text-lg font-black">Buscar como cliente</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Entiende como una busqueda real se convierte en visita, contacto o ruta.
              </p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-white/10 p-5">
              <Store className="h-7 w-7 text-amber-200" />
              <p className="mt-3 text-lg font-black">Pensar como negocio</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                Practica decisiones sobre presupuesto, reputacion, capacidad y visibilidad.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
