import { eventBus } from './EventBus';
import { EVENT_TYPES, HEALTH_STATUS } from './EventConstants';
import { logger } from './Logger';
import type { CounterUpdateEvent, BroadcasterInfoEvent, HealthStatusEvent, StreamerbotConnectionEvent } from '../types/events';

const sbLogger = logger.createChildLogger('Streamerbot');

declare global {
  interface Window {
    StreamerbotClient: any;
    updateCounterFromGlobalVariable?: (name: string, value: any) => void;
    loadBroadcasterProfileImage?: (url: string) => void;
    requestGoalVariables?: (types: string) => void;
    ComponentComposer?: any;
    _pendingProfileImageLoad?: string;
  }
}

interface StreamerbotConfig {
  host: string;
  port: number;
  endpoint: string;
  immediate: boolean;
  autoReconnect: boolean;
  retries: number;
  retryInterval: number;
  onConnect?: (data: any) => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

interface InitializationState {
  connected: boolean;
  globalsLoaded: boolean;
  broadcasterLoaded: boolean;
  ready: boolean;
}

class StreamerbotIntegration {
  private client: any = null;
  private initState: InitializationState = {
    connected: false,
    globalsLoaded: false,
    broadcasterLoaded: false,
    ready: false
  };
  private pendingVariables: Record<string, any> = {};
  private componentReady = false;

  constructor() {
    sbLogger.info('Streamerbot integration initializing');
    this.setupComponentReadyListener();
  }

  private setupComponentReadyListener(): void {
    window.addEventListener('streamoverlay:ready', (event: any) => {
      const { component, timestamp, functions } = event.detail;
      sbLogger.debug(`Component ready: ${component} at ${timestamp}`);

      if (component === 'example-html') {
        this.componentReady = true;
        sbLogger.info('Example.html functions available', functions);

        if (Object.keys(this.pendingVariables).length > 0) {
          sbLogger.debug('Processing pending initial data');
          this.processInitialVariables(this.pendingVariables);
        }

        const pendingImage = (window as any)._pendingProfileImageLoad;
        if (pendingImage && typeof (window as any).loadBroadcasterProfileImage === 'function') {
          sbLogger.debug('Retrying profile image load', pendingImage);
          (window as any).loadBroadcasterProfileImage(pendingImage);
          delete (window as any)._pendingProfileImageLoad;
        }
      }
    });
  }

  private processInitialVariables(variables: Record<string, any>): void {
    sbLogger.debug('Processing variables', variables);

    for (const [variableName, variableData] of Object.entries(variables)) {
      let variableValue = variableData;
      if (typeof variableData === 'object' && variableData !== null && 'value' in variableData) {
        variableValue = variableData.value;
      }
      this.processVariable(variableName, variableValue);
    }

    this.pendingVariables = {};
    sbLogger.info('Variable processing complete');
  }

  private processVariable(name: string, value: any): void {
    sbLogger.debug(`Processing ${name} = ${value}`);

    // Handle all counter-related variables (values, labels, toggles)
    if (name.startsWith('counter')) {
      if (name.includes('label')) {
        // Counter labels
        eventBus.emit(EVENT_TYPES.COUNTER_UPDATE, {
          counterName: name,
          value: String(value),
          isLabel: true,
          timestamp: Date.now()
        });
        sbLogger.debug(`Emitted counter label update: ${name} = ${value}`);
      } else if (name.includes('toggle')) {
        // Counter toggles (visibility)
        eventBus.emit(EVENT_TYPES.COUNTER_UPDATE, {
          counterName: name,
          value: value,
          isToggle: true,
          timestamp: Date.now()
        });
        sbLogger.debug(`Emitted counter toggle update: ${name} = ${value}`);
      } else {
        // Counter values
        const counterValue = typeof value === 'string' ? parseInt(value, 10) : value;
        if (!isNaN(counterValue)) {
          eventBus.emit(EVENT_TYPES.COUNTER_UPDATE, {
            counterName: name,
            value: counterValue,
            timestamp: Date.now()
          });
          sbLogger.debug(`Emitted counter value update: ${name} = ${counterValue}`);
        }
      }
    }

    if (name === 'broadcasterProfileImageTrigger' && value && value.trim() !== '') {
      if (typeof window.loadBroadcasterProfileImage === 'function') {
        window.loadBroadcasterProfileImage(value.trim());
      } else {
        window._pendingProfileImageLoad = value.trim();
      }
    }

    if (name === 'activeGoalTypes' && typeof window.requestGoalVariables === 'function') {
      window.requestGoalVariables(value);
    }

    // Also call the legacy window function for backwards compatibility
    if (typeof window.updateCounterFromGlobalVariable === 'function') {
      window.updateCounterFromGlobalVariable(name, value);
    }
  }

  private async waitForClientReady(maxWait: number = 1000): Promise<boolean> {
    const startTime = Date.now();
    sbLogger.debug('Verifying client readiness');

    while (Date.now() - startTime < maxWait) {
      try {
        await this.client.getInfo();
        sbLogger.debug('Client ready verification successful');
        return true;
      } catch (error) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }

    sbLogger.warn(`Client readiness timeout after ${maxWait}ms`);
    return false;
  }

  private setupEventListeners(): void {
    if (!this.client) return;

    sbLogger.debug('Registering event listeners');

    this.client.on('Misc.GlobalVariableUpdated', ({ event, data }: any) => {
      sbLogger.debug('GlobalVariableUpdated event received', data);

      // Handle both old format (variableName/value) and new format (name/newValue)
      const variableName = data?.variableName || data?.name;
      const variableValue = data?.value !== undefined ? data.value : data?.newValue;

      if (variableName && variableValue !== undefined) {
        sbLogger.info(`Processing real-time update: ${variableName} = ${variableValue}`);
        this.processVariable(variableName, variableValue);
      }
    });

    this.client.on('WebsocketClient.Open', async () => {
      sbLogger.info('Connected to Streamer.bot');
      this.initState.connected = true;

      eventBus.emit(EVENT_TYPES.STREAMERBOT_CONNECTION, {
        connected: true,
        timestamp: Date.now()
      });

      eventBus.emit(EVENT_TYPES.HEALTH_STATUS, {
        status: HEALTH_STATUS.CONNECTED,
        message: 'Connected to Streamer.bot',
        timestamp: Date.now()
      });

      setTimeout(async () => {
        await this.waitForClientReady();
        await this.requestInitialData();
      }, 200);
    });

    this.client.on('WebsocketClient.Close', (event: any) => {
      sbLogger.warn('Disconnected from Streamer.bot', event);
      this.initState.connected = false;

      eventBus.emit(EVENT_TYPES.STREAMERBOT_CONNECTION, {
        connected: false,
        timestamp: Date.now()
      });

      eventBus.emit(EVENT_TYPES.HEALTH_STATUS, {
        status: HEALTH_STATUS.DISCONNECTED,
        message: 'Disconnected from Streamer.bot',
        timestamp: Date.now()
      });

      this.resetState();
    });

    sbLogger.info('Event listeners registered');
  }

  private resetState(): void {
    this.initState = {
      connected: false,
      globalsLoaded: false,
      broadcasterLoaded: false,
      ready: false
    };
    sbLogger.debug('Initialization state reset');
  }

  private async requestInitialData(): Promise<void> {
    sbLogger.info('Requesting initial data');

    try {
      const globals = await this.client.getGlobals();
      if (globals) {
        sbLogger.debug('Received global variables', globals);
        this.pendingVariables = globals;

        if (this.componentReady) {
          this.processInitialVariables(globals);
        } else {
          // Store for later - wait for componentReady event
          sbLogger.debug('Component not ready, storing variables pending initialization');
          // No timeout fallback - we rely on the ready event which is guaranteed by main.ts
        }

        this.initState.globalsLoaded = true;
      }
    } catch (error) {
      sbLogger.error('Failed to get global variables', error);
    }

    try {
      const broadcaster = await this.client.getBroadcaster();
      if (broadcaster) {
        sbLogger.debug('Received broadcaster info', broadcaster);
        
        const broadcasterEvent: BroadcasterInfoEvent = {
          displayName: broadcaster.displayName,
          profileImageUrl: broadcaster.profileImageUrl,
          description: broadcaster.description,
          viewCount: broadcaster.viewCount,
          followerCount: broadcaster.followerCount
        };

        eventBus.emit(EVENT_TYPES.BROADCASTER_UPDATE, broadcasterEvent);
        this.initState.broadcasterLoaded = true;
      }
    } catch (error) {
      sbLogger.error('Failed to get broadcaster info', error);
    }

    this.initState.ready = true;
    sbLogger.info('Initial data loading completed', this.initState);
  }

  public initialize(): void {
    if (typeof window.StreamerbotClient === 'undefined') {
      sbLogger.error('Official @streamerbot/client not available');
      
      eventBus.emit(EVENT_TYPES.HEALTH_STATUS, {
        status: HEALTH_STATUS.ERROR,
        message: 'Streamerbot client not available',
        timestamp: Date.now()
      });
      
      return;
    }

    sbLogger.info('Initializing Streamerbot client');

    const config: StreamerbotConfig = {
      host: '127.0.0.1',
      port: 8080,
      endpoint: '/',
      immediate: false,
      autoReconnect: true,
      retries: 5,
      retryInterval: 2000,
      onConnect: (data: any) => {
        sbLogger.info('Connected to Streamer.bot', data);
      },
      onDisconnect: () => {
        sbLogger.warn('Disconnected from Streamer.bot');
        this.resetState();
      },
      onError: (error: any) => {
        sbLogger.error('Connection error', error);
        
        eventBus.emit(EVENT_TYPES.HEALTH_STATUS, {
          status: HEALTH_STATUS.ERROR,
          message: `Connection error: ${error}`,
          timestamp: Date.now()
        });
      }
    };

    this.client = new window.StreamerbotClient(config);

    // Expose client globally so components can reuse it
    (window as any).streamerbotClient = this.client;

    this.setupEventListeners();

    sbLogger.info('Streamerbot client created, connecting...');
    this.client.connect();
  }

  public getClient(): any {
    return this.client;
  }

  public getInitState(): InitializationState {
    return { ...this.initState };
  }
}

export const streamerbotIntegration = new StreamerbotIntegration();

if (typeof window !== 'undefined') {
  (window as any).streamerbotIntegration = streamerbotIntegration;
}

sbLogger.info('Streamerbot integration module loaded');
