/**
 * Alert System Type Definitions
 * Platform-agnostic types for stream alerts (follows, subs, cheers, raids, donations)
 */

export type AlertType = 'follow' | 'sub' | 'cheer' | 'raid' | 'donation' | 'redemption' | 'firstword';
export type AlertPlatform =
  | 'twitch' | 'youtube' | 'streamlabs' | 'kofi' | 'streamelements'
  | 'kick' | 'trovo' | 'tipeeestream' | 'donordrive' | 'fourthwall';

/**
 * Normalized alert event - platform-agnostic format
 * Used by UI components to display alerts regardless of source platform
 */
export interface AlertEvent {
  /** Type of alert */
  type: AlertType;
  /** Source platform */
  platform: AlertPlatform;
  /** Display name of the user who triggered the alert */
  user: string;
  /** Amount (bits, donation amount, etc.) */
  amount?: number;
  /** Currency for donations */
  currency?: string;
  /** User message */
  message?: string;
  /** Subscription tier (1, 2, 3 for Twitch) */
  tier?: string;
  /** Months subscribed (for resubs) */
  months?: number;
  /** Whether this is a gift sub */
  isGift?: boolean;
  /** Gift recipient (for gift subs) */
  giftRecipient?: string;
  /** Number of viewers (for raids) */
  viewers?: number;
  /** Channel point reward name */
  reward?: string;
  /** Channel point cost */
  cost?: number;
  /** Whether this is a test event */
  isTest?: boolean;
  /** Unix timestamp when event occurred */
  timestamp: number;
  /** Unique event ID for deduplication */
  id?: string;
}

/**
 * Configuration for AlertFeed component
 */
export interface AlertFeedConfig {
  /** Maximum number of alerts in queue */
  maxQueueSize: number;
  /** Maximum number of alerts visible simultaneously */
  maxVisible: number;
  /** Display duration for each alert in milliseconds */
  displayDuration: number;
  /** Delay between alerts in milliseconds */
  alertDelay: number;
  /** Animation duration in milliseconds */
  animationDuration: number;
  /** Alert types to display (empty = all) */
  enabledTypes: AlertType[];
  /** Whether to play sound triggers */
  soundEnabled: boolean;
}

/**
 * Alert queue item with display state
 */
export interface QueuedAlert extends AlertEvent {
  /** Current display state */
  state: 'pending' | 'entering' | 'displaying' | 'exiting' | 'done';
  /** Time when state was last updated */
  stateTimestamp: number;
}

/**
 * Recent activity item for activity feed
 */
export interface ActivityItem {
  /** Unique ID */
  id: string;
  /** Alert type */
  type: AlertType;
  /** Platform source */
  platform: AlertPlatform;
  /** User display name */
  user: string;
  /** Secondary text (amount, tier, etc.) */
  detail?: string;
  /** Unix timestamp */
  timestamp: number;
}

/**
 * Configuration for RecentActivity component
 */
export interface RecentActivityConfig {
  /** Maximum items to display */
  maxItems: number;
  /** Whether to auto-scroll */
  autoScroll: boolean;
  /** Scroll animation duration */
  scrollDuration: number;
  /** Event types to include (empty = all) */
  enabledTypes: AlertType[];
  /** Whether to show timestamps */
  showTimestamps: boolean;
  /** Time format for timestamps */
  timeFormat: 'relative' | 'absolute';
}
