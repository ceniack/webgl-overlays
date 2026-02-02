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
    element.className = `activity-item activity-${item.type}`;
    element.setAttribute('data-activity-id', item.id);

    const icon = this.getActivityIcon(item.type);
    const timestamp = this.config.showTimestamps ? this.formatTimestamp(item.timestamp) : '';

    element.innerHTML = `
      <div class="activity-icon">${icon}</div>
      <div class="activity-body">
        <span class="activity-user">${this.escapeHtml(item.user)}</span>
        <span class="activity-detail">${this.escapeHtml(item.detail || '')}</span>
      </div>
      ${timestamp ? `<div class="activity-time">${timestamp}</div>` : ''}
    `;

    return element;
  }

  /**
   * Get icon for activity type
   */
  private getActivityIcon(type: AlertType): string {
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
