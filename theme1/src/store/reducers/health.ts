import type { HealthState } from '../types';
import type { StoreAction } from '../actions';

export function healthReducer(state: HealthState, action: StoreAction): HealthState {
  switch (action.type) {
    case 'HEART_RATE_RECEIVED':
      return {
        ...state,
        bpm: action.bpm,
        status: 'connected',
        lastUpdateAt: action.timestamp,
      };
    case 'HEALTH_STATUS_CHANGED':
      return {
        ...state,
        status: action.status,
        message: action.message,
        lastUpdateAt: action.timestamp,
      };
    default:
      return state;
  }
}
