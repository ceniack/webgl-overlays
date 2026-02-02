/**
 * Standalone Heart Rate Monitor Component
 * Integrates with Streamer.bot for real-time heart rate data
 */

class HeartRateMonitor {
    constructor() {
        this.heartRateTimeout = null;
        this.HEART_RATE_TIMEOUT = 15000; // 15 seconds no data = inactive
        this.lastHeartRateUpdate = 0;
        this.client = null;
        this.isConnected = false;

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        console.log('💓 Heart Rate Monitor initializing...');

        // Initialize monitor display
        this.initializeHeartRateMonitor();

        // Connect to Streamer.bot
        this.connectToStreamerbot();

        // Set up debug functions
        this.setupDebugFunctions();

        console.log('💓 Heart Rate Monitor initialized successfully');
    }

    initializeHeartRateMonitor() {
        const monitor = document.querySelector('.heart-rate-monitor');
        const heartRateContainer = document.querySelector('.heart-rate-container');

        if (!monitor || !heartRateContainer) {
            console.error('💓 Heart rate monitor elements not found');
            return;
        }

        // Start with default animation speed (60 BPM)
        monitor.style.setProperty('--animation-duration', '2.5s');
        heartRateContainer.classList.add('active');

        console.log('💓 CSS Heart rate monitor initialized - continuous animation started');
    }

    connectToStreamerbot() {
        // Check for both possible exports
        const ClientClass = typeof StreamerbotClient !== 'undefined' ? StreamerbotClient :
                           typeof Streamerbot !== 'undefined' && Streamerbot.Client ? Streamerbot.Client : null;

        if (!ClientClass) {
            console.error('💓 Streamer.bot client not found. Make sure streamerbot-client.js is loaded.');
            console.log('💓 Available globals:', {
                StreamerbotClient: typeof StreamerbotClient,
                Streamerbot: typeof Streamerbot,
                StreamerbotClientClass: typeof Streamerbot?.Client
            });
            this.setStatus('Streamer.bot client library not found');

            // Enable test mode if Streamer.bot client is not available
            this.enableTestMode();
            return;
        }

        try {
            // Configure Streamer.bot client (using correct format from original)
            const config = {
                host: '127.0.0.1',
                port: 8080,
                endpoint: '/',             // Correct: matches Streamer.bot server
                immediate: false,          // Prevent premature connections
                autoReconnect: true,
                retries: 5,                // Reduced retry count
                retryInterval: 2000        // Increased retry interval
            };

            console.log('💓 Creating client with config:', config);
            console.log('💓 Using client class:', ClientClass.name);

            // Create and initialize client
            this.client = new ClientClass(config);

            // Set up event handlers
            this.setupEventHandlers();

            // Connect to Streamer.bot
            this.client.connect();

            console.log(`💓 Connecting to Streamer.bot at ws://${config.host}:${config.port}${config.endpoint}...`);

            // Add connection timeout
            setTimeout(() => {
                if (!this.isConnected) {
                    console.warn('💓 Connection timeout after 10 seconds - enabling test mode');
                    this.setStatus('Connection timeout - using test mode');
                    this.enableTestMode();
                }
            }, 10000);
        } catch (error) {
            console.error('💓 Failed to connect to Streamer.bot:', error);
            this.setStatus('Connection failed - using test mode');

            // Enable test mode if connection fails
            this.enableTestMode();
        }
    }

    setupEventHandlers() {
        if (!this.client) return;

        // Connection events (using correct event names from original)
        this.client.on('WebsocketClient.Open', () => {
            this.isConnected = true;
            console.log('💓 Connected to Streamer.bot successfully');
            this.setStatus('Connected - Waiting for data...');
        });

        this.client.on('WebsocketClient.Close', (event) => {
            this.isConnected = false;
            console.log('💓 Disconnected from Streamer.bot');
            this.setStatus('Disconnected');
            this.setHeartRateInactive();
        });

        // Heart rate events (using correct event names)
        this.client.on('Raw.Action', (data) => {
            try {
                const eventData = data.data || {};
                const eventArgs = eventData.arguments || {};

                if (eventArgs.triggerName === 'heart_rate_pulse') {
                    console.log('💓 Heart rate pulse received:', eventArgs);
                    const heartRate = eventArgs.heartRate || eventArgs.bpm;
                    if (heartRate) {
                        this.updateHeartRate(heartRate, eventArgs.measuredAt);
                    }
                }
            } catch (error) {
                console.error('💓 Error processing heart rate event:', error);
            }
        });

        // Global variable events (for alternative data source)
        this.client.on('Misc.GlobalVariableUpdated', (data) => {
            try {
                const variableName = data.name;
                const variableValue = data.newValue;

                if (variableName === 'heartRate' || variableName === 'heart_rate') {
                    const heartRate = parseInt(variableValue);
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

    updateHeartRateAnimation(heartRate, waitForCycle = false) {
        const monitor = document.querySelector('.heart-rate-monitor');
        if (!monitor) return;

        // Calculate new animation duration: 60 BPM = 2.5s baseline
        const newDuration = Math.max(0.5, Math.min(5.0, 60 / heartRate * 2.5));

        if (waitForCycle) {
            // Wait for current animation cycle to finish
            const currentDuration = parseFloat(getComputedStyle(monitor).getPropertyValue('--animation-duration')) || 2.5;

            const fadeIn = monitor.querySelector('.fade-in');
            const fadeOut = monitor.querySelector('.fade-out');

            if (fadeIn && fadeOut) {
                // Pause animations
                fadeIn.style.animationPlayState = 'paused';
                fadeOut.style.animationPlayState = 'paused';

                // Wait for next cycle start, then apply new duration
                setTimeout(() => {
                    monitor.style.setProperty('--animation-duration', `${newDuration}s`);
                    fadeIn.style.animationPlayState = 'running';
                    fadeOut.style.animationPlayState = 'running';
                }, currentDuration * 1000);
            }

            console.log(`💓 Animation speed will update to ${heartRate} BPM = ${newDuration.toFixed(1)}s cycle (waiting for current cycle)`);
        } else {
            // Dynamic real-time speed change with smooth transition
            const fadeIn = monitor.querySelector('.fade-in');
            const fadeOut = monitor.querySelector('.fade-out');

            if (fadeIn && fadeOut) {
                // Briefly pause to resync animations
                fadeIn.style.animationPlayState = 'paused';
                fadeOut.style.animationPlayState = 'paused';

                // Apply new duration immediately
                monitor.style.setProperty('--animation-duration', `${newDuration}s`);

                // Resume animations after a tiny delay to ensure sync
                setTimeout(() => {
                    fadeIn.style.animationPlayState = 'running';
                    fadeOut.style.animationPlayState = 'running';
                }, 10);
            }

            console.log(`💓 Animation speed updated: ${heartRate} BPM = ${newDuration.toFixed(1)}s cycle (real-time transition)`);
        }
    }

    updateHeartRate(heartRate, measuredAt) {
        const heartRateValue = document.getElementById('heart-rate-value');
        const heartRateStatus = document.getElementById('heart-rate-status');
        const heartRateContainer = document.querySelector('.heart-rate-container');

        if (!heartRateValue || !heartRateStatus || !heartRateContainer) {
            console.error('💓 Heart rate display elements not found');
            return;
        }

        // Validate heart rate value
        const validHeartRate = parseInt(heartRate);
        if (isNaN(validHeartRate) || validHeartRate <= 0 || validHeartRate > 300) {
            console.warn('💓 Invalid heart rate value:', heartRate);
            return;
        }

        // Update display values
        heartRateValue.textContent = validHeartRate;
        heartRateStatus.textContent = 'Live';

        // Update animation speed with smooth real-time transition
        this.updateHeartRateAnimation(validHeartRate, false); // false = real-time, true = wait for cycle

        // Mark as active
        heartRateContainer.classList.remove('inactive');
        heartRateContainer.classList.add('active');

        // Update timestamp and reset timeout
        this.lastHeartRateUpdate = Date.now();

        if (this.heartRateTimeout) {
            clearTimeout(this.heartRateTimeout);
        }

        this.heartRateTimeout = setTimeout(() => {
            this.setHeartRateInactive();
        }, this.HEART_RATE_TIMEOUT);

        console.log(`💓 Heart rate updated: ${validHeartRate} BPM - animation speed adjusted`);
    }

    setHeartRateInactive() {
        const heartRateStatus = document.getElementById('heart-rate-status');
        const heartRateContainer = document.querySelector('.heart-rate-container');

        if (heartRateStatus) {
            heartRateStatus.textContent = this.isConnected ? 'Waiting for data...' : 'Disconnected';
        }

        if (heartRateContainer) {
            heartRateContainer.classList.remove('active');
            heartRateContainer.classList.add('inactive');
        }

        console.log('💓 Heart rate monitor set to inactive state');
    }

    setStatus(message) {
        const heartRateStatus = document.getElementById('heart-rate-status');
        if (heartRateStatus) {
            heartRateStatus.textContent = message;
        }
    }

    // Test functions for development
    testHeartRate(bpm = 75) {
        console.log(`💓 Testing heart rate with ${bpm} BPM`);
        this.updateHeartRate(bpm, new Date().toISOString());
    }

    testHeartRateSequence() {
        console.log('💓 Starting heart rate test sequence...');
        const sequence = [60, 75, 90, 120, 100, 80, 65];
        let index = 0;

        const testInterval = setInterval(() => {
            if (index >= sequence.length) {
                clearInterval(testInterval);
                console.log('💓 Test sequence completed');
                return;
            }

            this.testHeartRate(sequence[index]);
            index++;
        }, 3000);
    }

    enableTestMode() {
        console.log('💓 Enabling test mode - Streamer.bot client not available');
        this.setStatus('Test mode - Use testHeartRate() to simulate data');

        // Start with a demo heart rate
        setTimeout(() => {
            this.testHeartRate(75);
        }, 2000);
    }

    setupDebugFunctions() {
        // Global debug functions
        window.heartRateMonitor = this;

        window.debugHeartRate = () => {
            console.log('💓 Heart Rate Monitor Debug Info:');
            console.log('- Connected:', this.isConnected);
            console.log('- Last update:', new Date(this.lastHeartRateUpdate).toLocaleTimeString());
            console.log('- Current BPM:', document.getElementById('heart-rate-value')?.textContent);
            console.log('- Status:', document.getElementById('heart-rate-status')?.textContent);

            const container = document.querySelector('.heart-rate-container');
            console.log('- State:', container?.classList.contains('active') ? 'Active' : 'Inactive');
        };

        window.testHeartRate = (bpm) => this.testHeartRate(bpm);
        window.testHeartRateSequence = () => this.testHeartRateSequence();

        console.log('💓 Debug functions registered: debugHeartRate(), testHeartRate(bpm), testHeartRateSequence()');
    }
}

// Initialize the heart rate monitor when script loads
new HeartRateMonitor();