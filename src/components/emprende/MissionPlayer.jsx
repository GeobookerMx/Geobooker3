import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Lightbulb,
  Medal,
  RotateCcw,
  Save,
  Target,
  TrendingUp,
  Trophy
} from 'lucide-react';
import GeoGuide from './GeoGuide';
import {
  applyDecision,
  getEmprendeBadges,
  getEmprendeRank,
  getMissionStateLabel,
  saveMissionReflection
} from '../../features/emprende/engine';
import { EMPRENDE_MISSIONS, MISSION_STATE } from '../../features/emprende/missionContent';
import { saveEmprendeProgress } from '../../features/emprende/storage';
import { trackEmprendeEvent, trackMissionStep } from '../../features/emprende/analytics';

const stateOrder = [
  MISSION_STATE.INTRO,
  MISSION_STATE.SCENARIO,
  MISSION_STATE.DECISION,
  MISSION_STATE.OUTCOME,
  MISSION_STATE.LEARNING,
  MISSION_STATE.REAL_ACTION,
  MISSION_STATE.REWARD,
  MISSION_STATE.COMPLETED
];

const metricLabels = {
  cash: 'Caja',
  customers: 'Clientes',
  reputation: 'Reputacion',
  capacity: 'Capacidad'
};

const skillLabels = {
  strategy: 'Estrategia',
  finance: 'Finanzas',
  customers: 'Clientes',
  operations: 'Operacion',
  visibility: 'Visibilidad',
  leadership: 'Liderazgo',
  sustainability: 'Sostenibilidad'
};

const qualityLabels = {
  best: 'Decision solida',
  mixed: 'Decision mixta',
  risky: 'Decision riesgosa'
};

const MetricPill = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-3">
    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
      <div className="h-full rounded-full bg-blue-600" style={{ width: `${value}%` }} />
    </div>
    <p className="mt-1 text-lg font-black text-slate-950">{value}</p>
  </div>
);

const DeltaList = ({ delta = {} }) => (
  <div className="grid gap-2 sm:grid-cols-2">
    {Object.entries(delta).map(([key, value]) => (
      <div
        key={key}
        className={`rounded-2xl px-4 py-3 text-sm font-bold ${
          value >= 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-800'
        }`}
      >
        {metricLabels[key] || key}: {value > 0 ? '+' : ''}{value}
      </div>
    ))}
  </div>
);

const SkillBar = ({ label, value }) => {
  const width = Math.min(100, Math.max(8, Number(value || 0) * 12));
  return (
    <div>
      <div className="flex items-center justify-between text-xs font-black uppercase tracking-wide text-slate-500">
        <span>{label}</span>
        <span>{value || 0}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-cyan-500" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
};

export default function MissionPlayer({
  mission,
  business,
  progress,
  onProgressChange,
  onNextMission,
  onReset
}) {
  const existingRun = progress.missionRuns?.[mission.id] || null;
  const existingDecision = mission.decisions.find((item) => item.id === existingRun?.decisionId) || null;
  const [state, setState] = useState(existingRun ? MISSION_STATE.COMPLETED : MISSION_STATE.INTRO);
  const [selectedDecision, setSelectedDecision] = useState(existingDecision);
  const [reflection, setReflection] = useState(progress.reflections?.[mission.id] || '');
  const [reflectionSaved, setReflectionSaved] = useState(false);

  const rank = useMemo(() => getEmprendeRank(progress.xp || 0), [progress.xp]);
  const badges = useMemo(() => getEmprendeBadges(progress), [progress]);
  const completedCount = progress.completedMissionIds?.length || 0;

  useEffect(() => {
    const nextDecision = mission.decisions.find((item) => item.id === progress.missionRuns?.[mission.id]?.decisionId) || null;
    setSelectedDecision(nextDecision);
    setState(nextDecision ? MISSION_STATE.COMPLETED : MISSION_STATE.INTRO);
    setReflection(progress.reflections?.[mission.id] || '');
    setReflectionSaved(false);
  }, [mission.id, progress.missionRuns, progress.reflections, mission.decisions]);

  useEffect(() => {
    trackMissionStep(mission, state, {
      business_id: business.id,
      completed: Boolean(existingRun)
    });
  }, [mission, state, business.id, existingRun]);

  const goNext = () => {
    const index = stateOrder.indexOf(state);
    const nextState = stateOrder[Math.min(index + 1, stateOrder.length - 1)];
    setState(nextState);
  };

  const handleDecision = (decision) => {
    setSelectedDecision(decision);
    const nextProgress = saveEmprendeProgress(applyDecision(progress, mission, decision));
    onProgressChange(nextProgress);
    setState(MISSION_STATE.OUTCOME);
    trackEmprendeEvent('emprende_decision_selected', {
      mission_id: mission.id,
      mission_slug: mission.slug,
      decision_id: decision.id,
      decision_quality: decision.quality,
      business_id: business.id,
      xp: decision.xp
    });

    if (typeof window !== 'undefined' && window.navigator?.vibrate) {
      window.navigator.vibrate(24);
    }
  };

  const handleSaveReflection = () => {
    const nextProgress = saveEmprendeProgress(saveMissionReflection(progress, mission.id, reflection));
    onProgressChange(nextProgress);
    setReflectionSaved(true);
    trackEmprendeEvent('emprende_reflection_saved', {
      mission_id: mission.id,
      mission_slug: mission.slug,
      length: reflection.trim().length
    });
  };

  const completed = state === MISSION_STATE.COMPLETED;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr,0.42fr]">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl md:p-7">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-blue-600">
              Reto {mission.order} de {EMPRENDE_MISSIONS.length} - {mission.estimatedMinutes} min
            </p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">
              {mission.title}
            </h1>
            <p className="mt-2 text-base leading-7 text-slate-600">{mission.subtitle}</p>
          </div>
          <div className={`rounded-3xl bg-gradient-to-br ${business.color} p-4 text-white shadow-lg md:min-w-48`}>
            <p className="text-xs font-black uppercase tracking-wide text-white/70">{business.badge}</p>
            <p className="mt-2 text-xl font-black">{business.name}</p>
            <p className="mt-1 text-xs leading-5 text-white/80">{business.description}</p>
          </div>
        </div>

        <div className="mt-6">
          <GeoGuide title={`Geo / ${getMissionStateLabel(state)}`}>
            {state === MISSION_STATE.INTRO && mission.intro}
            {state === MISSION_STATE.SCENARIO && mission.scenario}
            {state === MISSION_STATE.DECISION && 'Elige una opcion. No hay magia: cada decision afecta caja, clientes, reputacion y capacidad.'}
            {state === MISSION_STATE.OUTCOME && selectedDecision?.consequence}
            {state === MISSION_STATE.LEARNING && mission.learning}
            {state === MISSION_STATE.REAL_ACTION && 'Ahora conecta el aprendizaje con una accion real dentro de Geobooker.'}
            {state === MISSION_STATE.REWARD && 'Buen avance. Sumaste experiencia y habilidades para tomar mejores decisiones de negocio.'}
            {completed && 'Reto completado. Puedes repetirlo, compartirlo o llevar esta accion al mundo real.'}
          </GeoGuide>
        </div>

        <div className="mt-6 rounded-3xl border border-amber-200 bg-amber-50 p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">Usted que haria?</p>
              <p className="mt-1 text-sm font-bold leading-6 text-slate-800">{mission.challengePrompt}</p>
              <textarea
                value={reflection}
                onChange={(event) => {
                  setReflection(event.target.value);
                  setReflectionSaved(false);
                }}
                rows={3}
                maxLength={420}
                placeholder="Escriba su razonamiento antes de elegir. Ejemplo: primero validaria caja, urgencia y cliente ideal..."
                className="mt-4 w-full rounded-2xl border border-amber-200 bg-white px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
              />
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-bold text-amber-800">{reflection.length}/420 - Guardado local en este dispositivo.</p>
                <button
                  type="button"
                  onClick={handleSaveReflection}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white transition hover:bg-slate-800"
                >
                  <Save className="h-4 w-4" />
                  {reflectionSaved ? 'Guardado' : 'Guardar respuesta'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {state === MISSION_STATE.DECISION && (
          <div className="mt-6 grid gap-4">
            {mission.decisions.map((decision) => (
              <button
                key={decision.id}
                onClick={() => handleDecision(decision)}
                className="group rounded-3xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-black text-slate-950">{decision.label}</h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500">
                        {qualityLabels[decision.quality] || 'Opcion'}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{decision.description}</p>
                  </div>
                  <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-blue-600 transition group-hover:translate-x-1" />
                </div>
              </button>
            ))}
          </div>
        )}

        {state === MISSION_STATE.OUTCOME && selectedDecision && (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <h3 className="flex items-center gap-2 text-lg font-black text-slate-950">
              <TrendingUp className="h-5 w-5 text-blue-600" />
              Impacto de la decision
            </h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{selectedDecision.consequence}</p>
            <div className="mt-4">
              <DeltaList delta={selectedDecision.delta} />
            </div>
          </div>
        )}

        {state === MISSION_STATE.REAL_ACTION && (
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <Link
              to={mission.realAction.to}
              onClick={() => trackEmprendeEvent('emprende_real_action_click', { mission_id: mission.id, action: 'primary' })}
              className="rounded-2xl bg-blue-600 px-5 py-4 text-center text-sm font-black text-white shadow-lg transition hover:bg-blue-700"
            >
              {mission.realAction.label}
            </Link>
            <Link
              to={mission.realAction.secondaryTo}
              onClick={() => trackEmprendeEvent('emprende_real_action_click', { mission_id: mission.id, action: 'secondary' })}
              className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center text-sm font-black text-slate-800 transition hover:bg-slate-50"
            >
              {mission.realAction.secondaryLabel}
            </Link>
          </div>
        )}

        {state === MISSION_STATE.REWARD && selectedDecision && (
          <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
            <h3 className="flex items-center gap-2 text-xl font-black text-emerald-900">
              <CheckCircle2 className="h-6 w-6" />
              +{selectedDecision.xp} XP
            </h3>
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(selectedDecision.skills || {}).map(([skill, points]) => (
                <span key={skill} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-emerald-800">
                  {skillLabels[skill] || skill} +{points}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            onClick={onReset}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reiniciar progreso
          </button>

          {state !== MISSION_STATE.DECISION && !completed && (
            <button
              onClick={goNext}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </button>
          )}

          {completed && (
            <button
              onClick={onNextMission}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-black text-white transition hover:bg-blue-700"
            >
              Siguiente reto
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </section>

      <aside className="space-y-4">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
            <Trophy className="h-4 w-4 text-amber-500" />
            Perfil emprendedor
          </p>
          <div className={`mt-4 rounded-2xl border px-4 py-3 ${rank.tone}`}>
            <p className="text-sm font-black">{rank.label}</p>
            <p className="mt-1 text-xs font-bold opacity-80">
              {rank.next ? `${rank.next - (progress.xp || 0)} XP para el siguiente rango` : 'Rango maximo de esta version'}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">XP</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{progress.xp || 0}</p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Retos</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{completedCount}/{EMPRENDE_MISSIONS.length}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
            <Target className="h-4 w-4 text-blue-600" />
            Tablero
          </p>
          <div className="mt-4 grid gap-3">
            {Object.entries(progress.metrics || {}).map(([key, value]) => (
              <MetricPill key={key} label={metricLabels[key] || key} value={value} />
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-lg">
          <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-500">Habilidades</p>
          <div className="mt-4 space-y-3">
            {Object.entries(progress.skills || {}).map(([key, value]) => (
              <SkillBar key={key} label={skillLabels[key] || key} value={value} />
            ))}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-lg">
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.22em] text-cyan-300">
            <Medal className="h-4 w-4" />
            Medallas
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {badges.length > 0 ? badges.map((badge) => (
              <span key={badge} className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-black text-white">
                {badge}
              </span>
            )) : (
              <p className="text-sm leading-6 text-slate-300">Completa retos y guarda respuestas para desbloquear medallas.</p>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
