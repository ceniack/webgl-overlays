import type { Middleware } from '../OverlayStore';
import { logger } from '../../js/Logger';

const persistLogger = logger.createChildLogger('Store:Persist');

/**
 * Persists latest events to Streamer.bot global variables.
 * Maintains backward compatibility with the existing persistence layer.
 */
export const persistenceMiddleware: Middleware = (action, _state, next) => {
  next();

  if (action.type === 'LATEST_EVENT_SET') {
    const client = (window as any).streamerbotClient;
    if (!client) return;

    const varName = `latestEvent${action.eventType.charAt(0).toUpperCase()}${action.eventType.slice(1)}`;
    const data = {
      user: action.user,
      platform: action.platform,
      timestamp: action.timestamp,
      amount: action.amount,
      tier: action.tier,
      months: action.months,
      isGift: action.isGift,
      giftRecipient: action.giftRecipient,
      viewers: action.viewers,
      reward: action.reward,
      cost: action.cost,
      message: action.message,
    };

    try {
      client.setGlobal(varName, JSON.stringify(data));
      persistLogger.debug(`Persisted ${varName}`);
    } catch (e) {
      persistLogger.warn(`Failed to persist ${varName}:`, e);
    }
  }
};
