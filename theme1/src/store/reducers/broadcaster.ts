import type { BroadcasterState } from '../types';
import type { StoreAction } from '../actions';

export function broadcasterReducer(state: BroadcasterState, action: StoreAction): BroadcasterState {
  switch (action.type) {
    case 'BROADCASTER_UPDATED':
      return {
        ...state,
        ...(action.displayName !== undefined && { displayName: action.displayName }),
        ...(action.username !== undefined && { username: action.username }),
        ...(action.userId !== undefined && { userId: action.userId }),
        ...(action.profileImageUrl !== undefined && { profileImageUrl: action.profileImageUrl }),
        ...(action.twitchUrl !== undefined && { twitchUrl: action.twitchUrl }),
        isLoaded: true,
      };
    default:
      return state;
  }
}
