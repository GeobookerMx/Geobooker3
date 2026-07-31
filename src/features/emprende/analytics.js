import { trackEvent } from '../../services/analyticsService';
import { EMPRENDE_CONTENT_VERSION } from './missionContent';

export const trackEmprendeEvent = (eventName, params = {}) => {
  trackEvent(eventName, {
    content_version: EMPRENDE_CONTENT_VERSION,
    source: 'geobooker_emprende',
    ...params
  });
};

export const trackMissionStep = (mission, state, extra = {}) => {
  trackEmprendeEvent('emprende_mission_step', {
    mission_id: mission?.id,
    mission_slug: mission?.slug,
    state,
    ...extra
  });
};
