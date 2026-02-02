/**
 * HealthMonitor Section Component
 * Migrated from heartrate-monitor component with TypeScript support
 * Implements SectionComponent interface for atomic design
 */

import type {
  SectionComponent,
  ComponentData,
  GlobalVariableEvent
} from '../../../types';

export interface HeartRateData {
  bpm: number;
  timestamp: string;
  status: 'active' | 'inactive' | 'connecting';
}

export interface HealthMonitorConfig {
  heartRateTimeout: number;
  globalVariableName: string;
  triggerName: string;
  defaultBpm: number;
}

export class HealthMonitor implements SectionComponent {
  public readonly type = 'section' as const;
  public readonly elementId: string;
  public readonly container: HTMLElement;
  public isInitialized = false;
  public data?: ComponentData;
  public readonly features: any[] = [];
  public readonly elements: any[] = [];

  private client: any = null;
  private isConnected = false;
  private heartRateTimeout: any = null;
  private lastHeartRateUpdate = 0;
  private config: HealthMonitorConfig;

  // Animation cycle-based speed changes
  private currentAnimationDuration = 1.6; // Current duration in seconds
  private pendingAnimationDuration: number | null = null; // Queued duration to apply at cycle end
  private cycleEndHandler: (() => void) | null = null; // Bound handler for cleanup

  constructor(container: HTMLElement, config?: Partial<HealthMonitorConfig>) {
    this.container = container;
    this.elementId = container.id || `health-monitor-${Date.now()}`;

    this.config = {
      heartRateTimeout: 15000, // 15 seconds no data = inactive
      globalVariableName: 'heartRate',
      triggerName: 'Heart Rate Pulse', // Pulsoid trigger name
      defaultBpm: 75,
      ...config
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('💓 HealthMonitor Component initializing...');

    // Initialize monitor display
    this.initializeHeartRateMonitor();

    // Connect to Streamer.bot
    await this.connectToStreamerbot();

    // Set up debug functions
    this.setupDebugFunctions();

    this.isInitialized = true;
    console.log('💓 HealthMonitor Component initialized successfully');
  }

  updateData(data: Partial<ComponentData>): void {
    // Health monitor doesn't use ComponentData directly,
    // it relies on real-time Streamer.bot events
    console.log('💓 HealthMonitor data update received (heart rate uses real-time events)');
  }

  destroy(): void {
    if (this.client) {
      this.client.disconnect?.();
    }

    if (this.heartRateTimeout) {
      clearTimeout(this.heartRateTimeout);
    }

    // Clean up animation listener
    this.cleanupAnimationListener();

    // Remove debug functions
    if (typeof window !== 'undefined') {
      delete (window as any).heartRateMonitor;
      delete (window as any).debugHeartRate;
      delete (window as any).testHeartRate;
      delete (window as any).testHeartRateRange;
    }

    this.isInitialized = false;
  }

  addFeature(feature: any): void {
    this.features.push(feature);
  }

  addElement(element: any): void {
    this.elements.push(element);
  }

  private initializeHeartRateMonitor(): void {
    const monitor = this.container.querySelector('.heart-rate-monitor') as HTMLElement;
    const heartRateContainer = this.container.querySelector('.heart-rate-container') as HTMLElement;

    if (!monitor || !heartRateContainer) {
      console.error('💓 Heart rate monitor elements not found');
      return;
    }

    // Initialize animation duration based on default BPM (75 BPM ≈ 1.28s)
    const defaultDuration = Math.max(0.4, Math.min(4.0, 60 / this.config.defaultBpm * 1.6));
    this.currentAnimationDuration = defaultDuration;
    monitor.style.setProperty('--animation-duration', `${defaultDuration}s`);
    heartRateContainer.classList.add('active');

    console.log(`💓 Heart rate monitor initialized at ${this.config.defaultBpm} BPM (${defaultDuration.toFixed(2)}s cycle)`);
  }

  private async connectToStreamerbot(): Promise<void> {
    const windowAny = window as any;

    // First, try to use existing global client (created by streamerbot-integration)
    if (windowAny.streamerbotClient) {
      console.log('💓 Using existing global Streamer.bot client');
      this.client = windowAny.streamerbotClient;
      this.isConnected = true;
      this.setupEventHandlers();
      this.setStatus('Connected via shared client');
      // HealthMonitor relies on real-time events, no initial data needed
      return;
    }

    // Check for Streamer.bot client availability
    const ClientClass = this.getStreamerbotClientClass();

    if (!ClientClass) {
      console.error('💓 ❌ Streamer.bot client not found. Make sure streamerbot-client.js is loaded.');
      this.setStatus('❌ Streamer.bot client not loaded');
      return;
    }

    try {
      // Configure Streamer.bot client
      const config = {
        host: '127.0.0.1',
        port: 8080,
        endpoint: '/',
        immediate: false,
        autoReconnect: true,
        retries: 5,
        retryInterval: 2000
      };

      console.log('💓 Creating new Streamer.bot client with config:', config);

      // Create and initialize client
      this.client = new ClientClass(config);

      // Set up event handlers
      this.setupEventHandlers();

      // Connect to Streamer.bot
      this.client.connect();

      console.log('💓 Connecting to Streamer.bot...');

      // Add connection timeout - FAIL LOUD, no test mode
      setTimeout(() => {
        if (!this.isConnected) {
          console.error('💓 ❌ CONNECTION TIMEOUT: Streamer.bot not responding after 10 seconds');
          console.error('💓 ❌ Check that Streamer.bot is running and WebSocket Server is enabled on port 8080');
          this.setStatus('❌ Connection timeout');
        }
      }, 10000);

    } catch (error) {
      console.error('💓 ❌ FAILED TO CONNECT to Streamer.bot:', error);
      this.setStatus('❌ Connection failed');
    }
  }

  private getStreamerbotClientClass(): any {
    if (typeof window === 'undefined') return null;

    const windowAny = window as any;
    return windowAny.StreamerbotClient ||
           (windowAny.Streamerbot?.Client) ||
           null;
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    // Connection events
    this.client.on('WebsocketClient.Open', () => {
      this.isConnected = true;
      console.log('💓 Connected to Streamer.bot successfully');
      this.setStatus('Connected - Waiting for data...');
    });

    this.client.on('WebsocketClient.Close', (event: any) => {
      this.isConnected = false;
      console.log('💓 Disconnected from Streamer.bot');
      this.setStatus('Disconnected');
      this.setHeartRateInactive();
    });

    // Heart rate events via Raw.Action
    this.client.on('Raw.Action', (eventOrData: any) => {
      try {
        // Handle both ({ event, data }) and (data) formats
        const data = eventOrData?.data || eventOrData;
        const eventData = data?.data || data || {};
        const eventArgs = eventData?.arguments || eventData?.args || {};

        // Log all Raw.Action events for debugging
        console.log('💓 Raw.Action received:', { triggerName: eventArgs.triggerName, data: eventArgs });

        if (eventArgs.triggerName === this.config.triggerName) {
          console.log('💓 Heart rate pulse received:', eventArgs);
          const heartRate = eventArgs.heartRate || eventArgs.bpm || eventArgs.heart_rate;
          if (heartRate) {
            this.updateHeartRate(heartRate, eventArgs.measuredAt);
          }
        }
      } catch (error) {
        console.error('💓 Error processing heart rate event:', error);
      }
    });

    // Global variable events (for alternative data source)
    // Handle both ({ event, data }) and (data) formats from @streamerbot/client
    this.client.on('Misc.GlobalVariableUpdated', (eventOrData: any) => {
      try {
        // Handle both formats: ({ event, data }) or just (data)
        const data = eventOrData?.data || eventOrData;

        // Handle both variableName/variableValue and name/newValue formats
        const variableName = data?.variableName || data?.name;
        const variableValue = data?.variableValue !== undefined ? data.variableValue :
                              (data?.value !== undefined ? data.value : data?.newValue);

        console.log('💓 GlobalVariableUpdated received:', variableName, '=', variableValue);

        if (variableName === this.config.globalVariableName || variableName === 'heart_rate') {
          const heartRate = typeof variableValue === 'number' ? variableValue : parseInt(String(variableValue));
          if (!isNaN(heartRate) && heartRate > 0) {
            console.log('💓 Heart rate from global variable:', heartRate);
            this.updateHeartRate(heartRate, new Date().toISOString());
          }
        }
      } catch (error) {
        console.error('💓 Error processing global variable update:', error);
      }
    });
  }

  public updateHeartRate(heartRate: number, timestamp?: string): void {
    console.log(`💓 Heart rate updated: ${heartRate} BPM`);

    // Ensure monitor is active (in case it was inactive from timeout)
    this.setHeartRateActive();

    // Update display
    this.updateHeartRateDisplay(heartRate);

    // Update animation speed
    this.updateHeartRateAnimation(heartRate);

    // Set status
    this.setStatus(`${heartRate} BPM`);

    // Reset timeout
    this.resetHeartRateTimeout();

    // Update last update time
    this.lastHeartRateUpdate = Date.now();
  }

  private updateHeartRateDisplay(heartRate: number): void {
    // Update the visible BPM value element (matches example.html template)
    const heartRateValue = this.container.querySelector('.heart-rate-value') as HTMLElement;

    if (heartRateValue) {
      heartRateValue.textContent = String(heartRate);
    }
  }

  private updateHeartRateAnimation(heartRate: number): void {
    const monitor = this.container.querySelector('.heart-rate-monitor') as HTMLElement;
    const fadeIn = this.container.querySelector('.fade-in') as HTMLElement;
    if (!monitor || !fadeIn) return;

    // Calculate target animation duration: 60 BPM = 1.6s baseline
    const newDuration = Math.max(0.4, Math.min(4.0, 60 / heartRate * 1.6));

    // If the change is very small, apply immediately (avoids waiting for tiny adjustments)
    const diff = Math.abs(newDuration - this.currentAnimationDuration);
    if (diff < 0.05) {
      return; // Skip tiny changes
    }

    // Queue the new duration to be applied at the end of the current cycle
    this.pendingAnimationDuration = newDuration;

    // If we don't already have a cycle-end listener, set one up
    if (!this.cycleEndHandler) {
      this.cycleEndHandler = () => this.onAnimationCycleEnd(monitor, fadeIn);
      fadeIn.addEventListener('animationiteration', this.cycleEndHandler);
      console.log(`💓 Queued speed change: ${heartRate} BPM → ${newDuration.toFixed(2)}s (waiting for cycle end)`);
    } else {
      console.log(`💓 Updated pending speed: ${heartRate} BPM → ${newDuration.toFixed(2)}s`);
    }
  }

  private onAnimationCycleEnd(monitor: HTMLElement, fadeIn: HTMLElement): void {
    // Apply the pending duration
    if (this.pendingAnimationDuration !== null) {
      this.currentAnimationDuration = this.pendingAnimationDuration;
      monitor.style.setProperty('--animation-duration', `${this.currentAnimationDuration}s`);
      console.log(`💓 Applied new speed at cycle end: ${this.currentAnimationDuration.toFixed(2)}s`);
      this.pendingAnimationDuration = null;
    }

    // Remove the listener until we need it again
    if (this.cycleEndHandler) {
      fadeIn.removeEventListener('animationiteration', this.cycleEndHandler);
      this.cycleEndHandler = null;
    }
  }

  private cleanupAnimationListener(): void {
    const fadeIn = this.container.querySelector('.fade-in') as HTMLElement;
    if (fadeIn && this.cycleEndHandler) {
      fadeIn.removeEventListener('animationiteration', this.cycleEndHandler);
      this.cycleEndHandler = null;
    }
    this.pendingAnimationDuration = null;
  }

  private setStatus(status: string): void {
    const statusElement = this.container.querySelector('.heart-rate-status') as HTMLElement;
    if (statusElement) {
      statusElement.textContent = status;
    }
  }

  private setHeartRateInactive(): void {
    const heartRateContainer = this.container.querySelector('.heart-rate-container') as HTMLElement;
    if (heartRateContainer) {
      heartRateContainer.classList.remove('active');
      heartRateContainer.classList.add('inactive');
    }

    this.setStatus('No data');
    console.log('💓 Heart rate set to inactive');
  }

  private setHeartRateActive(): void {
    const heartRateContainer = this.container.querySelector('.heart-rate-container') as HTMLElement;
    if (heartRateContainer && !heartRateContainer.classList.contains('active')) {
      heartRateContainer.classList.remove('inactive');
      heartRateContainer.classList.add('active');
      console.log('💓 Heart rate set to active');
    }
  }

  private resetHeartRateTimeout(): void {
    if (this.heartRateTimeout) {
      clearTimeout(this.heartRateTimeout);
    }

    this.heartRateTimeout = setTimeout(() => {
      console.warn('💓 Heart rate data timeout - setting inactive');
      this.setHeartRateInactive();
    }, this.config.heartRateTimeout);
  }

  private enableTestMode(): void {
    console.log('💓 Enabling test mode - Streamer.bot client not available');

    // Start test heart rate simulation
    let testBpm = this.config.defaultBpm;
    const testInterval = setInterval(() => {
      // Simulate varying heart rate between 60-120 BPM
      testBpm = Math.floor(Math.random() * 60) + 60;
      this.updateHeartRate(testBpm, new Date().toISOString());
    }, 3000);

    // Store test interval for cleanup
    (this as any).testInterval = testInterval;
  }

  // Test functions for development
  public testHeartRate(bpm = 80): void {
    console.log(`💓 Testing heart rate: ${bpm} BPM`);
    this.updateHeartRate(bpm, new Date().toISOString());
  }

  public testHeartRateRange(minBpm = 60, maxBpm = 120, intervalMs = 1000): void {
    console.log(`💓 Testing heart rate range: ${minBpm}-${maxBpm} BPM every ${intervalMs}ms`);

    let currentBpm = minBpm;
    const direction = 1;

    const testInterval = setInterval(() => {
      this.updateHeartRate(currentBpm, new Date().toISOString());

      currentBpm += direction * 5;
      if (currentBpm > maxBpm || currentBpm < minBpm) {
        currentBpm = Math.max(minBpm, Math.min(maxBpm, currentBpm));
      }
    }, intervalMs);

    // Auto-stop after 30 seconds
    setTimeout(() => {
      clearInterval(testInterval);
      console.log('💓 Heart rate range test completed');
    }, 30000);
  }

  private setupDebugFunctions(): void {
    if (typeof window === 'undefined') return;

    // Global debug functions
    (window as any).healthMonitorComponent = this;

    (window as any).debugHeartRate = () => {
      console.log('💓 HealthMonitor Component Debug Info:');
      console.log('- Connected:', this.isConnected);
      console.log('- Last Update:', new Date(this.lastHeartRateUpdate).toISOString());

      const bpmDisplay = this.container.querySelector('.bpm-display') as HTMLElement;
      const statusElement = this.container.querySelector('.heart-rate-status') as HTMLElement;
      const monitor = this.container.querySelector('.heart-rate-monitor') as HTMLElement;

      console.log('- Current BPM:', bpmDisplay?.textContent);
      console.log('- Status:', statusElement?.textContent);
      console.log('- Animation Duration:', monitor?.style.getPropertyValue('--animation-duration'));

      const heartRateContainer = this.container.querySelector('.heart-rate-container') as HTMLElement;
      console.log('- Active:', heartRateContainer?.classList.contains('active'));
    };

    (window as any).testHeartRate = (bpm: number) => this.testHeartRate(bpm);
    (window as any).testHeartRateRange = (min: number, max: number, interval: number) =>
      this.testHeartRateRange(min, max, interval);

    console.log('💓 Debug functions registered: debugHeartRate(), testHeartRate(bpm), testHeartRateRange(min, max, interval)');
  }
}