import type {
  OverlayState,
  CounterEntry,
  StoreAlert,
  LatestEventEntry,
  GoalEntry,
} from './types';
import type { AlertType } from '../types/alerts';

// ---- Connection ----
export const selectIsConnected = (s: OverlayState) => s.connection.streamerbotConnected;
export const selectConnection = (s: OverlayState) => s.connection;

// ---- Broadcaster ----
export const selectBroadcaster = (s: OverlayState) => s.broadcaster;
export const selectDisplayName = (s: OverlayState) => s.broadcaster.displayName;
export const selectProfileImageUrl = (s: OverlayState) => s.broadcaster.profileImageUrl;

// ---- Counters ----
export const selectCounters = (s: OverlayState) => s.counters;
export const selectCounter = (id: string) =>
  (s: OverlayState): CounterEntry | undefined => s.counters[id];
export const selectVisibleCounterIds = (s: OverlayState): string[] =>
  Object.entries(s.counters)
    .filter(([, c]) => c && typeof c === 'object' && c.visible)
    .map(([id]) => id);

// ---- Health ----
export const selectHealth = (s: OverlayState) => s.health;
export const selectBpm = (s: OverlayState) => s.health.bpm;
export const selectHealthStatus = (s: OverlayState) => s.health.status;

// ---- Alerts ----
export const selectAlertQueue = (s: OverlayState) => s.alerts.queue;
export const selectActiveAlerts = (s: OverlayState) => s.alerts.active;
export const selectAlertQueueLength = (s: OverlayState) => s.alerts.queue.length;
export const selectActiveAlertCount = (s: OverlayState) => s.alerts.active.length;
export const selectHasAvailableAlertSlot = (s: OverlayState): boolean =>
  s.alerts.active.filter(a => a.lifecycle === 'active').length < s.alerts.maxVisible;
export const selectNextPendingAlert = (s: OverlayState): StoreAlert | undefined =>
  s.alerts.queue[0];

// ---- Latest Events ----
export const selectLatestEvents = (s: OverlayState) => s.latestEvents;
export const selectLatestEvent = (type: AlertType) =>
  (s: OverlayState): LatestEventEntry | null => s.latestEvents[type] ?? null;

// ---- Goals ----
export const selectGoals = (s: OverlayState) => s.goals.goals;
export const selectGoal = (id: string) =>
  (s: OverlayState): GoalEntry | undefined => s.goals.goals[id];
export const selectActiveGoals = (s: OverlayState): GoalEntry[] =>
  Object.values(s.goals.goals).filter(g => g.isActive);

// ---- Activity ----
export const selectActivityItems = (s: OverlayState) => s.activity.items;
export const selectActivityCount = (s: OverlayState) => s.activity.items.length;

// ---- Stream ----
export const selectIsLive = (s: OverlayState) => s.stream.isLive;
export const selectStreamStatus = (s: OverlayState) => s.stream;
