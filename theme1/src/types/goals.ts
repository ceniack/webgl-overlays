/**
 * Goal System Type Definitions
 * Types for stream goal tracking (followers, subs, bits, donations)
 */

export type GoalType = 'follower' | 'sub' | 'bit' | 'donation' | 'custom';

/**
 * Stream goal definition
 */
export interface StreamGoal {
  /** Unique goal identifier */
  id: string;
  /** Type of goal */
  type: GoalType;
  /** Current progress value */
  current: number;
  /** Target value */
  target: number;
  /** Display label for the goal */
  label: string;
  /** Whether goal is currently active */
  isActive: boolean;
  /** Start timestamp */
  startedAt?: number;
  /** End timestamp (if completed) */
  completedAt?: number;
}

/**
 * Event emitted when a goal's progress updates
 */
export interface GoalUpdateEvent {
  /** Goal ID */
  goalId: string;
  /** Goal type */
  type: GoalType;
  /** New current value */
  current: number;
  /** Target value (may change) */
  target?: number;
  /** Previous value (for delta calculation) */
  previousValue?: number;
  /** Unix timestamp */
  timestamp: number;
}

/**
 * Event emitted when a goal is completed
 */
export interface GoalCompletedEvent {
  /** Goal ID */
  goalId: string;
  /** Goal type */
  type: GoalType;
  /** Final value achieved */
  finalValue: number;
  /** Original target */
  target: number;
  /** Unix timestamp */
  timestamp: number;
}

/**
 * Configuration for GoalTracker component
 */
export interface GoalTrackerConfig {
  /** Maximum number of goals to display */
  maxGoals: number;
  /** Whether to animate progress changes */
  animateProgress: boolean;
  /** Animation duration in milliseconds */
  animationDuration: number;
  /** Whether to show milestone celebrations */
  showMilestones: boolean;
  /** Milestone percentages to celebrate (e.g., [25, 50, 75, 100]) */
  milestoneThresholds: number[];
  /** Display layout */
  layout: 'vertical' | 'horizontal';
  /** Whether to show percentage */
  showPercentage: boolean;
  /** Whether to show values (current/target) */
  showValues: boolean;
  /** Goal variable prefix in Streamer.bot */
  variablePrefix: string;
}

/**
 * Milestone event when a threshold is reached
 */
export interface GoalMilestoneEvent {
  /** Goal ID */
  goalId: string;
  /** Goal type */
  type: GoalType;
  /** Milestone percentage reached */
  milestone: number;
  /** Current value */
  current: number;
  /** Target value */
  target: number;
  /** Unix timestamp */
  timestamp: number;
}

/**
 * Mapping of Streamer.bot variable names to goal properties
 */
export interface GoalVariableMapping {
  /** Variable name for current value */
  currentVar: string;
  /** Variable name for target value */
  targetVar: string;
  /** Variable name for label */
  labelVar?: string;
  /** Variable name for active state */
  activeVar?: string;
}

/**
 * Goal display state for rendering
 */
export interface GoalDisplayState {
  /** Goal data */
  goal: StreamGoal;
  /** Progress percentage (0-100) */
  percentage: number;
  /** Whether currently animating */
  isAnimating: boolean;
  /** Previous percentage (for animation) */
  previousPercentage: number;
  /** Last milestone reached */
  lastMilestone?: number;
}
