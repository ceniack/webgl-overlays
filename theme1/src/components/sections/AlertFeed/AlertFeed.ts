/**
 * AlertFeed Section Component
 * Displays animated alerts for follows, subs, cheers, raids, and donations
 * Implements queue-based alert display with configurable animations
 */

import type { SectionComponent, ComponentData } from '../../../types';
import type {
  AlertEvent,
  AlertType,
  QueuedAlert,
  AlertFeedConfig
} from '../../../types/alerts';
import type { AlertTriggerEvent } from '../../../types/events';
import { eventBus } from '../../../js/EventBus';
import { EVENT_TYPES } from '../../../js/EventConstants';
import { logger } from '../../../js/Logger';

const alertLogger = logger.createChildLogger('AlertFeed');

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
  private currentAlert: QueuedAlert | null = null;
  private isProcessing = false;
  private processTimeout: any = null;

  // DOM elements
  private alertContainer: HTMLElement | null = null;
  private alertContent: HTMLElement | null = null;

  constructor(container: HTMLElement, config?: Partial<AlertFeedConfig>) {
    this.container = container;
    this.elementId = container.id || `alert-feed-${Date.now()}`;

    this.config = {
      maxQueueSize: 50,
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
    // Clear any pending timeouts
    if (this.processTimeout) {
      clearTimeout(this.processTimeout);
    }

    // Clear queue
    this.alertQueue = [];
    this.currentAlert = null;
    this.isProcessing = false;

    // Remove debug functions
    if (typeof window !== 'undefined') {
      delete (window as any).alertFeedComponent;
      delete (window as any).debugAlertFeed;
      delete (window as any).testAlert;
      delete (window as any).testAlertQueue;
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
    // Create alert container if it doesn't exist
    this.alertContainer = this.container.querySelector('.alert-container');
    if (!this.alertContainer) {
      this.alertContainer = document.createElement('div');
      this.alertContainer.className = 'alert-container';
      this.container.appendChild(this.alertContainer);
    }

    // Create content area
    this.alertContent = document.createElement('div');
    this.alertContent.className = 'alert-content';
    this.alertContainer.appendChild(this.alertContent);

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

    // Create queued alert
    const queuedAlert: QueuedAlert = {
      ...alert,
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

    // Start processing if not already
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  /**
   * Process the alert queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.alertQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.alertQueue.length > 0) {
      const alert = this.alertQueue.shift()!;
      await this.displayAlert(alert);

      // Wait between alerts
      if (this.alertQueue.length > 0) {
        await this.sleep(this.config.alertDelay);
      }
    }

    this.isProcessing = false;
    this.currentAlert = null;
  }

  /**
   * Display a single alert with animations
   */
  private async displayAlert(alert: QueuedAlert): Promise<void> {
    this.currentAlert = alert;
    alert.state = 'entering';
    alert.stateTimestamp = Date.now();

    // Build alert HTML
    const alertElement = this.buildAlertElement(alert);

    // Clear previous content and add new alert
    if (this.alertContent) {
      this.alertContent.innerHTML = '';
      this.alertContent.appendChild(alertElement);
    }

    // Enter animation
    await this.animateIn(alertElement);

    alert.state = 'displaying';
    alert.stateTimestamp = Date.now();

    // Display duration
    await this.sleep(this.config.displayDuration);

    // Exit animation
    alert.state = 'exiting';
    alert.stateTimestamp = Date.now();
    await this.animateOut(alertElement);

    // Remove from DOM
    alertElement.remove();

    alert.state = 'done';
    alert.stateTimestamp = Date.now();
  }

  /**
   * Build the alert DOM element
   */
  private buildAlertElement(alert: QueuedAlert): HTMLElement {
    const element = document.createElement('div');
    element.className = `alert alert-${alert.type} alert-${alert.platform}`;
    element.setAttribute('data-alert-id', alert.id || '');

    // Icon based on type
    const icon = this.getAlertIcon(alert.type);

    // Build content based on alert type
    let content = '';
    switch (alert.type) {
      case 'follow':
        content = `
          <div class="alert-icon">${icon}</div>
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
          <div class="alert-icon">${icon}</div>
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
          <div class="alert-icon">${icon}</div>
          <div class="alert-body">
            <div class="alert-title">${alert.amount} Bits!</div>
            <div class="alert-user">${this.escapeHtml(alert.user)}</div>
            ${alert.message ? `<div class="alert-message">"${this.escapeHtml(alert.message)}"</div>` : ''}
          </div>
        `;
        break;

      case 'raid':
        content = `
          <div class="alert-icon">${icon}</div>
          <div class="alert-body">
            <div class="alert-title">Raid!</div>
            <div class="alert-user">${this.escapeHtml(alert.user)}</div>
            <div class="alert-detail">with ${alert.viewers || 0} viewers</div>
          </div>
        `;
        break;

      case 'donation':
        content = `
          <div class="alert-icon">${icon}</div>
          <div class="alert-body">
            <div class="alert-title">${alert.currency || '$'}${alert.amount} Donation!</div>
            <div class="alert-user">${this.escapeHtml(alert.user)}</div>
            ${alert.message ? `<div class="alert-message">"${this.escapeHtml(alert.message)}"</div>` : ''}
          </div>
        `;
        break;

      case 'redemption':
        content = `
          <div class="alert-icon">${icon}</div>
          <div class="alert-body">
            <div class="alert-title">Redemption!</div>
            <div class="alert-user">${this.escapeHtml(alert.user)}</div>
            <div class="alert-detail">${this.escapeHtml(alert.reward || 'Unknown Reward')}</div>
            ${alert.message ? `<div class="alert-message">"${this.escapeHtml(alert.message)}"</div>` : ''}
          </div>
        `;
        break;

      default:
        content = `
          <div class="alert-icon">${icon}</div>
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
   * Get icon for alert type
   */
  private getAlertIcon(type: AlertType): string {
    const icons: Record<AlertType, string> = {
      follow: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>',
      sub: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
      cheer: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>',
      raid: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>',
      donation: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1 1.05.82 1.87 2.65 1.87 1.96 0 2.4-.98 2.4-1.59 0-.83-.44-1.61-2.67-2.14-2.48-.6-4.18-1.62-4.18-3.67 0-1.72 1.39-2.84 3.11-3.21V4h2.67v1.95c1.86.45 2.79 1.86 2.85 3.39H14.3c-.05-1.11-.64-1.87-2.22-1.87-1.5 0-2.4.68-2.4 1.64 0 .84.65 1.39 2.67 1.91s4.18 1.39 4.18 3.91c-.01 1.83-1.38 2.83-3.12 3.16z"/></svg>',
      redemption: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 6h-2.18c.11-.31.18-.65.18-1 0-1.66-1.34-3-3-3-1.05 0-1.96.54-2.5 1.35l-.5.67-.5-.68C10.96 2.54 10.05 2 9 2 7.34 2 6 3.34 6 5c0 .35.07.69.18 1H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-5-2c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zM9 4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm11 15H4v-2h16v2zm0-5H4V8h5.08L7 10.83 8.62 12 11 8.76l1-1.36 1 1.36L15.38 12 17 10.83 14.92 8H20v6z"/></svg>'
    };
    return icons[type] || icons.follow;
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

  private async animateIn(element: HTMLElement): Promise<void> {
    element.style.opacity = '0';
    element.style.transform = 'translateY(-20px) scale(0.9)';
    element.style.transition = `all ${this.config.animationDuration}ms ease-out`;

    // Force reflow
    element.offsetHeight;

    element.style.opacity = '1';
    element.style.transform = 'translateY(0) scale(1)';

    await this.sleep(this.config.animationDuration);
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
      console.log('- Is processing:', this.isProcessing);
      console.log('- Current alert:', this.currentAlert);
      console.log('- Config:', this.config);
    };

    windowAny.testAlert = (type: AlertType = 'follow', user: string = 'TestUser') => {
      const testAlert: AlertEvent = {
        type,
        platform: 'twitch',
        user,
        timestamp: Date.now(),
        isTest: true,
        id: `test-${Date.now()}`
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
      }

      console.log(`Testing ${type} alert from ${user}`);
      this.queueAlert(testAlert);
    };

    windowAny.testAlertQueue = (count: number = 5) => {
      const types: AlertType[] = ['follow', 'sub', 'cheer', 'raid', 'donation', 'redemption'];
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

    alertLogger.info('Debug functions registered: debugAlertFeed(), testAlert(), testAlertQueue()');
  }
}
