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

export type EventMap = {
  'counter:update': CounterUpdateEvent;
  'carousel:control': CarouselControlEvent;
  'broadcaster:update': BroadcasterInfoEvent;
  'health:status': HealthStatusEvent;
  'streamerbot:connection': StreamerbotConnectionEvent;
  'component:ready': ComponentReadyEvent;
};

export type EventType = keyof EventMap;

export type EventHandler<T extends EventType> = (data: EventMap[T]) => void;
