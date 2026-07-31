import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, BriefcaseBusiness, Share2 } from 'lucide-react';
import MissionPlayer from '../../components/emprende/MissionPlayer';
import {
  EMPRENDE_BUSINESSES,
  EMPRENDE_MISSIONS
} from '../../features/emprende/missionContent';
import {
  getBusinessById,
  getMissionById,
  getMissionBySlug,
  getMissionCompletion,
  getNextMission
} from '../../features/emprende/engine';
import {
  loadEmprendeProgress,
  resetEmprendeProgress,
  saveEmprendeProgress
} from '../../features/emprende/storage';
import { trackEmprendeEvent } from '../../features/emprende/analytics';

const shareFallback = async (payload) => {
  if (navigator.share) {
    await navigator.share(payload);
    return true;
  }

  if (navigator.clipboard) {
    await navigator.clipboard.writeText(payload.url);
    return true;
  }

  return false;
};

export default function EmprendePage() {
  const { challengeSlug } = useParams();
  const [progress, setProgress] = useState(() => loadEmprendeProgress());
  const [activeMissionId, setActiveMissionId] = useState(() => {
    if (challengeSlug) return getMissionBySlug(challengeSlug).id;
    return loadEmprendeProgress().lastMissionId || EMPRENDE_MISSIONS[0].id;
  });
  const [shareStatus, setShareStatus] = useState('');

  const activeMission = challengeSlug
    ? getMissionBySlug(challengeSlug)
    : getMissionById(activeMissionId);
  const selectedBusiness = getBusinessById(progress.selectedBusinessId);
  const completion = getMissionCompletion(progress);

  useEffect(() => {
    trackEmprendeEvent('emprende_page_view', {
      mission_id: activeMission.id,
      mission_slug: activeMission.slug,
      completed_percent: completion
    });
  }, [activeMission.id, activeMission.slug, completion]);

  const handleBusinessChange = (businessId) => {
    const nextProgress = saveEmprendeProgress({
      ...progress,
      selectedBusinessId: businessId
    });
    setProgress(nextProgress);
    trackEmprendeEvent('emprende_business_selected', { business_id: businessId });
  };

  const handleReset = () => {
    const fresh = resetEmprendeProgress();
    setProgress(fresh);
    setActiveMissionId(EMPRENDE_MISSIONS[0].id);
    trackEmprendeEvent('emprende_progress_reset');
  };

  const handleNextMission = () => {
    const nextMission = getNextMission(activeMission.id) || EMPRENDE_MISSIONS[0];
    setActiveMissionId(nextMission.id);
    const nextProgress = saveEmprendeProgress({
      ...progress,
      lastMissionId: nextMission.id
    });
    setProgress(nextProgress);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleShare = async () => {
    setShareStatus('');
    const url = `${window.location.origin}/emprende/reto/${activeMission.slug}`;
    const payload = {
      title: 'Geobooker Emprende',
      text: `Estoy practicando decisiones de negocio en Geobooker Emprende: ${activeMission.title}`,
      url
    };

    try {
      let shared = false;
      if (Capacitor.isNativePlatform()) {
        const { Share } = await import('@capacitor/share');
        await Share.share(payload);
        shared = true;
      } else {
        shared = await shareFallback(payload);
      }
      setShareStatus(shared ? 'Link compartido o copiado.' : 'No se pudo compartir en este dispositivo.');
      trackEmprendeEvent('emprende_share_click', { mission_id: activeMission.id, shared });
    } catch (error) {
      console.warn('[Emprende] Share failed:', error);
      setShareStatus('No se pudo compartir en este momento.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-100">
      <section className="relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -left-20 top-10 h-72 w-72 rounded-full bg-cyan-500 blur-3xl" />
          <div className="absolute right-0 top-20 h-96 w-96 rounded-full bg-blue-700 blur-3xl" />
        </div>
        <div className="container relative mx-auto px-4 py-10 md:py-14">
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-bold text-slate-100 transition hover:bg-white/15"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver a Geobooker
          </Link>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.2fr,0.8fr] lg:items-end">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">
                Geobooker Emprende
              </p>
              <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight tracking-tight md:text-6xl">
                Aprende a tomar mejores decisiones antes de gastar dinero real.
              </h1>
              <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300 md:text-lg">
                Un simulador ligero para entender visibilidad local, clientes, reputacion y operacion.
                Primero practicas; despues conectas con acciones reales dentro de Geobooker.
              </p>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-200">Avance</p>
                  <p className="mt-2 text-4xl font-black">{completion}%</p>
                </div>
                <BookOpen className="h-12 w-12 text-cyan-300" />
              </div>
              <div className="mt-4 h-3 overflow-hidden rounded-full bg-white/10">
                <div className="h-full rounded-full bg-cyan-300" style={{ width: `${completion}%` }} />
              </div>
              <button
                onClick={handleShare}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-cyan-50"
              >
                <Share2 className="h-4 w-4" />
                Compartir reto
              </button>
              {shareStatus && <p className="mt-2 text-center text-xs text-slate-300">{shareStatus}</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4 py-8">
        <div className="mb-6 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-blue-600">
                <BriefcaseBusiness className="h-4 w-4" />
                Elige tu caso de practica
              </p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Negocio inicial</h2>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Cambiar el negocio no borra tu aprendizaje; solo adapta el contexto.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {EMPRENDE_BUSINESSES.map((business) => (
                <button
                  key={business.id}
                  onClick={() => handleBusinessChange(business.id)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    progress.selectedBusinessId === business.id
                      ? 'border-blue-400 bg-blue-50 text-blue-950 shadow'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                  }`}
                >
                  <p className="text-xs font-black uppercase tracking-wide text-blue-600">{business.badge}</p>
                  <p className="mt-1 text-sm font-black">{business.name}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          {EMPRENDE_MISSIONS.map((mission) => {
            const isActive = mission.id === activeMission.id;
            const isDone = progress.completedMissionIds?.includes(mission.id);
            return (
              <button
                key={mission.id}
                onClick={() => setActiveMissionId(mission.id)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-black transition ${
                  isActive
                    ? 'bg-slate-950 text-white'
                    : isDone
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-white text-slate-700'
                }`}
              >
                Mision {mission.order}
              </button>
            );
          })}
        </div>

        <MissionPlayer
          mission={activeMission}
          business={selectedBusiness}
          progress={progress}
          onProgressChange={setProgress}
          onNextMission={handleNextMission}
          onReset={handleReset}
        />
      </section>
    </main>
  );
}

