import type { GoalsState, GoalEntry } from '../types';
import type { StoreAction } from '../actions';

export function goalsReducer(state: GoalsState, action: StoreAction): GoalsState {
  switch (action.type) {
    case 'GOAL_UPDATED': {
      const existing = state.goals[action.goalId];
      const isComplete = action.target !== undefined
        ? action.current >= action.target
        : existing?.target !== undefined
          ? action.current >= existing.target
          : false;

      const updated: GoalEntry = {
        id: action.goalId,
        type: action.goalType,
        current: action.current,
        target: action.target ?? existing?.target ?? 0,
        label: action.label ?? existing?.label ?? '',
        isActive: true,
        isComplete,
        startedAt: existing?.startedAt ?? action.timestamp,
        completedAt: isComplete ? (existing?.completedAt ?? action.timestamp) : null,
      };

      return {
        ...state,
        goals: { ...state.goals, [action.goalId]: updated },
      };
    }
    default:
      return state;
  }
}
