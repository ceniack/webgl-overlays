import { eventBus } from './EventBus';
import { EVENT_TYPES, HEALTH_STATUS } from './EventConstants';
import { logger } from './Logger';
import type {
  CounterUpdateEvent,
  BroadcasterInfoEvent,
  HealthStatusEvent,
  StreamerbotConnectionEvent,
  AlertTriggerEvent,
  StreamStatusEvent,
  GoalProgressEvent,
  ActivityItemEvent
} from '../types/events';
import type { AlertType, AlertPlatform } from '../types/alerts';
import type { GoalType } from '../types/goals';

const sbLogger = logger.createChildLogger('Streamerbot');

declare global {
  interface Window {
    StreamerbotClient: any;
    updateCounterFromGlobalVariable?: (name: string, value: any) => void;
    loadBroadcasterProfileImage?: (url: string) => void;
    requestGoalVariables?: (types: string) => void;
    ComponentComposer?: any;
    _pendingProfileImageLoad?: string;
  }
}

interface StreamerbotConfig {
  host: string;
  port: number;
  endpoint: string;
  immediate: boolean;
  autoReconnect: boolean;
  retries: number;
  retryInterval: number;
  onConnect?: (data: any) => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

interface InitializationState {
  connected: boolean;
  globalsLoaded: boolean;
  broadcasterLoaded: boolean;
  ready: boolean;
}

class StreamerbotIntegration {
  private client: any = null;
  private initState: InitializationState = {
    connected: false,
    globalsLoaded: false,
    broadcasterLoaded: false,
    ready: false
  };
  private pendingVariables: Record<string, any> = {};
  private componentReady = false;

  constructor() {
    sbLogger.info('Streamerbot integration initializing');
    this.setupComponentReadyListener();
  }

  private setupComponentReadyListener(): void {
    window.addEventListener('streamoverlay:ready', (event: any) => {
      const { component, timestamp, functions } = event.detail;
      sbLogger.debug(`Component ready: ${component} at ${timestamp}`);

      if (component === 'overlay-html') {
        this.componentReady = true;
        sbLogger.info('Overlay functions available', functions);

        if (Object.keys(this.pendingVariables).length > 0) {
          sbLogger.debug('Processing pending initial data');
          this.processInitialVariables(this.pendingVariables);
        }

        const pendingImage = (window as any)._pendingProfileImageLoad;
        if (pendingImage && typeof (window as any).loadBroadcasterProfileImage === 'function') {
          sbLogger.debug('Retrying profile image load', pendingImage);
          (window as any).loadBroadcasterProfileImage(pendingImage);
          delete (window as any)._pendingProfileImageLoad;
        }
      }
    });
  }

  private processInitialVariables(variables: Record<string, any>): void {
    sbLogger.debug('Processing variables', variables);

    for (const [variableName, variableData] of Object.entries(variables)) {
      let variableValue = variableData;
      if (typeof variableData === 'object' && variableData !== null && 'value' in variableData) {
        variableValue = variableData.value;
      }
      this.processVariable(variableName, variableValue);
    }

    this.pendingVariables = {};
    sbLogger.info('Variable processing complete');
  }

  private processVariable(name: string, value: any): void {
    sbLogger.debug(`Processing ${name} = ${value}`);

    // Handle all counter-related variables (values, labels, toggles)
    if (name.startsWith('counter')) {
      if (name.includes('label')) {
        // Counter labels
        eventBus.emit(EVENT_TYPES.COUNTER_UPDATE, {
          counterName: name,
          value: String(value),
          isLabel: true,
          timestamp: Date.now()
        });
        sbLogger.debug(`Emitted counter label update: ${name} = ${value}`);
      } else if (name.includes('toggle')) {
        // Counter toggles (visibility)
        eventBus.emit(EVENT_TYPES.COUNTER_UPDATE, {
          counterName: name,
          value: value,
          isToggle: true,
          timestamp: Date.now()
        });
        sbLogger.debug(`Emitted counter toggle update: ${name} = ${value}`);
      } else {
        // Counter values
        const counterValue = typeof value === 'string' ? parseInt(value, 10) : value;
        if (!isNaN(counterValue)) {
          eventBus.emit(EVENT_TYPES.COUNTER_UPDATE, {
            counterName: name,
            value: counterValue,
            timestamp: Date.now()
          });
          sbLogger.debug(`Emitted counter value update: ${name} = ${counterValue}`);
        }
      }
    }

    if (name === 'broadcasterProfileImageTrigger' && value && value.trim() !== '') {
      if (typeof window.loadBroadcasterProfileImage === 'function') {
        window.loadBroadcasterProfileImage(value.trim());
      } else {
        window._pendingProfileImageLoad = value.trim();
      }
    }

    if (name === 'activeGoalTypes' && typeof window.requestGoalVariables === 'function') {
      window.requestGoalVariables(value);
    }

    // Also call the legacy window function for backwards compatibility
    if (typeof window.updateCounterFromGlobalVariable === 'function') {
      window.updateCounterFromGlobalVariable(name, value);
    }
  }

  /**
   * Process goal-related variables from Streamer.bot global variables
   * Expected format: goal{Type}Current, goal{Type}Target (e.g., goalFollowerCurrent)
   */
  private processGoalVariable(name: string, value: any): void {
    // Match goal variable patterns: goalFollowerCurrent, goalSubTarget, etc.
    const goalMatch = name.match(/^goal(Follower|Sub|Bit|Donation|Custom)?(Current|Target)$/i);
    if (!goalMatch) return;

    const goalTypeStr = (goalMatch[1] || 'custom').toLowerCase();
    const valueType = goalMatch[2].toLowerCase(); // 'current' or 'target'

    // Map to GoalType
    const goalTypeMap: Record<string, GoalType> = {
      follower: 'follower',
      sub: 'sub',
      bit: 'bit',
      donation: 'donation',
      custom: 'custom'
    };
    const goalType = goalTypeMap[goalTypeStr] || 'custom';
    const goalId = `${goalType}-goal`;

    // Parse numeric value
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numericValue)) return;

    sbLogger.debug(`Goal variable update: ${name} = ${numericValue} (type: ${goalType}, ${valueType})`);

    const goalEvent: GoalProgressEvent = {
      goalId,
      type: goalType,
      current: valueType === 'current' ? numericValue : 0,
      target: valueType === 'target' ? numericValue : undefined,
      timestamp: Date.now()
    };

    eventBus.emit(EVENT_TYPES.GOAL_PROGRESS, goalEvent);
  }

  private async waitForClientReady(maxWait: number = 1000): Promise<boolean> {
    const startTime = Date.now();
    sbLogger.debug('Verifying client readiness');

    while (Date.now() - startTime < maxWait) {
      try {
        await this.client.getInfo();
        sbLogger.debug('Client ready verification successful');
        return true;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    sbLogger.warn(`Client readiness timeout after ${maxWait}ms`);
    return false;
  }

  /**
   * Normalize platform-specific events into unified AlertTriggerEvent format
   */
  private normalizeAlertEvent(source: string, type: AlertType, data: any): AlertTriggerEvent {
    const platform = source.split('.')[0].toLowerCase() as AlertPlatform;
    const baseEvent: AlertTriggerEvent = {
      type,
      platform,
      user: data.user_name || data.displayName || data.userName || data.name || 'Unknown',
      timestamp: Date.now(),
      isTest: data.isTest ?? false,
      id: `${type}-${platform}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    switch (type) {
      case 'follow':
        return baseEvent;

      case 'sub':
        return {
          ...baseEvent,
          tier: data.tier || data.sub_tier || '1',
          months: data.cumulative_months || data.cumulativeMonths || data.months || 1,
          isGift: data.is_gift || data.isGift || false,
          giftRecipient: data.recipient_user_name || data.recipientUserName,
          message: data.message?.text || data.message
        };

      case 'cheer':
        return {
          ...baseEvent,
          amount: data.bits || data.amount || 0,
          message: data.message?.text || data.message
        };

      case 'raid':
        return {
          ...baseEvent,
          viewers: data.viewers || data.viewer_count || data.viewerCount || 0
        };

      case 'donation':
        return {
          ...baseEvent,
          amount: parseFloat(data.amount) || data.amount || 0,
          currency: data.currency || 'USD',
          message: data.message?.text || data.message
        };

      case 'redemption':
        return {
          ...baseEvent,
          reward: data.reward?.title || data.rewardTitle || data.title || 'Unknown Reward',
          cost: data.reward?.cost || data.rewardCost || data.cost || 0,
          message: data.user_input || data.userInput || data.message
        };

      default:
        return baseEvent;
    }
  }

  /**
   * Emit an alert event and corresponding activity item
   */
  private emitAlertEvent(alertEvent: AlertTriggerEvent): void {
    sbLogger.info(`📢 Alert: ${alertEvent.type} from ${alertEvent.platform} - ${alertEvent.user}`);

    // Emit main alert trigger event
    eventBus.emit(EVENT_TYPES.ALERT_TRIGGER, alertEvent);

    // Also emit as activity item for the activity feed
    const activityItem: ActivityItemEvent = {
      id: alertEvent.id || `activity-${Date.now()}`,
      type: alertEvent.type,
      platform: alertEvent.platform,
      user: alertEvent.user,
      detail: this.getActivityDetail(alertEvent),
      timestamp: alertEvent.timestamp
    };
    eventBus.emit(EVENT_TYPES.ACTIVITY_ITEM, activityItem);
  }

  /**
   * Generate detail text for activity feed based on alert type
   */
  private getActivityDetail(alert: AlertTriggerEvent): string {
    switch (alert.type) {
      case 'follow':
        return 'followed';
      case 'sub':
        if (alert.isGift && alert.giftRecipient) {
          return `gifted a Tier ${alert.tier || '1'} sub to ${alert.giftRecipient}`;
        }
        return alert.months && alert.months > 1
          ? `subscribed for ${alert.months} months`
          : `subscribed (Tier ${alert.tier || '1'})`;
      case 'cheer':
        return `cheered ${alert.amount} bits`;
      case 'raid':
        return `raided with ${alert.viewers} viewers`;
      case 'donation':
        return `donated ${alert.currency || '$'}${alert.amount}`;
      case 'redemption':
        return `redeemed ${alert.reward}`;
      default:
        return '';
    }
  }

  private setupEventListeners(): void {
    if (!this.client) return;

    sbLogger.debug('Registering event listeners');

    // ============================================
    // TWITCH EVENTS
    // ============================================

    // Twitch Follow
    this.client.on('Twitch.Follow', ({ event, data }: any) => {
      sbLogger.debug('Twitch.Follow event received', data);
      const alertEvent = this.normalizeAlertEvent('Twitch.Follow', 'follow', data);
      this.emitAlertEvent(alertEvent);
    });

    // Twitch Subscription events
    this.client.on('Twitch.Sub', ({ event, data }: any) => {
      sbLogger.debug('Twitch.Sub event received', data);
      const alertEvent = this.normalizeAlertEvent('Twitch.Sub', 'sub', data);
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('Twitch.ReSub', ({ event, data }: any) => {
      sbLogger.debug('Twitch.ReSub event received', data);
      const alertEvent = this.normalizeAlertEvent('Twitch.ReSub', 'sub', data);
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('Twitch.GiftSub', ({ event, data }: any) => {
      sbLogger.debug('Twitch.GiftSub event received', data);
      const alertEvent = this.normalizeAlertEvent('Twitch.GiftSub', 'sub', {
        ...data,
        isGift: true
      });
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('Twitch.GiftBomb', ({ event, data }: any) => {
      sbLogger.debug('Twitch.GiftBomb event received', data);
      // Gift bomb = multiple gift subs, emit one alert for the gifter
      const alertEvent = this.normalizeAlertEvent('Twitch.GiftBomb', 'sub', {
        ...data,
        isGift: true,
        giftRecipient: `${data.gifts || data.total || 1} viewers`
      });
      this.emitAlertEvent(alertEvent);
    });

    // Twitch Cheer (Bits)
    this.client.on('Twitch.Cheer', ({ event, data }: any) => {
      sbLogger.debug('Twitch.Cheer event received', data);
      const alertEvent = this.normalizeAlertEvent('Twitch.Cheer', 'cheer', data);
      this.emitAlertEvent(alertEvent);
    });

    // Twitch Raid
    this.client.on('Twitch.Raid', ({ event, data }: any) => {
      sbLogger.debug('Twitch.Raid event received', data);
      const alertEvent = this.normalizeAlertEvent('Twitch.Raid', 'raid', data);
      this.emitAlertEvent(alertEvent);
    });

    // Twitch Channel Point Redemption
    this.client.on('Twitch.RewardRedemption', ({ event, data }: any) => {
      sbLogger.debug('Twitch.RewardRedemption event received', data);
      const alertEvent = this.normalizeAlertEvent('Twitch.RewardRedemption', 'redemption', data);
      this.emitAlertEvent(alertEvent);
    });

    // Twitch Stream Status
    this.client.on('Twitch.StreamOnline', ({ event, data }: any) => {
      sbLogger.info('Twitch.StreamOnline event received', data);
      const statusEvent: StreamStatusEvent = {
        status: 'online',
        platform: 'twitch',
        timestamp: Date.now()
      };
      eventBus.emit(EVENT_TYPES.STREAM_STATUS, statusEvent);
    });

    this.client.on('Twitch.StreamOffline', ({ event, data }: any) => {
      sbLogger.info('Twitch.StreamOffline event received', data);
      const statusEvent: StreamStatusEvent = {
        status: 'offline',
        platform: 'twitch',
        timestamp: Date.now()
      };
      eventBus.emit(EVENT_TYPES.STREAM_STATUS, statusEvent);
    });

    // ============================================
    // YOUTUBE EVENTS
    // ============================================

    // YouTube New Subscriber (equivalent to Twitch Follow)
    this.client.on('YouTube.NewSubscriber', ({ event, data }: any) => {
      sbLogger.debug('YouTube.NewSubscriber event received', data);
      const alertEvent = this.normalizeAlertEvent('YouTube.NewSubscriber', 'follow', data);
      this.emitAlertEvent(alertEvent);
    });

    // YouTube SuperChat (equivalent to Twitch Bits/Cheer)
    this.client.on('YouTube.SuperChat', ({ event, data }: any) => {
      sbLogger.debug('YouTube.SuperChat event received', data);
      const alertEvent = this.normalizeAlertEvent('YouTube.SuperChat', 'cheer', {
        ...data,
        bits: data.amount // Map amount to bits for normalization
      });
      this.emitAlertEvent(alertEvent);
    });

    // YouTube SuperSticker (similar to SuperChat)
    this.client.on('YouTube.SuperSticker', ({ event, data }: any) => {
      sbLogger.debug('YouTube.SuperSticker event received', data);
      const alertEvent = this.normalizeAlertEvent('YouTube.SuperSticker', 'cheer', {
        ...data,
        bits: data.amount
      });
      this.emitAlertEvent(alertEvent);
    });

    // ============================================
    // DONATION PLATFORM EVENTS
    // ============================================

    // Streamlabs Donation
    this.client.on('Streamlabs.Donation', ({ event, data }: any) => {
      sbLogger.debug('Streamlabs.Donation event received', data);
      const alertEvent = this.normalizeAlertEvent('Streamlabs.Donation', 'donation', data);
      this.emitAlertEvent(alertEvent);
    });

    // Ko-Fi Donation
    this.client.on('Kofi.Donation', ({ event, data }: any) => {
      sbLogger.debug('Kofi.Donation event received', data);
      const alertEvent = this.normalizeAlertEvent('Kofi.Donation', 'donation', data);
      this.emitAlertEvent(alertEvent);
    });

    // StreamElements Tip
    this.client.on('StreamElements.Tip', ({ event, data }: any) => {
      sbLogger.debug('StreamElements.Tip event received', data);
      const alertEvent = this.normalizeAlertEvent('StreamElements.Tip', 'donation', data);
      this.emitAlertEvent(alertEvent);
    });

    // ============================================
    // GOAL EVENTS
    // ============================================

    // Twitch Community Goal Contribution
    this.client.on('Twitch.CommunityGoalContribution', ({ event, data }: any) => {
      sbLogger.debug('Twitch.CommunityGoalContribution event received', data);
      const goalEvent: GoalProgressEvent = {
        goalId: data.id || 'community-goal',
        type: 'custom',
        current: data.total || data.current_amount || 0,
        target: data.target_amount || data.goal || 0,
        timestamp: Date.now()
      };
      eventBus.emit(EVENT_TYPES.GOAL_PROGRESS, goalEvent);
    });

    // ============================================
    // EXISTING EVENT HANDLERS
    // ============================================

    this.client.on('Misc.GlobalVariableUpdated', ({ event, data }: any) => {
      sbLogger.debug('GlobalVariableUpdated event received', data);

      // Handle both old format (variableName/value) and new format (name/newValue)
      const variableName = data?.variableName || data?.name;
      const variableValue = data?.value !== undefined ? data.value : data?.newValue;

      if (variableName && variableValue !== undefined) {
        sbLogger.info(`Processing real-time update: ${variableName} = ${variableValue}`);
        this.processVariable(variableName, variableValue);

        // Check if this is a goal-related variable
        this.processGoalVariable(variableName, variableValue);
      }
    });

    this.client.on('WebsocketClient.Open', async () => {
      sbLogger.info('Connected to Streamer.bot');
      this.initState.connected = true;

      eventBus.emit(EVENT_TYPES.STREAMERBOT_CONNECTION, {
        connected: true,
        timestamp: Date.now()
      });

      eventBus.emit(EVENT_TYPES.HEALTH_STATUS, {
        status: HEALTH_STATUS.CONNECTED,
        message: 'Connected to Streamer.bot',
        timestamp: Date.now()
      });

      setTimeout(async () => {
        await this.waitForClientReady();
        await this.requestInitialData();
      }, 200);
    });

    this.client.on('WebsocketClient.Close', (event: any) => {
      sbLogger.warn('Disconnected from Streamer.bot', event);
      this.initState.connected = false;

      eventBus.emit(EVENT_TYPES.STREAMERBOT_CONNECTION, {
        connected: false,
        timestamp: Date.now()
      });

      eventBus.emit(EVENT_TYPES.HEALTH_STATUS, {
        status: HEALTH_STATUS.DISCONNECTED,
        message: 'Disconnected from Streamer.bot',
        timestamp: Date.now()
      });

      this.resetState();
    });

    sbLogger.info('Event listeners registered');
  }

  private resetState(): void {
    this.initState = {
      connected: false,
      globalsLoaded: false,
      broadcasterLoaded: false,
      ready: false
    };
    sbLogger.debug('Initialization state reset');
  }

  private async requestInitialData(): Promise<void> {
    sbLogger.info('Requesting initial data');

    try {
      const globals = await this.client.getGlobals();
      if (globals) {
        sbLogger.debug('Received global variables', globals);
        this.pendingVariables = globals;

        if (this.componentReady) {
          this.processInitialVariables(globals);
        } else {
          // Store for later - wait for componentReady event
          sbLogger.debug('Component not ready, storing variables pending initialization');
          // No timeout fallback - we rely on the ready event which is guaranteed by main.ts
        }

        this.initState.globalsLoaded = true;
      }
    } catch (error) {
      sbLogger.error('Failed to get global variables', error);
    }

    try {
      const broadcaster = await this.client.getBroadcaster();
      if (broadcaster) {
        sbLogger.debug('Received broadcaster info', broadcaster);
        
        const broadcasterEvent: BroadcasterInfoEvent = {
          displayName: broadcaster.displayName,
          profileImageUrl: broadcaster.profileImageUrl,
          description: broadcaster.description,
          viewCount: broadcaster.viewCount,
          followerCount: broadcaster.followerCount
        };

        eventBus.emit(EVENT_TYPES.BROADCASTER_UPDATE, broadcasterEvent);
        this.initState.broadcasterLoaded = true;
      }
    } catch (error) {
      sbLogger.error('Failed to get broadcaster info', error);
    }

    this.initState.ready = true;
    sbLogger.info('Initial data loading completed', this.initState);
  }

  public initialize(): void {
    if (typeof window.StreamerbotClient === 'undefined') {
      sbLogger.error('Official @streamerbot/client not available');
      
      eventBus.emit(EVENT_TYPES.HEALTH_STATUS, {
        status: HEALTH_STATUS.ERROR,
        message: 'Streamerbot client not available',
        timestamp: Date.now()
      });
      
      return;
    }

    sbLogger.info('Initializing Streamerbot client');

    const config: StreamerbotConfig = {
      host: '127.0.0.1',
      port: 8080,
      endpoint: '/',
      immediate: false,
      autoReconnect: true,
      retries: 5,
      retryInterval: 2000,
      onConnect: (data: any) => {
        sbLogger.info('Connected to Streamer.bot', data);
      },
      onDisconnect: () => {
        sbLogger.warn('Disconnected from Streamer.bot');
        this.resetState();
      },
      onError: (error: any) => {
        sbLogger.error('Connection error', error);
        
        eventBus.emit(EVENT_TYPES.HEALTH_STATUS, {
          status: HEALTH_STATUS.ERROR,
          message: `Connection error: ${error}`,
          timestamp: Date.now()
        });
      }
    };

    this.client = new window.StreamerbotClient(config);

    // Expose client globally so components can reuse it
    (window as any).streamerbotClient = this.client;

    this.setupEventListeners();

    sbLogger.info('Streamerbot client created, connecting...');
    this.client.connect();
  }

  public getClient(): any {
    return this.client;
  }

  public getInitState(): InitializationState {
    return { ...this.initState };
  }
}

export const streamerbotIntegration = new StreamerbotIntegration();

if (typeof window !== 'undefined') {
  (window as any).streamerbotIntegration = streamerbotIntegration;
}

sbLogger.info('Streamerbot integration module loaded');
