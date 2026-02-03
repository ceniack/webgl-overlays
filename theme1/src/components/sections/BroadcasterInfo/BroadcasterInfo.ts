/**
 * BroadcasterInfo Section Component
 * Migrated from branding component with TypeScript support
 * Implements SectionComponent interface for atomic design
 */

import type {
  SectionComponent,
  ComponentData,
  BroadcasterInfo as BroadcasterData,
  GlobalVariableEvent
} from '../../../types';
import { logger } from '../../../js/Logger';

const componentLogger = logger.createChildLogger('BroadcasterInfo');

export interface BroadcasterInfoConfig {
  broadcaster: {
    displayNameVariable: string;
    usernameVariable: string;
    userIdVariable: string;
    twitchUrlVariable: string;
    profileImageTriggerVariable: string;
    defaultDisplayName: string;
    defaultUsername: string;
    defaultTwitchUrl: string;
  };
}

export class BroadcasterInfo implements SectionComponent {
  public readonly type = 'section' as const;
  public readonly elementId: string;
  public readonly container: HTMLElement;
  public isInitialized = false;
  public data?: ComponentData;
  public readonly features: any[] = [];
  public readonly elements: any[] = [];

  private client: any = null;
  private isConnected = false;
  private config: BroadcasterInfoConfig;

  constructor(container: HTMLElement, config?: Partial<BroadcasterInfoConfig>) {
    this.container = container;
    this.elementId = container.id || `broadcaster-info-${Date.now()}`;

    this.config = {
      broadcaster: {
        displayNameVariable: 'broadcasterDisplayName',
        usernameVariable: 'broadcasterUsername',
        userIdVariable: 'broadcasterUserId',
        twitchUrlVariable: 'broadcasterTwitchUrl',
        profileImageTriggerVariable: 'broadcasterProfileImageTrigger',
        defaultDisplayName: 'STREAMER',
        defaultUsername: 'streamer',
        defaultTwitchUrl: 'twitch.tv/streamer',
        ...config?.broadcaster
      }
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    componentLogger.info('Initializing...');

    // Set default values
    this.setDefaults();

    // Connect to Streamer.bot
    await this.connectToStreamerbot();

    // Set up debug functions
    this.setupDebugFunctions();

    this.isInitialized = true;
    componentLogger.info('Initialized successfully');
  }

  updateData(data: Partial<ComponentData>): void {
    if (data.broadcaster) {
      this.updateFromBroadcasterData(data.broadcaster);
    }
  }

  destroy(): void {
    if (this.client) {
      this.client.disconnect?.();
    }

    // Remove debug functions
    if (typeof window !== 'undefined') {
      delete (window as any).brandingComponent;
      delete (window as any).debugBranding;
      delete (window as any).testProfileImage;
      delete (window as any).testBroadcasterData;
    }

    this.isInitialized = false;
  }

  addFeature(feature: any): void {
    // Implementation for adding features
    this.features.push(feature);
  }

  addElement(element: any): void {
    // Implementation for adding elements
    this.elements.push(element);
  }

  private setDefaults(): void {
    const profileName = this.container.querySelector('#profile-name') as HTMLElement;
    const profileLink = this.container.querySelector('#profile-link') as HTMLElement;
    const profileFallback = this.container.querySelector('#profile-fallback') as HTMLElement;

    if (profileName) profileName.textContent = this.config.broadcaster.defaultDisplayName;
    if (profileLink) profileLink.textContent = this.config.broadcaster.defaultTwitchUrl;
    if (profileFallback) {
      profileFallback.textContent = this.config.broadcaster.defaultDisplayName.charAt(0).toUpperCase();
    }
  }

  private async connectToStreamerbot(): Promise<void> {
    const windowAny = window as any;

    // First, try to use existing global client (created by streamerbot-integration)
    if (windowAny.streamerbotClient) {
      componentLogger.debug('Using existing global Streamer.bot client');
      this.client = windowAny.streamerbotClient;
      this.isConnected = true;  // Assume connected if global client exists
      this.setupEventHandlers();
      this.requestInitialData();
      return;
    }

    // Check for Streamer.bot client class availability
    const ClientClass = this.getStreamerbotClientClass();

    if (!ClientClass) {
      componentLogger.error('Streamer.bot client not found. Make sure streamerbot-client.js is loaded.');
      this.showConnectionError('Streamer.bot client not loaded');
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

      componentLogger.debug('Creating new Streamer.bot client');

      // Create and initialize client
      this.client = new ClientClass(config);

      // Set up event handlers
      this.setupEventHandlers();

      // Connect to Streamer.bot
      this.client.connect();

      componentLogger.debug('Connecting to Streamer.bot...');

      // Add connection timeout - FAIL LOUD, no test mode
      setTimeout(() => {
        if (!this.isConnected) {
          componentLogger.error('CONNECTION TIMEOUT: Streamer.bot not responding after 10 seconds');
          componentLogger.error('Check that Streamer.bot is running and WebSocket Server is enabled on port 8080');
          this.showConnectionError('Connection timeout - Streamer.bot not responding');
        }
      }, 10000);

    } catch (error) {
      componentLogger.error('FAILED TO CONNECT to Streamer.bot:', error);
      this.showConnectionError('Connection failed - check Streamer.bot');
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
      componentLogger.info('Connected to Streamer.bot');
      this.requestInitialData();
    });

    this.client.on('WebsocketClient.Close', (event: any) => {
      this.isConnected = false;
      componentLogger.info('Disconnected from Streamer.bot');
    });

    // Global variable events for broadcaster info
    this.client.on('Misc.GlobalVariableUpdated', (data: any) => {
      try {
        const variableName = data.variableName;
        const variableValue = data.variableValue;

        if (variableName && variableValue !== undefined) {
          componentLogger.debug(`GlobalVariableUpdated: ${variableName} = ${variableValue}`);
          this.handleVariableUpdate(variableName, variableValue);
        }
      } catch (error) {
        componentLogger.error('Error processing global variable update:', error);
      }
    });
  }

  private async requestInitialData(): Promise<void> {
    if (!this.client || !this.isConnected) return;

    componentLogger.debug('Requesting initial broadcaster data...');

    // Request all broadcaster-related variables
    const variables = [
      this.config.broadcaster.displayNameVariable,
      this.config.broadcaster.usernameVariable,
      this.config.broadcaster.userIdVariable,
      this.config.broadcaster.twitchUrlVariable,
      this.config.broadcaster.profileImageTriggerVariable
    ];

    for (const variable of variables) {
      try {
        const response = await this.client.getGlobal(variable);
        if (response?.variable !== undefined) {
          componentLogger.debug(`Got initial ${variable} = ${response.variable}`);
          this.handleVariableUpdate(variable, response.variable);
        }
      } catch (error) {
        // Silently ignore "Request failed" errors - this just means the variable doesn't exist yet
        // Only log unexpected errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (!errorMessage.includes('Request failed')) {
          componentLogger.warn(`Failed to get initial ${variable}:`, error);
        }
        // Variable doesn't exist in Streamer.bot - this is normal, will use defaults or API fallback
      }
    }

    // Also try to get broadcaster info from API
    try {
      const broadcasterData = await this.client.getBroadcaster();
      if (broadcasterData?.status === 'ok') {
        componentLogger.debug('Got broadcaster data from API');
        this.updateFromBroadcasterAPI(broadcasterData);
      }
    } catch (error) {
      componentLogger.warn('Could not get broadcaster data from API:', error);
    }
  }

  private handleVariableUpdate(variableName: string, variableValue: string | number | boolean): void {
    const config = this.config.broadcaster;

    switch (variableName) {
      case config.displayNameVariable:
        this.updateBroadcasterDisplayName(String(variableValue));
        break;
      case config.usernameVariable:
        this.updateBroadcasterUsername(String(variableValue));
        break;
      case config.userIdVariable:
        componentLogger.debug(`Broadcaster user ID updated: ${variableValue}`);
        break;
      case config.twitchUrlVariable:
        this.updateBroadcasterTwitchUrl(String(variableValue));
        break;
      case config.profileImageTriggerVariable:
        const value = String(variableValue).trim();
        if (value !== '') {
          this.loadBroadcasterProfileImage(value);
        }
        break;
    }
  }

  private updateFromBroadcasterAPI(data: any): void {
    // Extract broadcaster information from API response
    if (data.platforms) {
      // Try to get Twitch data first, fallback to other platforms
      const platformData = data.platforms.twitch || data.platforms.kick || data.platforms.youtube;

      if (platformData) {
        const displayName = platformData.broadcastUserName || platformData.broadcasterUserName;
        const username = platformData.broadcastUser || platformData.broadcasterLogin;

        if (displayName) {
          componentLogger.debug(`Updating display name from API: ${displayName}`);
          this.updateBroadcasterDisplayName(displayName);
        }

        if (username) {
          componentLogger.debug(`Updating username from API: ${username}`);
          this.updateBroadcasterUsername(username);
        }
      }
    }
  }

  private updateFromBroadcasterData(data: BroadcasterData): void {
    if (data.displayName) {
      this.updateBroadcasterDisplayName(data.displayName);
    }

    if (data.userName) {
      this.updateBroadcasterUsername(data.userName);
    }

    if (data.twitchUrl) {
      this.updateBroadcasterTwitchUrl(data.twitchUrl);
    }
  }

  private updateBroadcasterDisplayName(displayName: string): void {
    if (!displayName || displayName.trim() === '') return;

    componentLogger.debug(`Updating broadcaster display name: ${displayName}`);

    const profileName = this.container.querySelector('#profile-name') as HTMLElement;
    const profileFallback = this.container.querySelector('#profile-fallback') as HTMLElement;

    if (profileName) profileName.textContent = displayName;
    if (profileFallback) {
      profileFallback.textContent = displayName.charAt(0).toUpperCase();
    }
  }

  private updateBroadcasterTwitchUrl(twitchUrl: string): void {
    if (!twitchUrl || twitchUrl.trim() === '') return;

    componentLogger.debug(`Updating broadcaster Twitch URL: ${twitchUrl}`);

    const profileLink = this.container.querySelector('#profile-link') as HTMLElement;
    if (profileLink) profileLink.textContent = twitchUrl;
  }

  private updateBroadcasterUsername(username: string): void {
    if (!username || username.trim() === '') return;

    componentLogger.debug(`Updating broadcaster username: ${username}`);

    // Update the Twitch URL
    const profileLink = this.container.querySelector('#profile-link') as HTMLElement;
    if (profileLink) profileLink.textContent = `twitch.tv/${username}`;

    // Also trigger profile image loading
    componentLogger.debug('Auto-triggering profile image load from username update');
    this.loadBroadcasterProfileImage(username);
  }

  private loadBroadcasterProfileImage(username: string): void {
    componentLogger.debug(`Loading broadcaster profile image for username: ${username}`);

    if (!username || username.trim() === '') {
      componentLogger.error('No username provided for profile image loading');
      this.showFallbackImage();
      return;
    }

    const decApiUrl = `https://decapi.me/twitch/avatar/${username}`;
    componentLogger.debug(`Making DecAPI request to: ${decApiUrl}`);

    // Use DecAPI to get the actual profile image URL
    fetch(decApiUrl)
      .then(response => {
        componentLogger.debug(`DecAPI response status: ${response.status} ${response.statusText}`);
        return response.text();
      })
      .then(url => {
        const cleanUrl = url.trim();
        componentLogger.debug(`DecAPI raw response: ${cleanUrl}`);

        if (cleanUrl &&
            cleanUrl.startsWith('http') &&
            !cleanUrl.toLowerCase().includes('error') &&
            !cleanUrl.toLowerCase().includes('user not found')) {
          this.loadImageFromUrl(cleanUrl);
        } else {
          componentLogger.debug(`DecAPI returned invalid/error response: ${cleanUrl}`);
          this.showFallbackImage();
        }
      })
      .catch(error => {
        componentLogger.error('DecAPI fetch failed:', error);
        this.showFallbackImage();
      });
  }

  private loadImageFromUrl(url: string): void {
    const img = this.container.querySelector('#profile-image') as HTMLImageElement;
    const fallback = this.container.querySelector('#profile-fallback') as HTMLElement;

    if (!img || !fallback) {
      componentLogger.error('Profile image elements not found');
      return;
    }

    componentLogger.debug(`Attempting to load image from URL: ${url}`);

    // Add a timeout to catch slow-loading images
    const timeout = setTimeout(() => {
      componentLogger.warn('Profile image loading timeout, showing fallback');
      this.showFallbackImage();
    }, 10000); // 10 second timeout

    img.onload = () => {
      clearTimeout(timeout);
      componentLogger.debug('Broadcaster profile image loaded successfully');
      img.style.display = 'block';
      fallback.style.display = 'none';
    };

    img.onerror = () => {
      clearTimeout(timeout);
      componentLogger.error(`Broadcaster profile image failed to load from URL: ${url}`);
      this.showFallbackImage();
    };

    img.src = url;
  }

  private showFallbackImage(): void {
    const img = this.container.querySelector('#profile-image') as HTMLImageElement;
    const fallback = this.container.querySelector('#profile-fallback') as HTMLElement;

    if (img) img.style.display = 'none';
    if (fallback) fallback.style.display = 'block';
  }

  private showConnectionError(message: string): void {
    // Update display to show error state
    const nameEl = this.container.querySelector('#profile-name');
    const linkEl = this.container.querySelector('#profile-link');
    const fallback = this.container.querySelector('#profile-fallback') as HTMLElement;

    if (nameEl) {
      nameEl.textContent = '⚠️ CONNECTION ERROR';
      (nameEl as HTMLElement).style.color = '#ff3366';
    }
    if (linkEl) {
      linkEl.textContent = message;
      (linkEl as HTMLElement).style.color = '#ff6666';
    }
    if (fallback) {
      fallback.textContent = '!';
      fallback.style.backgroundColor = '#ff3366';
      fallback.style.display = 'block';
    }
  }

  // Test functions for development
  public testProfileImage(username = 'shroud'): void {
    componentLogger.debug(`Testing profile image with username: ${username}`);
    this.loadBroadcasterProfileImage(username);
  }

  public testBroadcasterData(displayName = 'TestStreamer', username = 'testuser'): void {
    componentLogger.debug(`Testing broadcaster data: ${displayName} (${username})`);
    this.updateBroadcasterDisplayName(displayName);
    this.updateBroadcasterUsername(username);
  }

  private setupDebugFunctions(): void {
    if (typeof window === 'undefined') return;

    // Global debug functions
    (window as any).broadcasterInfoComponent = this;

    (window as any).debugBroadcasterInfo = () => {
      componentLogger.info('BroadcasterInfo Component Debug Info:');
      componentLogger.info(`- Connected: ${this.isConnected}`);

      const profileName = this.container.querySelector('#profile-name') as HTMLElement;
      const profileLink = this.container.querySelector('#profile-link') as HTMLElement;
      const profileFallback = this.container.querySelector('#profile-fallback') as HTMLElement;
      const img = this.container.querySelector('#profile-image') as HTMLImageElement;

      componentLogger.info(`- Display Name: ${profileName?.textContent}`);
      componentLogger.info(`- Profile Link: ${profileLink?.textContent}`);
      componentLogger.info(`- Profile Fallback: ${profileFallback?.textContent}`);
      componentLogger.info(`- Profile Image Visible: ${img?.style.display === 'block'}`);
      componentLogger.info(`- Profile Image URL: ${img?.src}`);
    };

    (window as any).testProfileImage = (username: string) => this.testProfileImage(username);
    (window as any).testBroadcasterData = (displayName: string, username: string) =>
      this.testBroadcasterData(displayName, username);

    componentLogger.debug('Debug functions registered: debugBroadcasterInfo(), testProfileImage(username), testBroadcasterData(displayName, username)');
  }
}
