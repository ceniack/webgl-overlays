import type { ActivityState } from '../types';
import type { StoreAction } from '../actions';

export function activityReducer(state: ActivityState, action: StoreAction): ActivityState {
  switch (action.type) {
    case 'ACTIVITY_ADDED': {
      const items = [action.item, ...state.items].slice(0, state.maxItems);
      return { ...state, items };
    }
    default:
      return state;
  }
}
