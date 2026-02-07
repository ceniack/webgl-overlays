import type { LatestEventsState, LatestEventEntry } from '../types';
import type { StoreAction } from '../actions';

export function latestEventsReducer(state: LatestEventsState, action: StoreAction): LatestEventsState {
  switch (action.type) {
    case 'LATEST_EVENT_SET': {
      const entry: LatestEventEntry = {
        user: action.user,
        platform: action.platform,
        timestamp: action.timestamp,
        amount: action.amount,
        currency: action.currency,
        tier: action.tier,
        months: action.months,
        isGift: action.isGift,
        giftRecipient: action.giftRecipient,
        viewers: action.viewers,
        reward: action.reward,
        cost: action.cost,
        message: action.message,
      };
      return { ...state, [action.eventType]: entry };
    }

    case 'LATEST_EVENT_RESTORED': {
      const entry: LatestEventEntry = {
        user: action.data.user,
        platform: action.data.platform,
        timestamp: action.data.timestamp,
        amount: action.data.amount,
        currency: action.data.currency,
        tier: action.data.tier,
        months: action.data.months,
        isGift: action.data.isGift,
        giftRecipient: action.data.giftRecipient,
        viewers: action.data.viewers,
        reward: action.data.reward,
        cost: action.data.cost,
        message: action.data.message,
      };
      return { ...state, [action.eventType]: entry };
    }

    default:
      return state;
  }
}
