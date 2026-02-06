/**
 * LatestEvent Section Component
 * Displays the most recent event of a configured type (follow, sub, cheer, etc.)
 * One class, instantiated per type - each instance filters for its configured event type
 * Persistence via Streamer.bot global variables (read-only — SB is source of truth)
 */

import type { SectionComponent, ComponentData } from '../../../types';
import type {
  AlertEvent,
  AlertType,
  AlertPlatform,
  LatestEventConfig
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

const latestLogger = logger.createChildLogger('LatestEvent');

/** Track all active instances for debug functions */
const instances: LatestEvent[] = [];

export class LatestEvent implements SectionComponent {
  public readonly type = 'section' as const;
  public readonly elementId: string;
  public readonly container: HTMLElement;
  public isInitialized = false;
  public data?: ComponentData;
  public readonly features: any[] = [];
  public readonly elements: any[] = [];

  private config: LatestEventConfig;
  private latestEvent: AlertEvent | null = null;
  private timestampInterval: ReturnType<typeof setInterval> | null = null;

  // DOM elements
  private placeholderEl: HTMLElement | null = null;
  private contentEl: HTMLElement | null = null;
  private userEl: HTMLElement | null = null;
  private detailEl: HTMLElement | null = null;
  private timeEl: HTMLElement | null = null;
  private iconEl: HTMLElement | null = null;
  private typeBadgeEl: HTMLElement | null = null;

  constructor(container: HTMLElement, config?: Partial<LatestEventConfig>) {
    this.container = container;
    this.elementId = container.id || `latest-event-${config?.eventType || 'unknown'}-${Date.now()}`;

    this.config = {
      eventType: 'follow',
      label: 'Latest Follower',
      showPlatformIcon: true,
      showTypeIcon: true,
      showTimestamp: true,
      timestampInterval: 30000,
      persist: true,
      placeholderText: '',
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    latestLogger.info(`LatestEvent[${this.config.eventType}] initializing...`);

    this.buildDOM();
    this.setupEventListeners();
    this.setupRestoreListener();

    // Start timestamp refresh interval
    if (this.config.showTimestamp && this.config.timestampInterval > 0) {
      this.timestampInterval = setInterval(() => {
        this.updateTimestamp();
      }, this.config.timestampInterval);
    }

    // Register this instance
    instances.push(this);
    this.setupDebugFunctions();

    this.isInitialized = true;
    latestLogger.info(`LatestEvent[${this.config.eventType}] initialized`);
  }

  updateData(data: Partial<ComponentData>): void {
    latestLogger.debug(`LatestEvent[${this.config.eventType}] data update received`);
  }

  destroy(): void {
    // Clear interval
    if (this.timestampInterval) {
      clearInterval(this.timestampInterval);
      this.timestampInterval = null;
    }

    // Remove from instances
    const idx = instances.indexOf(this);
    if (idx !== -1) instances.splice(idx, 1);

    // Clean up debug functions if no instances remain
    if (instances.length === 0 && typeof window !== 'undefined') {
      delete (window as any).testLatestEvent;
      delete (window as any).testAllLatestEvents;
      delete (window as any).debugLatestEvents;
      delete (window as any).clearLatestEvents;
    }

    this.isInitialized = false;
    latestLogger.info(`LatestEvent[${this.config.eventType}] destroyed`);
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
    // Find the section-content container or use the container directly
    const target = this.container.querySelector('.section-content') || this.container;

    const wrapper = document.createElement('div');
    wrapper.className = `latest-event latest-event-${this.config.eventType}`;
    wrapper.setAttribute('data-event-type', this.config.eventType);

    wrapper.innerHTML = `
      <div class="latest-event-placeholder" style="display: none;">
        <span class="latest-event-placeholder-text">${this.escapeHtml(this.config.placeholderText)}</span>
      </div>
      <div class="latest-event-content" style="display: none;">
        <div class="latest-event-icon" style="--platform-brand-color: transparent">
          <span class="latest-event-type-badge"></span>
        </div>
        <div class="latest-event-body">
          <div class="latest-event-user"></div>
          <div class="latest-event-detail"></div>
        </div>
        <div class="latest-event-time"></div>
      </div>
    `;

    target.appendChild(wrapper);

    // Cache DOM references
    this.placeholderEl = wrapper.querySelector('.latest-event-placeholder');
    this.contentEl = wrapper.querySelector('.latest-event-content');
    this.iconEl = wrapper.querySelector('.latest-event-icon');
    this.typeBadgeEl = wrapper.querySelector('.latest-event-type-badge');
    this.userEl = wrapper.querySelector('.latest-event-user');
    this.detailEl = wrapper.querySelector('.latest-event-detail');
    this.timeEl = wrapper.querySelector('.latest-event-time');

    latestLogger.debug(`LatestEvent[${this.config.eventType}] DOM built`);
  }

  // ============================================
  // EVENT HANDLING
  // ============================================

  private setupEventListeners(): void {
    eventBus.on(EVENT_TYPES.ALERT_TRIGGER, (event: AlertTriggerEvent) => {
      this.handleAlert(event as AlertEvent);
    });

    latestLogger.debug(`LatestEvent[${this.config.eventType}] event listeners registered`);
  }

  private handleAlert(event: AlertEvent): void {
    // Filter: only handle our configured event type
    if (event.type !== this.config.eventType) return;

    latestLogger.info(`LatestEvent[${this.config.eventType}] received: ${event.user}`);

    this.latestEvent = event;
    this.render();
    this.triggerUpdateAnimation();
  }

  // ============================================
  // RENDERING
  // ============================================

  private render(): void {
    if (!this.latestEvent) return;

    const event = this.latestEvent;

    // Hide placeholder, show content
    if (this.placeholderEl) this.placeholderEl.style.display = 'none';
    if (this.contentEl) this.contentEl.style.display = '';

    // Update icon
    if (this.iconEl && this.config.showPlatformIcon) {
      const platformColor = getPlatformColor(event.platform);
      this.iconEl.style.setProperty('--platform-brand-color', platformColor);

      const platformIconHtml = getPlatformIconHtml(event.platform);
      // Preserve the type badge, replace only the icon content
      const badgeHtml = this.typeBadgeEl?.outerHTML || '';
      this.iconEl.innerHTML = platformIconHtml + badgeHtml;
      // Re-cache badge reference
      this.typeBadgeEl = this.iconEl.querySelector('.latest-event-type-badge');
    }

    // Update type badge
    if (this.typeBadgeEl && this.config.showTypeIcon) {
      const typeIcon = getTypeIconSvg(event.type);
      const typeColor = getTypeColor(event.type);
      this.typeBadgeEl.style.color = typeColor;
      this.typeBadgeEl.innerHTML = typeIcon;
    }

    // Update user
    if (this.userEl) {
      this.userEl.textContent = event.user;
    }

    // Update detail text
    if (this.detailEl) {
      const detail = this.getDetailText(event);
      this.detailEl.textContent = detail;
      this.detailEl.style.display = detail ? '' : 'none';
    }

    // Update timestamp
    this.updateTimestamp();
  }

  private getDetailText(event: AlertEvent): string {
    switch (event.type) {
      case 'follow':
        return '';
      case 'sub':
        if (event.isGift && event.giftRecipient) {
          return `Gifted to ${event.giftRecipient}`;
        }
        {
          const parts: string[] = [];
          if (event.tier) parts.push(`Tier ${event.tier}`);
          if (event.months && event.months > 1) parts.push(`${event.months}mo`);
          return parts.join(' \u00B7 ');
        }
      case 'cheer':
        return event.amount ? `${event.amount} bits` : '';
      case 'raid':
        return event.viewers ? `${event.viewers} viewers` : '';
      case 'donation':
        if (event.amount != null) {
          return `${event.currency || '$'}${event.amount}`;
        }
        return '';
      case 'redemption':
        {
          const parts: string[] = [];
          if (event.reward) parts.push(event.reward);
          if (event.cost) parts.push(`(${event.cost}pts)`);
          return parts.join(' ');
        }
      case 'firstword':
        if (event.message) {
          return event.message.length > 40
            ? event.message.slice(0, 40) + '\u2026'
            : event.message;
        }
        return '';
      default:
        return '';
    }
  }

  private updateTimestamp(): void {
    if (!this.timeEl || !this.config.showTimestamp || !this.latestEvent) return;
    this.timeEl.textContent = this.getRelativeTime(this.latestEvent.timestamp);
  }

  private getRelativeTime(timestamp: number): string {
    const diff = Date.now() - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${Math.floor(hours / 24)}d`;
  }

  private triggerUpdateAnimation(): void {
    if (!this.contentEl) return;
    this.contentEl.classList.remove('latest-event-flash');
    // Force reflow to restart animation
    void this.contentEl.offsetHeight;
    this.contentEl.classList.add('latest-event-flash');
  }

  // ============================================
  // RESTORE (from Streamer.bot global variables)
  // ============================================

  private setupRestoreListener(): void {
    eventBus.on(EVENT_TYPES.LATEST_EVENT_RESTORE, (data: { eventType: AlertType; event: AlertEvent }) => {
      if (data.eventType !== this.config.eventType) return;
      latestLogger.info(`LatestEvent[${this.config.eventType}] restored: ${data.event.user}`);
      this.latestEvent = data.event;
      this.render();
    });
  }

  // ============================================
  // UTILITIES
  // ============================================

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // ============================================
  // DEBUG FUNCTIONS
  // ============================================

  private setupDebugFunctions(): void {
    const windowAny = window as any;

    windowAny.testLatestEvent = (type: AlertType = 'follow', user: string = 'TestUser') => {
      const platforms: AlertPlatform[] = ['twitch', 'youtube', 'kick', 'kofi', 'streamlabs'];
      const platform = platforms[Math.floor(Math.random() * platforms.length)];

      const testAlert: AlertEvent = {
        type,
        platform,
        user,
        timestamp: Date.now(),
        isTest: true,
        id: `test-latest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      };

      // Add type-specific data
      switch (type) {
        case 'sub':
          testAlert.tier = '1';
          testAlert.months = Math.floor(Math.random() * 24) + 1;
          break;
        case 'cheer':
          testAlert.amount = [100, 500, 1000, 5000][Math.floor(Math.random() * 4)];
          break;
        case 'raid':
          testAlert.viewers = Math.floor(Math.random() * 500) + 10;
          break;
        case 'donation':
          testAlert.amount = [5, 10, 25, 50, 100][Math.floor(Math.random() * 5)];
          testAlert.currency = '$';
          break;
        case 'redemption':
          testAlert.reward = 'Hydrate!';
          testAlert.cost = 500;
          break;
        case 'firstword':
          testAlert.message = 'Hello everyone! First time here!';
          break;
      }

      console.log(`Testing LatestEvent: ${type} from ${user} (${platform})`);
      eventBus.emit(EVENT_TYPES.ALERT_TRIGGER, testAlert);
    };

    windowAny.testAllLatestEvents = () => {
      const types: AlertType[] = ['follow', 'sub', 'cheer', 'raid', 'donation', 'redemption', 'firstword'];
      const users = ['FollowFan', 'SubStar', 'CheerChamp', 'RaidRider', 'DonorDave', 'RedeemRick', 'FirstWordFaye'];

      types.forEach((type, i) => {
        setTimeout(() => {
          windowAny.testLatestEvent(type, users[i]);
        }, i * 200);
      });

      console.log(`Firing ${types.length} test events (one per type, 200ms apart)`);
    };

    windowAny.debugLatestEvents = () => {
      console.log('LatestEvent Instances:');
      instances.forEach(inst => {
        console.log(`  [${inst.config.eventType}]`, {
          initialized: inst.isInitialized,
          hasEvent: !!inst.latestEvent,
          user: inst.latestEvent?.user || null,
          platform: inst.latestEvent?.platform || null,
          timestamp: inst.latestEvent?.timestamp || null
        });
      });
    };

    windowAny.clearLatestEvents = () => {
      instances.forEach(inst => {
        inst.latestEvent = null;
      });
      console.log('Cleared all LatestEvent in-memory state. Persistence is managed by Streamer.bot globals.');
    };

    latestLogger.info(`Debug functions registered: testLatestEvent(), testAllLatestEvents(), debugLatestEvents(), clearLatestEvents()`);
  }
}
