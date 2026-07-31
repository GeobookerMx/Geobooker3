import { EMPRENDE_CONTENT_VERSION } from './missionContent';
import { createInitialProgress } from './engine';

const STORAGE_KEY = 'geobooker_emprende_progress_v1';

export const loadEmprendeProgress = () => {
  if (typeof window === 'undefined') return createInitialProgress();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialProgress();

    const parsed = JSON.parse(raw);
    if (parsed?.contentVersion !== EMPRENDE_CONTENT_VERSION) {
      return {
        ...createInitialProgress(),
        selectedBusinessId: parsed?.selectedBusinessId || 'cafeteria'
      };
    }

    return {
      ...createInitialProgress(),
      ...parsed,
      metrics: {
        ...createInitialProgress().metrics,
        ...(parsed.metrics || {})
      },
      skills: {
        ...createInitialProgress().skills,
        ...(parsed.skills || {})
      }
    };
  } catch (error) {
    console.warn('[Emprende] Could not load local progress:', error);
    return createInitialProgress();
  }
};

export const saveEmprendeProgress = (progress) => {
  if (typeof window === 'undefined') return progress;

  const nextProgress = {
    ...progress,
    updatedAt: new Date().toISOString()
  };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextProgress));
  } catch (error) {
    console.warn('[Emprende] Could not save local progress:', error);
  }

  return nextProgress;
};

export const resetEmprendeProgress = () => {
  const fresh = createInitialProgress();
  saveEmprendeProgress(fresh);
  return fresh;
};
