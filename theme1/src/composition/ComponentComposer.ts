/**
 * ComponentComposer - Custom component composition system
 * Handles loading, caching, and composing components for OBS overlays
 * Optimized for performance and OBS Browser Source compatibility
 */

import type {
  Component,
  ComponentConfig,
  ComponentComposer as IComponentComposer,
  ComponentLoader as IComponentLoader,
  ComponentRegistry as IComponentRegistry,
  ComponentFactory,
  LayoutConfig,
  ComponentData
} from '../types';

import { BroadcasterInfo } from '../components/sections/BroadcasterInfo/BroadcasterInfo';
import { CounterCarousel } from '../components/sections/CounterCarousel/CounterCarousel';
import { HealthMonitor } from '../components/sections/HealthMonitor/HealthMonitor';
// Components available but not yet integrated into overlay:
// import { AlertFeed } from '../components/sections/AlertFeed/AlertFeed';
// import { GoalTracker } from '../components/sections/GoalTracker/GoalTracker';
// import { RecentActivity } from '../components/sections/RecentActivity/RecentActivity';

interface ComponentModule {
  html: string;
  css: string;
  js: string;
}

interface ComponentCache {
  [path: string]: ComponentModule;
}

export class ComponentLoader implements IComponentLoader {
  private cache: ComponentCache = {};

  async loadComponent<T extends Component>(config: ComponentConfig): Promise<T> {
    const componentModule = await this.loadComponentModule(config.path);
    return this.instantiateComponent<T>(componentModule, config);
  }

  async loadHTML(path: string): Promise<string> {
    const response = await fetch(`/component/${path}/${path}.html`);
    if (!response.ok) {
      throw new Error(`Failed to load HTML for ${path}: ${response.statusText}`);
    }
    return response.text();
  }

  async loadCSS(path: string): Promise<string> {
    const response = await fetch(`/component/${path}/${path}.css`);
    if (!response.ok) {
      throw new Error(`Failed to load CSS for ${path}: ${response.statusText}`);
    }
    return response.text();
  }

  async loadJS(path: string): Promise<string> {
    const response = await fetch(`/component/${path}/${path}.js`);
    if (!response.ok) {
      throw new Error(`Failed to load JS for ${path}: ${response.statusText}`);
    }
    return response.text();
  }

  private async loadComponentModule(path: string): Promise<ComponentModule> {
    // Check cache first
    if (this.cache[path]) {
      return this.cache[path];
    }

    console.log(`📦 Loading component module: ${path}`);

    // Load HTML, CSS, JS in parallel
    const [html, css, js] = await Promise.all([
      this.loadHTML(path),
      this.loadCSS(path),
      this.loadJS(path)
    ]);

    const module: ComponentModule = { html, css, js };
    this.cache[path] = module;

    return module;
  }

  private instantiateComponent<T extends Component>(module: ComponentModule, config: ComponentConfig): Promise<T> {
    // For now, this would integrate with the existing HTML/CSS/JS pattern
    // In a full implementation, this would parse the module and create component instances
    throw new Error('Component instantiation not yet implemented - use legacy components for now');
  }
}

export class ComponentRegistry implements IComponentRegistry {
  private factories = new Map<string, ComponentFactory<any>>();

  register<T extends Component>(name: string, factory: ComponentFactory<T>): void {
    this.factories.set(name, factory);
    console.log(`📦 Registered component factory: ${name}`);
  }

  async create<T extends Component>(name: string, config: ComponentConfig): Promise<T> {
    const factory = this.factories.get(name);
    if (!factory) {
      throw new Error(`Component factory not found: ${name}`);
    }
    return factory(config);
  }

  has(name: string): boolean {
    return this.factories.has(name);
  }

  list(): string[] {
    return Array.from(this.factories.keys());
  }
}

export class ComponentComposer implements IComponentComposer {
  private components = new Map<string, Component>();
  private loader: IComponentLoader;
  private registry: IComponentRegistry;
  private updateCallbacks = new Map<string, ((data: Partial<ComponentData>) => void)[]>();

  constructor() {
    this.loader = new ComponentLoader();
    this.registry = new ComponentRegistry();
    this.setupDefaultComponents();
  }

  async addComponent(config: ComponentConfig): Promise<Component> {
    console.log(`📦 Adding component: ${config.name} (${config.path})`);

    // Check if component is already registered in registry
    if (this.registry.has(config.name)) {
      const component = await this.registry.create(config.name, config);
      this.components.set(component.elementId, component);
      return component;
    }

    // Fallback to loader for legacy components
    const component = await this.loader.loadComponent(config);
    this.components.set(component.elementId, component);
    return component;
  }

  removeComponent(componentId: string): void {
    const component = this.components.get(componentId);
    if (component) {
      component.destroy();
      this.components.delete(componentId);
      console.log(`📦 Removed component: ${componentId}`);
    }
  }

  updateComponent(componentId: string, data: Partial<ComponentData>): void {
    const component = this.components.get(componentId);
    if (component) {
      component.updateData(data);

      // Notify any update callbacks
      const callbacks = this.updateCallbacks.get(componentId) || [];
      callbacks.forEach(callback => callback(data));
    }
  }

  async composeLayout(layout: LayoutConfig): Promise<HTMLElement> {
    console.log(`📦 Composing layout: ${layout.name}`);

    // Create main layout container
    const layoutContainer = document.createElement('div');
    layoutContainer.className = `layout layout-${layout.name}`;
    layoutContainer.style.width = `${layout.width}px`;
    layoutContainer.style.height = `${layout.height}px`;

    // Load and add each section component
    for (const sectionConfig of layout.sections) {
      try {
        const component = await this.addComponent(sectionConfig);
        await component.initialize();

        // Add component's container to layout
        layoutContainer.appendChild(component.container);

        console.log(`📦 Added component to layout: ${sectionConfig.name}`);
      } catch (error) {
        console.error(`📦 Failed to add component ${sectionConfig.name}:`, error);
      }
    }

    return layoutContainer;
  }

  // Subscribe to component updates
  subscribe(componentId: string, callback: (data: Partial<ComponentData>) => void): void {
    if (!this.updateCallbacks.has(componentId)) {
      this.updateCallbacks.set(componentId, []);
    }
    this.updateCallbacks.get(componentId)!.push(callback);
  }

  unsubscribe(componentId: string): void {
    this.updateCallbacks.delete(componentId);
  }

  // Broadcast updates to all components
  broadcast(data: Partial<ComponentData>): void {
    this.components.forEach(component => {
      component.updateData(data);
    });
  }

  // Broadcast to specific component
  broadcastToComponent(componentId: string, data: Partial<ComponentData>): void {
    this.updateComponent(componentId, data);
  }

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

    // Components available but not yet integrated:
    // AlertFeed, GoalTracker, RecentActivity

    console.log('📦 ComponentComposer initialized with component factories:', this.registry.list());
  }

  // Get all managed components
  getComponents(): Component[] {
    return Array.from(this.components.values());
  }

  // Get specific component by ID
  getComponent(componentId: string): Component | undefined {
    return this.components.get(componentId);
  }
}