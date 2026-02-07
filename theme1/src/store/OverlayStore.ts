import type { OverlayState } from './types';
import type { StoreAction } from './actions';
import { createInitialState } from './initialState';
import { rootReducer } from './reducers';
import { logger } from '../js/Logger';

const storeLogger = logger.createChildLogger('Store');

export type Selector<T> = (state: OverlayState) => T;
export type Subscriber<T> = (value: T, prevValue: T, state: OverlayState) => void;
export type Middleware = (
  action: StoreAction,
  state: OverlayState,
  next: () => void
) => void;

interface Subscription<T> {
  selector: Selector<T>;
  callback: Subscriber<T>;
  lastValue: T;
}

class OverlayStoreImpl {
  private state: OverlayState;
  private subscriptions: Set<Subscription<any>> = new Set();
  private middlewares: Middleware[] = [];
  private isDispatching = false;
  private actionLog: Array<{ action: StoreAction; timestamp: number }> = [];
  private maxLogSize = 200;

  constructor() {
    this.state = createInitialState();
    storeLogger.info('OverlayStore created');
  }

  getState(): Readonly<OverlayState> {
    return this.state;
  }

  dispatch(action: StoreAction): void {
    if (this.isDispatching) {
      storeLogger.error(
        `Cannot dispatch "${action.type}" while dispatching "${this.state._meta.lastActionType}". ` +
        'Schedule side effects in middleware or subscribers.'
      );
      return;
    }

    this.actionLog.push({ action, timestamp: Date.now() });
    if (this.actionLog.length > this.maxLogSize) {
      this.actionLog.shift();
    }

    // Run middleware chain
    let index = 0;
    const runNext = () => {
      if (index < this.middlewares.length) {
        const mw = this.middlewares[index++];
        mw(action, this.state, runNext);
      } else {
        this.executeDispatch(action);
      }
    };

    runNext();
  }

  /**
   * Subscribe to state changes via a selector.
   * Callback fires only when the selector's return value changes (reference equality).
   * Returns an unsubscribe function.
   */
  subscribe<T>(selector: Selector<T>, callback: Subscriber<T>): () => void {
    const subscription: Subscription<T> = {
      selector,
      callback,
      lastValue: selector(this.state),
    };

    this.subscriptions.add(subscription);

    return () => {
      this.subscriptions.delete(subscription);
    };
  }

  /**
   * Add middleware that runs before each dispatch.
   * Call next() to continue the chain; omit to swallow the action.
   */
  use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  getActionLog(): ReadonlyArray<{ action: StoreAction; timestamp: number }> {
    return this.actionLog;
  }

  getSubscriptionCount(): number {
    return this.subscriptions.size;
  }

  private executeDispatch(action: StoreAction): void {
    this.isDispatching = true;

    try {
      const prevState = this.state;
      this.state = rootReducer(prevState, action);
      this.notifySubscribers(prevState);
    } catch (error) {
      storeLogger.error(`Error in reducer for action "${action.type}":`, error);
    } finally {
      this.isDispatching = false;
    }
  }

  private notifySubscribers(prevState: OverlayState): void {
    for (const sub of this.subscriptions) {
      try {
        const newValue = sub.selector(this.state);
        if (newValue !== sub.lastValue) {
          const prevValue = sub.lastValue;
          sub.lastValue = newValue;
          sub.callback(newValue, prevValue, this.state);
        }
      } catch (error) {
        storeLogger.error('Error in subscription callback:', error);
      }
    }
  }
}

// Singleton
export const overlayStore = new OverlayStoreImpl();

// Window exposure for debugging
if (typeof window !== 'undefined') {
  (window as any).overlayState = () => overlayStore.getState();
  (window as any).overlayStore = overlayStore;
  (window as any).overlayActionLog = () => overlayStore.getActionLog();

  (window as any).debugStore = () => {
    const state = overlayStore.getState();
    storeLogger.info('=== OverlayStore Debug ===');
    storeLogger.info(`  Actions dispatched: ${state._meta.actionCount}`);
    storeLogger.info(`  Last action: ${state._meta.lastActionType}`);
    storeLogger.info(`  Subscriptions: ${overlayStore.getSubscriptionCount()}`);
    storeLogger.info(`  Connected: ${state.connection.streamerbotConnected}`);
    storeLogger.info(`  Alert queue: ${state.alerts.queue.length}`);
    storeLogger.info(`  Active alerts: ${state.alerts.active.length}`);
    storeLogger.info(`  Activity items: ${state.activity.items.length}`);
    console.log('Full state:', JSON.parse(JSON.stringify(state)));
  };
}
