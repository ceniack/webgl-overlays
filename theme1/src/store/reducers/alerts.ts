import type { AlertsState, StoreAlert } from '../types';
import type { StoreAction } from '../actions';

export function alertsReducer(state: AlertsState, action: StoreAction): AlertsState {
  switch (action.type) {
    case 'ALERT_ENQUEUED': {
      // Drop oldest if queue is full
      const queue = state.queue.length >= state.maxQueueSize
        ? [...state.queue.slice(1)]
        : [...state.queue];

      const newAlert: StoreAlert = {
        ...action.alert,
        lifecycle: 'pending',
        lifecycleChangedAt: Date.now(),
      };
      queue.push(newAlert);

      return { ...state, queue };
    }

    case 'ALERT_ACTIVATED': {
      const queueAlert = state.queue.find(a => a.id === action.alertId);
      if (!queueAlert) return state;

      const activatedAlert: StoreAlert = {
        ...queueAlert,
        lifecycle: 'active',
        lifecycleChangedAt: action.timestamp,
      };

      return {
        ...state,
        queue: state.queue.filter(a => a.id !== action.alertId),
        active: [...state.active, activatedAlert],
      };
    }

    case 'ALERT_EXITING': {
      return {
        ...state,
        active: state.active.map(a =>
          a.id === action.alertId
            ? { ...a, lifecycle: 'exiting' as const, lifecycleChangedAt: action.timestamp }
            : a
        ),
      };
    }

    case 'ALERT_DISMISSED': {
      const dismissed = state.recentlyDismissed.slice(-19);
      dismissed.push(action.alertId);

      return {
        ...state,
        active: state.active.filter(a => a.id !== action.alertId),
        recentlyDismissed: dismissed,
      };
    }

    default:
      return state;
  }
}
