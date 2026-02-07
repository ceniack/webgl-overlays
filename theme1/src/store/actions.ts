/**
 * Typed store actions. Every action is a plain serializable object.
 */

import type { AlertType, AlertPlatform } from '../types/alerts';
import type { GoalType } from '../types/goals';

// ---- Connection ----

export interface ConnectedAction {
  type: 'CONNECTION_OPENED';
  timestamp: number;
}

export interface DisconnectedAction {
  type: 'CONNECTION_CLOSED';
  timestamp: number;
}

export interface ConnectionErrorAction {
  type: 'CONNECTION_ERROR';
  message: string;
  timestamp: number;
}

// ---- Broadcaster ----

export interface BroadcasterUpdatedAction {
  type: 'BROADCASTER_UPDATED';
  displayName?: string;
  username?: string;
  userId?: string;
  profileImageUrl?: string;
  twitchUrl?: string;
}

// ---- Counters ----

export interface CounterValueSetAction {
  type: 'COUNTER_VALUE_SET';
  counterId: string;
  value: number;
}

export interface CounterLabelSetAction {
  type: 'COUNTER_LABEL_SET';
  counterId: string;
  label: string;
}

export interface CounterVisibilitySetAction {
  type: 'COUNTER_VISIBILITY_SET';
  counterId: string;
  visible: boolean;
}

// ---- Health ----

export interface HeartRateReceivedAction {
  type: 'HEART_RATE_RECEIVED';
  bpm: number;
  timestamp: number;
}

export interface HealthStatusChangedAction {
  type: 'HEALTH_STATUS_CHANGED';
  status: 'connected' | 'disconnected' | 'error' | 'inactive';
  message: string;
  timestamp: number;
}

// ---- Alerts ----

export interface AlertEnqueuedAction {
  type: 'ALERT_ENQUEUED';
  alert: {
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
  };
}

export interface AlertActivatedAction {
  type: 'ALERT_ACTIVATED';
  alertId: string;
  timestamp: number;
}

export interface AlertExitingAction {
  type: 'ALERT_EXITING';
  alertId: string;
  timestamp: number;
}

export interface AlertDismissedAction {
  type: 'ALERT_DISMISSED';
  alertId: string;
  timestamp: number;
}

// ---- Latest Events ----

export interface LatestEventSetAction {
  type: 'LATEST_EVENT_SET';
  eventType: AlertType;
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

export interface LatestEventRestoredAction {
  type: 'LATEST_EVENT_RESTORED';
  eventType: AlertType;
  data: {
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
  };
}

// ---- Goals ----

export interface GoalUpdatedAction {
  type: 'GOAL_UPDATED';
  goalId: string;
  goalType: GoalType;
  current: number;
  target?: number;
  label?: string;
  timestamp: number;
}

// ---- Activity ----

export interface ActivityAddedAction {
  type: 'ACTIVITY_ADDED';
  item: {
    id: string;
    type: AlertType;
    platform: AlertPlatform;
    user: string;
    detail: string;
    timestamp: number;
  };
}

// ---- Stream ----

export interface StreamOnlineAction {
  type: 'STREAM_ONLINE';
  platform: 'twitch' | 'youtube';
  timestamp: number;
}

export interface StreamOfflineAction {
  type: 'STREAM_OFFLINE';
  platform: 'twitch' | 'youtube';
  timestamp: number;
}

// ---- Union ----

export type StoreAction =
  | ConnectedAction
  | DisconnectedAction
  | ConnectionErrorAction
  | BroadcasterUpdatedAction
  | CounterValueSetAction
  | CounterLabelSetAction
  | CounterVisibilitySetAction
  | HeartRateReceivedAction
  | HealthStatusChangedAction
  | AlertEnqueuedAction
  | AlertActivatedAction
  | AlertExitingAction
  | AlertDismissedAction
  | LatestEventSetAction
  | LatestEventRestoredAction
  | GoalUpdatedAction
  | ActivityAddedAction
  | StreamOnlineAction
  | StreamOfflineAction;
