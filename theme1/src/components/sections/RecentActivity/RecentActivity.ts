/**
 * RecentActivity Section Component
 * Scrolling feed of recent stream activity (follows, subs, cheers, etc.)
 * Compact list format with auto-scroll and configurable item limit
 */

import type { SectionComponent, ComponentData } from '../../../types';
import type {
  ActivityItem,
  AlertType,
  RecentActivityConfig
} from '../../../types/alerts';
import type { ActivityItemEvent } from '../../../types/events';
import { eventBus } from '../../../js/EventBus';
import { EVENT_TYPES } from '../../../js/EventConstants';
import { logger } from '../../../js/Logger';
import { getPlatformIconHtml, getPlatformColor } from '../../../icons/platform-icons';

const activityLogger = logger.createChildLogger('RecentActivity');

export class RecentActivity implements SectionComponent {
  public readonly type = 'section' as const;
  public readonly elementId: string;
  public readonly container: HTMLElement;
  public isInitialized = false;
  public data?: ComponentData;
  public readonly features: any[] = [];
  public readonly elements: any[] = [];

  private config: RecentActivityConfig;
  private activities: ActivityItem[] = [];
  private activityList: HTMLElement | null = null;
  private scrollAnimationId: number | null = null;

  constructor(container: HTMLElement, config?: Partial<RecentActivityConfig>) {
    this.container = container;
    this.elementId = container.id || `recent-activity-${Date.now()}`;

    this.config = {
      maxItems: 10,
      autoScroll: true,
      scrollDuration: 500,
      enabledTypes: [], // Empty = all types enabled
      showTimestamps: true,
      timeFormat: 'relative',
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    activityLogger.info('RecentActivity Component initializing...');

    // Build DOM structure
    this.buildDOM();

    // Set up EventBus listeners
    this.setupEventListeners();

    // Set up debug functions
    this.setupDebugFunctions();

    this.isInitialized = true;
    activityLogger.info('RecentActivity Component initialized successfully');
  }

  updateData(data: Partial<ComponentData>): void {
    activityLogger.debug('RecentActivity data update received');
  }

  destroy(): void {
    // Cancel any scroll animations
    if (this.scrollAnimationId) {
      cancelAnimationFrame(this.scrollAnimationId);
    }

    // Clear activities
    this.activities = [];

    // Remove debug functions
    if (typeof window !== 'undefined') {
      delete (window as any).recentActivityComponent;
      delete (window as any).debugRecentActivity;
      delete (window as any).testActivity;
      delete (window as any).testActivityFeed;
    }

    this.isInitialized = false;
    activityLogger.info('RecentActivity Component destroyed');
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
    // Create activity container
    let activityContainer = this.container.querySelector('.activity-container') as HTMLElement;
    if (!activityContainer) {
      activityContainer = document.createElement('div');
      activityContainer.className = 'activity-container';
      this.container.appendChild(activityContainer);
    }

    // Create activity list
    this.activityList = document.createElement('ul');
    this.activityList.className = 'activity-list';
    activityContainer.appendChild(this.activityList);

    // Add empty state
    this.showEmptyState();

    activityLogger.debug('RecentActivity DOM built');
  }

  private showEmptyState(): void {
    if (!this.activityList) return;

    if (this.activities.length === 0) {
      this.activityList.innerHTML = `
        <li class="activity-empty">
          <span class="activity-empty-text">Waiting for activity...</span>
        </li>
      `;
    }
  }

  // ============================================
  // EVENT HANDLING
  // ============================================

  private setupEventListeners(): void {
    eventBus.on(EVENT_TYPES.ACTIVITY_ITEM, (event: ActivityItemEvent) => {
      activityLogger.debug('Activity item event received:', event);
      this.addActivity(event as ActivityItem);
    });

    activityLogger.debug('RecentActivity event listeners registered');
  }

  // ============================================
  // ACTIVITY MANAGEMENT
  // ============================================

  /**
   * Add a new activity to the feed
   */
  public addActivity(item: ActivityItem): void {
    // Check if type is enabled
    if (this.config.enabledTypes.length > 0 &&
        !this.config.enabledTypes.includes(item.type)) {
      activityLogger.debug(`Activity type ${item.type} not enabled, skipping`);
      return;
    }

    // Add to beginning of array (newest first)
    this.activities.unshift(item);

    // Trim to max items
    if (this.activities.length > this.config.maxItems) {
      this.activities = this.activities.slice(0, this.config.maxItems);
    }

    // Update display
    this.renderActivityList();

    activityLogger.info(`Activity added: ${item.type} - ${item.user} (total: ${this.activities.length})`);
  }

  /**
   * Render the full activity list
   */
  private renderActivityList(): void {
    if (!this.activityList) return;

    // Clear empty state
    this.activityList.innerHTML = '';

    // Render each activity
    this.activities.forEach((activity, index) => {
      const element = this.createActivityElement(activity);
      this.activityList!.appendChild(element);

      // Animate new item
      if (index === 0) {
        element.classList.add('activity-new');
        setTimeout(() => {
          element.classList.remove('activity-new');
        }, 500);
      }
    });

    // Auto-scroll to top if enabled
    if (this.config.autoScroll && this.activityList.parentElement) {
      this.activityList.parentElement.scrollTop = 0;
    }
  }

  /**
   * Create DOM element for an activity item
   */
  private createActivityElement(item: ActivityItem): HTMLElement {
    const element = document.createElement('li');
    element.className = `activity-item activity-${item.type} activity-platform-${item.platform}`;
    element.setAttribute('data-activity-id', item.id);

    const platformIcon = getPlatformIconHtml(item.platform);
    const platformColor = getPlatformColor(item.platform);
    const timestamp = this.config.showTimestamps ? this.formatTimestamp(item.timestamp) : '';

    element.innerHTML = `
      <div class="activity-icon" style="--platform-brand-color: ${platformColor}">${platformIcon}</div>
      <div class="activity-body">
        <span class="activity-user">${this.escapeHtml(item.user)}</span>
        <span class="activity-detail">${this.escapeHtml(item.detail || '')}</span>
      </div>
      ${timestamp ? `<div class="activity-time">${timestamp}</div>` : ''}
    `;

    return element;
  }

  /**
   * Format timestamp based on config
   */
  private formatTimestamp(timestamp: number): string {
    if (this.config.timeFormat === 'relative') {
      return this.getRelativeTime(timestamp);
    } else {
      return new Date(timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  /**
   * Get relative time string (e.g., "2m ago")
   */
  private getRelativeTime(timestamp: number): string {
    const now = Date.now();
    const diff = now - timestamp;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) {
      return 'now';
    } else if (minutes < 60) {
      return `${minutes}m`;
    } else if (hours < 24) {
      return `${hours}h`;
    } else {
      return `${Math.floor(hours / 24)}d`;
    }
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Clear all activities
   */
  public clearActivities(): void {
    this.activities = [];
    this.showEmptyState();
    activityLogger.info('Activities cleared');
  }

  // ============================================
  // DEBUG FUNCTIONS
  // ============================================

  private setupDebugFunctions(): void {
    const windowAny = window as any;

    windowAny.recentActivityComponent = this;

    windowAny.debugRecentActivity = () => {
      console.log('RecentActivity Component Debug Info:');
      console.log('- Initialized:', this.isInitialized);
      console.log('- Activity count:', this.activities.length);
      console.log('- Config:', this.config);
      console.log('- Activities:', this.activities);
    };

    windowAny.testActivity = (type: AlertType = 'follow', user: string = 'TestUser') => {
      const details: Record<AlertType, string> = {
        follow: 'followed',
        sub: 'subscribed (Tier 1)',
        cheer: 'cheered 100 bits',
        raid: 'raided with 50 viewers',
        donation: 'donated $5.00',
        redemption: 'redeemed Hydrate!'
      };

      const activity: ActivityItem = {
        id: `test-${Date.now()}`,
        type,
        platform: 'twitch',
        user,
        detail: details[type],
        timestamp: Date.now()
      };

      console.log(`Testing ${type} activity from ${user}`);
      this.addActivity(activity);
    };

    windowAny.testActivityFeed = (count: number = 5) => {
      const types: AlertType[] = ['follow', 'sub', 'cheer', 'raid', 'donation', 'redemption'];
      const users = ['StreamerFan1', 'GamerPro99', 'ChatLurker', 'BigDonor', 'LoyalSub'];

      for (let i = 0; i < count; i++) {
        const type = types[Math.floor(Math.random() * types.length)];
        const user = users[Math.floor(Math.random() * users.length)] + (i + 1);
        setTimeout(() => {
          windowAny.testActivity(type, user);
        }, i * 200);
      }

      console.log(`Adding ${count} test activities`);
    };

    windowAny.clearActivityFeed = () => {
      this.clearActivities();
      console.log('Activity feed cleared');
    };

    activityLogger.info('Debug functions registered: debugRecentActivity(), testActivity(), testActivityFeed(), clearActivityFeed()');
  }
}
