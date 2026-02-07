import type { StreamState } from '../types';
import type { StoreAction } from '../actions';

export function streamReducer(state: StreamState, action: StoreAction): StreamState {
  switch (action.type) {
    case 'STREAM_ONLINE':
      return {
        ...state,
        isLive: true,
        platform: action.platform,
        lastOnlineAt: action.timestamp,
      };
    case 'STREAM_OFFLINE':
      return {
        ...state,
        isLive: false,
        lastOfflineAt: action.timestamp,
      };
    default:
      return state;
  }
}
