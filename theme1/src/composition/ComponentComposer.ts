/**
 * ComponentComposer - Component composition and orchestration system
 * Handles registration and lifecycle management of overlay components
 * Optimized for OBS Browser Source compatibility
 */

import type {
  Component,
  ComponentConfig,
  ComponentComposer as IComponentComposer,
  ComponentRegistry as IComponentRegistry,
  ComponentFactory,
  ComponentData
} from '../types';

import { BroadcasterInfo } from '../components/sections/BroadcasterInfo/BroadcasterInfo';
import { CounterCarousel } from '../components/sections/CounterCarousel/CounterCarousel';
import { HealthMonitor } from '../components/sections/HealthMonitor/HealthMonitor';
import { logger } from '../js/Logger';

const composerLogger = logger.createChildLogger('ComponentComposer');

import { AlertFeed } from '../components/sections/AlertFeed/AlertFeed';
import { LatestEvent } from '../components/sections/LatestEvent/LatestEvent';
import type { AlertFeedConfig, LatestEventConfig } from '../types/alerts';

// Components available but not yet integrated into overlay:
// import { GoalTracker } from '../components/sections/GoalTracker/GoalTracker';
// import { RecentActivity } from '../components/sections/RecentActivity/RecentActivity';

/**
 * Registry for component factories
 * Maps component names to factory functions that create component instances
 */
export class ComponentRegistry implements IComponentRegistry {
  private factories = new Map<string, ComponentFactory<Component>>();

  /**
   * Register a component factory by name
   * @param name - Unique name for the component type
   * @param factory - Factory function that creates component instances
   */
  register<T extends Component>(name: string, factory: ComponentFactory<T>): void {
    this.factories.set(name, factory as ComponentFactory<Component>);
    composerLogger.debug(`Registered component factory: ${name}`);
  }

  /**
   * Create a component instance using its registered factory
   * @param name - Name of the registered component type
   * @param config - Configuration for the component instance
   * @returns Promise resolving to the created component
   * @throws Error if component factory is not registered
   */
  async create<T extends Component>(name: string, config: ComponentConfig): Promise<T> {
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Component factory not found: ${name}`);
    }
    return factory(config) as Promise<T>;
  }

  /**
   * Check if a component factory is registered
   * @param name - Name to check
   */
  has(name: string): boolean {
    return this.factories.has(name);
  }

  /**
   * Get list of all registered component names
   */
  list(): string[] {
    return Array.from(this.factories.keys());
  }
}

/**
 * ComponentComposer - Main orchestration class for overlay components
 *
 * Responsibilities:
 * - Register component factories
 * - Create and manage component instances
 * - Track component lifecycle
 *
 * Usage:
 * ```typescript
 * const composer = new ComponentComposer();
 * const component = await composer.addComponent({
 *   name: 'BroadcasterInfo',
 *   path: '.branding-section'
 * });
 * await component.initialize();
 * ```
 */
export class ComponentComposer implements IComponentComposer {
  private components = new Map<string, Component>();
  private registry: IComponentRegistry;

  constructor() {
    this.registry = new ComponentRegistry();
    this.setupDefaultComponents();
  }

  /**
   * Add and register a component instance
   * @param config - Component configuration with name and container path
   * @returns Promise resolving to the created component
   * @throws Error if component factory is not registered or container not found
   */
  async addComponent(config: ComponentConfig): Promise<Component> {
    composerLogger.debug(`Adding component: ${config.name} (${config.path})`);

    if (!this.registry.has(config.name)) {
      throw new Error(`Component not registered: ${config.name}`);
    }

    const component = await this.registry.create(config.name, config);
    this.components.set(component.elementId, component);
    return component;
  }

  /**
   * Remove a component and call its destroy method
   * @param componentId - ID of the component to remove
   */
  removeComponent(componentId: string): void {
    const component = this.components.get(componentId);
    if (component) {
      component.destroy();
      this.components.delete(componentId);
      composerLogger.debug(`Removed component: ${componentId}`);
    }
  }

  /**
   * Update a component's data
   * @param componentId - ID of the component to update
   * @param data - Partial data to update
   */
  updateComponent(componentId: string, data: Partial<ComponentData>): void {
    const component = this.components.get(componentId);
    if (component) {
      component.updateData(data);
    }
  }

  /**
   * Get all managed components
   * @returns Array of all registered component instances
   */
  getComponents(): Component[] {
    return Array.from(this.components.values());
  }

  /**
   * Get a specific component by ID
   * @param componentId - ID of the component to retrieve
   * @returns Component instance or undefined if not found
   */
  getComponent(componentId: string): Component | undefined {
    return this.components.get(componentId);
  }

  /**
   * Register default component factories
   * Called automatically during construction
   */
  private setupDefaultComponents(): void {
    // Register TypeScript component factories
    this.registry.register('BroadcasterInfo', async (config: ComponentConfig) => {
      const container = document.querySelector(config.path) as HTMLElement;
      if (!container) {
        throw new Error(`Container not found for BroadcasterInfo: ${config.path}`);
      }
      return new BroadcasterInfo(container) as unknown as Component;
    });

    this.registry.register('CounterCarousel', async (config: ComponentConfig) => {
      const container = document.querySelector(config.path) as HTMLElement;
      if (!container) {
        throw new Error(`Container not found for CounterCarousel: ${config.path}`);
      }
      return CounterCarousel.getInstance(container) as unknown as Component;
    });

    this.registry.register('HealthMonitor', async (config: ComponentConfig) => {
      const container = document.querySelector(config.path) as HTMLElement;
      if (!container) {
        throw new Error(`Container not found for HealthMonitor: ${config.path}`);
      }
      return new HealthMonitor(container) as unknown as Component;
    });

    this.registry.register('AlertFeed', async (config: ComponentConfig) => {
      const container = document.querySelector(config.path) as HTMLElement;
      if (!container) {
        throw new Error(`Container not found for AlertFeed: ${config.path}`);
      }
      return new AlertFeed(container, config.data as Partial<AlertFeedConfig>) as unknown as Component;
    });

    this.registry.register('LatestEvent', async (config: ComponentConfig) => {
      const container = document.querySelector(config.path) as HTMLElement;
      if (!container) {
        throw new Error(`Container not found for LatestEvent: ${config.path}`);
      }
      return new LatestEvent(container, config.data as Partial<LatestEventConfig>) as unknown as Component;
    });

    // Components available but not yet integrated:
    // GoalTracker, RecentActivity

    composerLogger.info('ComponentComposer initialized with factories:', this.registry.list());
  }
}
