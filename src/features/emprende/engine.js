import {
  EMPRENDE_BUSINESSES,
  EMPRENDE_CONTENT_VERSION,
  EMPRENDE_MISSIONS,
  INITIAL_METRICS,
  INITIAL_SKILLS,
  MISSION_STATE
} from './missionContent';

const clampMetric = (value) => Math.max(0, Math.min(100, Number(value) || 0));

export const createMissionRunId = (missionId) => {
  const stamp = Date.now().toString(36);
  return `${missionId}-${stamp}`;
};

export const createInitialProgress = () => ({
  contentVersion: EMPRENDE_CONTENT_VERSION,
  selectedBusinessId: 'cafeteria',
  metrics: { ...INITIAL_METRICS },
  skills: { ...INITIAL_SKILLS },
  xp: 0,
  completedMissionIds: [],
  missionRuns: {},
  lastMissionId: EMPRENDE_MISSIONS[0]?.id || null,
  updatedAt: new Date().toISOString()
});

export const getBusinessById = (businessId) =>
  EMPRENDE_BUSINESSES.find((business) => business.id === businessId) || EMPRENDE_BUSINESSES[0];

export const getMissionById = (missionId) =>
  EMPRENDE_MISSIONS.find((mission) => mission.id === missionId) || EMPRENDE_MISSIONS[0];

export const getMissionBySlug = (slug) =>
  EMPRENDE_MISSIONS.find((mission) => mission.slug === slug) || EMPRENDE_MISSIONS[0];

export const getNextMission = (currentMissionId) => {
  const currentIndex = EMPRENDE_MISSIONS.findIndex((mission) => mission.id === currentMissionId);
  return EMPRENDE_MISSIONS[currentIndex + 1] || null;
};

export const applyDecision = (progress, mission, decision) => {
  const metrics = { ...progress.metrics };
  Object.entries(decision.delta || {}).forEach(([key, value]) => {
    metrics[key] = clampMetric((metrics[key] ?? 0) + value);
  });

  const skills = { ...progress.skills };
  Object.entries(decision.skills || {}).forEach(([key, value]) => {
    skills[key] = Math.max(0, (skills[key] ?? 0) + value);
  });

  const completedMissionIds = Array.from(
    new Set([...(progress.completedMissionIds || []), mission.id])
  );

  const runId = progress.missionRuns?.[mission.id]?.runId || createMissionRunId(mission.id);

  return {
    ...progress,
    metrics,
    skills,
    xp: (progress.xp || 0) + (decision.xp || 0),
    completedMissionIds,
    lastMissionId: mission.id,
    missionRuns: {
      ...(progress.missionRuns || {}),
      [mission.id]: {
        runId,
        missionId: mission.id,
        decisionId: decision.id,
        quality: decision.quality,
        xp: decision.xp || 0,
        completedAt: new Date().toISOString(),
        contentVersion: EMPRENDE_CONTENT_VERSION
      }
    },
    updatedAt: new Date().toISOString()
  };
};

export const getMissionCompletion = (progress) => {
  const completed = progress?.completedMissionIds?.length || 0;
  return Math.round((completed / EMPRENDE_MISSIONS.length) * 100);
};

export const getMissionStateLabel = (state) => {
  const labels = {
    [MISSION_STATE.INTRO]: 'Introduccion',
    [MISSION_STATE.SCENARIO]: 'Situacion',
    [MISSION_STATE.DECISION]: 'Decision',
    [MISSION_STATE.CONFIRMATION]: 'Confirmacion',
    [MISSION_STATE.OUTCOME]: 'Consecuencia',
    [MISSION_STATE.LEARNING]: 'Aprendizaje',
    [MISSION_STATE.REAL_ACTION]: 'Accion real',
    [MISSION_STATE.REWARD]: 'Recompensa',
    [MISSION_STATE.COMPLETED]: 'Completado'
  };
  return labels[state] || 'Emprende';
};
