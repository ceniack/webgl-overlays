/**
 * Main JavaScript Module for Compiled Component System
 * Single entry point with shared Streamer.bot client
 */

// Component JavaScript will be loaded via script tags
// Vite will handle bundling when these are included directly

/**
 * Global Shared Client Manager
 */
class ComponentComposer {
    constructor() {
        this.client = null;
        this.isConnected = false;
        this.components = new Map();
        this.retryAttempts = 0;
        this.maxRetries = 10;

        // Component Composer initializing...
    }

    async initialize() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            await new Promise(resolve => {
                document.addEventListener('DOMContentLoaded', resolve);
            });
        }

        // Initialize global shared client
        await this.initializeSharedClient();

        // Initialize all components with shared client
        await this.initializeComponents();

        console.log('✅ Component Composer fully initialized');
    }

    async initializeSharedClient() {
        // First, check if streamer-integration.js already created a working client
        let attempts = 0;
        while (!window.streamerbotClient && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (window.streamerbotClient) {
            console.log('✅ Found existing Streamer.bot client');
            this.client = window.streamerbotClient;
            this.isConnected = true; // Integration script handles connection

            // Make ComponentComposer available for integration script
            window.ComponentComposer = this;

            // Export compatibility functions for streamer-integration.js
            window.updateCounterFromGlobalVariable = this.updateCounterFromGlobalVariable.bind(this);
            window.loadBroadcasterProfileImage = this.loadBroadcasterProfileImage.bind(this);

            // CRITICAL FIX: When using shared client, we still need to be ready to receive events
            // The integration script will forward events to us via updateGlobalVariable()
            console.log('✅ ComponentComposer ready to receive events from integration script');

            // Skip connection setup since integration script handles it
            return;
        }

        // Fallback: Create new client if integration script didn't provide one

        // Wait for Streamer.bot client classes to be available
        let clientReady = false;
        attempts = 0;

        while (!clientReady && attempts < 50) {
            if (typeof Streamerbot !== 'undefined' && Streamerbot.Client) {
                clientReady = true;
                break;
            }
            if (typeof StreamerbotClient !== 'undefined') {
                window.Streamerbot = { Client: StreamerbotClient };
                clientReady = true;
                break;
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (!clientReady) {
            console.error('❌ Failed to find Streamer.bot client after 5 seconds');
            return;
        }

        // Create single shared client instance with correct configuration
        const ClientClass = Streamerbot.Client || StreamerbotClient;
        this.client = new ClientClass({
            host: '127.0.0.1',
            port: 8080,
            endpoint: '/',
            autoReconnect: true,
            retries: this.maxRetries,
            retryInterval: 1000
        });

        // Set up global client reference
        window.streamerbotClient = this.client;

        // Global event handlers
        this.client.on('Streamerbot.Connected', (data) => {
            console.log('🟢 Global Streamer.bot client connected:', data);
            this.isConnected = true;
            this.retryAttempts = 0;

            // Request initial data
            this.requestAllGlobalVariables();
        });

        this.client.on('Streamerbot.Disconnected', (data) => {
            console.log('🔴 Global Streamer.bot client disconnected:', data);
            this.isConnected = false;
        });

        this.client.on('Misc.GlobalVariableUpdated', (data) => {
            if (data.name && data.name.includes('counter')) {
                console.log(`Global variable updated: ${data.name} = ${data.newValue}`); // Debug counter updates
            }
            // Broadcast to all components
            this.broadcastToComponents('globalVariableUpdated', data);
        });

        // Platform events - broadcast to all components
        this.setupPlatformEventHandlers();

        // Connect
        await this.client.connect();
    }

    setupPlatformEventHandlers() {
        const platformEvents = [
            'Twitch.Follow', 'Twitch.Subscribe', 'Twitch.Cheer', 'Twitch.Raid',
            'YouTube.Subscribe', 'YouTube.SuperChat', 'YouTube.SuperSticker'
        ];

        platformEvents.forEach(eventName => {
            this.client.on(eventName, (data) => {
                this.broadcastToComponents('platformEvent', { type: eventName, data });
            });
        });
    }

    async requestAllGlobalVariables() {
        if (!this.client) return;

        const variableNames = [
            'broadcasterDisplayName', 'broadcasterUsername', 'broadcasterUserId',
            'broadcasterTwitchUrl', 'broadcasterProfileImageTrigger',
            'counter1', 'counter1label', 'counter2', 'counter2label',
            'counter3', 'counter3label', 'counter4', 'counter4label',
            'heartRate', 'heartRateStatus'
        ];

        for (const varName of variableNames) {
            try {
                const response = await this.client.getGlobalVariable(varName);
                if (response && response.value !== undefined) {
                    this.broadcastToComponents('globalVariableUpdated', {
                        name: varName,
                        newValue: response.value,
                        oldValue: null
                    });
                }
            } catch (error) {
                console.warn(`⚠️ Failed to get variable ${varName}:`, error);
            }
        }
    }

    broadcastToComponents(eventType, data) {
        this.components.forEach((component, name) => {
            try {
                if (component && typeof component.handleSharedEvent === 'function') {
                    component.handleSharedEvent(eventType, data);
                }
            } catch (error) {
                console.error(`❌ Error broadcasting to component ${name}:`, error);
            }
        });
    }

    async initializeComponents() {
        const componentInitializers = [
            {
                name: 'branding',
                selector: '.branding-component',
                factory: () => new CompiledBrandingComponent(this.client)
            },
            {
                name: 'counters',
                selector: '.counters-component',
                factory: () => new CompiledCountersComponent(this.client)
            },
            {
                name: 'heartRate',
                selector: '.heart-rate-component',
                factory: () => new CompiledHeartRateComponent(this.client)
            }
        ];

        const initPromises = componentInitializers.map(async ({ name, selector, factory }) => {
            try {
                const element = document.querySelector(selector);
                if (!element) {
                    console.log(`ℹ️ Component ${name} not found in DOM (selector: ${selector})`);
                    return null;
                }

                console.log(`🔄 Initializing ${name} component...`);
                const component = factory();

                if (!component || typeof component.initialize !== 'function') {
                    throw new Error(`Component ${name} missing initialize method`);
                }

                await component.initialize();
                this.components.set(name, component);
                console.log(`✅ ${name} component initialized successfully`);
                return component;
            } catch (error) {
                console.error(`❌ Failed to initialize ${name} component:`, error);
                console.error(`Stack trace:`, error.stack);
                return null;
            }
        });

        await Promise.allSettled(initPromises);

        const successCount = Array.from(this.components.values()).length;
        const totalCount = componentInitializers.length;
        console.log(`✅ Initialized ${successCount}/${totalCount} components`);
    }

    registerComponent(name, component) {
        this.components.set(name, component);
    }

    // Interface for integration script to send variable updates
    updateGlobalVariable(name, newValue, oldValue = null) {
        console.log(`🔗 ComponentComposer received update: ${name} = ${newValue}`);
        this.broadcastToComponents('globalVariableUpdated', {
            name: name,
            newValue: newValue,
            oldValue: oldValue
        });
    }

    // Compatibility function for streamer-integration.js
    updateCounterFromGlobalVariable(variableName, value) {
        // Extract actual value from Streamer.bot variable object
        let actualValue = value;
        if (typeof value === 'object' && value !== null && 'value' in value) {
            actualValue = value.value;
        }

        this.updateGlobalVariable(variableName, actualValue);
    }

    // Profile image loading compatibility function
    loadBroadcasterProfileImage(username) {
        const brandingComponent = this.components.get('branding');
        if (brandingComponent && typeof brandingComponent.loadProfileImage === 'function') {
            brandingComponent.loadProfileImage(username);
        } else {
            console.warn('⚠️ Branding component not found or missing loadProfileImage method');
        }
    }
}

/**
 * Compiled BroadcasterInfo Component
 */
class CompiledBrandingComponent {
    constructor(sharedClient) {
        this.client = sharedClient; // Use shared client, don't create new one
        this.container = document.querySelector('.branding-component');
        this.initialized = false;
        this.config = {
            broadcaster: {
                displayNameVariable: 'broadcasterDisplayName',
                usernameVariable: 'broadcasterUsername',
                userIdVariable: 'broadcasterUserId',
                twitchUrlVariable: 'broadcasterTwitchUrl',
                profileImageTriggerVariable: 'broadcasterProfileImageTrigger',
                defaultDisplayName: 'STREAMER',
                defaultUsername: 'streamer',
                defaultTwitchUrl: 'twitch.tv/streamer'
            }
        };
    }

    async initialize() {
        if (this.initialized) return;

        // Set defaults
        this.setDefaults();

        // Setup component-specific handlers
        this.setupEventHandlers();

        this.initialized = true;
    }

    setDefaults() {
        const nameEl = document.getElementById('profile-name');
        const linkEl = document.getElementById('profile-link');
        const fallbackEl = document.getElementById('profile-fallback');

        if (nameEl) nameEl.textContent = this.config.broadcaster.defaultDisplayName;
        if (linkEl) linkEl.textContent = this.config.broadcaster.defaultTwitchUrl;
        if (fallbackEl) fallbackEl.textContent = this.config.broadcaster.defaultDisplayName.charAt(0).toUpperCase();
    }

    setupEventHandlers() {
        // Component receives events from shared client via composer
    }

    handleSharedEvent(eventType, data) {
        if (eventType === 'globalVariableUpdated') {
            this.handleVariableUpdate(data.name, data.newValue);
        }
    }

    handleVariableUpdate(name, value) {
        switch (name) {
            case this.config.broadcaster.displayNameVariable:
                const nameEl = document.getElementById('profile-name');
                if (nameEl) nameEl.textContent = value || this.config.broadcaster.defaultDisplayName;
                break;

            case this.config.broadcaster.twitchUrlVariable:
                const linkEl = document.getElementById('profile-link');
                if (linkEl) linkEl.textContent = value || this.config.broadcaster.defaultTwitchUrl;
                break;

            case this.config.broadcaster.profileImageTriggerVariable:
                if (value) {
                    this.loadProfileImage(value);
                } else {
                    console.warn('⚠️ Profile image trigger is empty or null');
                }
                break;
        }
    }

    async loadProfileImage(username) {
        try {
            const response = await fetch(`https://decapi.me/twitch/avatar/${username}`);
            if (response.ok) {
                const avatarUrl = await response.text();  // DecAPI returns the URL as text
                const trimmedUrl = avatarUrl.trim();

                const imgEl = document.getElementById('profile-image');
                const fallbackEl = document.getElementById('profile-fallback');

                if (imgEl && fallbackEl && trimmedUrl && trimmedUrl !== 'User not found') {
                    imgEl.src = trimmedUrl;
                    imgEl.style.display = 'block';
                    fallbackEl.style.display = 'none';
                } else {
                    console.warn('⚠️ Invalid profile image URL or elements not found');
                }
            } else {
                console.warn('⚠️ DecAPI request failed:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('❌ Failed to load profile image:', error);
        }
    }
}

/**
 * Compiled CounterCarousel Component
 */
class CompiledCountersComponent {
    constructor(sharedClient) {
        this.client = sharedClient; // Use shared client
        this.container = document.querySelector('.counters-component');
        this.initialized = false;
        this.counters = new Map();
        this.currentSlide = 0;
    }

    async initialize() {
        if (this.initialized) return;

        // Initialize counter tracking
        this.initializeCounterTracking();

        // Setup carousel
        this.setupCarousel();

        this.initialized = true;
    }

    initializeCounterTracking() {
        for (let i = 1; i <= 4; i++) {
            this.counters.set(i, {
                value: 0,
                label: `Counter ${i}`,
                variable: `counter${i}`,
                labelVariable: `counter${i}label`
            });
        }
    }

    setupCarousel() {
        // Build initial carousel from hidden elements
        this.buildCarouselFromHiddenElements();

        // Start carousel rotation
        this.startCarouselRotation();
    }

    buildCarouselFromHiddenElements() {
        const track = document.getElementById('carousel-track');
        const indicators = document.getElementById('carousel-indicators');

        if (!track || !indicators) return;

        // Clear existing content
        track.innerHTML = '';
        indicators.innerHTML = '';

        // Build slides from counter data, reading current values from template
        let slideIndex = 0;
        this.counters.forEach((counter, index) => {
            // Read current values from existing template elements
            const templateValueEl = document.getElementById(`counter-counter${index}`);
            const templateLabelEl = document.getElementById(`counter${index}-label`);

            const currentValue = templateValueEl ? templateValueEl.textContent : counter.value;
            const currentLabel = templateLabelEl ? templateLabelEl.textContent : counter.label;

            // Update counter data with current values
            counter.value = currentValue;
            counter.label = currentLabel;

            // Create slide
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            slide.id = `slide-${index}`;

            slide.innerHTML = `
                <div class="counter-box">
                    <div class="counter-value" id="display-counter${index}">${currentValue}</div>
                    <div class="counter-label" id="display-counter${index}-label">${currentLabel}</div>
                </div>
            `;

            track.appendChild(slide);

            // Create indicator
            const indicator = document.createElement('div');
            indicator.className = `indicator ${slideIndex === 0 ? 'active' : ''}`;
            indicator.dataset.slide = slideIndex;
            indicators.appendChild(indicator);

            slideIndex++;
        });

        // Initialize carousel track to show first slide
        if (track && slideIndex > 0) {
            track.classList.add('manual-slide-0');
        }
    }

    startCarouselRotation() {
        this.rotationTimer = setInterval(() => {
            this.nextSlide();
        }, 3000); // Rotate every 3 seconds
    }

    nextSlide() {
        const track = document.getElementById('carousel-track');
        const indicators = document.querySelectorAll('.indicator');
        const slides = document.querySelectorAll('.carousel-slide');

        if (slides.length === 0) {
            console.warn('⚠️ No slides found for carousel');
            return;
        }

        // Remove current manual slide class
        if (track) {
            track.classList.remove(`manual-slide-${this.currentSlide}`);
        }

        // Remove current indicator active state
        if (indicators[this.currentSlide]) {
            indicators[this.currentSlide].classList.remove('active');
        }

        // Move to next slide
        this.currentSlide = (this.currentSlide + 1) % slides.length;

        // Apply new manual slide class (this moves the track)
        if (track) {
            track.classList.add(`manual-slide-${this.currentSlide}`);
        }

        // Set new indicator active state
        if (indicators[this.currentSlide]) {
            indicators[this.currentSlide].classList.add('active');
        }
    }

    handleSharedEvent(eventType, data) {
        if (eventType === 'globalVariableUpdated') {
            this.handleVariableUpdate(data.name, data.newValue);
        }
    }

    handleVariableUpdate(name, value) {
        // Update counter values and labels using existing template IDs
        for (let i = 1; i <= 4; i++) {
            const counter = this.counters.get(i);
            if (name === counter.variable) {
                counter.value = value;
                // Update both existing template element and carousel display element
                const templateEl = document.getElementById(`counter-counter${i}`);
                const displayEl = document.getElementById(`display-counter${i}`);
                if (templateEl) templateEl.textContent = value;
                if (displayEl) displayEl.textContent = value;
                console.log(`Counter ${i} updated: ${value}`); // Essential debugging
            } else if (name === counter.labelVariable) {
                counter.label = value;
                // Update both existing template element and carousel display element
                const templateLabelEl = document.getElementById(`counter${i}-label`);
                const displayLabelEl = document.getElementById(`display-counter${i}-label`);
                if (templateLabelEl) templateLabelEl.textContent = value;
                if (displayLabelEl) displayLabelEl.textContent = value;
                console.log(`Counter ${i} label updated: ${value}`); // Essential debugging
            }
        }
    }
}

/**
 * Compiled HealthMonitor Component
 */
class CompiledHeartRateComponent {
    constructor(sharedClient) {
        this.client = sharedClient; // Use shared client
        this.container = document.querySelector('.heart-rate-component');
        this.initialized = false;
        this.heartRate = null;
        this.status = 'Waiting for data...';
    }

    async initialize() {
        if (this.initialized) return;

        // Set defaults
        this.updateDisplay();

        this.initialized = true;
    }

    handleSharedEvent(eventType, data) {
        if (eventType === 'globalVariableUpdated') {
            this.handleVariableUpdate(data.name, data.newValue);
        }
    }

    handleVariableUpdate(name, value) {
        switch (name) {
            case 'heartRate':
                this.heartRate = value;
                this.updateDisplay();
                break;
            case 'heartRateStatus':
                this.status = value || 'Waiting for data...';
                this.updateDisplay();
                break;
        }
    }

    updateDisplay() {
        const valueEl = document.getElementById('heart-rate-value');
        const statusEl = document.getElementById('heart-rate-status');

        if (valueEl) {
            valueEl.textContent = this.heartRate || '--';
        }

        if (statusEl) {
            statusEl.textContent = this.status;
        }
    }
}

// Initialize the composer when page loads
const composer = new ComponentComposer();
composer.initialize().catch(error => {
    console.error('❌ Failed to initialize Component Composer:', error);
});

// Export for debugging
window.ComponentComposer = composer;