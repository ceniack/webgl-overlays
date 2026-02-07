import type { Middleware } from '../OverlayStore';
import { overlayStore } from '../OverlayStore';
import { selectHasAvailableAlertSlot, selectNextPendingAlert } from '../selectors';

/**
 * Auto-promotes pending alerts to active when slots are available.
 * Runs after ALERT_ENQUEUED and ALERT_DISMISSED actions.
 */
export const alertQueueMiddleware: Middleware = (action, _state, next) => {
  next(); // Let the reducer run first

  if (action.type === 'ALERT_ENQUEUED' || action.type === 'ALERT_DISMISSED') {
    // Use setTimeout(0) to avoid dispatch-during-dispatch
    setTimeout(() => promoteAlerts(), 0);
  }
};

function promoteAlerts(): void {
  let state = overlayStore.getState();

  while (selectHasAvailableAlertSlot(state) && selectNextPendingAlert(state)) {
    const next = selectNextPendingAlert(state);
    if (!next) break;

    overlayStore.dispatch({
      type: 'ALERT_ACTIVATED',
      alertId: next.id,
      timestamp: Date.now(),
    });

    state = overlayStore.getState();
  }
}
