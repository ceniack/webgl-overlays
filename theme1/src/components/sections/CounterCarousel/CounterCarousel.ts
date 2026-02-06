/**
 * CounterCarousel Section Component
 * Uses Splide.js for carousel functionality
 * Integrates with Streamer.bot for real-time counter updates
 */

import Splide from '@splidejs/splide';
import type {
  SectionComponent,
  ComponentData,
  CounterData,
  CounterCollection,
  StreamerbotGlobalVariableEvent
} from '../../../types';

import { eventBus } from '../../../js/EventBus';
import { EVENT_TYPES } from '../../../js/EventConstants';
import { logger } from '../../../js/Logger';

const componentLogger = logger.createChildLogger('CounterCarousel');

export interface CounterConfig {
  valueVariable: string;
  labelVariable: string;
  toggleVariable: string;
  defaultValue: number;
  defaultLabel: string;
  defaultVisible: boolean;
}

export interface CounterCarouselConfig {
  counter1: CounterConfig;
  counter2: CounterConfig;
  counter3: CounterConfig;
  counter4: CounterConfig;
}

export interface SplideOptions {
  type: 'loop' | 'slide' | 'fade';
  autoplay: boolean;
  interval: number;
  pauseOnHover: boolean;
  arrows: boolean;
  pagination: boolean;
  speed: number;
  rewind: boolean;
}

export class CounterCarousel implements SectionComponent {
  // Static guard to prevent multiple instances
  private static instance: CounterCarousel | null = null;

  public readonly type = 'section' as const;
  public readonly elementId: string;
  public readonly container: HTMLElement;
  public isInitialized = false;
  public data?: ComponentData;
  public readonly features: any[] = [];
  public readonly elements: any[] = [];

  private client: any = null;
  private isConnected = false;
  private config: CounterCarouselConfig;
  private splide: Splide | null = null;
  private splideOptions: SplideOptions;
  private counterVisibility: Record<string, boolean> = {};
  private resizeObserver: ResizeObserver | null = null;

  /**
   * Static factory method - returns existing instance if one exists
   */
  static getInstance(container: HTMLElement, config?: Partial<CounterCarouselConfig>): CounterCarousel {
    if (CounterCarousel.instance) {
      componentLogger.warn('CounterCarousel already exists, returning existing instance');
      return CounterCarousel.instance;
    }
    return new CounterCarousel(container, config);
  }

  constructor(container: HTMLElement, config?: Partial<CounterCarouselConfig>) {
    // Check if instance already exists (for direct constructor calls)
    if (CounterCarousel.instance) {
      componentLogger.warn('CounterCarousel already exists, use getInstance() instead');
      // Copy properties from existing instance to satisfy TypeScript
      this.container = CounterCarousel.instance.container;
      this.elementId = CounterCarousel.instance.elementId;
      this.config = CounterCarousel.instance.config;
      this.splideOptions = CounterCarousel.instance.splideOptions;
      this.isInitialized = CounterCarousel.instance.isInitialized;
      return;
    }

    CounterCarousel.instance = this;

    this.container = container;
    this.elementId = container.id || `counter-carousel-${Date.now()}`;

    this.config = {
      counter1: {
        valueVariable: 'counter1',
        labelVariable: 'counter1label',
        toggleVariable: 'counter1toggle',
        defaultValue: 0,
        defaultLabel: 'Counter 1',
        defaultVisible: true
      },
      counter2: {
        valueVariable: 'counter2',
        labelVariable: 'counter2label',
        toggleVariable: 'counter2toggle',
        defaultValue: 0,
        defaultLabel: 'Counter 2',
        defaultVisible: true
      },
      counter3: {
        valueVariable: 'counter3',
        labelVariable: 'counter3label',
        toggleVariable: 'counter3toggle',
        defaultValue: 0,
        defaultLabel: 'Counter 3',
        defaultVisible: true
      },
      counter4: {
        valueVariable: 'counter4',
        labelVariable: 'counter4label',
        toggleVariable: 'counter4toggle',
        defaultValue: 0,
        defaultLabel: 'Counter 4',
        defaultVisible: true
      },
      ...config
    };

    // Initialize visibility state
    Object.keys(this.config).forEach(counterId => {
      const cfg = this.config[counterId as keyof CounterCarouselConfig];
      this.counterVisibility[counterId] = cfg.defaultVisible;
    });

    // Splide configuration
    this.splideOptions = {
      type: 'loop',
      autoplay: true,
      interval: 5000,
      pauseOnHover: true,
      arrows: false,
      pagination: false, // We'll use custom indicators
      speed: 500,
      rewind: true
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      componentLogger.debug('Already initialized, skipping');
      return;
    }

    componentLogger.info('Initializing with Splide.js...');

    // Build carousel HTML structure
    this.buildCarouselStructure();

    // Initialize Splide carousel
    this.initializeSplide();

    // Connect to Streamer.bot
    await this.connectToStreamerbot();

    // Subscribe to eventBus for counter updates
    this.setupEventBusListeners();

    // Set up debug functions
    this.setupDebugFunctions();

    this.isInitialized = true;
    componentLogger.info('Initialized successfully with Splide');
  }

  private buildCarouselStructure(): void {
    // Find or create the carousel container
    const carouselContainer = this.container.querySelector('#stats-carousel-container') ||
                              this.container.querySelector('.carousel-container') ||
                              this.container.querySelector('.section-content');

    if (!carouselContainer) {
      componentLogger.error('Could not find carousel container element');
      return;
    }

    // Clear existing content - remove legacy carousel elements
    carouselContainer.innerHTML = '';

    // Remove carousel-container class to avoid legacy CSS conflicts
    carouselContainer.classList.remove('carousel-container');
    carouselContainer.classList.add('splide-container');

    // Create Splide structure — dimensions handled by CSS (.counter-splide class)
    const splideRoot = document.createElement('div');
    splideRoot.className = 'splide counter-splide';
    splideRoot.id = 'counter-splide';

    const splideTrack = document.createElement('div');
    splideTrack.className = 'splide__track';

    const splideList = document.createElement('ul');
    splideList.className = 'splide__list';

    // Create slides for each counter
    Object.keys(this.config).forEach(counterId => {
      const cfg = this.config[counterId as keyof CounterCarouselConfig];
      const slide = this.createCounterSlide(counterId, cfg);
      splideList.appendChild(slide);
    });

    splideTrack.appendChild(splideList);
    splideRoot.appendChild(splideTrack);
    carouselContainer.appendChild(splideRoot);

    // Update indicators in header
    this.updateIndicators();

    componentLogger.debug('Splide carousel structure built');
  }

  private createCounterSlide(counterId: string, config: CounterConfig): HTMLLIElement {
    const slide = document.createElement('li');
    slide.className = 'splide__slide counter-slide';
    slide.dataset.counterId = counterId;

    const content = document.createElement('div');
    content.className = 'counter-content';

    const valueEl = document.createElement('div');
    valueEl.className = 'counter-value-large';
    valueEl.id = `carousel-${counterId}-value`;
    valueEl.dataset.counterId = counterId;
    valueEl.dataset.counterType = 'value';
    valueEl.textContent = String(config.defaultValue);

    const labelEl = document.createElement('div');
    labelEl.className = 'counter-label-large';
    labelEl.id = `carousel-${counterId}-label`;
    labelEl.dataset.counterId = counterId;
    labelEl.dataset.counterType = 'label';
    labelEl.textContent = config.defaultLabel;

    content.appendChild(valueEl);
    content.appendChild(labelEl);
    slide.appendChild(content);

    return slide;
  }

  private initializeSplide(): void {
    const splideElement = this.container.querySelector('#counter-splide') as HTMLElement;
    if (!splideElement) {
      componentLogger.error('Splide element not found');
      return;
    }

    // Ensure the splide element has proper dimensions before mounting
    const containerRect = splideElement.parentElement?.getBoundingClientRect();
    componentLogger.debug(`Container dimensions: ${containerRect?.width} x ${containerRect?.height}`);

    try {
      this.splide = new Splide(splideElement, {
        type: this.splideOptions.type,
        autoplay: this.splideOptions.autoplay,
        interval: this.splideOptions.interval,
        pauseOnHover: this.splideOptions.pauseOnHover,
        arrows: this.splideOptions.arrows,
        pagination: this.splideOptions.pagination,
        speed: this.splideOptions.speed,
        rewind: this.splideOptions.rewind,
        // Explicit sizing — height controlled by CSS
        width: '100%',
        gap: 0,
        padding: 0,
        // Fix for slide width calculation
        perPage: 1,
        perMove: 1,
        // Accessibility
        i18n: {
          prev: 'Previous counter',
          next: 'Next counter',
          first: 'Go to first counter',
          last: 'Go to last counter',
          slideX: 'Go to counter %s',
          pageX: 'Go to page %s',
        }
      });

      // Listen for slide changes to update indicators
      this.splide.on('moved', (newIndex: number) => {
        this.updateActiveIndicator(newIndex);
      });

      // Log when ready
      this.splide.on('mounted', () => {
        componentLogger.debug('Splide mounted event fired');
        const track = splideElement.querySelector('.splide__track') as HTMLElement;
        const list = splideElement.querySelector('.splide__list') as HTMLElement;
        componentLogger.debug(`Track dimensions: ${track?.offsetWidth} x ${track?.offsetHeight}`);
        componentLogger.debug(`List transform: ${list?.style.transform}`);
      });

      this.splide.mount();
      componentLogger.debug('Splide carousel mounted successfully');

      // Force a refresh after a short delay to ensure dimensions are correct
      setTimeout(() => {
        if (this.splide) {
          this.splide.refresh();
          componentLogger.debug('Splide refreshed after mount');
        }
      }, 100);

      // Watch for container resizes (e.g. editor cell resize) and refresh Splide
      this.resizeObserver = new ResizeObserver(() => {
        if (this.splide) {
          this.splide.refresh();
        }
      });
      this.resizeObserver.observe(splideElement);

      // Set initial indicator
      this.updateActiveIndicator(0);
    } catch (error) {
      componentLogger.error('Failed to initialize Splide:', error);
    }
  }

  private updateIndicators(): void {
    const indicatorsContainer = this.container.querySelector('#carousel-indicators') ||
                                 this.container.querySelector('.carousel-indicators');
    if (!indicatorsContainer) return;

    indicatorsContainer.innerHTML = '';

    const visibleCounters = Object.keys(this.config).filter(
      counterId => this.counterVisibility[counterId]
    );

    visibleCounters.forEach((counterId, index) => {
      const indicator = document.createElement('div');
      indicator.className = 'indicator';
      indicator.dataset.slide = String(index);
      indicator.dataset.counterId = counterId;

      // Click to go to slide
      indicator.addEventListener('click', () => {
        if (this.splide) {
          this.splide.go(index);
        }
      });

      indicatorsContainer.appendChild(indicator);
    });
  }

  private updateActiveIndicator(activeIndex: number): void {
    const indicators = this.container.querySelectorAll('.indicator');
    indicators.forEach((indicator, index) => {
      indicator.classList.toggle('active', index === activeIndex);
    });
  }

  updateData(data: Partial<ComponentData>): void {
    if (data.counters) {
      this.updateFromCounterData(data.counters);
    }
  }

  destroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    if (this.splide) {
      this.splide.destroy();
      this.splide = null;
    }

    if (this.client) {
      this.client.disconnect?.();
    }

    // Remove debug functions
    if (typeof window !== 'undefined') {
      delete (window as any).counterCarouselComponent;
      delete (window as any).debugCounters;
      delete (window as any).testCounterValues;
      delete (window as any).testCounterLabels;
      delete (window as any).testCounterVisibility;
    }

    // Reset static singleton guard
    CounterCarousel.instance = null;

    this.isInitialized = false;
  }

  addFeature(feature: any): void {
    this.features.push(feature);
  }

  addElement(element: any): void {
    this.elements.push(element);
  }

  private setupEventBusListeners(): void {
    componentLogger.debug('Setting up eventBus listeners for counter updates');

    // Listen for counter updates from streamerbot-integration
    eventBus.on(EVENT_TYPES.COUNTER_UPDATE, (data: any) => {
      componentLogger.debug('EventBus COUNTER_UPDATE received:', data);
      if (data?.counterName) {
        // Handle different update types
        if (data.isLabel) {
          this.handleLabelUpdate(data.counterName, data.value);
        } else if (data.isToggle) {
          this.handleToggleUpdate(data.counterName, data.value);
        } else {
          this.handleValueUpdate(data.counterName, data.value);
        }
      }
    });
  }

  private handleValueUpdate(variableName: string, value: any): void {
    Object.keys(this.config).forEach(counterId => {
      const config = this.config[counterId as keyof CounterCarouselConfig];
      if (variableName === config.valueVariable) {
        this.updateCounterValue(counterId, value);
      }
    });
  }

  private handleLabelUpdate(variableName: string, value: string): void {
    Object.keys(this.config).forEach(counterId => {
      const config = this.config[counterId as keyof CounterCarouselConfig];
      if (variableName === config.labelVariable) {
        this.updateCounterLabel(counterId, value);
      }
    });
  }

  private handleToggleUpdate(variableName: string, value: any): void {
    Object.keys(this.config).forEach(counterId => {
      const config = this.config[counterId as keyof CounterCarouselConfig];
      if (variableName === config.toggleVariable) {
        this.setCounterVisibility(counterId, value);
      }
    });
  }

  private async connectToStreamerbot(): Promise<void> {
    const windowAny = window as any;

    // Use existing global client
    if (windowAny.streamerbotClient) {
      componentLogger.debug('Using existing global Streamer.bot client');
      this.client = windowAny.streamerbotClient;
      this.isConnected = true;
      this.setupEventHandlers();
      this.requestInitialData();
      return;
    }

    const ClientClass = this.getStreamerbotClientClass();

    if (!ClientClass) {
      componentLogger.error('Streamer.bot client not found');
      return;
    }

    try {
      const config = {
        host: '127.0.0.1',
        port: 8080,
        endpoint: '/',
        immediate: false,
        autoReconnect: true,
        retries: 5,
        retryInterval: 2000
      };

      componentLogger.debug('Creating new Streamer.bot client');
      this.client = new ClientClass(config);
      this.setupEventHandlers();
      this.client.connect();

      setTimeout(() => {
        if (!this.isConnected) {
          componentLogger.error('CONNECTION TIMEOUT: Streamer.bot not responding');
        }
      }, 10000);
    } catch (error) {
      componentLogger.error('FAILED TO CONNECT to Streamer.bot:', error);
    }
  }

  private getStreamerbotClientClass(): any {
    if (typeof window === 'undefined') return null;
    const windowAny = window as any;
    return windowAny.StreamerbotClient || windowAny.Streamerbot?.Client || null;
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('WebsocketClient.Open', () => {
      this.isConnected = true;
      componentLogger.info('Connected to Streamer.bot');
      this.requestInitialData();
    });

    this.client.on('WebsocketClient.Close', () => {
      this.isConnected = false;
      componentLogger.info('Disconnected from Streamer.bot');
    });
  }

  private async requestInitialData(): Promise<void> {
    if (!this.client || !this.isConnected) return;

    componentLogger.debug('Requesting initial counter data...');

    const variables: string[] = [];
    Object.keys(this.config).forEach(counterId => {
      const config = this.config[counterId as keyof CounterCarouselConfig];
      variables.push(config.valueVariable, config.labelVariable, config.toggleVariable);
    });

    for (const variable of variables) {
      try {
        const response = await this.client.getGlobal(variable);
        if (response?.variable !== undefined) {
          const actualValue = response.variable.value !== undefined
            ? response.variable.value
            : response.variable;
          componentLogger.debug(`Got initial ${variable} = ${actualValue}`);
          this.updateCounterFromGlobalVariable(variable, actualValue);
        }
      } catch (error) {
        componentLogger.warn(`Failed to get initial ${variable}:`, error);
      }
    }
  }

  private updateFromCounterData(counters: CounterCollection): void {
    Object.keys(counters).forEach(counterId => {
      const counterData = counters[counterId as keyof CounterCollection];
      if (counterData) {
        this.updateCounterValue(counterId, counterData.value);
        this.updateCounterLabel(counterId, counterData.label);
        this.setCounterVisibility(counterId, counterData.isVisible);
      }
    });
  }

  private updateCounterFromGlobalVariable(variableName: string, variableValue: string | number | boolean): void {
    Object.keys(this.config).forEach(counterId => {
      const config = this.config[counterId as keyof CounterCarouselConfig];

      if (variableName === config.valueVariable) {
        this.updateCounterValue(counterId, variableValue);
      } else if (variableName === config.labelVariable) {
        this.updateCounterLabel(counterId, String(variableValue));
      } else if (variableName === config.toggleVariable) {
        this.setCounterVisibility(counterId, variableValue);
      }
    });
  }

  private updateCounterValue(counterId: string, value: string | number | boolean): void {
    const displayValue = value === undefined || value === null || value === 'undefined' ? '0' : String(value);

    // Update ALL matching elements (including Splide clones in loop mode)
    // Splide clones slides for seamless looping, so we need querySelectorAll
    const carouselElements = document.querySelectorAll(`[data-counter-id="${counterId}"][data-counter-type="value"]`) as NodeListOf<HTMLElement>;
    const originalElement = document.querySelector(`#counter-${counterId}`) as HTMLElement;

    if (carouselElements.length > 0) {
      carouselElements.forEach(el => {
        el.textContent = displayValue;
      });
      componentLogger.debug(`Updated carousel ${counterId} value: ${displayValue} (${carouselElements.length} elements)`);
    }
    if (originalElement) {
      originalElement.textContent = displayValue;
    }
  }

  private updateCounterLabel(counterId: string, label: string): void {
    const config = this.config[counterId as keyof CounterCarouselConfig];
    const displayLabel = label || config.defaultLabel;

    // Update ALL matching elements (including Splide clones in loop mode)
    // Splide clones slides for seamless looping, so we need querySelectorAll
    const carouselElements = document.querySelectorAll(`[data-counter-id="${counterId}"][data-counter-type="label"]`) as NodeListOf<HTMLElement>;
    const originalElement = document.querySelector(`#${counterId}-label`) as HTMLElement;

    if (carouselElements.length > 0) {
      carouselElements.forEach(el => {
        el.textContent = displayLabel;
      });
      componentLogger.debug(`Updated carousel ${counterId} label: ${displayLabel} (${carouselElements.length} elements)`);
    }
    if (originalElement) {
      originalElement.textContent = displayLabel;
    }
  }

  private setCounterVisibility(counterId: string, visible: string | number | boolean): void {
    let isVisible = true;
    if (typeof visible === 'boolean') {
      isVisible = visible;
    } else if (typeof visible === 'string') {
      isVisible = visible.toLowerCase() !== 'false' && visible !== '0' && visible !== '';
    } else if (typeof visible === 'number') {
      isVisible = visible !== 0;
    }

    this.counterVisibility[counterId] = isVisible;

    // Find the Splide slide for this counter — use CSS class for visibility
    const slide = this.container.querySelector(`.splide__slide[data-counter-id="${counterId}"]`) as HTMLElement;
    const counterBox = document.querySelector(`#${counterId}-box`) as HTMLElement;

    if (slide) {
      slide.classList.toggle('is-hidden', !isVisible);
      componentLogger.debug(`Set carousel ${counterId} visibility: ${isVisible}`);
    }
    if (counterBox) {
      counterBox.classList.toggle('is-hidden', !isVisible);
    }

    // Refresh Splide to handle hidden slides
    if (this.splide) {
      this.splide.refresh();
    }

    // Update indicators
    this.updateIndicators();
  }

  // Public methods for testing
  public testCounterValues(): void {
    componentLogger.debug('Testing counter values...');
    this.updateCounterValue('counter1', Math.floor(Math.random() * 1000));
    this.updateCounterValue('counter2', Math.floor(Math.random() * 500));
    this.updateCounterValue('counter3', Math.floor(Math.random() * 10000));
    this.updateCounterValue('counter4', Math.floor(Math.random() * 100));
  }

  public testCounterLabels(): void {
    componentLogger.debug('Testing counter labels...');
    const labels = ['Follows', 'Subs', 'Cheers', 'Raids'];
    Object.keys(this.config).forEach((counterId, index) => {
      this.updateCounterLabel(counterId, labels[index]);
    });
  }

  public testCounterVisibility(): void {
    componentLogger.debug('Testing counter visibility...');
    Object.keys(this.config).forEach((counterId) => {
      this.setCounterVisibility(counterId, Math.random() > 0.3);
    });
  }

  public goToSlide(index: number): void {
    if (this.splide) {
      this.splide.go(index);
    }
  }

  public pauseAutoplay(): void {
    if (this.splide && this.splide.Components.Autoplay) {
      this.splide.Components.Autoplay.pause();
    }
  }

  public resumeAutoplay(): void {
    if (this.splide && this.splide.Components.Autoplay) {
      this.splide.Components.Autoplay.play();
    }
  }

  private setupDebugFunctions(): void {
    if (typeof window === 'undefined') return;

    (window as any).counterCarouselComponent = this;

    (window as any).debugCounters = () => {
      componentLogger.info('CounterCarousel Component Debug Info:');
      componentLogger.info(`- Connected: ${this.isConnected}`);
      componentLogger.info(`- Splide mounted: ${!!this.splide}`);
      componentLogger.info(`- Visibility state: ${JSON.stringify(this.counterVisibility)}`);

      Object.keys(this.config).forEach(counterId => {
        const valueEl = document.querySelector(`#carousel-${counterId}-value`) as HTMLElement;
        const labelEl = document.querySelector(`#carousel-${counterId}-label`) as HTMLElement;

        componentLogger.info(`- ${counterId}: value=${valueEl?.textContent}, label=${labelEl?.textContent}, visible=${this.counterVisibility[counterId]}`);
      });
    };

    (window as any).testCounterValues = () => this.testCounterValues();
    (window as any).testCounterLabels = () => this.testCounterLabels();
    (window as any).testCounterVisibility = () => this.testCounterVisibility();

    componentLogger.debug('Debug functions registered: debugCounters(), testCounterValues(), testCounterLabels(), testCounterVisibility()');
  }
}
