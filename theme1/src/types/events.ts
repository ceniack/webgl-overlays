export interface CounterUpdateEvent {
  counterName: string;
  value: number | string | boolean;
  isLabel?: boolean;
  isToggle?: boolean;
  timestamp?: number;
}

export interface CarouselControlEvent {
  action: 'start' | 'stop' | 'next' | 'previous' | 'goto';
  slideIndex?: number;
}

export interface BroadcasterInfoEvent {
  displayName?: string;
  profileImageUrl?: string;
  description?: string;
  viewCount?: number;
  followerCount?: number;
}

export interface HealthStatusEvent {
  status: 'connected' | 'disconnected' | 'error';
  message?: string;
  timestamp: number;
}

export interface StreamerbotConnectionEvent {
  connected: boolean;
  timestamp: number;
}

export interface ComponentReadyEvent {
  componentName: string;
  timestamp: number;
}

// Alert system events
export interface AlertTriggerEvent {
  type: 'follow' | 'sub' | 'cheer' | 'raid' | 'donation' | 'redemption' | 'firstword';
  platform: 'twitch' | 'youtube' | 'streamlabs' | 'kofi' | 'streamelements' | 'kick' | 'trovo' | 'tipeeestream' | 'donordrive' | 'fourthwall';
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
  id?: string;
}

export interface StreamStatusEvent {
  status: 'online' | 'offline';
  platform: 'twitch' | 'youtube';
  timestamp: number;
}

export interface GoalProgressEvent {
  goalId: string;
  type: 'follower' | 'sub' | 'bit' | 'donation' | 'custom';
  current: number;
  target?: number;
  previousValue?: number;
  timestamp: number;
}

export interface ActivityItemEvent {
  id: string;
  type: 'follow' | 'sub' | 'cheer' | 'raid' | 'donation' | 'redemption' | 'firstword';
  platform: 'twitch' | 'youtube' | 'streamlabs' | 'kofi' | 'streamelements' | 'kick' | 'trovo' | 'tipeeestream' | 'donordrive' | 'fourthwall';
  user: string;
  detail?: string;
  timestamp: number;
}

export type EventMap = {
  'counter:update': CounterUpdateEvent;
  'carousel:control': CarouselControlEvent;
  'broadcaster:update': BroadcasterInfoEvent;
  'health:status': HealthStatusEvent;
  'streamerbot:connection': StreamerbotConnectionEvent;
  'component:ready': ComponentReadyEvent;
  // New alert system events
  'alert:trigger': AlertTriggerEvent;
  'stream:status': StreamStatusEvent;
  'goal:progress': GoalProgressEvent;
  'activity:item': ActivityItemEvent;
};

export type EventType = keyof EventMap;

export type EventHandler<T extends EventType> = (data: EventMap[T]) => void;
