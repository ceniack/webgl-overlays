/**
 * GoalTracker Section Component
 * Visual progress bars for stream goals (followers, subs, bits, donations)
 * Supports multiple concurrent goals with animated progress
 */

import type { SectionComponent, ComponentData } from '../../../types';
import type {
  StreamGoal,
  GoalType,
  GoalTrackerConfig,
  GoalDisplayState,
  GoalMilestoneEvent
} from '../../../types/goals';
import type { GoalProgressEvent } from '../../../types/events';
import { eventBus } from '../../../js/EventBus';
import { EVENT_TYPES } from '../../../js/EventConstants';
import { logger } from '../../../js/Logger';

const goalLogger = logger.createChildLogger('GoalTracker');

export class GoalTracker implements SectionComponent {
  public readonly type = 'section' as const;
  public readonly elementId: string;
  public readonly container: HTMLElement;
  public isInitialized = false;
  public data?: ComponentData;
  public readonly features: any[] = [];
  public readonly elements: any[] = [];

  private config: GoalTrackerConfig;
  private goals: Map<string, GoalDisplayState> = new Map();
  private goalElements: Map<string, HTMLElement> = new Map();
  private animationFrameId: number | null = null;

  constructor(container: HTMLElement, config?: Partial<GoalTrackerConfig>) {
    this.container = container;
    this.elementId = container.id || `goal-tracker-${Date.now()}`;

    this.config = {
      maxGoals: 4,
      animateProgress: true,
      animationDuration: 500,
      showMilestones: true,
      milestoneThresholds: [25, 50, 75, 100],
      layout: 'vertical',
      showPercentage: true,
      showValues: true,
      variablePrefix: 'goal',
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    goalLogger.info('GoalTracker Component initializing...');

    // Build DOM structure
    this.buildDOM();

    // Set up EventBus listeners
    this.setupEventListeners();

    // Set up debug functions
    this.setupDebugFunctions();

    this.isInitialized = true;
    goalLogger.info('GoalTracker Component initialized successfully');
  }

  updateData(data: Partial<ComponentData>): void {
    goalLogger.debug('GoalTracker data update received');
  }

  destroy(): void {
    // Cancel any pending animations
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Clear goals
    this.goals.clear();
    this.goalElements.clear();

    // Remove debug functions
    if (typeof window !== 'undefined') {
      delete (window as any).goalTrackerComponent;
      delete (window as any).debugGoalTracker;
      delete (window as any).testGoal;
      delete (window as any).setGoal;
    }

    this.isInitialized = false;
    goalLogger.info('GoalTracker Component destroyed');
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
    // Create goals container
    let goalsContainer = this.container.querySelector('.goals-container') as HTMLElement;
    if (!goalsContainer) {
      goalsContainer = document.createElement('div');
      goalsContainer.className = `goals-container goals-${this.config.layout}`;
      this.container.appendChild(goalsContainer);
    }

    goalLogger.debug('GoalTracker DOM built');
  }

  // ============================================
  // EVENT HANDLING
  // ============================================

  private setupEventListeners(): void {
    eventBus.on(EVENT_TYPES.GOAL_PROGRESS, (event: GoalProgressEvent) => {
      goalLogger.debug('Goal progress event received:', event);
      this.handleGoalUpdate(event);
    });

    goalLogger.debug('GoalTracker event listeners registered');
  }

  // ============================================
  // GOAL MANAGEMENT
  // ============================================

  /**
   * Handle a goal update event
   */
  private handleGoalUpdate(event: GoalProgressEvent): void {
    const { goalId, type, current, target } = event;

    let displayState = this.goals.get(goalId);
    const previousValue = displayState?.goal.current ?? 0;

    if (!displayState) {
      // Create new goal
      const goal: StreamGoal = {
        id: goalId,
        type,
        current: current,
        target: target || 100,
        label: this.getDefaultLabel(type),
        isActive: true,
        startedAt: Date.now()
      };

      displayState = {
        goal,
        percentage: this.calculatePercentage(current, target || 100),
        isAnimating: false,
        previousPercentage: 0
      };

      this.goals.set(goalId, displayState);
      this.createGoalElement(goalId, displayState);

      goalLogger.info(`New goal created: ${goalId} (${type})`);
    } else {
      // Update existing goal
      displayState.previousPercentage = displayState.percentage;
      displayState.goal.current = current;

      if (target !== undefined) {
        displayState.goal.target = target;
      }

      displayState.percentage = this.calculatePercentage(
        current,
        displayState.goal.target
      );

      // Check for milestone achievements
      if (this.config.showMilestones) {
        this.checkMilestones(displayState, previousValue);
      }
    }

    // Update display
    this.updateGoalDisplay(goalId, displayState);
  }

  /**
   * Calculate percentage (capped at 100)
   */
  private calculatePercentage(current: number, target: number): number {
    if (target <= 0) return 0;
    return Math.min(100, (current / target) * 100);
  }

  /**
   * Get default label for goal type
   */
  private getDefaultLabel(type: GoalType): string {
    const labels: Record<GoalType, string> = {
      follower: 'Follower Goal',
      sub: 'Sub Goal',
      bit: 'Bit Goal',
      donation: 'Donation Goal',
      custom: 'Goal'
    };
    return labels[type] || 'Goal';
  }

  /**
   * Create DOM element for a goal
   */
  private createGoalElement(goalId: string, state: GoalDisplayState): void {
    const goalsContainer = this.container.querySelector('.goals-container');
    if (!goalsContainer) return;

    // Check max goals limit
    if (this.goalElements.size >= this.config.maxGoals) {
      goalLogger.warn(`Max goals (${this.config.maxGoals}) reached, cannot add more`);
      return;
    }

    const element = document.createElement('div');
    element.className = `goal goal-${state.goal.type}`;
    element.id = `goal-${goalId}`;
    element.setAttribute('data-goal-id', goalId);

    element.innerHTML = `
      <div class="goal-header">
        <span class="goal-label">${this.escapeHtml(state.goal.label)}</span>
        ${this.config.showPercentage ? `<span class="goal-percentage">${Math.floor(state.percentage)}%</span>` : ''}
      </div>
      <div class="goal-progress-container">
        <div class="goal-progress-bar" style="width: 0%">
          <div class="goal-progress-glow"></div>
        </div>
        <div class="goal-progress-shine"></div>
      </div>
      ${this.config.showValues ? `
        <div class="goal-values">
          <span class="goal-current">${this.formatNumber(state.goal.current)}</span>
          <span class="goal-separator">/</span>
          <span class="goal-target">${this.formatNumber(state.goal.target)}</span>
        </div>
      ` : ''}
      <div class="goal-milestone-popup"></div>
    `;

    goalsContainer.appendChild(element);
    this.goalElements.set(goalId, element);

    // Trigger initial animation
    requestAnimationFrame(() => {
      this.updateGoalDisplay(goalId, state);
    });

    goalLogger.debug(`Goal element created: ${goalId}`);
  }

  /**
   * Update the display for a goal
   */
  private updateGoalDisplay(goalId: string, state: GoalDisplayState): void {
    const element = this.goalElements.get(goalId);
    if (!element) return;

    const progressBar = element.querySelector('.goal-progress-bar') as HTMLElement;
    const percentageEl = element.querySelector('.goal-percentage');
    const currentEl = element.querySelector('.goal-current');
    const targetEl = element.querySelector('.goal-target');

    if (progressBar) {
      if (this.config.animateProgress) {
        progressBar.style.transition = `width ${this.config.animationDuration}ms ease-out`;
      }
      progressBar.style.width = `${state.percentage}%`;
    }

    if (percentageEl) {
      percentageEl.textContent = `${Math.floor(state.percentage)}%`;
    }

    if (currentEl) {
      currentEl.textContent = this.formatNumber(state.goal.current);
    }

    if (targetEl) {
      targetEl.textContent = this.formatNumber(state.goal.target);
    }

    // Update type class in case it changed
    element.className = `goal goal-${state.goal.type}`;

    // Check for completion
    if (state.percentage >= 100 && !element.classList.contains('goal-complete')) {
      element.classList.add('goal-complete');
      this.celebrateCompletion(goalId, state);
    }
  }

  /**
   * Check for milestone achievements
   */
  private checkMilestones(state: GoalDisplayState, previousValue: number): void {
    const previousPercentage = this.calculatePercentage(previousValue, state.goal.target);

    for (const threshold of this.config.milestoneThresholds) {
      if (state.percentage >= threshold && previousPercentage < threshold) {
        // Milestone reached!
        goalLogger.info(`Milestone reached: ${state.goal.id} at ${threshold}%`);

        const milestoneEvent: GoalMilestoneEvent = {
          goalId: state.goal.id,
          type: state.goal.type,
          milestone: threshold,
          current: state.goal.current,
          target: state.goal.target,
          timestamp: Date.now()
        };

        // Show milestone popup
        this.showMilestonePopup(state.goal.id, threshold);

        // Update last milestone
        state.lastMilestone = threshold;

        break; // Only one milestone at a time
      }
    }
  }

  /**
   * Show milestone popup
   */
  private showMilestonePopup(goalId: string, milestone: number): void {
    const element = this.goalElements.get(goalId);
    if (!element) return;

    const popup = element.querySelector('.goal-milestone-popup') as HTMLElement;
    if (!popup) return;

    popup.textContent = milestone === 100 ? 'GOAL COMPLETE!' : `${milestone}% Reached!`;
    popup.classList.add('show');

    setTimeout(() => {
      popup.classList.remove('show');
    }, 3000);
  }

  /**
   * Celebrate goal completion
   */
  private celebrateCompletion(goalId: string, state: GoalDisplayState): void {
    goalLogger.info(`Goal completed: ${goalId}`);

    state.goal.completedAt = Date.now();
    state.goal.isActive = false;
  }

  /**
   * Set a goal's values directly (useful for initialization)
   */
  public setGoal(goalId: string, type: GoalType, current: number, target: number, label?: string): void {
    const event: GoalProgressEvent = {
      goalId,
      type,
      current,
      target,
      timestamp: Date.now()
    };

    this.handleGoalUpdate(event);

    // Update label if provided
    const state = this.goals.get(goalId);
    if (state && label) {
      state.goal.label = label;
      const element = this.goalElements.get(goalId);
      const labelEl = element?.querySelector('.goal-label');
      if (labelEl) {
        labelEl.textContent = label;
      }
    }
  }

  // ============================================
  // UTILITIES
  // ============================================

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  }

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

    windowAny.goalTrackerComponent = this;

    windowAny.debugGoalTracker = () => {
      console.log('GoalTracker Component Debug Info:');
      console.log('- Initialized:', this.isInitialized);
      console.log('- Active goals:', this.goals.size);
      console.log('- Config:', this.config);
      console.log('- Goals:', Array.from(this.goals.entries()));
    };

    windowAny.testGoal = (type: GoalType = 'follower') => {
      const goalId = `test-${type}-goal`;
      const current = Math.floor(Math.random() * 80) + 10;
      const target = 100;

      console.log(`Testing ${type} goal: ${current}/${target}`);
      this.setGoal(goalId, type, current, target, `Test ${type.charAt(0).toUpperCase() + type.slice(1)} Goal`);
    };

    windowAny.setGoal = (goalId: string, type: GoalType, current: number, target: number, label?: string) => {
      this.setGoal(goalId, type, current, target, label);
    };

    windowAny.updateGoalProgress = (goalId: string, newCurrent: number) => {
      const state = this.goals.get(goalId);
      if (state) {
        const event: GoalProgressEvent = {
          goalId,
          type: state.goal.type,
          current: newCurrent,
          previousValue: state.goal.current,
          timestamp: Date.now()
        };
        this.handleGoalUpdate(event);
        console.log(`Updated ${goalId} to ${newCurrent}/${state.goal.target}`);
      } else {
        console.log(`Goal ${goalId} not found`);
      }
    };

    goalLogger.info('Debug functions registered: debugGoalTracker(), testGoal(), setGoal(), updateGoalProgress()');
  }
}
