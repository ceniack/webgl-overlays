import type { ConnectionState } from '../types';
import type { StoreAction } from '../actions';

export function connectionReducer(state: ConnectionState, action: StoreAction): ConnectionState {
  switch (action.type) {
    case 'CONNECTION_OPENED':
      return {
        ...state,
        streamerbotConnected: true,
        lastConnectedAt: action.timestamp,
        reconnectAttempts: 0,
      };
    case 'CONNECTION_CLOSED':
      return {
        ...state,
        streamerbotConnected: false,
        lastDisconnectedAt: action.timestamp,
      };
    case 'CONNECTION_ERROR':
      return {
        ...state,
        streamerbotConnected: false,
        reconnectAttempts: state.reconnectAttempts + 1,
      };
    default:
      return state;
  }
}
