import type { OverlayState } from './types';

export function createInitialState(): OverlayState {
  return {
    connection: {
      streamerbotConnected: false,
      lastConnectedAt: null,
      lastDisconnectedAt: null,
      reconnectAttempts: 0,
    },
    broadcaster: {
      displayName: '',
      username: '',
      userId: '',
      profileImageUrl: null,
      twitchUrl: '',
      isLoaded: false,
    },
    counters: {
      counter1: { value: 0, label: 'Counter 1', visible: true, lastUpdatedAt: 0 },
      counter2: { value: 0, label: 'Counter 2', visible: true, lastUpdatedAt: 0 },
      counter3: { value: 0, label: 'Counter 3', visible: true, lastUpdatedAt: 0 },
      counter4: { value: 0, label: 'Counter 4', visible: true, lastUpdatedAt: 0 },
    },
    health: {
      status: 'disconnected',
      bpm: 0,
      lastUpdateAt: null,
      message: '',
    },
    alerts: {
      queue: [],
      active: [],
      recentlyDismissed: [],
      maxVisible: 3,
      maxQueueSize: 50,
    },
    latestEvents: {
      follow: null,
      sub: null,
      cheer: null,
      raid: null,
      donation: null,
      redemption: null,
      firstword: null,
    },
    goals: {
      goals: {},
    },
    activity: {
      items: [],
      maxItems: 50,
    },
    stream: {
      isLive: false,
      platform: null,
      lastOnlineAt: null,
      lastOfflineAt: null,
    },
    _meta: {
      version: 1,
      lastActionType: '',
      lastActionAt: 0,
      actionCount: 0,
      createdAt: Date.now(),
    },
  };
}
