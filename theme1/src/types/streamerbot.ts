/**
 * TypeScript interfaces for Streamer.bot events and data
 * Using official @streamerbot/client types with extensions for our use case
 */

// Import official types from @streamerbot/client
export type {
  StreamerbotClient,
  StreamerbotEventData,
  StreamerbotEventPayload,
  StreamerbotPlatform,
  StreamerbotGlobalVariable,
  StreamerbotAction,
  BroadcasterPlatforms,
  StreamerbotResponse
} from '@streamerbot/client';

// Re-export platform type with our naming
export type { StreamerbotPlatform as Platform } from '@streamerbot/client';

// Our custom extensions for component data structure
export interface GlobalVariableEvent {
  variableName: string;
  variableValue: string | number | boolean;
  oldValue?: string | number | boolean;
  timestamp: Date;
}

// Broadcaster Information (our custom structure)
export interface BroadcasterInfo {
  displayName: string;
  userName: string;
  userId: string;
  profileImageUrl?: string;
  twitchUrl?: string;
  isLive: boolean;
  followerCount: number;
  subscriberCount: number;
}

// Goal System Types (our custom structure)
export interface StreamGoal {
  type: 'Follower' | 'Subscription' | 'Bit';
  current: number;
  target: number;
  description?: string;
  isActive: boolean;
  progress: number; // 0-100 percentage
}

export interface GoalCollection {
  [goalType: string]: StreamGoal;
}

// Counter System Types (our custom structure)
export interface CounterData {
  label: string;
  value: number;
  isVisible: boolean;
  lastUpdated: Date;
}

export interface CounterCollection {
  counter1: CounterData;
  counter2: CounterData;
  [key: `counter${number}`]: CounterData;
}

// Activity Feed Types (our custom structure)
export interface ActivityItem {
  id: string;
  type: 'follow' | 'subscribe' | 'cheer' | 'goal' | 'other';
  displayName: string;
  message: string;
  timestamp: Date;
  data?: Record<string, unknown>;
}

export interface ActivityFeed {
  items: ActivityItem[];
  maxItems: number;
}

// Component Data Interface (our custom structure)
export interface ComponentData {
  broadcaster: BroadcasterInfo;
  goals: GoalCollection;
  counters: CounterCollection;
  activity: ActivityFeed;
  globalVariables: Record<string, any>;
}

// WebSocket Message Types (our custom structure)
export interface WebSocketMessage {
  type: 'update' | 'error' | 'connected' | 'disconnected';
  data?: unknown;
  timestamp: Date;
}

export interface OverlayUpdateMessage extends WebSocketMessage {
  type: 'update';
  data: Partial<ComponentData>;
}

// Legacy interface for backwards compatibility
export interface StreamerbotGlobalVariableEvent extends GlobalVariableEvent {
  eventType: 'GlobalVariableUpdated';
}