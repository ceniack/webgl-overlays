/**
 * TypeScript interfaces for component system
 * Defines contracts for atomic design components
 */

import type { ComponentData } from './streamerbot';

// Base component interface
export interface Component {
  readonly elementId: string;
  readonly container: HTMLElement;
  isInitialized: boolean;
  data?: ComponentData;

  initialize(): Promise<void>;
  updateData(data: Partial<ComponentData>): void;
  destroy(): void;
}

// Component configuration
export interface ComponentConfig {
  name: string;
  path: string;
  data?: Record<string, unknown>;
  dependencies?: string[];
  autoUpdate?: boolean;
  updateInterval?: number;
}

// Element (Atomic) Component
export interface ElementComponent extends Component {
  readonly type: 'element';
  getValue(): string | number | boolean;
  setValue(value: string | number | boolean): void;
}

// Feature (Molecular) Component
export interface FeatureComponent extends Component {
  readonly type: 'feature';
  readonly elements: ElementComponent[];
  addElement(element: ElementComponent): void;
  removeElement(elementId: string): void;
}

// Section (Organism) Component
export interface SectionComponent extends Component {
  readonly type: 'section';
  readonly features: FeatureComponent[];
  readonly elements: ElementComponent[];
  addFeature(feature: FeatureComponent): void;
  addElement(element: ElementComponent): void;
}

// Layout (Template) Component
export interface LayoutComponent {
  readonly type: 'layout';
  readonly sections: SectionComponent[];
  readonly config: LayoutConfig;
  render(): Promise<HTMLElement>;
  compose(components: ComponentConfig[]): Promise<void>;
}

// Layout configuration
export interface LayoutConfig {
  name: string;
  width: number;
  height: number;
  theme: string;
  sections: ComponentConfig[];
}

// Component composition
export interface ComponentComposer {
  addComponent(config: ComponentConfig): Promise<Component>;
  removeComponent(componentId: string): void;
  updateComponent(componentId: string, data: Partial<ComponentData>): void;
  getComponents(): Component[];
  getComponent(componentId: string): Component | undefined;
}

// Component registry for dependency injection
export interface ComponentRegistry {
  register<T extends Component>(name: string, factory: ComponentFactory<T>): void;
  create<T extends Component>(name: string, config: ComponentConfig): Promise<T>;
  has(name: string): boolean;
  list(): string[];
}

export type ComponentFactory<T extends Component> = (config: ComponentConfig) => Promise<T>;