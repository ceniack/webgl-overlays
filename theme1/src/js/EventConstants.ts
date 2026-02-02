import type { EventType } from '../types/events';

export const EVENT_TYPES = {
  COUNTER_UPDATE: 'counter:update' as EventType,
  CAROUSEL_CONTROL: 'carousel:control' as EventType,
  BROADCASTER_UPDATE: 'broadcaster:update' as EventType,
  HEALTH_STATUS: 'health:status' as EventType,
  STREAMERBOT_CONNECTION: 'streamerbot:connection' as EventType,
  COMPONENT_READY: 'component:ready' as EventType,
  // Alert system events
  ALERT_TRIGGER: 'alert:trigger' as EventType,
  STREAM_STATUS: 'stream:status' as EventType,
  GOAL_PROGRESS: 'goal:progress' as EventType,
  ACTIVITY_ITEM: 'activity:item' as EventType,
} as const;

export const CAROUSEL_ACTIONS = {
  START: 'start',
  STOP: 'stop',
  NEXT: 'next',
  PREVIOUS: 'previous',
  GOTO: 'goto',
} as const;

export const HEALTH_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  ERROR: 'error',
} as const;
