/**
 * Centralized overlay state — single JSON-serializable object.
 * No Date objects, no Map/Set, no functions — pure data.
 */

import type { AlertType, AlertPlatform } from '../types/alerts';
import type { GoalType } from '../types/goals';

// ---- Top-level state ----

export interface OverlayState {
  connection: ConnectionState;
  broadcaster: BroadcasterState;
  counters: CountersState;
  health: HealthState;
  alerts: AlertsState;
  latestEvents: LatestEventsState;
  goals: GoalsState;
  activity: ActivityState;
  stream: StreamState;
  _meta: MetaState;
}

// ---- Connection ----

export interface ConnectionState {
  streamerbotConnected: boolean;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
  reconnectAttempts: number;
}

// ---- Broadcaster ----

export interface BroadcasterState {
  displayName: string;
  username: string;
  userId: string;
  profileImageUrl: string | null;
  twitchUrl: string;
  isLoaded: boolean;
}

// ---- Counters ----

export interface CounterEntry {
  value: number;
  label: string;
  visible: boolean;
  lastUpdatedAt: number;
}

export interface CountersState {
  [key: string]: CounterEntry;
}

// ---- Health (Heart Rate) ----

export interface HealthState {
  status: 'connected' | 'disconnected' | 'error' | 'inactive';
  bpm: number;
  lastUpdateAt: number | null;
  message: string;
}

// ---- Alerts ----

export type AlertLifecycle = 'pending' | 'active' | 'exiting' | 'dismissed';

export interface StoreAlert {
  id: string;
  type: AlertType;
  platform: AlertPlatform;
  user: string;
  amount?: number;
  currency?: string;
  message?: string;
  tier?: string;
  months?: number;
  isGift?: boolean;
  giftRecipient?: string;
  viewers?: number;
  reward?: string;
  cost?: number;
  isTest?: boolean;
  timestamp: number;
  lifecycle: AlertLifecycle;
  lifecycleChangedAt: number;
}

export interface AlertsState {
  queue: StoreAlert[];
  active: StoreAlert[];
  recentlyDismissed: string[];
  maxVisible: number;
  maxQueueSize: number;
}

// ---- Latest Events ----

export interface LatestEventEntry {
  user: string;
  platform: AlertPlatform;
  timestamp: number;
  amount?: number;
  currency?: string;
  tier?: string;
  months?: number;
  isGift?: boolean;
  giftRecipient?: string;
  viewers?: number;
  reward?: string;
  cost?: number;
  message?: string;
}

export interface LatestEventsState {
  follow: LatestEventEntry | null;
  sub: LatestEventEntry | null;
  cheer: LatestEventEntry | null;
  raid: LatestEventEntry | null;
  donation: LatestEventEntry | null;
  redemption: LatestEventEntry | null;
  firstword: LatestEventEntry | null;
  [key: string]: LatestEventEntry | null;
}

// ---- Goals ----

export interface GoalEntry {
  id: string;
  type: GoalType;
  current: number;
  target: number;
  label: string;
  isActive: boolean;
  isComplete: boolean;
  startedAt: number | null;
  completedAt: number | null;
}

export interface GoalsState {
  goals: Record<string, GoalEntry>;
}

// ---- Activity Feed ----

export interface ActivityEntry {
  id: string;
  type: AlertType;
  platform: AlertPlatform;
  user: string;
  detail: string;
  timestamp: number;
}

export interface ActivityState {
  items: ActivityEntry[];
  maxItems: number;
}

// ---- Stream Status ----

export interface StreamState {
  isLive: boolean;
  platform: 'twitch' | 'youtube' | null;
  lastOnlineAt: number | null;
  lastOfflineAt: number | null;
}

// ---- Meta ----

export interface MetaState {
  version: number;
  lastActionType: string;
  lastActionAt: number;
  actionCount: number;
  createdAt: number;
}
