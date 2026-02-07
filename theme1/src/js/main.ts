import '@splidejs/splide/css';
import '../css/index.css';

import '../components/sections/AlertFeed/AlertFeed.css';
import '../components/sections/LatestEvent/LatestEvent.css';

// Component styles available but not yet integrated:
// import '../components/sections/GoalTracker/GoalTracker.css';
// import '../components/sections/RecentActivity/RecentActivity.css';

import { eventBus } from './EventBus';
import { EVENT_TYPES } from './EventConstants';
import { logger } from './Logger';
import { initializeTheme } from './ThemeManager';
import { streamerbotIntegration } from './streamerbot-integration';
import { ComponentComposer } from '../composition/ComponentComposer';
import { CanvasRenderer } from '../composition/CanvasRenderer';
import { initializeGLOverlay } from '../gl/index';
import { overlayStore, loggingMiddleware, alertQueueMiddleware, persistenceMiddleware } from '../store';

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

    // Apply theme and layout from URL parameters
    initializeTheme();

    // Wait for DOM if still loading
    if (document.readyState === 'loading') {
      await new Promise(resolve => {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
      });
    }

    // Get component name from body data attribute for conditional initialization
    const componentName = document.body.getAttribute('data-component') || 'unknown';
    mainLogger.debug(`Component identified: ${componentName}`);

    // Register store middleware before any data flows
    overlayStore.use(loggingMiddleware);
    overlayStore.use(alertQueueMiddleware);
    overlayStore.use(persistenceMiddleware);
    mainLogger.debug('Store middleware registered');

    mainLogger.debug('DOM ready, initializing Streamer.bot client first');

    // Initialize Streamer.bot client FIRST - needed for all pages (overlay and alerts)
    streamerbotIntegration.initialize();

    // Small delay to let the client establish connection
    await new Promise(resolve => setTimeout(resolve, 500));

    // Only initialize full component system on main overlay page
    if (componentName === 'overlay-html') {
      mainLogger.debug('Initializing ComponentComposer for overlay');

      // Create the ComponentComposer
      const composer = new ComponentComposer();

      // Initialize components in-place (don't use composeLayout which moves containers)
      // Each component is initialized in its existing DOM container
      // Note: AlertFeed, GoalTracker, RecentActivity sections are hidden by default
      // Enable them in CSS by setting `display: flex` on the section
      const componentConfigs = [
        { name: 'BroadcasterInfo', path: '.branding-section' },
        { name: 'CounterCarousel', path: '.counters-section' },
        { name: 'HealthMonitor', path: '.heart-rate-section' },
        // LatestEvent instances — hidden by default, enable by removing display:none in overlay.html
        { name: 'LatestEvent', path: '.latest-follower-section', data: { eventType: 'follow', label: 'Latest Follower' }, optional: true },
        { name: 'LatestEvent', path: '.latest-sub-section', data: { eventType: 'sub', label: 'Latest Sub' }, optional: true },
        { name: 'LatestEvent', path: '.latest-cheer-section', data: { eventType: 'cheer', label: 'Latest Cheer' }, optional: true },
        { name: 'LatestEvent', path: '.latest-raid-section', data: { eventType: 'raid', label: 'Latest Raid' }, optional: true },
        { name: 'LatestEvent', path: '.latest-donation-section', data: { eventType: 'donation', label: 'Latest Donation' }, optional: true },
        { name: 'LatestEvent', path: '.latest-redemption-section', data: { eventType: 'redemption', label: 'Latest Redemption' }, optional: true },
        { name: 'LatestEvent', path: '.latest-firstword-section', data: { eventType: 'firstword', label: 'Latest First Word' }, optional: true }
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
    } else if (componentName === 'alerts-html') {
      mainLogger.debug('Initializing ComponentComposer for alerts');

      const composer = new ComponentComposer();

      try {
        const component = await composer.addComponent({
          name: 'AlertFeed',
          path: '.alerts-overlay',
          data: { maxVisible: 3, displayDuration: 5000 }
        });
        await component.initialize();
        mainLogger.debug('AlertFeed component initialized for alerts page');
      } catch (error) {
        mainLogger.error('Failed to initialize AlertFeed:', error);
      }

      // Expose composer for debugging
      (window as any).ComponentComposer = composer;

      mainLogger.info('ComponentComposer initialized for alerts page');
    } else if (componentName === 'canvas-html') {
      mainLogger.debug('Initializing CanvasRenderer for canvas overlay');

      const composer = new ComponentComposer();
      const gridElement = document.getElementById('canvas-grid');

      if (!gridElement) {
        mainLogger.error('Canvas grid element (#canvas-grid) not found');
      } else {
        const renderer = new CanvasRenderer(gridElement, composer);
        await renderer.initialize();

        // Setup global functions for canvas too
        setupGlobalFunctions(composer);

        // Expose for debugging
        (window as any).canvasRenderer = renderer;
        (window as any).debugCanvas = () => renderer.debug();
      }

      mainLogger.info('CanvasRenderer initialized');
    } else if (componentName === 'canvas-editor-html') {
      mainLogger.debug('Initializing CanvasRenderer for canvas editor');

      const composer = new ComponentComposer();
      const gridElement = document.getElementById('canvas-grid');

      if (!gridElement) {
        mainLogger.error('Canvas grid element (#canvas-grid) not found');
      } else {
        // Read layout name from URL query param (set by canvas-editor.js)
        const urlParams = new URLSearchParams(window.location.search);
        const canvasLayout = urlParams.get('canvasLayout') || 'default-canvas';
        const renderer = new CanvasRenderer(gridElement, composer, canvasLayout);
        await renderer.initialize();

        setupGlobalFunctions(composer);

        (window as any).canvasRenderer = renderer;
        (window as any).debugCanvas = () => renderer.debug();
      }

      mainLogger.info('CanvasRenderer initialized for editor');
    } else if (componentName === 'webgl-overlay') {
      mainLogger.info('Initializing WebGL overlay');

      const sceneManager = await initializeGLOverlay();

      // Expose for debugging
      (window as any).sceneManager = sceneManager;

      mainLogger.info('WebGL overlay initialized');
    } else {
      mainLogger.info(`Skipping ComponentComposer for ${componentName} - streamerbot connection active`);
    }

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
  // Get component name from body data attribute for dynamic identification
  const componentName = document.body.getAttribute('data-component') || 'unknown';

  const readyEvent = new CustomEvent('streamoverlay:ready', {
    detail: {
      component: componentName,
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
