import { eventBus } from './EventBus';
import { EVENT_TYPES, HEALTH_STATUS } from './EventConstants';
import { logger } from './Logger';
import { overlayStore } from '../store';
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
import type { AlertType, AlertPlatform, AlertEvent } from '../types/alerts';
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
  subscribe?: Record<string, string[]> | '*';
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
        // Dual-write: store dispatch
        const labelCounterId = name.replace('label', '').replace('Label', '');
        overlayStore.dispatch({ type: 'COUNTER_LABEL_SET', counterId: labelCounterId, label: String(value) });
        sbLogger.debug(`Emitted counter label update: ${name} = ${value}`);
      } else if (name.includes('toggle')) {
        // Counter toggles (visibility)
        eventBus.emit(EVENT_TYPES.COUNTER_UPDATE, {
          counterName: name,
          value: value,
          isToggle: true,
          timestamp: Date.now()
        });
        // Dual-write: store dispatch
        const toggleCounterId = name.replace('toggle', '').replace('Toggle', '');
        const isVisible = value === true || value === 'true' || value === '1' || value === 1;
        overlayStore.dispatch({ type: 'COUNTER_VISIBILITY_SET', counterId: toggleCounterId, visible: isVisible });
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
          // Dual-write: store dispatch
          overlayStore.dispatch({ type: 'COUNTER_VALUE_SET', counterId: name, value: counterValue });
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

    // Handle latestEvent persisted globals (e.g., latestEventFollow, latestEventSub)
    if (name.startsWith('latestEvent')) {
      const eventType = name.replace('latestEvent', '').toLowerCase() as AlertType;
      try {
        const event: AlertEvent = typeof value === 'string' ? JSON.parse(value) : value;
        // Normalize timestamp: Streamer.bot %unixtime% is in seconds, JS uses milliseconds
        if (event.timestamp && event.timestamp < 1e12) {
          event.timestamp = event.timestamp * 1000;
        }
        eventBus.emit(EVENT_TYPES.LATEST_EVENT_RESTORE, { eventType, event });
        // Dual-write: store dispatch
        overlayStore.dispatch({
          type: 'LATEST_EVENT_RESTORED',
          eventType,
          data: {
            user: event.user || 'Unknown',
            platform: (event.platform || 'twitch') as AlertPlatform,
            timestamp: event.timestamp || Date.now(),
            amount: event.amount,
            tier: event.tier,
            months: event.months,
            isGift: event.isGift,
            giftRecipient: event.giftRecipient,
            viewers: event.viewers,
            reward: event.reward,
            cost: event.cost,
            message: event.message,
          },
        });
        sbLogger.debug(`Emitted latestEvent restore: ${eventType} = ${event.user}`);
      } catch (e) {
        sbLogger.error(`Failed to parse latestEvent global: ${name}`, e);
      }
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

    // Dual-write: store dispatch
    overlayStore.dispatch({
      type: 'GOAL_UPDATED',
      goalId,
      goalType,
      current: valueType === 'current' ? numericValue : 0,
      target: valueType === 'target' ? numericValue : undefined,
      timestamp: Date.now(),
    });
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
  /**
   * Extract username from various possible data structures
   */
  private extractUsername(data: any): string {
    // Handle anonymous events (e.g., anonymous cheers)
    if (data.isAnonymous === true || data.message?.isAnonymous === true) return 'Anonymous';

    // Check if 'user' is a string directly (YouTube pattern)
    // YouTube sends user as the display name string, not an object
    if (typeof data.user === 'string' && data.user.trim() !== '') {
      return data.user;
    }

    // Try nested user object first (common in Streamer.bot/Twitch)
    if (data.user?.displayName) return data.user.displayName;
    if (data.user?.display_name) return data.user.display_name;
    if (data.user?.username) return data.user.username;
    if (data.user?.name) return data.user.name;
    if (data.user?.login) return data.user.login;

    // Try nested message object (Streamer.bot cheer events)
    if (data.message?.displayName) return data.message.displayName;
    if (data.message?.display_name) return data.message.display_name;
    if (data.message?.username) return data.message.username;
    if (data.message?.user_name) return data.message.user_name;
    if (data.message?.userName) return data.message.userName;

    // Try direct properties
    if (data.displayName) return data.displayName;
    if (data.display_name) return data.display_name;
    if (data.username) return data.username;
    if (data.user_name) return data.user_name;
    if (data.userName) return data.userName;
    if (data.name) return data.name;
    if (data.login) return data.login;

    return 'Unknown';
  }

  /**
   * Extract message text from various possible data structures
   */
  private extractMessage(data: any): string | undefined {
    // Handle null/undefined
    if (data.message === null || data.message === undefined) {
      return undefined;
    }

    // If message is already a string, return it
    if (typeof data.message === 'string') {
      return data.message;
    }

    // If message is an object, try common nested properties
    if (typeof data.message === 'object') {
      if (data.message.message) return data.message.message;
      if (data.message.text) return data.message.text;
      if (data.message.content) return data.message.content;
      // Don't return [object Object]
      return undefined;
    }

    return undefined;
  }

  private normalizeAlertEvent(source: string, type: AlertType, data: any): AlertTriggerEvent {
    const platform = source.split('.')[0].toLowerCase() as AlertPlatform;

    // Debug log the raw data structure
    sbLogger.debug(`Raw ${type} event data:`, JSON.stringify(data, null, 2));

    const baseEvent: AlertTriggerEvent = {
      type,
      platform,
      user: this.extractUsername(data),
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
          message: this.extractMessage(data)
        };

      case 'cheer':
        return {
          ...baseEvent,
          amount: data.bits || data.amount || 0,
          message: this.extractMessage(data)
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
          message: this.extractMessage(data)
        };

      case 'redemption':
        return {
          ...baseEvent,
          reward: data.reward?.title || data.rewardTitle || data.title || 'Unknown Reward',
          cost: data.reward?.cost || data.rewardCost || data.cost || 0,
          message: data.user_input || data.userInput || this.extractMessage(data)
        };

      case 'firstword':
        return {
          ...baseEvent,
          message: data.message?.message || undefined
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

    // Dual-write: enqueue alert in store
    overlayStore.dispatch({
      type: 'ALERT_ENQUEUED',
      alert: {
        id: alertEvent.id || `${alertEvent.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: alertEvent.type,
        platform: alertEvent.platform as AlertPlatform,
        user: alertEvent.user,
        amount: alertEvent.amount,
        currency: alertEvent.currency,
        message: alertEvent.message,
        tier: alertEvent.tier,
        months: alertEvent.months,
        isGift: alertEvent.isGift,
        giftRecipient: alertEvent.giftRecipient,
        viewers: alertEvent.viewers,
        reward: alertEvent.reward,
        cost: alertEvent.cost,
        isTest: alertEvent.isTest,
        timestamp: alertEvent.timestamp,
      },
    });

    // Dual-write: update latest event in store
    overlayStore.dispatch({
      type: 'LATEST_EVENT_SET',
      eventType: alertEvent.type,
      user: alertEvent.user,
      platform: alertEvent.platform as AlertPlatform,
      timestamp: alertEvent.timestamp,
      amount: alertEvent.amount,
      currency: alertEvent.currency,
      tier: alertEvent.tier,
      months: alertEvent.months,
      isGift: alertEvent.isGift,
      giftRecipient: alertEvent.giftRecipient,
      viewers: alertEvent.viewers,
      reward: alertEvent.reward,
      cost: alertEvent.cost,
      message: alertEvent.message,
    });

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

    // Dual-write: add to activity in store
    overlayStore.dispatch({
      type: 'ACTIVITY_ADDED',
      item: {
        id: activityItem.id,
        type: activityItem.type as AlertType,
        platform: activityItem.platform as AlertPlatform,
        user: activityItem.user,
        detail: activityItem.detail,
        timestamp: activityItem.timestamp,
      },
    });
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
      case 'firstword':
        return 'sent their first message';
      default:
        return '';
    }
  }

  private setupEventListeners(): void {
    if (!this.client) return;

    sbLogger.debug('Registering event listeners');

    // ============================================
    // DEBUG: Wildcard listener to catch ALL events (filtered)
    // ============================================
    this.client.on('*', (payload: any) => {
      const source = payload?.event?.source;
      const type = payload?.event?.type;
      // Filter out noisy events
      if (source === 'Inputs' && type === 'InputMouseClick') return;
      if (source === 'Inputs' && type === 'InputKeyPress') return;
      sbLogger.info('🔔 RAW EVENT RECEIVED:', source, type, payload);
    });

    // ============================================
    // RAW.ACTION HANDLER - Catches test events from Streamer.bot UI
    // Test buttons trigger Actions, not native platform events
    // ============================================
    this.client.on('Raw.Action', ({ event, data }: any) => {
      const eventSource = data?.arguments?.eventSource?.toLowerCase();
      const triggerName = data?.arguments?.triggerName;
      const triggerCategory = data?.arguments?.triggerCategory;

      sbLogger.debug('Raw.Action received:', { eventSource, triggerName, triggerCategory, data });

      // Only process if this looks like a platform event test
      if (!eventSource || !triggerName) return;

      // Map trigger names to our alert types
      // Different platforms use different trigger names for similar events
      let alertType: AlertType | null = null;

      // Follow events
      if (triggerName === 'Follow' || triggerName === 'New Subscriber') alertType = 'follow';
      // Sub/membership events
      else if (triggerName === 'Subscription' || triggerName === 'Sub' || triggerName === 'New Sponsor') alertType = 'sub';
      else if (triggerName === 'Resubscription' || triggerName === 'ReSub' || triggerName === 'MemberMileStone') alertType = 'sub';
      else if (triggerName === 'GiftSubscription' || triggerName === 'GiftSub') alertType = 'sub';
      // Cheer/donation events
      else if (triggerName === 'Cheer' || triggerName === 'SpellCast' || triggerName === 'Super Chat' || triggerName === 'SuperChat') alertType = 'cheer';
      else if (triggerName === 'Super Sticker' || triggerName === 'SuperSticker') alertType = 'cheer';
      // Raid
      else if (triggerName === 'Raid') alertType = 'raid';
      // First message
      else if (triggerName === 'FirstWords' || triggerName === 'FirstWord' || triggerName === 'First Words') alertType = 'firstword';

      if (!alertType) {
        sbLogger.debug('Unhandled Raw.Action trigger:', triggerName);
        return;
      }

      // Build alert from action arguments
      const args = data?.arguments || {};
      const alertEvent = this.normalizeAlertEvent(
        `${eventSource}.${triggerName}`,
        alertType,
        {
          ...args,
          user: args.user || args.userName || args.displayName || 'Unknown',
          isTest: args.isTest ?? true
        }
      );

      sbLogger.info(`📢 Test Alert from Raw.Action: ${alertType} from ${eventSource}`);
      this.emitAlertEvent(alertEvent);
    });

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

    // Twitch FirstWord (First Chat Message)
    this.client.on('Twitch.FirstWord', ({ event, data }: any) => {
      sbLogger.debug('Twitch.FirstWord event received', data);
      const alertEvent = this.normalizeAlertEvent('Twitch.FirstWord', 'firstword', data);
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
      // Dual-write: store dispatch
      overlayStore.dispatch({ type: 'STREAM_ONLINE', platform: 'twitch', timestamp: Date.now() });
    });

    this.client.on('Twitch.StreamOffline', ({ event, data }: any) => {
      sbLogger.info('Twitch.StreamOffline event received', data);
      const statusEvent: StreamStatusEvent = {
        status: 'offline',
        platform: 'twitch',
        timestamp: Date.now()
      };
      eventBus.emit(EVENT_TYPES.STREAM_STATUS, statusEvent);
      // Dual-write: store dispatch
      overlayStore.dispatch({ type: 'STREAM_OFFLINE', platform: 'twitch', timestamp: Date.now() });
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
    // KICK EVENTS
    // ============================================

    this.client.on('Kick.Follow', ({ event, data }: any) => {
      sbLogger.debug('Kick.Follow event received', data);
      const alertEvent = this.normalizeAlertEvent('Kick.Follow', 'follow', data);
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('Kick.Subscription', ({ event, data }: any) => {
      sbLogger.debug('Kick.Subscription event received', data);
      const alertEvent = this.normalizeAlertEvent('Kick.Subscription', 'sub', data);
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('Kick.Resubscription', ({ event, data }: any) => {
      sbLogger.debug('Kick.Resubscription event received', data);
      const alertEvent = this.normalizeAlertEvent('Kick.Resubscription', 'sub', data);
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('Kick.GiftSubscription', ({ event, data }: any) => {
      sbLogger.debug('Kick.GiftSubscription event received', data);
      const alertEvent = this.normalizeAlertEvent('Kick.GiftSubscription', 'sub', { ...data, isGift: true });
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('Kick.FirstWords', ({ event, data }: any) => {
      sbLogger.debug('Kick.FirstWords event received', data);
      const alertEvent = this.normalizeAlertEvent('Kick.FirstWords', 'firstword', data);
      this.emitAlertEvent(alertEvent);
    });

    // ============================================
    // TROVO EVENTS
    // ============================================

    this.client.on('Trovo.Follow', ({ event, data }: any) => {
      sbLogger.debug('Trovo.Follow event received', data);
      const alertEvent = this.normalizeAlertEvent('Trovo.Follow', 'follow', data);
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('Trovo.Subscription', ({ event, data }: any) => {
      sbLogger.debug('Trovo.Subscription event received', data);
      const alertEvent = this.normalizeAlertEvent('Trovo.Subscription', 'sub', data);
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('Trovo.Resubscription', ({ event, data }: any) => {
      sbLogger.debug('Trovo.Resubscription event received', data);
      const alertEvent = this.normalizeAlertEvent('Trovo.Resubscription', 'sub', data);
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('Trovo.GiftSubscription', ({ event, data }: any) => {
      sbLogger.debug('Trovo.GiftSubscription event received', data);
      const alertEvent = this.normalizeAlertEvent('Trovo.GiftSubscription', 'sub', { ...data, isGift: true });
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('Trovo.SpellCast', ({ event, data }: any) => {
      sbLogger.debug('Trovo.SpellCast event received', data);
      // Map Trovo spell value to amount for cheer normalization
      const alertEvent = this.normalizeAlertEvent('Trovo.SpellCast', 'cheer', {
        ...data,
        bits: data.spellValue || data.value || data.amount || 0
      });
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('Trovo.Raid', ({ event, data }: any) => {
      sbLogger.debug('Trovo.Raid event received', data);
      const alertEvent = this.normalizeAlertEvent('Trovo.Raid', 'raid', data);
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('Trovo.FirstWords', ({ event, data }: any) => {
      sbLogger.debug('Trovo.FirstWords event received', data);
      const alertEvent = this.normalizeAlertEvent('Trovo.FirstWords', 'firstword', data);
      this.emitAlertEvent(alertEvent);
    });

    // ============================================
    // YOUTUBE MEMBERSHIP EVENTS (expand existing)
    // ============================================

    this.client.on('YouTube.NewSponsor', ({ event, data }: any) => {
      sbLogger.debug('YouTube.NewSponsor event received', data);
      const alertEvent = this.normalizeAlertEvent('YouTube.NewSponsor', 'sub', data);
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('YouTube.MemberMileStone', ({ event, data }: any) => {
      sbLogger.debug('YouTube.MemberMileStone event received', data);
      // Map YouTube membership months to sub months field
      const alertEvent = this.normalizeAlertEvent('YouTube.MemberMileStone', 'sub', {
        ...data,
        months: data.memberMonths || data.months || 1
      });
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('YouTube.FirstWords', ({ event, data }: any) => {
      sbLogger.debug('YouTube.FirstWords event received', data);
      const alertEvent = this.normalizeAlertEvent('YouTube.FirstWords', 'firstword', data);
      this.emitAlertEvent(alertEvent);
    });

    // ============================================
    // ADDITIONAL DONATION PLATFORMS
    // ============================================

    this.client.on('TipeeeStream.Donation', ({ event, data }: any) => {
      sbLogger.debug('TipeeeStream.Donation event received', data);
      const alertEvent = this.normalizeAlertEvent('TipeeeStream.Donation', 'donation', data);
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('DonorDrive.Donation', ({ event, data }: any) => {
      sbLogger.debug('DonorDrive.Donation event received', data);
      const alertEvent = this.normalizeAlertEvent('DonorDrive.Donation', 'donation', data);
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('Fourthwall.Donation', ({ event, data }: any) => {
      sbLogger.debug('Fourthwall.Donation event received', data);
      const alertEvent = this.normalizeAlertEvent('Fourthwall.Donation', 'donation', data);
      this.emitAlertEvent(alertEvent);
    });

    // ============================================
    // KO-FI MEMBERSHIP EVENTS
    // ============================================

    this.client.on('Kofi.Subscription', ({ event, data }: any) => {
      sbLogger.debug('Kofi.Subscription event received', data);
      const alertEvent = this.normalizeAlertEvent('Kofi.Subscription', 'sub', data);
      this.emitAlertEvent(alertEvent);
    });

    this.client.on('Kofi.Resubscription', ({ event, data }: any) => {
      sbLogger.debug('Kofi.Resubscription event received', data);
      const alertEvent = this.normalizeAlertEvent('Kofi.Resubscription', 'sub', data);
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
      // Dual-write: store dispatch
      overlayStore.dispatch({
        type: 'GOAL_UPDATED',
        goalId: goalEvent.goalId,
        goalType: 'custom',
        current: goalEvent.current,
        target: goalEvent.target,
        timestamp: Date.now(),
      });
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

      // Dual-write: store dispatch
      overlayStore.dispatch({ type: 'CONNECTION_OPENED', timestamp: Date.now() });
      overlayStore.dispatch({ type: 'HEALTH_STATUS_CHANGED', status: 'connected', message: 'Connected to Streamer.bot', timestamp: Date.now() });

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

      // Dual-write: store dispatch
      overlayStore.dispatch({ type: 'CONNECTION_CLOSED', timestamp: Date.now() });
      overlayStore.dispatch({ type: 'HEALTH_STATUS_CHANGED', status: 'disconnected', message: 'Disconnected from Streamer.bot', timestamp: Date.now() });

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
      const broadcasterResponse = await this.client.getBroadcaster();
      if (broadcasterResponse) {
        sbLogger.debug('Received broadcaster info', broadcasterResponse);

        // Extract broadcaster data from nested platform structure
        // Response shape: { platforms: { twitch: { broadcastUser, broadcastUserName, broadcastUserId }, kick: {...} }, connected: [...] }
        const platforms = broadcasterResponse.platforms || {};
        const twitch = platforms.twitch || {};
        const kick = platforms.kick || {};

        const displayName = twitch.broadcastUser || kick.broadcasterUserName || '';
        const username = twitch.broadcastUserName || kick.broadcasterLogin || '';
        const userId = twitch.broadcastUserId || kick.broadcasterUserId || '';

        // Fetch Twitch profile image via DecAPI (returns CDN URL, 300x300).
        // Fall back to Kick profile URL if DecAPI fails or no Twitch username.
        let profileImageUrl: string | null = kick.broadcasterProfileUrl || null;
        if (username) {
          try {
            const decApiUrl = `https://decapi.me/twitch/avatar/${username}`;
            const resp = await fetch(decApiUrl);
            const cdnUrl = (await resp.text()).trim();
            if (cdnUrl && cdnUrl.startsWith('http') &&
                !cdnUrl.toLowerCase().includes('error') &&
                !cdnUrl.toLowerCase().includes('user not found')) {
              profileImageUrl = cdnUrl;
              sbLogger.debug(`DecAPI profile image: ${cdnUrl}`);
            }
          } catch (decApiErr) {
            sbLogger.warn('DecAPI avatar fetch failed, using fallback', decApiErr);
          }
        }

        const broadcasterEvent: BroadcasterInfoEvent = {
          displayName,
          profileImageUrl,
          description: '',
          viewCount: 0,
          followerCount: 0
        };

        eventBus.emit(EVENT_TYPES.BROADCASTER_UPDATE, broadcasterEvent);

        // Store dispatch
        overlayStore.dispatch({
          type: 'BROADCASTER_UPDATED',
          displayName,
          username,
          userId,
          profileImageUrl,
          twitchUrl: username ? `twitch.tv/${username}` : undefined,
        });

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

    const config: any = {
      host: '127.0.0.1',
      port: 8080,
      endpoint: '/',
      immediate: false,
      autoReconnect: true,
      retries: 5,
      retryInterval: 2000,
      logLevel: 'debug',  // Enable debug logging to see subscription activity
      subscribe: {
        // Twitch events
        Twitch: ['Follow', 'Sub', 'ReSub', 'GiftSub', 'GiftBomb', 'Cheer', 'Raid',
                 'RewardRedemption', 'FirstWord', 'StreamOnline', 'StreamOffline',
                 'CommunityGoalContribution'],
        // YouTube events
        YouTube: ['NewSubscriber', 'SuperChat', 'SuperSticker', 'NewSponsor',
                  'MemberMileStone', 'FirstWords'],
        // Kick events
        Kick: ['Follow', 'Subscription', 'Resubscription', 'GiftSubscription', 'FirstWords'],
        // Trovo events
        Trovo: ['Follow', 'Subscription', 'Resubscription', 'GiftSubscription',
                'SpellCast', 'Raid', 'FirstWords'],
        // Donation platforms
        Streamlabs: ['Donation'],
        Kofi: ['Donation', 'Subscription', 'Resubscription'],
        StreamElements: ['Tip'],
        TipeeeStream: ['Donation'],
        DonorDrive: ['Donation'],
        Fourthwall: ['Donation'],
        // System events
        Misc: ['GlobalVariableUpdated']
      },
      onConnect: async (data: any) => {
        sbLogger.info('Connected to Streamer.bot', data);
        this.initState.connected = true;

        eventBus.emit(EVENT_TYPES.STREAMERBOT_CONNECTION, {
          connected: true,
          timestamp: Date.now()
        });

        // Store dispatch
        overlayStore.dispatch({ type: 'CONNECTION_OPENED', timestamp: Date.now() });
        overlayStore.dispatch({ type: 'HEALTH_STATUS_CHANGED', status: 'connected', message: 'Connected to Streamer.bot', timestamp: Date.now() });

        eventBus.emit(EVENT_TYPES.HEALTH_STATUS, {
          status: HEALTH_STATUS.CONNECTED,
          message: 'Connected to Streamer.bot',
          timestamp: Date.now()
        });

        // Fetch initial data after connection stabilizes
        setTimeout(async () => {
          await this.waitForClientReady();
          await this.requestInitialData();
        }, 200);

        // Log subscription status and ensure subscriptions after connection
        setTimeout(async () => {
          try {
            const events = await this.client?.getEvents();
            sbLogger.info('Available events from Streamer.bot:', events);

            // Explicitly subscribe to all events including Kick/Trovo
            sbLogger.info('Explicitly subscribing to Kick/Trovo events...');
            const subscribeResult = await this.client?.subscribe({
              Kick: ['Follow', 'Subscription', 'Resubscription', 'GiftSubscription', 'FirstWords',
                     'ChatMessage', 'StreamOnline', 'StreamOffline'],
              Trovo: ['Follow', 'Subscription', 'Resubscription', 'GiftSubscription',
                      'SpellCast', 'Raid', 'FirstWords', 'ChatMessage']
            });
            sbLogger.info('Subscribe result:', subscribeResult);
          } catch (e) {
            sbLogger.warn('Could not fetch available events or subscribe', e);
          }
        }, 1000);
      },
      onDisconnect: () => {
        sbLogger.warn('Disconnected from Streamer.bot');
        this.initState.connected = false;

        eventBus.emit(EVENT_TYPES.STREAMERBOT_CONNECTION, {
          connected: false,
          timestamp: Date.now()
        });

        // Store dispatch
        overlayStore.dispatch({ type: 'CONNECTION_CLOSED', timestamp: Date.now() });
        overlayStore.dispatch({ type: 'HEALTH_STATUS_CHANGED', status: 'disconnected', message: 'Disconnected from Streamer.bot', timestamp: Date.now() });

        eventBus.emit(EVENT_TYPES.HEALTH_STATUS, {
          status: HEALTH_STATUS.DISCONNECTED,
          message: 'Disconnected from Streamer.bot',
          timestamp: Date.now()
        });

        this.resetState();
      },
      onError: (error: any) => {
        sbLogger.error('Connection error', error);

        eventBus.emit(EVENT_TYPES.HEALTH_STATUS, {
          status: HEALTH_STATUS.ERROR,
          message: `Connection error: ${error}`,
          timestamp: Date.now()
        });

        // Dual-write: store dispatch
        overlayStore.dispatch({ type: 'CONNECTION_ERROR', message: `Connection error: ${error}`, timestamp: Date.now() });
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

  // Debug helper: manually subscribe to events
  (window as any).subscribeToKick = async () => {
    const client = (window as any).streamerbotClient;
    if (!client) {
      sbLogger.error('Streamer.bot client not available');
      return;
    }
    sbLogger.info('Subscribing to Kick events...');
    const result = await client.subscribe({
      Kick: ['Follow', 'Subscription', 'Resubscription', 'GiftSubscription', 'FirstWords',
             'ChatMessage', 'StreamOnline', 'StreamOffline', 'BroadcasterAuthenticated']
    });
    sbLogger.info('Subscribe result:', result);
    return result;
  };

  // Debug helper: get current subscriptions
  (window as any).getSubscriptions = () => {
    const client = (window as any).streamerbotClient;
    if (!client) {
      sbLogger.error('Streamer.bot client not available');
      return;
    }
    sbLogger.info('Current subscriptions:', client.subscriptions);
    return client.subscriptions;
  };

  // Debug helper: subscribe to ALL events
  (window as any).subscribeToAll = async () => {
    const client = (window as any).streamerbotClient;
    if (!client) {
      sbLogger.error('Streamer.bot client not available');
      return;
    }
    sbLogger.info('Subscribing to ALL events (*)...');
    const result = await client.subscribe('*');
    sbLogger.info('Subscribe result:', result);
    return result;
  };
}

sbLogger.info('Streamerbot integration module loaded');
