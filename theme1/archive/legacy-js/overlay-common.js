// ===== STREAM OVERLAY COMMON JAVASCRIPT =====

// Check if debug mode enabled via URL query string
const urlParams = new URLSearchParams(window.location.search);
const debugMode = urlParams.has('debug');

// Debug message buffer for messages logged before WebSocket connects
window.debugMessageBuffer = [];

if (debugMode) {
    // Enhanced universal console capture with multiple delivery channels
    function sendDebugMessage(message, isError = false, source = 'browser') {
        const logEntry = {
            type: 'browser_log',
            message: isError ? `ERROR: ${message}` : message,
            source: source,
            url: window.location.href,
            timestamp: new Date().toISOString()
        };

        // Try overlay WebSocket first (primary channel)
        if (window.overlayWS && window.overlayWS.isConnected) {
            window.overlayWS.send(logEntry);
            return;
        }

        // Fallback to HTTP POST when WebSocket unavailable
        fetch('/api/debug-log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(logEntry)
        }).catch(() => {
            // Buffer if both fail
            window.debugMessageBuffer.push(logEntry);
        });
    }

    // Make sendDebugMessage globally available for other modules
    window.sendDebugMessage = sendDebugMessage;

    // Store original console methods to ensure browser display works
    const originalBrowserLog = console.log.bind(console);
    const originalBrowserError = console.error.bind(console);

    // Override console.log with enhanced source detection
    console.log = function(...args) {
        // ALWAYS call original console first to ensure browser display
        originalBrowserLog(...args);

        const message = args.join(' ');

        // Enhanced streamer.bot message detection
        const isStreamerbotMessage = (
            message.includes('Streamer.bot') ||
            message.includes('StreamerbotIntegration') ||
            message.includes('🎮 Streamer.bot integration') ||
            message.includes('❤️') ||  // Follow events
            message.includes('⭐') ||  // Subscribe events
            message.includes('💎') ||  // Cheer events
            message.includes('🚀') ||  // Raid events
            message.includes('🔌') ||  // Connection events
            message.includes('✅ Connected to Streamer.bot') ||
            message.includes('📨 Forwarding event') ||
            message.includes('🎬 Triggering action') ||
            /^(🔧|📊|⏰|🧪|📝|❌|🎯|📋)/.test(message) // Debug test patterns
        );

        const source = isStreamerbotMessage ? 'streamerbot' : 'browser';
        sendDebugMessage(message, false, source);
    };

    // Override console.error with enhanced source detection
    console.error = function(...args) {
        // ALWAYS call original console first to ensure browser display
        originalBrowserError(...args);

        const message = args.join(' ');

        // Detect streamer.bot errors and tag appropriately
        const source = (message.includes('Streamer.bot') ||
                       message.includes('StreamerbotClient') ||
                       message.includes('client error')) ? 'streamerbot' : 'browser';

        sendDebugMessage(message, true, source);
    };

    // Enhanced flush function with HTTP fallback support
    window.flushDebugBuffer = function() {
        if (window.debugMessageBuffer.length > 0) {
            console.log(`📤 Flushing ${window.debugMessageBuffer.length} buffered debug messages`);

            // Try WebSocket first
            if (window.overlayWS && window.overlayWS.isConnected) {
                window.debugMessageBuffer.forEach(msg => window.overlayWS.send(msg));
                window.debugMessageBuffer = [];
            } else {
                // Use HTTP fallback for buffered messages
                const messagesToFlush = [...window.debugMessageBuffer];
                window.debugMessageBuffer = [];

                messagesToFlush.forEach(logEntry => {
                    fetch('/api/debug-log', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(logEntry)
                    }).catch(() => {
                        // If HTTP also fails, put back in buffer
                        window.debugMessageBuffer.push(logEntry);
                    });
                });
            }
        }
    };
}

// Global configuration
const OverlayConfig = {
    websocket: {
        url: 'ws://localhost:3000',
        reconnectDelay: 5000,
        maxReconnectAttempts: 10
    },
    streamerbot: {
        host: 'localhost',
        port: 8080,
        endpoints: {
            actions: '/api/actions',
            events: '/api/events',
            websocket: 'ws://localhost:8080/'
        }
    },
    ui: {
        notificationDuration: 5000,
        animationDuration: 500,
        maxChatMessages: 50,
        maxAlertQueue: 10
    }
};

// ===== WEBSOCKET CONNECTION MANAGER =====

class WebSocketManager {
    constructor(url = OverlayConfig.websocket.url) {
        this.url = url;
        this.ws = null;
        this.reconnectAttempts = 0;
        this.isConnected = false;
        this.reconnectTimer = null;
        this.eventHandlers = new Map();
        this.onConnectionChange = null;

        this.connect();
    }

    connect() {
        try {
            this.ws = new WebSocket(this.url);
            this.setupEventHandlers();
        } catch (error) {
            console.error('Failed to create WebSocket connection:', error);
            this.scheduleReconnect();
        }
    }

    setupEventHandlers() {
        this.ws.onopen = () => {
            console.log('✅ WebSocket connected to', this.url);
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.onConnectionChange?.(true);

            // Flush any buffered debug messages
            if (typeof window.flushDebugBuffer === 'function') {
                window.flushDebugBuffer();
            }
        };

        this.ws.onmessage = async (event) => {
            try {
                let messageData = event.data;

                // Handle different data types
                if (messageData instanceof Blob) {
                    // Convert Blob to text
                    messageData = await messageData.text();
                } else if (messageData instanceof ArrayBuffer) {
                    // Convert ArrayBuffer to text
                    messageData = new TextDecoder().decode(messageData);
                }

                // Parse as JSON
                const data = JSON.parse(messageData);
                this.handleMessage(data);
            } catch (error) {
                console.error('❌ Failed to parse WebSocket message:', error, event.data);
            }
        };

        this.ws.onclose = (event) => {
            console.log('❌ WebSocket connection closed:', event.code, event.reason);
            this.isConnected = false;
            this.onConnectionChange?.(false);
            this.scheduleReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };
    }

    handleMessage(data) {
        // Broadcast to all registered event handlers
        const handlers = this.eventHandlers.get(data.type) || [];
        handlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error('❌ Error in event handler for', data.type, ':', error);
            }
        });

        // Also trigger generic 'message' handlers
        const messageHandlers = this.eventHandlers.get('message') || [];
        messageHandlers.forEach(handler => {
            try {
                handler(data);
            } catch (error) {
                console.error('❌ Error in message handler:', error);
            }
        });
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= OverlayConfig.websocket.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            return;
        }

        this.reconnectTimer = setTimeout(() => {
            this.reconnectAttempts++;
            console.log(`🔄 Reconnection attempt ${this.reconnectAttempts}...`);
            this.connect();
        }, OverlayConfig.websocket.reconnectDelay);
    }

    on(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    }

    off(eventType, handler) {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }

    send(data) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('⚠️ Cannot send message: WebSocket not connected');
        }
    }

    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        if (this.ws) {
            this.ws.close();
        }
    }
}

// ===== CUSTOM STREAMERBOT CLIENT REMOVED =====
// Official @streamerbot/client is used instead

// ===== UTILITY FUNCTIONS =====

class OverlayUtils {
    static formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    static formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static showNotification(text, type = 'info', duration = OverlayConfig.ui.notificationDuration) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = text;

        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Hide notification
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => document.body.removeChild(notification), 500);
        }, duration);
    }

    static animateElement(element, animation, duration = OverlayConfig.ui.animationDuration) {
        return new Promise(resolve => {
            element.style.animation = `${animation} ${duration}ms ease-out`;
            setTimeout(() => {
                element.style.animation = '';
                resolve();
            }, duration);
        });
    }

    static createElement(tag, className = '', textContent = '') {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (textContent) element.textContent = textContent;
        return element;
    }

    static updateProgress(progressElement, percentage, animated = true) {
        if (!progressElement) return;

        const clampedPercentage = Math.max(0, Math.min(100, percentage));

        if (animated) {
            progressElement.style.transition = 'width 1s ease-in-out';
        }

        progressElement.style.width = `${clampedPercentage}%`;
    }

    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // ===== SHARED PROFILE LOADING UTILITIES =====

    /**
     * Load broadcaster profile image with Streamer.bot integration fallback
     * @param {string} username - Twitch username (optional if using Streamer.bot)
     * @param {string} fallbackLetter - Fallback letter to show (default: first letter of username)
     * @param {HTMLElement} imageElement - Image element to populate
     * @param {HTMLElement} fallbackElement - Fallback element to show if image fails
     */
    static async loadBroadcasterProfile(username, fallbackLetter, imageElement, fallbackElement) {
        console.log('Loading broadcaster profile:', { username, fallbackLetter });

        // First try to get username from Streamer.bot global variables
        let actualUsername = username;
        if (!actualUsername && window.StreamerbotIntegration) {
            try {
                const variables = await window.StreamerbotIntegration.requestGlobalVariables();
                actualUsername = variables.broadcasterUsername || variables.broadcasterDisplayName;
                console.log('Got username from Streamer.bot:', actualUsername);
            } catch (error) {
                console.log('Could not get username from Streamer.bot:', error.message);
            }
        }

        if (!actualUsername) {
            console.log('No username available, showing fallback');
            this.showProfileFallback(fallbackElement, imageElement, fallbackLetter || 'S');
            return;
        }

        try {
            console.log('Fetching profile image for:', actualUsername);
            const response = await fetch(`https://decapi.me/twitch/avatar/${actualUsername}`);
            const url = (await response.text()).trim();

            if (url && url.startsWith('http')) {
                console.log('DecAPI returned URL:', url);

                if (imageElement) {
                    imageElement.onload = () => {
                        console.log('Profile image loaded successfully');
                        this.showProfileImage(imageElement, fallbackElement);
                    };

                    imageElement.onerror = () => {
                        console.error('Profile image failed to load');
                        this.showProfileFallback(fallbackElement, imageElement, fallbackLetter || actualUsername.charAt(0).toUpperCase());
                    };

                    imageElement.src = url;
                } else {
                    console.error('No image element provided');
                    this.showProfileFallback(fallbackElement, imageElement, fallbackLetter || actualUsername.charAt(0).toUpperCase());
                }
            } else {
                console.error('DecAPI returned invalid URL:', url);
                this.showProfileFallback(fallbackElement, imageElement, fallbackLetter || actualUsername.charAt(0).toUpperCase());
            }
        } catch (error) {
            console.error('Profile loading failed:', error);
            this.showProfileFallback(fallbackElement, imageElement, fallbackLetter || actualUsername.charAt(0).toUpperCase());
        }
    }

    /**
     * Show profile image and hide fallback
     */
    static showProfileImage(imageElement, fallbackElement) {
        if (imageElement) imageElement.style.display = 'block';
        if (fallbackElement) fallbackElement.style.display = 'none';
    }

    /**
     * Show profile fallback and hide image
     */
    static showProfileFallback(fallbackElement, imageElement, letter) {
        if (fallbackElement) {
            fallbackElement.textContent = letter;
            fallbackElement.style.display = 'block';
        }
        if (imageElement) imageElement.style.display = 'none';
    }

    /**
     * Get broadcaster name with Streamer.bot integration fallback
     * @param {string} fallbackName - Fallback name to use
     * @returns {Promise<string>} The broadcaster name
     */
    static async getBroadcasterName(fallbackName = 'Streamer') {
        // First try to get name from Streamer.bot global variables
        if (window.StreamerbotIntegration) {
            try {
                const variables = await window.StreamerbotIntegration.requestGlobalVariables();
                const name = variables.broadcasterDisplayName || variables.broadcasterUsername;
                if (name) {
                    console.log('Got broadcaster name from Streamer.bot:', name);
                    return name;
                }
            } catch (error) {
                console.log('Could not get broadcaster name from Streamer.bot:', error.message);
            }
        }

        console.log('Using fallback broadcaster name:', fallbackName);
        return fallbackName;
    }

    /**
     * Create particles animation for BRB screen
     * @param {HTMLElement} container - Container element for particles
     * @param {number} particleCount - Number of particles to create (default: 25)
     * @param {Array} colors - Array of color values (default: cyberpunk colors)
     */
    static createParticles(container, particleCount = 25, colors = ['#ff3366', '#a855f7', '#00d4ff']) {
        if (!container) {
            console.error('No particle container provided');
            return;
        }

        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';

            // Randomize position and timing
            particle.style.left = Math.random() * 100 + '%';
            particle.style.animationDelay = Math.random() * 12 + 's';
            particle.style.animationDuration = (8 + Math.random() * 8) + 's';

            // Randomize size slightly
            const size = 2 + Math.random() * 4;
            particle.style.width = size + 'px';
            particle.style.height = size + 'px';

            // Apply random color
            particle.style.background = colors[Math.floor(Math.random() * colors.length)];

            // Apply basic particle styles
            particle.style.position = 'absolute';
            particle.style.borderRadius = '50%';
            particle.style.opacity = '0.4';
            particle.style.animation = particle.style.animation || 'float-up 12s linear infinite';

            container.appendChild(particle);
        }

        console.log(`Created ${particleCount} particles in container`);
    }
}

// ===== OVERLAY BASE CLASS =====

class OverlayBase {
    constructor(overlayType = 'generic') {
        this.overlayType = overlayType;
        this.wsManager = null;
        this.isInitialized = false;
        this.eventHandlers = new Map();

        this.init();
    }

    async init() {
        console.log(`🚀 Initializing ${this.overlayType} overlay...`);

        // Initialize WebSocket connection for overlay server communication
        this.wsManager = new WebSocketManager();
        this.wsManager.onConnectionChange = (connected) => {
            this.onConnectionStatusChange(connected);
        };

        // Set up event forwarding
        this.setupEventForwarding();

        // Call overlay-specific initialization
        if (this.onInit) {
            await this.onInit();
        }

        this.isInitialized = true;
        console.log(`✅ ${this.overlayType} overlay initialized - Official @streamerbot/client handles Streamer.bot connection`);
    }

    setupEventForwarding() {
        // Forward WebSocket events to overlay handlers
        this.wsManager.on('message', (data) => {
            const handlers = this.eventHandlers.get(data.type) || [];
            handlers.forEach(handler => handler(data));
        });
    }

    on(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    }

    emit(eventType, data) {
        if (this.wsManager) {
            this.wsManager.send({ type: eventType, ...data });
        }
    }

    onConnectionStatusChange(connected) {
        console.log(`🔌 Connection status: ${connected ? 'Connected' : 'Disconnected'}`);

        // Update UI elements if they exist
        const statusElements = document.querySelectorAll('.connection-status');
        statusElements.forEach(element => {
            element.textContent = connected ? 'Connected' : 'Disconnected';
            element.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
        });
    }

    destroy() {
        if (this.wsManager) {
            this.wsManager.disconnect();
        }
        console.log(`🗑️ ${this.overlayType} overlay destroyed`);
    }
}

// ===== AUTO-INITIALIZATION =====

// Global instances
window.overlayWS = null;
window.overlayUtils = OverlayUtils;

// Initialize when DOM is loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOverlayCommon);
} else {
    initializeOverlayCommon();
}

function initializeOverlayCommon() {
    console.log('🎮 Overlay common JavaScript loaded');

    // Make utilities globally available
    window.OverlayUtils = OverlayUtils;
    window.WebSocketManager = WebSocketManager;
    window.OverlayBase = OverlayBase;
    window.OverlayConfig = OverlayConfig;

    // Initialize global WebSocket connection for overlay server communication
    window.overlayWS = new WebSocketManager();

    console.log('✅ Overlay common systems initialized - Streamer.bot connection handled by official client');
}

// ===== GLOBAL ERROR HANDLING =====

window.addEventListener('error', (event) => {
    console.error('❌ Global overlay error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('❌ Unhandled promise rejection in overlay:', event.reason);
});

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.overlayWS) {
        window.overlayWS.disconnect();
    }
});