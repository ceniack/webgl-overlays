// Store singleton and core API
export { overlayStore } from './OverlayStore';
export type { Selector, Subscriber, Middleware } from './OverlayStore';

// State types
export type {
  OverlayState,
  ConnectionState,
  BroadcasterState,
  CountersState,
  CounterEntry,
  HealthState,
  AlertsState,
  StoreAlert,
  AlertLifecycle,
  LatestEventsState,
  LatestEventEntry,
  GoalsState,
  GoalEntry,
  ActivityState,
  ActivityEntry,
  StreamState,
  MetaState,
} from './types';

// Actions
export type { StoreAction } from './actions';

// Selectors
export {
  selectIsConnected,
  selectConnection,
  selectBroadcaster,
  selectDisplayName,
  selectProfileImageUrl,
  selectCounters,
  selectCounter,
  selectVisibleCounterIds,
  selectHealth,
  selectBpm,
  selectHealthStatus,
  selectAlertQueue,
  selectActiveAlerts,
  selectAlertQueueLength,
  selectActiveAlertCount,
  selectHasAvailableAlertSlot,
  selectNextPendingAlert,
  selectLatestEvents,
  selectLatestEvent,
  selectGoals,
  selectGoal,
  selectActiveGoals,
  selectActivityItems,
  selectActivityCount,
  selectIsLive,
  selectStreamStatus,
} from './selectors';

// Middleware
export {
  loggingMiddleware,
  alertQueueMiddleware,
  persistenceMiddleware,
} from './middleware';
