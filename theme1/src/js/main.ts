import '@splidejs/splide/css';
import '../css/style.css';

// Component styles available but not yet integrated:
// import '../components/sections/AlertFeed/AlertFeed.css';
// import '../components/sections/GoalTracker/GoalTracker.css';
// import '../components/sections/RecentActivity/RecentActivity.css';

import { eventBus } from './EventBus';
import { EVENT_TYPES } from './EventConstants';
import { logger } from './Logger';
import { streamerbotIntegration } from './streamerbot-integration';
import { ComponentComposer } from '../composition/ComponentComposer';

const mainLogger = logger.createChildLogger('Main');

// Static guard for initialization
let isInitializing = false;

async function initializeApp(): Promise<void> {
  // Guard against multiple calls
  if ((window as any).__streamOverlayInitialized) {
    mainLogger.warn('Application already initialized, skipping');
    return;
  }

  if (isInitializing) {
    mainLogger.warn('Application already initializing, skipping duplicate call');
    return;
  }

  isInitializing = true;
  (window as any).__streamOverlayInitialized = true;

  try {
    mainLogger.info('Application starting');

    // Wait for DOM if still loading
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      });
    }

    mainLogger.debug('DOM ready, initializing Streamer.bot client first');

    // Initialize Streamer.bot client FIRST so components can use it
    streamerbotIntegration.initialize();

    // Small delay to let the client establish connection
    await new Promise(resolve => setTimeout(resolve, 500));

    mainLogger.debug('Initializing ComponentComposer');

    // Create the ComponentComposer
    const composer = new ComponentComposer();

    // Initialize components in-place (don't use composeLayout which moves containers)
    // Each component is initialized in its existing DOM container
    // Note: AlertFeed, GoalTracker, RecentActivity sections are hidden by default
    // Enable them in CSS by setting `display: flex` on the section
    const componentConfigs = [
      { name: 'BroadcasterInfo', path: '.branding-section' },
      { name: 'CounterCarousel', path: '.counters-section' },
      { name: 'HealthMonitor', path: '.heart-rate-section' }
      // Components available but not yet integrated:
      // { name: 'AlertFeed', path: '.alert-section', optional: true },
      // { name: 'GoalTracker', path: '.goal-section', optional: true },
      // { name: 'RecentActivity', path: '.activity-section', optional: true }
    ];

    for (const config of componentConfigs) {
      try {
        // Check if container exists for optional components
        const container = document.querySelector(config.path) as HTMLElement;
        if (!container) {
          if ((config as any).optional) {
            mainLogger.debug(`Optional component ${config.name} skipped - container not found`);
            continue;
          }
          throw new Error(`Container not found: ${config.path}`);
        }

        // Skip hidden optional components (display: none)
        const isVisible = window.getComputedStyle(container).display !== 'none';
        if ((config as any).optional && !isVisible) {
          mainLogger.debug(`Optional component ${config.name} skipped - container hidden`);
          continue;
        }

        const component = await composer.addComponent(config);
        await component.initialize();
        mainLogger.debug(`Component ${config.name} initialized`);
      } catch (error) {
        if ((config as any).optional) {
          mainLogger.debug(`Optional component ${config.name} not initialized:`, error);
        } else {
          mainLogger.error(`Failed to initialize ${config.name}:`, error);
        }
      }
    }

    // Setup global functions for backward compatibility
    setupGlobalFunctions(composer);

    mainLogger.info('ComponentComposer fully initialized');

    // Small delay before dispatching ready event
    await new Promise(resolve => setTimeout(resolve, 50));

    // Dispatch ready event
    dispatchReadyEvent();

    mainLogger.info('Application initialized successfully');
  } catch (error) {
    mainLogger.error('Failed to initialize application', error);
  }
}

function setupGlobalFunctions(composer: ComponentComposer): void {
  // Expose composer for debugging
  (window as any).ComponentComposer = composer;

  // Counter update function for Streamer.bot integration
  (window as any).updateCounterFromGlobalVariable = (name: string, value: any) => {
    mainLogger.debug(`Global counter update: ${name} = ${value}`);

    if (name.startsWith('counter') && !name.includes('label')) {
      const counterValue = typeof value === 'string' ? parseInt(value, 10) : value;
      if (!isNaN(counterValue)) {
        eventBus.emit(EVENT_TYPES.COUNTER_UPDATE, {
          counterName: name,
          value: counterValue,
          timestamp: Date.now()
        });
      }
    }
  };

  // Broadcaster profile image loader
  (window as any).loadBroadcasterProfileImage = (url: string) => {
    mainLogger.debug(`Loading broadcaster profile image: ${url}`);
    eventBus.emit(EVENT_TYPES.BROADCASTER_UPDATE, {
      profileImageUrl: url
    });
  };

  // Goal variables request
  window.requestGoalVariables = (types: string) => {
    mainLogger.debug(`Requesting goal variables: ${types}`);
  };

  mainLogger.debug('Global functions registered');
}

function dispatchReadyEvent(): void {
  const readyEvent = new CustomEvent('streamoverlay:ready', {
    detail: {
      component: 'example-html',
      timestamp: Date.now(),
      functions: [
        'updateCounterFromGlobalVariable',
        'loadBroadcasterProfileImage',
        'requestGoalVariables'
      ]
    }
  });

  window.dispatchEvent(readyEvent);
  mainLogger.info('Dispatched streamoverlay:ready event');

  eventBus.emit(EVENT_TYPES.COMPONENT_READY, {
    componentName: 'ComponentComposer',
    timestamp: Date.now()
  });
}

// Use a closure to ensure single initialization
const initOnce = (() => {
  let initialized = false;
  return async () => {
    if (initialized) return;
    initialized = true;
    await initializeApp();
  };
})();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOnce, { once: true });
} else {
  initOnce();
}

// Re-export ComponentComposer for external use
export { ComponentComposer };
