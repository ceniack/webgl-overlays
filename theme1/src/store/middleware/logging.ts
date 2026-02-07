import type { Middleware } from '../OverlayStore';
import { logger } from '../../js/Logger';

const mwLogger = logger.createChildLogger('Store:MW');

export const loggingMiddleware: Middleware = (action, _state, next) => {
  mwLogger.debug(`ACTION: ${action.type}`, action);
  next();
};
