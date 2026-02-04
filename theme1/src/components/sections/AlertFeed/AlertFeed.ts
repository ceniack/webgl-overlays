/**
 * AlertFeed Section Component
 * Displays animated alerts for follows, subs, cheers, raids, donations, and redemptions
 * Supports multi-alert display with configurable maxVisible count
 * Implements queue-based alert display with timeout-based removal
 */

import type { SectionComponent, ComponentData } from '../../../types';
import type {
  AlertEvent,
  AlertType,
  AlertPlatform,
  QueuedAlert,
  AlertFeedConfig
} from '../../../types/alerts';
import type { AlertTriggerEvent } from '../../../types/events';
import { eventBus } from '../../../js/EventBus';
import { EVENT_TYPES } from '../../../js/EventConstants';
import { logger } from '../../../js/Logger';
import {
  getPlatformIconHtml,
  getPlatformColor,
  getTypeIconSvg,
  getTypeColor
} from '../../../icons/platform-icons';

const alertLogger = logger.createChildLogger('AlertFeed');

interface ActiveAlert {
  alert: QueuedAlert;
  element: HTMLElement;
  timeout: ReturnType<typeof setTimeout>;
}

export class AlertFeed implements SectionComponent {
  public readonly type = 'section' as const;
  public readonly elementId: string;
  public readonly container: HTMLElement;
  public isInitialized = false;
  public data?: ComponentData;
  public readonly features: any[] = [];
  public readonly elements: any[] = [];

  private config: AlertFeedConfig;
  private alertQueue: QueuedAlert[] = [];
  private activeAlerts = new Map<string, ActiveAlert>();
  private isProcessing = false;

  // DOM elements
  private alertContainer: HTMLElement | null = null;
  private debugPanel: HTMLElement | null = null;
  private debugActiveEl: HTMLElement | null = null;
  private debugQueueEl: HTMLElement | null = null;

  constructor(container: HTMLElement, config?: Partial<AlertFeedConfig>) {
    this.container = container;
    this.elementId = container.id || `alert-feed-${Date.now()}`;

    this.config = {
      maxQueueSize: 50,
      maxVisible: 1,
      displayDuration: 5000,
      alertDelay: 500,
      animationDuration: 500,
      enabledTypes: [], // Empty = all types enabled
      soundEnabled: true,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    alertLogger.info('AlertFeed Component initializing...');

    // Build DOM structure
    this.buildDOM();

    // Set up EventBus listeners
    this.setupEventListeners();

    // Set up debug functions
    this.setupDebugFunctions();

    this.isInitialized = true;
    alertLogger.info('AlertFeed Component initialized successfully');
  }

  updateData(data: Partial<ComponentData>): void {
    alertLogger.debug('AlertFeed data update received');
  }

  destroy(): void {
    // Clear all active alert timeouts
    for (const [, active] of this.activeAlerts) {
      clearTimeout(active.timeout);
      active.element.remove();
    }
    this.activeAlerts.clear();

    // Clear queue
    this.alertQueue = [];
    this.isProcessing = false;

    // Remove debug functions
    if (typeof window !== 'undefined') {
      delete (window as any).alertFeedComponent;
      delete (window as any).debugAlertFeed;
      delete (window as any).testAlert;
      delete (window as any).testAlertQueue;
      delete (window as any).testPlatformAlert;
      delete (window as any).testAllPlatforms;
      delete (window as any).testHelp;
      delete (window as any).listActions;
      delete (window as any).runAction;
      delete (window as any).showDebug;
      delete (window as any).hideDebug;
    }

    this.isInitialized = false;
    alertLogger.info('AlertFeed Component destroyed');
  }

  addFeature(feature: any): void {
    this.features.push(feature);
  }

  addElement(element: any): void {
    this.elements.push(element);
  }

  // ============================================
  // DOM BUILDING
  // ============================================

  private buildDOM(): void {
    // Find or create alert container
    this.alertContainer = this.container.querySelector('.alert-container');
    if (!this.alertContainer) {
      this.alertContainer = document.createElement('div');
      this.alertContainer.className = 'alert-container';
      this.alertContainer.id = 'alert-container';
      this.container.appendChild(this.alertContainer);
    }

    // Find or create debug panel in document body
    this.debugPanel = document.getElementById('debug-panel');
    if (!this.debugPanel) {
      this.debugPanel = document.createElement('div');
      this.debugPanel.className = 'debug-panel';
      this.debugPanel.id = 'debug-panel';
      this.debugPanel.innerHTML = `
        <div>Active: <span id="debug-active">0</span></div>
        <div>Queue: <span id="debug-queue">0</span></div>
      `;
      document.body.appendChild(this.debugPanel);
    }

    this.debugActiveEl = document.getElementById('debug-active');
    this.debugQueueEl = document.getElementById('debug-queue');

    alertLogger.debug('AlertFeed DOM built');
  }

  // ============================================
  // EVENT HANDLING
  // ============================================

  private setupEventListeners(): void {
    eventBus.on(EVENT_TYPES.ALERT_TRIGGER, (event: AlertTriggerEvent) => {
      alertLogger.debug('Alert trigger received:', event);
      this.queueAlert(event as AlertEvent);
    });

    alertLogger.debug('AlertFeed event listeners registered');
  }

  // ============================================
  // ALERT QUEUE MANAGEMENT
  // ============================================

  /**
   * Add an alert to the queue
   */
  public queueAlert(alert: AlertEvent): void {
    // Check if alert type is enabled
    if (this.config.enabledTypes.length > 0 &&
        !this.config.enabledTypes.includes(alert.type)) {
      alertLogger.debug(`Alert type ${alert.type} not enabled, skipping`);
      return;
    }

    // Create queued alert with unique ID
    const queuedAlert: QueuedAlert = {
      ...alert,
      id: alert.id || `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      state: 'pending',
      stateTimestamp: Date.now()
    };

    // Add to queue (respect max size)
    if (this.alertQueue.length >= this.config.maxQueueSize) {
      alertLogger.warn(`Alert queue full (${this.config.maxQueueSize}), dropping oldest alert`);
      this.alertQueue.shift();
    }

    this.alertQueue.push(queuedAlert);
    alertLogger.info(`Alert queued: ${alert.type} from ${alert.user} (queue size: ${this.alertQueue.length})`);

    this.updateDebugPanel();

    // Start processing if not already
    this.processQueue();
  }

  /**
   * Process the alert queue — non-blocking, fills up to maxVisible slots
   */
  private processQueue(): void {
    while (this.alertQueue.length > 0 && this.activeAlerts.size < this.config.maxVisible) {
      const alert = this.alertQueue.shift()!;
      this.displayAlert(alert);
    }
    this.updateDebugPanel();
  }

  /**
   * Display a single alert — non-blocking, timeout-based removal
   */
  private displayAlert(alert: QueuedAlert): void {
    alert.state = 'entering';
    alert.stateTimestamp = Date.now();

    // Build alert element
    const alertElement = this.buildAlertElement(alert);

    // Append directly to alert container (no intermediate wrapper)
    if (this.alertContainer) {
      this.alertContainer.appendChild(alertElement);
    }

    // Animate in
    this.animateIn(alertElement);

    // Set timeout for removal
    const timeout = setTimeout(() => {
      this.removeAlert(alert.id!);
    }, this.config.displayDuration + this.config.animationDuration);

    // Track in activeAlerts
    this.activeAlerts.set(alert.id!, { alert, element: alertElement, timeout });

    alert.state = 'displaying';
    alert.stateTimestamp = Date.now();
    this.updateDebugPanel();
  }

  /**
   * Remove an alert by ID — animate out, clean up, process next
   */
  private async removeAlert(alertId: string): Promise<void> {
    const active = this.activeAlerts.get(alertId);
    if (!active) return;

    active.alert.state = 'exiting';
    active.alert.stateTimestamp = Date.now();

    // Animate out
    await this.animateOut(active.element);

    // Remove from DOM
    active.element.remove();

    // Clean up
    clearTimeout(active.timeout);
    this.activeAlerts.delete(alertId);

    active.alert.state = 'done';
    active.alert.stateTimestamp = Date.now();

    this.updateDebugPanel();

    // Process next alerts in queue
    this.processQueue();
  }

  /**
   * Build the alert DOM element
   */
  private buildAlertElement(alert: QueuedAlert): HTMLElement {
    const element = document.createElement('div');
    element.className = `alert alert-${alert.type} alert-${alert.platform}`;
    element.setAttribute('data-alert-id', alert.id || '');

    // Platform icon (primary) + type badge (secondary)
    const platformIcon = getPlatformIconHtml(alert.platform);
    const platformColor = getPlatformColor(alert.platform);
    const typeIcon = getTypeIconSvg(alert.type);
    const typeColor = getTypeColor(alert.type);
    const iconHtml = `<div class="alert-icon" style="--platform-brand-color: ${platformColor}">${platformIcon}<span class="alert-type-badge" style="color: ${typeColor}">${typeIcon}</span></div>`;

    // Build content based on alert type
    let content = '';
    switch (alert.type) {
      case 'follow':
        content = `
          ${iconHtml}
          <div class="alert-body">
            <div class="alert-title">New Follower!</div>
            <div class="alert-user">${this.escapeHtml(alert.user)}</div>
          </div>
        `;
        break;

      case 'sub':
        const subText = alert.isGift
          ? `gifted a sub to ${this.escapeHtml(alert.giftRecipient || 'someone')}`
          : alert.months && alert.months > 1
            ? `resubscribed for ${alert.months} months!`
            : 'subscribed!';
        content = `
          ${iconHtml}
          <div class="alert-body">
            <div class="alert-title">${alert.isGift ? 'Gift Sub!' : 'New Subscriber!'}</div>
            <div class="alert-user">${this.escapeHtml(alert.user)}</div>
            <div class="alert-detail">${subText}</div>
            ${alert.message ? `<div class="alert-message">"${this.escapeHtml(alert.message)}"</div>` : ''}
          </div>
        `;
        break;

      case 'cheer':
        content = `
          ${iconHtml}
          <div class="alert-body">
            <div class="alert-title">${alert.amount} Bits!</div>
            <div class="alert-user">${this.escapeHtml(alert.user)}</div>
            ${alert.message ? `<div class="alert-message">"${this.escapeHtml(alert.message)}"</div>` : ''}
          </div>
        `;
        break;

      case 'raid':
        content = `
          ${iconHtml}
          <div class="alert-body">
            <div class="alert-title">Raid!</div>
            <div class="alert-user">${this.escapeHtml(alert.user)}</div>
            <div class="alert-detail">with ${alert.viewers || 0} viewers</div>
          </div>
        `;
        break;

      case 'donation':
        content = `
          ${iconHtml}
          <div class="alert-body">
            <div class="alert-title">${alert.currency || '$'}${alert.amount} Donation!</div>
            <div class="alert-user">${this.escapeHtml(alert.user)}</div>
            ${alert.message ? `<div class="alert-message">"${this.escapeHtml(alert.message)}"</div>` : ''}
          </div>
        `;
        break;

      case 'redemption':
        content = `
          ${iconHtml}
          <div class="alert-body">
            <div class="alert-title">Redemption!</div>
            <div class="alert-user">${this.escapeHtml(alert.user)}</div>
            <div class="alert-detail">${this.escapeHtml(alert.reward || 'Unknown Reward')}</div>
            ${alert.message ? `<div class="alert-message">"${this.escapeHtml(alert.message)}"</div>` : ''}
          </div>
        `;
        break;

      case 'firstword':
        content = `
          ${iconHtml}
          <div class="alert-body">
            <div class="alert-title">First Message!</div>
            <div class="alert-user">${this.escapeHtml(alert.user)}</div>
            ${alert.message ? `<div class="alert-message">"${this.escapeHtml(alert.message)}"</div>` : ''}
          </div>
        `;
        break;

      default:
        content = `
          ${iconHtml}
          <div class="alert-body">
            <div class="alert-title">Alert!</div>
            <div class="alert-user">${this.escapeHtml(alert.user)}</div>
          </div>
        `;
    }

    element.innerHTML = content;
    return element;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // ANIMATIONS
  // ============================================

  private animateIn(element: HTMLElement): void {
    element.style.opacity = '0';
    element.style.transform = 'translateY(-20px) scale(0.9)';
    element.style.transition = `all ${this.config.animationDuration}ms ease-out`;

    // Force reflow
    element.offsetHeight;

    element.style.opacity = '1';
    element.style.transform = 'translateY(0) scale(1)';
  }

  private async animateOut(element: HTMLElement): Promise<void> {
    element.style.transition = `all ${this.config.animationDuration}ms ease-in`;
    element.style.opacity = '0';
    element.style.transform = 'translateY(20px) scale(0.9)';

    await this.sleep(this.config.animationDuration);
  }

  // ============================================
  // UTILITIES
  // ============================================

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateDebugPanel(): void {
    if (this.debugActiveEl) {
      this.debugActiveEl.textContent = String(this.activeAlerts.size);
    }
    if (this.debugQueueEl) {
      this.debugQueueEl.textContent = String(this.alertQueue.length);
    }
  }

  // ============================================
  // DEBUG FUNCTIONS
  // ============================================

  private setupDebugFunctions(): void {
    const windowAny = window as any;

    windowAny.alertFeedComponent = this;

    windowAny.debugAlertFeed = () => {
      console.log('AlertFeed Component Debug Info:');
      console.log('- Initialized:', this.isInitialized);
      console.log('- Queue size:', this.alertQueue.length);
      console.log('- Active alerts:', this.activeAlerts.size);
      console.log('- Max visible:', this.config.maxVisible);
      console.log('- Config:', this.config);
    };

    windowAny.testAlert = (type: AlertType = 'follow', user: string = 'TestUser') => {
      const testAlert: AlertEvent = {
        type,
        platform: 'twitch',
        user,
        timestamp: Date.now(),
        isTest: true,
        id: `test-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      };

      // Add type-specific data
      switch (type) {
        case 'sub':
          testAlert.tier = '1';
          testAlert.months = Math.floor(Math.random() * 24) + 1;
          testAlert.message = 'Test subscription message!';
          break;
        case 'cheer':
          testAlert.amount = [100, 500, 1000, 5000][Math.floor(Math.random() * 4)];
          testAlert.message = 'PogChamp great stream!';
          break;
        case 'raid':
          testAlert.viewers = Math.floor(Math.random() * 500) + 10;
          break;
        case 'donation':
          testAlert.amount = [5, 10, 25, 50, 100][Math.floor(Math.random() * 5)];
          testAlert.currency = '$';
          testAlert.message = 'Thanks for the amazing content!';
          break;
        case 'redemption':
          testAlert.reward = 'Hydrate!';
          testAlert.cost = 500;
          break;
        case 'firstword':
          testAlert.message = 'Hello everyone! First time here!';
          break;
      }

      console.log(`Testing ${type} alert from ${user}`);
      this.queueAlert(testAlert);
    };

    windowAny.testAlertQueue = (count: number = 5) => {
      const types: AlertType[] = ['follow', 'sub', 'cheer', 'raid', 'donation', 'redemption', 'firstword'];
      const users = ['StreamerFan1', 'GamerPro99', 'ChatLurker', 'BigDonor', 'LoyalSub'];

      for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const user = users[Math.floor(Math.random() * users.length)];
        setTimeout(() => {
          windowAny.testAlert(type, user + i);
        }, i * 100);
      }

      console.log(`Queued ${count} test alerts`);
    };

    windowAny.testPlatformAlert = (
      platform: AlertPlatform = 'twitch',
      type: AlertType = 'follow',
      user: string = 'PlatformTestUser',
      options: Partial<AlertEvent> = {}
    ) => {
      const testAlert: AlertEvent = {
        type,
        platform,
        user,
        timestamp: Date.now(),
        isTest: true,
        id: `test-${platform}-${Date.now()}`,
        ...options
      };

      console.log(`Testing ${platform} ${type} alert from ${user}`);
      eventBus.emit(EVENT_TYPES.ALERT_TRIGGER, testAlert);
    };

    windowAny.testAllPlatforms = () => {
      const platforms: AlertPlatform[] = [
        'twitch', 'youtube', 'kick', 'kofi', 'streamlabs',
        'streamelements', 'trovo', 'tipeeestream', 'donordrive', 'fourthwall'
      ];
      const types: AlertType[] = ['follow', 'sub', 'cheer', 'raid', 'donation', 'redemption', 'firstword'];

      let delay = 0;
      for (const platform of platforms) {
        for (const type of types) {
          setTimeout(() => {
            windowAny.testPlatformAlert(platform, type, `${platform}_${type}_user`);
          }, delay);
          delay += 1500;
        }
      }

      console.log(`Cycling through ${platforms.length} platforms x ${types.length} types (${platforms.length * types.length} alerts)`);
    };

    windowAny.testHelp = () => {
      console.log(`
AlertFeed Debug Commands:
  testAlert(type?, user?)           - Test a single alert
  testAlertQueue(count?)            - Queue multiple random alerts
  testPlatformAlert(platform, type, user, options?) - Test specific platform alert
  testAllPlatforms()                - Cycle through all platform+type combos
  debugAlertFeed()                  - Show component state
  showDebug()                       - Show debug panel
  hideDebug()                       - Hide debug panel
  listActions()                     - List Streamer.bot actions
  runAction(name, args?)            - Run a Streamer.bot action

Alert Types: follow, sub, cheer, raid, donation, redemption, firstword
Platforms: twitch, youtube, kick, kofi, streamlabs, streamelements, trovo, tipeeestream, donordrive, fourthwall
      `);
    };

    windowAny.showDebug = () => {
      if (this.debugPanel) {
        this.debugPanel.classList.add('visible');
      }
    };

    windowAny.hideDebug = () => {
      if (this.debugPanel) {
        this.debugPanel.classList.remove('visible');
      }
    };

    windowAny.listActions = async () => {
      const client = (window as any).streamerbotClient;
      if (!client) {
        console.log('Streamer.bot client not available');
        return;
      }
      try {
        const actions = await client.getActions();
        console.log('Streamer.bot Actions:', actions);
        return actions;
      } catch (e) {
        console.error('Failed to list actions:', e);
      }
    };

    windowAny.runAction = async (name: string, args?: Record<string, any>) => {
      const client = (window as any).streamerbotClient;
      if (!client) {
        console.log('Streamer.bot client not available');
        return;
      }
      try {
        const result = await client.doAction(name, args);
        console.log(`Action "${name}" result:`, result);
        return result;
      } catch (e) {
        console.error(`Failed to run action "${name}":`, e);
      }
    };

    alertLogger.info('Debug functions registered: testAlert(), testAlertQueue(), testPlatformAlert(), testAllPlatforms(), testHelp()');
  }
}
