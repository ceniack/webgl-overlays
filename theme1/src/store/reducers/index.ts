import type { OverlayState } from '../types';
import type { StoreAction } from '../actions';
import { connectionReducer } from './connection';
import { broadcasterReducer } from './broadcaster';
import { countersReducer } from './counters';
import { healthReducer } from './health';
import { alertsReducer } from './alerts';
import { latestEventsReducer } from './latestEvents';
import { goalsReducer } from './goals';
import { activityReducer } from './activity';
import { streamReducer } from './stream';

export function rootReducer(state: OverlayState, action: StoreAction): OverlayState {
  return {
    connection: connectionReducer(state.connection, action),
    broadcaster: broadcasterReducer(state.broadcaster, action),
    counters: countersReducer(state.counters, action),
    health: healthReducer(state.health, action),
    alerts: alertsReducer(state.alerts, action),
    latestEvents: latestEventsReducer(state.latestEvents, action),
    goals: goalsReducer(state.goals, action),
    activity: activityReducer(state.activity, action),
    stream: streamReducer(state.stream, action),
    _meta: {
      ...state._meta,
      lastActionType: action.type,
      lastActionAt: Date.now(),
      actionCount: state._meta.actionCount + 1,
    },
  };
}
