import type { CountersState } from '../types';
import type { StoreAction } from '../actions';

export function countersReducer(state: CountersState, action: StoreAction): CountersState {
  switch (action.type) {
    case 'COUNTER_VALUE_SET': {
      const existing = state[action.counterId];
      if (!existing) return state;
      return {
        ...state,
        [action.counterId]: {
          ...existing,
          value: action.value,
          lastUpdatedAt: Date.now(),
        },
      };
    }
    case 'COUNTER_LABEL_SET': {
      const existing = state[action.counterId];
      if (!existing) return state;
      return {
        ...state,
        [action.counterId]: {
          ...existing,
          label: action.label,
          lastUpdatedAt: Date.now(),
        },
      };
    }
    case 'COUNTER_VISIBILITY_SET': {
      const existing = state[action.counterId];
      if (!existing) return state;
      return {
        ...state,
        [action.counterId]: {
          ...existing,
          visible: action.visible,
          lastUpdatedAt: Date.now(),
        },
      };
    }
    default:
      return state;
  }
}
