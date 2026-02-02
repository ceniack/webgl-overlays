// ===== CLEAN EXAMPLE.HTML STREAMER.BOT INTEGRATION =====
// Single source of truth for Streamer.bot communication using official @streamerbot/client

console.log('🎮 Streamer.bot integration loading for clean example.html system');

// Official client configuration (replaced by inline config with callbacks)

// Global variable configuration for example.html
const ExampleHtmlVariables = {
    basic: [
        'counter1', 'counter1label',
        'counter2', 'counter2label',
        'broadcasterDisplayName', 'broadcasterUsername',
        'broadcasterUserId', 'broadcasterTwitchUrl',
        'broadcasterProfileImageTrigger',
        'broadcasterProfileImageUrl', 'broadcasterDescription'
    ],
    goals: {
        activeTypesVariable: 'activeGoalTypes',
        supportedTypes: ['Follower', 'Subscription', 'Bit', 'Donation', 'Raid', 'Host', 'Viewer']
    },
    chat: {
        enabled: true,
        maxMessages: 50,
        platforms: ['twitch', 'youtube'],
        showTimestamps: true,
        showPlatformIcons: true
    }
};

// ===== COMPONENT READINESS COORDINATION SYSTEM =====
// Event-driven coordination between integration script and components

let componentReadyState = {
    exampleHtml: false,
    dataProcessingPending: false
};

// Store data for processing when components are ready
let pendingVariables = {};

// Listen for namespaced readiness events
window.addEventListener('streamoverlay:ready', (event) => {
    const { component, timestamp, functions } = event.detail;
    console.log(`🔔 Component ready: ${component} at ${timestamp}`);

    if (component === 'example-html') {
        componentReadyState.exampleHtml = true;
        console.log('✅ Example.html functions available:', functions);

        // If we have pending data to process, do it now
        if (componentReadyState.dataProcessingPending) {
            console.log('🔄 Processing pending initial data...');
            processInitialVariables(pendingVariables);
        }

        // Retry pending profile image load if we stored one earlier
        if (window._pendingProfileImageLoad && typeof window.loadBroadcasterProfileImage === 'function') {
            console.log('🖼️ Retrying profile image load after ready event for:', window._pendingProfileImageLoad);
            window.loadBroadcasterProfileImage(window._pendingProfileImageLoad);
            window._pendingProfileImageLoad = null;
        }
    }
});

function storeVariablesForProcessing(variables) {
    pendingVariables = variables;
    componentReadyState.dataProcessingPending = true;

    // If example.html is already ready, process immediately
    if (componentReadyState.exampleHtml) {
        processInitialVariables(pendingVariables);
        return;
    }

    // NEW: Fallback timeout to prevent permanent blocking
    setTimeout(() => {
        if (componentReadyState.dataProcessingPending) {
            console.warn('⚠️ Timeout waiting for streamoverlay:ready, processing variables anyway');
            processInitialVariables(pendingVariables);
        }
    }, 2000); // 2 second fallback
}

function processInitialVariables(allVariables) {
    console.log('🔄 Processing variables with enhanced error handling...');

    // Process all variables from the bulk response
    for (const [variableName, variableValue] of Object.entries(allVariables)) {
        console.log(`📥 Processing ${variableName} = ${variableValue}`);

        // Enhanced error handling - replace silent failures with detailed diagnostics
        if (typeof window.updateCounterFromGlobalVariable === 'function') {
            if (variableName === 'broadcasterProfileImageTrigger') {
                if (variableValue && variableValue.trim() !== '') {
                    if (typeof window.loadBroadcasterProfileImage === 'function') {
                        window.loadBroadcasterProfileImage(variableValue.trim());
                        console.log(`✅ Updated ${variableName} = ${variableValue}`);
                    } else {
                        console.error(`❌ loadBroadcasterProfileImage not available for ${variableName} = ${variableValue}`);
                    }
                }
            } else if (variableName === 'activeGoalTypes') {
                if (typeof window.requestGoalVariables === 'function') {
                    window.requestGoalVariables(variableValue);
                    console.log(`✅ Updated ${variableName} = ${variableValue}`);
                } else {
                    console.error(`❌ requestGoalVariables not available for ${variableName} = ${variableValue}`);
                }
            } else if (variableName.includes('toggle')) {
                // Defer toggle variables until carousel initialization completes
                setTimeout(() => {
                    if (typeof window.updateCounterFromGlobalVariable === 'function') {
                        window.updateCounterFromGlobalVariable(variableName, variableValue);
                        console.log(`✅ Deferred toggle update: ${variableName} = ${variableValue}`);
                    } else {
                        console.error(`❌ updateCounterFromGlobalVariable not available for deferred toggle: ${variableName}`);
                    }
                }, 1500); // Wait for carousel 1000ms + 500ms buffer
                console.log(`⏰ Deferred toggle variable: ${variableName} = ${variableValue}`);
            } else {
                window.updateCounterFromGlobalVariable(variableName, variableValue);
                console.log(`✅ Updated ${variableName} = ${variableValue}`);
            }
        } else {
            console.error(`❌ updateCounterFromGlobalVariable not available for ${variableName} = ${variableValue}`);
            console.log('🔍 Available window functions:', Object.keys(window).filter(k => k.includes('update')));
        }
    }

    // Clear pending state
    componentReadyState.dataProcessingPending = false;
    pendingVariables = {};
    console.log('✅ Enhanced variable processing complete');
}

// Connection state tracking to prevent race conditions
let initializationState = {
    connected: false,
    globalsLoaded: false,
    broadcasterLoaded: false,
    ready: false
};

// Client readiness verification
async function waitForClientReady(client, maxWait = 1000) {
    const startTime = Date.now();
    console.log('🔍 Verifying client readiness...');

    while (Date.now() - startTime < maxWait) {
        try {
            // Test with lightweight API call to verify client is ready
            const info = await client.getInfo();
            console.log('✅ Client ready verification successful');
            return true;
        } catch (error) {
            // Wait 10ms before retry
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    console.log('⚠️ Client readiness timeout after', maxWait, 'ms - proceeding anyway');
    return false; // Timeout - proceed anyway with fallback
}

// Initialize official client when available
function initializeStreamerbotClient() {
    if (typeof StreamerbotClient === 'undefined') {
        console.error('❌ Official @streamerbot/client not available');
        return null;
    }

    console.log('🚀 Initializing official @streamerbot/client for example.html...');

    // CRITICAL FIX: Use correct configuration with callbacks
    const streamerbotConfig = {
        host: '127.0.0.1',
        port: 8080,
        endpoint: '/',
        immediate: false,        // Don't auto-connect
        autoReconnect: true,
        retries: 5,
        retryInterval: 2000,
        onConnect: (data) => {
            console.log('✅ Connected to Streamer.bot');
            console.log('Instance:', data);
            initializationState.connected = true;
            // Start data retrieval
            requestInitialData();
        },
        onDisconnect: () => {
            console.log('❌ Disconnected from Streamer.bot');
            initializationState.connected = false;
            // Reset tracking for next connection
            subscriptionAttempts = 0;
            subscriptionSuccess = false;
            initializationState = {
                connected: false,
                globalsLoaded: false,
                broadcasterLoaded: false,
                ready: false
            };
            console.log('🔄 Initialization state reset for reconnection');
        },
        onError: (error) => {
            console.error('❌ Connection error:', error);
        }
    };

    // Initialize official client with proper callbacks
    const streamerbotClient = new StreamerbotClient(streamerbotConfig);

    console.log('✅ Streamer.bot client created with proper callback configuration');
    return streamerbotClient;
}

// Setup event listeners on the provided client reference
function setupEventListeners(client) {
    // CRITICAL FIX: Register event listeners IMMEDIATELY (before connection)
    console.log('🔄 Registering event listeners BEFORE connection...');
    setupGlobalVariableEventHandler(client);
    setupPlatformEventHandlers(client);

    // Connection events (for debugging and state tracking)
    client.on('WebsocketClient.Open', async () => {
        console.log('✅ Connected to Streamer.bot via official client');
        console.log('🔄 Event listeners already registered, connection established');
        subscriptionAttempts++;
        initializationState.connected = true;

        // TIMING FIX: Minimal delay with client readiness verification
        setTimeout(async () => {
            const startTime = Date.now();
            console.log('🚀 Attempting initial data retrieval with optimized timing...');

            // Verify client readiness before API calls
            const clientReady = await waitForClientReady(client);
            if (!clientReady) {
                console.log('⚠️ Proceeding with API calls despite client readiness timeout');
            }

            // 1. Get all global variables first
            const bulkSuccess = await requestInitialGlobalVariablesBulk(client);
            initializationState.globalsLoaded = bulkSuccess;

            if (!bulkSuccess) {
                console.log('🔄 Bulk method failed, using individual fallback approach...');
                await requestInitialGlobalVariables(client);
                initializationState.globalsLoaded = true; // Set to true after fallback
            }

            // 2. Get broadcaster information using getBroadcaster API
            console.log('📺 Attempting getBroadcaster() API call...');
            const broadcasterSuccess = await requestBroadcasterInfo(client);
            initializationState.broadcasterLoaded = broadcasterSuccess;

            if (!broadcasterSuccess) {
                console.log('📺 getBroadcaster() not available or failed, using global variables for broadcaster info');
            } else {
                console.log('✅ getBroadcaster() succeeded - broadcaster name should be updated');
                console.log('🔍 You should see real broadcaster name instead of "STREAMER" in overlay');
            }

            // Mark initialization as ready
            initializationState.ready = true;
            const totalTime = Date.now() - startTime;
            console.log('✅ Initial data loading completed in', totalTime, 'ms');
            console.log('📊 Initialization state:', initializationState);

            // 3. Test API methods for debugging (reduced delay)
            setTimeout(() => {
                console.log('🧪 Running API tests...');
                testGetGlobals(client);
                testGetBroadcaster(client);
            }, 100); // Reduced from 500ms to 100ms
        }, 200); // TIMING FIX: Increased from 50ms to 200ms - allows client to be fully ready
    });

    client.on('WebsocketClient.Close', (event) => {
        console.log('❌ Disconnected from Streamer.bot via official client');
        console.log('🔍 Close event code:', event?.code || 'Unknown', 'reason:', event?.reason || 'Unknown');

        // Enhanced error detection via close codes
        if (event?.type === 'error' || !event?.wasClean) {
            console.error('❌ Connection closed due to error');
        }

        // Reset will be handled by onDisconnect callback
    });

    console.log('✅ Connection event handlers set up');
}

// CRITICAL FIX: Global variable event handler (registered BEFORE connection)
function setupGlobalVariableEventHandler(client) {
    // Global Variable Updates (critical for ComponentComposer integration)
    client.on('Misc.GlobalVariableUpdated', ({ event, data }) => {
        console.log('🔄 GlobalVariableUpdated event received');
        console.log('Event:', event);  // { source: 'Misc', type: 'GlobalVariableUpdated' }
        console.log('Data:', data);    // Variable data payload

        const variableName = data.name;
        const variableValue = data.newValue;

        if (variableName && variableValue !== undefined) {
            console.log('🔄 GlobalVariableUpdated:', variableName, '=', variableValue);

            // Attempt to forward to ComponentComposer with retry logic for timing issues
            forwardToComponentComposer(variableName, variableValue, data.oldValue);

            // Forward to example.html handlers (compatibility)
            if (typeof handleGlobalVariableUpdate === 'function') {
                handleGlobalVariableUpdate({
                    data: { name: variableName, newValue: variableValue }
                });
            }
        }
    });

    console.log('✅ Global variable event handler registered BEFORE connection');
}

// Direct label update fallback for when ComponentComposer fails
function attemptDirectLabelUpdate(variableName, value) {
    // Direct DOM update for counter labels when ComponentComposer fails
    const counterMatch = variableName.match(/counter(\d+)label/);
    if (counterMatch) {
        const counterNum = counterMatch[1];
        const labelElement = document.getElementById(`counter${counterNum}-label`);
        if (labelElement) {
            labelElement.textContent = value;
            console.log(`✅ Direct label update: ${variableName} = ${value}`);
            return true;
        }
    }

    // Direct DOM update for broadcaster info when ComponentComposer fails
    if (variableName === 'broadcasterDisplayName') {
        const nameElement = document.getElementById('profile-name');
        const fallbackElement = document.getElementById('profile-fallback');
        if (nameElement) {
            nameElement.textContent = value;
            console.log(`✅ Direct broadcaster name update: ${value}`);
            if (fallbackElement) {
                fallbackElement.textContent = value.charAt(0).toUpperCase();
            }
            return true;
        }
    }

    if (variableName === 'broadcasterUsername') {
        const linkElement = document.getElementById('profile-link');
        if (linkElement) {
            linkElement.textContent = `twitch.tv/${value}`;
            console.log(`✅ Direct broadcaster username update: ${value}`);
            return true;
        }
    }

    return false;
}

// Helper function to forward events to ComponentComposer with retry logic
function forwardToComponentComposer(variableName, variableValue, oldValue, retryCount = 0) {
    const maxRetries = 5; // Increased attempts

    if (window.ComponentComposer && typeof window.ComponentComposer.updateGlobalVariable === 'function') {
        console.log('📨 Forwarding to ComponentComposer:', variableName, '=', variableValue);
        window.ComponentComposer.updateGlobalVariable(variableName, variableValue, oldValue);
    } else if (retryCount < maxRetries) {
        // Reduced delay: 50ms first, then escalating
        const delay = retryCount === 0 ? 50 : Math.min(100 * retryCount, 500);
        console.warn(`⚠️ ComponentComposer not ready, retry ${retryCount + 1}/${maxRetries} in ${delay}ms`);
        setTimeout(() => {
            forwardToComponentComposer(variableName, variableValue, oldValue, retryCount + 1);
        }, delay);
    } else {
        console.error(`❌ ComponentComposer not available after ${maxRetries} retries`);

        // Direct DOM fallback for critical updates
        if (variableName.includes('label') || variableName.includes('broadcaster')) {
            attemptDirectLabelUpdate(variableName, variableValue);
        }
        console.log('🔍 Final ComponentComposer status:', {
            exists: !!window.ComponentComposer,
            hasMethod: !!(window.ComponentComposer && window.ComponentComposer.updateGlobalVariable),
            methodType: typeof window.ComponentComposer?.updateGlobalVariable
        });
    }
}

// Request initial global variables for example.html
async function requestInitialGlobalVariables(client) {
    console.log('📥 Requesting initial global variables for example.html...');

    // Request basic variables
    for (const variable of ExampleHtmlVariables.basic) {
        try {
            const response = await client.getGlobal(variable);
            const value = response.variable;
            console.log(`📥 Got initial value for ${variable} =`, value);

            // Update example.html counter system
            if (typeof window.updateCounterFromGlobalVariable === 'function') {
                if (variable === 'broadcasterProfileImageTrigger') {
                    if (value && value.trim() !== '') {
                        if (typeof window.loadBroadcasterProfileImage === 'function') {
                            window.loadBroadcasterProfileImage(value.trim());
                        }
                    }
                } else if (variable === 'activeGoalTypes') {
                    if (typeof window.requestGoalVariables === 'function') {
                        window.requestGoalVariables(value);
                    }
                } else {
                    window.updateCounterFromGlobalVariable(variable, value);
                }
            }
        } catch (error) {
            console.warn(`⚠️ Failed to get initial ${variable}:`, error);
        }
    }

    // Request activeGoalTypes separately
    try {
        const response = await client.getGlobal(ExampleHtmlVariables.goals.activeTypesVariable);
        const activeGoalTypes = response.variable;
        console.log('🎯 Got initial activeGoalTypes:', activeGoalTypes);
        if (typeof requestGoalVariables === 'function') {
            requestGoalVariables(activeGoalTypes);
        }
    } catch (error) {
        console.warn('⚠️ Failed to get initial activeGoalTypes:', error);
    }
}

// Setup platform event handlers that map to example.html format
function setupPlatformEventHandlers(client) {
    // Twitch Events
    client.on('Twitch.Follow', (data) => {
        if (typeof window.handleStreamerBotEvent === 'function') {
            window.handleStreamerBotEvent({
                event: { source: 'Raw', type: 'Action' },
                data: {
                    arguments: {
                        triggerName: 'Follow',
                        eventSource: 'Twitch',
                        user: data.user?.display_name || data.user_name,
                        display: data.user?.display_name || data.user_name
                    }
                }
            });
        }
    });

    client.on('Twitch.Subscribe', (data) => {
        if (typeof window.handleStreamerBotEvent === 'function') {
            window.handleStreamerBotEvent({
                event: { source: 'Raw', type: 'Action' },
                data: {
                    arguments: {
                        triggerName: 'Subscribe',
                        eventSource: 'Twitch',
                        user: data.user?.display_name || data.user_name,
                        display: data.user?.display_name || data.user_name,
                        tier: data.tier
                    }
                }
            });
        }
    });

    client.on('Twitch.Cheer', (data) => {
        if (typeof window.handleStreamerBotEvent === 'function') {
            window.handleStreamerBotEvent({
                event: { source: 'Raw', type: 'Action' },
                data: {
                    arguments: {
                        triggerName: 'Cheer',
                        eventSource: 'Twitch',
                        user: data.user?.display_name || data.user_name,
                        display: data.user?.display_name || data.user_name,
                        bits: data.bits,
                        message: data.message
                    }
                }
            });
        }
    });

    client.on('Twitch.Raid', (data) => {
        if (typeof window.handleStreamerBotEvent === 'function') {
            window.handleStreamerBotEvent({
                event: { source: 'Raw', type: 'Action' },
                data: {
                    arguments: {
                        triggerName: 'Raid',
                        eventSource: 'Twitch',
                        user: data.from_broadcaster_user_name,
                        display: data.from_broadcaster_user_name,
                        viewers: data.viewers
                    }
                }
            });
        }
    });

    // YouTube Events
    client.on('YouTube.Subscribe', (data) => {
        if (typeof window.handleStreamerBotEvent === 'function') {
            window.handleStreamerBotEvent({
                event: { source: 'Raw', type: 'Action' },
                data: {
                    arguments: {
                        triggerName: 'Subscribe',
                        eventSource: 'YouTube',
                        user: data.user?.display_name || data.user_name,
                        display: data.user?.display_name || data.user_name
                    }
                }
            });
        }
    });

    client.on('YouTube.SuperChat', (data) => {
        if (typeof window.handleStreamerBotEvent === 'function') {
            window.handleStreamerBotEvent({
                event: { source: 'Raw', type: 'Action' },
                data: {
                    arguments: {
                        triggerName: 'Donation',
                        eventSource: 'YouTube',
                        user: data.user?.display_name || data.user_name,
                        display: data.user?.display_name || data.user_name,
                        amount: data.amount,
                        message: data.message
                    }
                }
            });
        }
    });

    // Raw.Action handler for chat messages and other non-platform events
    client.on('Raw.Action', (data) => {
        const eventData = data.data || {};
        const eventArgs = eventData.arguments || {};

        // Enhanced debugging for all Raw.Action events
        console.log('🔍 Raw.Action event received:', {
            triggerName: eventArgs.triggerName,
            allArgs: eventArgs ? Object.keys(eventArgs) : 'no args',
            heartRateFields: {
                heartRate: eventArgs.heartRate,
                bpm: eventArgs.bpm,
                pulse: eventArgs.pulse
            }
        });

        // Process chat messages AND heartbeat events via Raw.Action
        console.log('🔍 [DEBUG] Checking event forwarding for:', eventArgs.triggerName);
        console.log('🔍 [DEBUG] window.ComponentComposer exists:', !!window.ComponentComposer);

        if (window.ComponentComposer) {
            // Process heartbeat events using modern ComponentComposer API
            const isHeartbeat = eventArgs.triggerName === 'Heart Rate Pulse' ||
                               eventArgs.triggerName === 'heart_rate_pulse' ||
                               eventArgs.triggerName?.toLowerCase().includes('heart') ||
                               eventArgs.triggerName?.toLowerCase().includes('pulse');

            console.log('🔍 [DEBUG] Is heartbeat event:', isHeartbeat);

            if (isHeartbeat) {
                const heartRate = eventArgs.heartRate || eventArgs.bpm || eventArgs.pulse;
                console.log('💓 Processing heartbeat via ComponentComposer:', eventArgs.triggerName, 'HR:', heartRate);

                if (heartRate && !isNaN(heartRate)) {
                    // Update heartRate global variable via ComponentComposer
                    window.ComponentComposer.updateGlobalVariable('heartRate', heartRate);
                    window.ComponentComposer.updateGlobalVariable('heartRateStatus', 'Live');
                    console.log('✅ Heartbeat data sent to ComponentComposer:', heartRate + ' BPM');
                } else {
                    console.warn('⚠️ Invalid heartbeat data:', {
                        triggerName: eventArgs.triggerName,
                        heartRate: eventArgs.heartRate,
                        bmp: eventArgs.bmp,
                        pulse: eventArgs.pulse
                    });
                }
            } else {
                console.log('🔍 [DEBUG] Event filtered out (not heartbeat):', eventArgs.triggerName);
            }
            // Chat messages and other events can be handled via ComponentComposer.broadcastToComponents if needed
            // Note: Global variable updates are handled by proper Misc.GlobalVariableUpdated events
            // Note: Platform events (Follow, Subscribe, etc.) are handled by proper platform event handlers
        } else {
            console.log('🔍 [DEBUG] ComponentComposer not available - modern component system not loaded!');
        }
    });



    console.log('✅ Platform event handlers configured for example.html');
}

// Data initialization function called from onConnect callback
async function requestInitialData() {
    console.log('🚀 Starting initial data retrieval...');
    const startTime = Date.now();

    // Verify client readiness before API calls
    const clientReady = await waitForClientReady(globalStreamerbotClient);
    if (!clientReady) {
        console.log('⚠️ Proceeding with API calls despite client readiness timeout');
    }

    // 1. Get all global variables first
    const bulkSuccess = await requestInitialGlobalVariablesBulk(globalStreamerbotClient);
    initializationState.globalsLoaded = bulkSuccess;

    if (!bulkSuccess) {
        console.log('🔄 Bulk method failed, using individual fallback approach...');
        await requestInitialGlobalVariables(globalStreamerbotClient);
        initializationState.globalsLoaded = true;
    }

    // 2. Get broadcaster information using getBroadcaster API
    console.log('📺 Attempting getBroadcaster() API call...');
    const broadcasterSuccess = await requestBroadcasterInfo(globalStreamerbotClient);
    initializationState.broadcasterLoaded = broadcasterSuccess;

    if (!broadcasterSuccess) {
        console.log('📺 getBroadcaster() not available or failed, using global variables for broadcaster info');
    } else {
        console.log('✅ getBroadcaster() succeeded - broadcaster name should be updated');
    }

    // Mark initialization as ready
    initializationState.ready = true;
    const totalTime = Date.now() - startTime;
    console.log('✅ Initial data loading completed in', totalTime, 'ms');
    console.log('📊 Initialization state:', initializationState);

    // Test API methods for debugging
    setTimeout(() => {
        console.log('🧪 Running API tests...');
        testGetGlobals(globalStreamerbotClient);
        testGetBroadcaster(globalStreamerbotClient);
    }, 100);
}

// Auto-initialization
let globalStreamerbotClient = null;

// Track subscription attempts and responses
let subscriptionAttempts = 0;
let subscriptionSuccess = false;

function initializeGlobalStreamerbotClient() {
    // Prevent multiple connection attempts
    if (globalStreamerbotClient) {
        console.log('✅ Found existing Streamer.bot client');
        return globalStreamerbotClient;
    }

    console.log('🔗 Creating new Streamer.bot client...');

    // Create client with proper configuration
    globalStreamerbotClient = initializeStreamerbotClient();

    if (globalStreamerbotClient) {
        // CRITICAL FIX: Register ALL event listeners BEFORE connection
        setupEventListeners(globalStreamerbotClient);

        // Make globally available
        window.streamerbotClient = globalStreamerbotClient;

        console.log('🔍 Client created successfully, attempting connection...');

        try {
            console.log('🔄 Calling connect() method...');
            globalStreamerbotClient.connect();
            console.log('✅ Connect() called successfully');

        } catch (error) {
            console.error('❌ CONNECTION FAILED:', error);
            console.log('💡 Check that Streamer.bot is running and WebSocket Server is enabled');
        }

        console.log('✅ Global official @streamerbot/client initialized');
    } else {
        console.error('❌ Failed to create Streamer.bot client');
    }

    return globalStreamerbotClient;
}

// Removed workaround functions that caused "Invalid event subscription requested" errors
// The official client now handles everything through proper callback configuration

// Initialize when DOM is ready or immediately if already loaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initializeGlobalStreamerbotClient, 100);
    });
} else {
    // Slight delay to ensure other scripts are loaded
    setTimeout(initializeGlobalStreamerbotClient, 100);
}

// Test function for getGlobals() API method verification
async function testGetGlobals(client = globalStreamerbotClient) {
    if (!client) {
        console.error('❌ testGetGlobals: No Streamer.bot client available');
        return null;
    }

    try {
        console.log('🧪 Testing getGlobals() API method...');
        const response = await client.getGlobals();
        console.log('✅ getGlobals() success! Response:', response);

        if (response && response.variables) {
            console.log('📊 Available variables count:', Object.keys(response.variables).length);
            console.log('📊 Available variables:', Object.keys(response.variables));

            // Log specific test variables if they exist
            if (response.variables.counter1 !== undefined) {
                console.log('🎯 counter1 value:', response.variables.counter1);
            }
            if (response.variables.counter2 !== undefined) {
                console.log('🎯 counter2 value:', response.variables.counter2);
            }
        }

        return response;
    } catch (error) {
        console.error('❌ getGlobals() test failed:', error);
        return null;
    }
}

// Test function for getBroadcaster() API method
async function testGetBroadcaster(client = globalStreamerbotClient) {
    if (!client) {
        console.error('❌ testGetBroadcaster: No Streamer.bot client available');
        return null;
    }

    try {
        console.log('🧪 Testing getBroadcaster() API method...');
        console.log('🔍 Client connection status:', initializationState.connected);
        console.log('🔍 Client WebSocket state:', client.socket?.readyState);

        const response = await client.getBroadcaster();
        console.log('✅ getBroadcaster() success! Full Response:', response);

        if (response) {
            // Check for direct fields first
            console.log('📺 Checking for direct fields:');
            if (response.displayName) console.log('  Display Name:', response.displayName);
            if (response.login) console.log('  Username/Login:', response.login);
            if (response.id) console.log('  User ID:', response.id);
            if (response.profileImageUrl) console.log('  Profile Image URL:', response.profileImageUrl);

            // Check for platforms object (actual structure)
            console.log('📺 Checking platforms object:');
            if (response.platforms) {
                console.log('  Platforms available:', Object.keys(response.platforms));

                // Log each platform's data
                Object.entries(response.platforms).forEach(([platform, data]) => {
                    console.log(`  ${platform.toUpperCase()} Platform Data:`, data);
                });
            } else {
                console.log('  No platforms object found');
            }

            // Check for other response fields
            console.log('📺 Full response structure:');
            console.log('  Response type:', typeof response);
            console.log('  Response keys:', Object.keys(response));
        }

        return response;
    } catch (error) {
        console.error('❌ getBroadcaster() test failed:', error);
        console.log('ℹ️  This might mean getBroadcaster() is not available in this Streamer.bot client version');
        return null;
    }
}

// Enhanced broadcaster info retrieval using getBroadcaster API
async function requestBroadcasterInfo(client) {
    console.log('📺 Requesting broadcaster information via getBroadcaster API...');

    // Enhanced diagnostic logging
    console.log('🔍 getBroadcaster() diagnostics:');
    console.log('  Client connected:', initializationState.connected);
    console.log('  Client methods available:', Object.getOwnPropertyNames(client).includes('getBroadcaster'));
    console.log('  getBroadcaster type:', typeof client.getBroadcaster);

    try {
        const broadcasterData = await client.getBroadcaster();

        if (!broadcasterData) {
            console.warn('⚠️ getBroadcaster() returned empty response');
            return false;
        }

        console.log('✅ Got broadcaster data from API:', broadcasterData);

        // Parse platforms object structure (actual API response format)
        const platforms = broadcasterData.platforms || {};
        console.log('🔍 Available platforms:', Object.keys(platforms));

        // Determine primary platform (Twitch preferred, fallback to first available)
        let primaryPlatform = null;
        let platformName = '';

        if (platforms.twitch) {
            primaryPlatform = platforms.twitch;
            platformName = 'Twitch';
            console.log('📺 Using Twitch platform data');
        } else if (platforms.kick) {
            primaryPlatform = platforms.kick;
            platformName = 'Kick';
            console.log('📺 Using Kick platform data');
        } else if (platforms.youtube) {
            primaryPlatform = platforms.youtube;
            platformName = 'YouTube';
            console.log('📺 Using YouTube platform data');
        } else {
            // Fallback to first available platform
            const availablePlatforms = Object.values(platforms);
            if (availablePlatforms.length > 0) {
                primaryPlatform = availablePlatforms[0];
                platformName = Object.keys(platforms)[0];
                console.log(`📺 Using ${platformName} platform data (first available)`);
            }
        }

        if (!primaryPlatform) {
            console.warn('⚠️ No platform data available in getBroadcaster() response');
            return false;
        }

        console.log(`📺 Extracting broadcaster info from ${platformName} platform:`, primaryPlatform);

        // Map actual API fields from platform data to overlay variables
        const broadcaster = {
            displayName: primaryPlatform.broadcastUserName || primaryPlatform.broadcasterUserName || primaryPlatform.broadcasterLogin,
            username: primaryPlatform.broadcastUser || primaryPlatform.broadcasterLogin,
            userId: primaryPlatform.broadcastUserId || primaryPlatform.broadcasterUserId,
            profileImageUrl: primaryPlatform.broadcasterProfileUrl || primaryPlatform.profileImageUrl,
            twitchUrl: primaryPlatform.broadcastUser ? `https://twitch.tv/${primaryPlatform.broadcastUser}` : null
        };

        console.log('📺 Mapped broadcaster data:', broadcaster);

        // Update overlay variables
        const variableMappings = [
            { value: broadcaster.displayName, variable: 'broadcasterDisplayName' },
            { value: broadcaster.username, variable: 'broadcasterUsername' },
            { value: broadcaster.userId, variable: 'broadcasterUserId' },
            { value: broadcaster.profileImageUrl, variable: 'broadcasterProfileImageUrl' },
            { value: broadcaster.twitchUrl, variable: 'broadcasterTwitchUrl' }
        ];

        // Update variables with fresh API data
        for (const mapping of variableMappings) {
            if (mapping.value !== undefined && mapping.value !== null) {
                console.log(`📺 Setting ${mapping.variable} = ${mapping.value}`);

                // Check if overlay functions are available
                if (typeof window.updateCounterFromGlobalVariable === 'function') {
                    window.updateCounterFromGlobalVariable(mapping.variable, mapping.value);
                } else {
                    // Direct DOM update fallback
                    console.log(`⚠️ updateCounterFromGlobalVariable not available, updating DOM directly for ${mapping.variable} = ${mapping.value}`);
                    updateBroadcasterDisplayDirectly(broadcaster.displayName, broadcaster.username);
                }
            }
        }

        // Trigger profile image loading if username available
        if (broadcaster.username && typeof window.loadBroadcasterProfileImage === 'function') {
            console.log('🖼️ Triggering profile image load for:', broadcaster.username);
            window.loadBroadcasterProfileImage(broadcaster.username);
        }

        return true;

    } catch (error) {
        console.warn('⚠️ Failed to get broadcaster info via getBroadcaster():', error.message);
        console.log('🔄 Falling back to global variables for broadcaster info...');
        return false;
    }
}

// Direct DOM update fallback if overlay functions not available
function updateBroadcasterDisplayDirectly(displayName, username) {
    try {
        // Update profile name display
        const profileNameElement = document.getElementById('profile-name');
        if (profileNameElement && displayName) {
            profileNameElement.textContent = displayName;
            console.log(`✅ Updated profile name directly: ${displayName}`);
        }

        // Update profile link
        const profileLinkElement = document.getElementById('profile-link');
        if (profileLinkElement && username) {
            profileLinkElement.textContent = `twitch.tv/${username}`;
            console.log(`✅ Updated profile link directly: twitch.tv/${username}`);
        }

        // Update profile fallback letter
        const profileFallbackElement = document.getElementById('profile-fallback');
        if (profileFallbackElement && displayName) {
            profileFallbackElement.textContent = displayName.charAt(0).toUpperCase();
            console.log(`✅ Updated profile fallback letter: ${displayName.charAt(0).toUpperCase()}`);
        }

        // Trigger profile image loading if username available and function exists
        if (username && typeof window.loadBroadcasterProfileImage === 'function') {
            console.log('🖼️ Triggering profile image load from direct update for:', username);
            window.loadBroadcasterProfileImage(username);
        } else if (username) {
            console.warn('⚠️ loadBroadcasterProfileImage function not available yet, will retry on ready event');
            // Store for retry when streamoverlay:ready event fires
            window._pendingProfileImageLoad = username;
        }

        return true;
    } catch (error) {
        console.error('❌ Failed to update broadcaster display directly:', error);
        return false;
    }
}

// Enhanced requestInitialGlobalVariables using getGlobals() for efficiency
async function requestInitialGlobalVariablesBulk(client) {
    console.log('📥 Requesting ALL global variables via getGlobals()...');

    try {
        // Single API call to get all variables at once
        const response = await client.getGlobals();

        if (!response || !response.variables) {
            console.warn('⚠️ getGlobals() returned empty or invalid response');
            return false;
        }

        const allVariables = response.variables;
        console.log('✅ Got bulk variables! Count:', Object.keys(allVariables).length);

        // Check if example.html functions are ready, if not store for later processing
        if (!componentReadyState.exampleHtml) {
            console.log('⏳ Example.html not ready, storing variables for later processing...');
            storeVariablesForProcessing(allVariables);
            return true; // Consider this successful - processing will happen when ready
        }

        // If already ready, process immediately
        processInitialVariables(allVariables);
        return true;

    } catch (error) {
        console.error('❌ Failed to get bulk variables via getGlobals():', error);
        console.log('🔄 Falling back to individual getGlobal() calls...');

        // Fallback to original individual approach
        await requestInitialGlobalVariables(client);
        return false;
    }
}

// Debug helper functions for initialization state
function debugInitializationState() {
    console.log('🔍 Current initialization state:', initializationState);
    console.log('🔍 Subscription attempts:', subscriptionAttempts);
    console.log('🔍 Subscription successful:', subscriptionSuccess);
    return initializationState;
}

function isInitializationComplete() {
    return initializationState.ready && initializationState.connected &&
           initializationState.globalsLoaded && initializationState.broadcasterLoaded;
}

// Manual trigger for testing broadcaster updates
async function manualUpdateBroadcaster() {
    console.log('🔄 Manually triggering broadcaster update...');
    console.log('🔍 Connection diagnostics:');

    if (!globalStreamerbotClient) {
        console.error('❌ No Streamer.bot client available for manual update');
        return false;
    }

    console.log('  Client object exists:', !!globalStreamerbotClient);
    console.log('  Connection state:', initializationState.connected);
    console.log('  Client socket exists:', !!globalStreamerbotClient.socket);
    console.log('  Client socket readyState:', globalStreamerbotClient.socket?.readyState);
    console.log('  WebSocket OPEN state (expected: 1):', WebSocket?.OPEN);

    // Try to check if client is actually functional
    try {
        console.log('🧪 Testing client functionality with getBroadcaster()...');
        const testResponse = await globalStreamerbotClient.getBroadcaster();
        console.log('✅ Client seems functional! Proceeding with broadcaster update...');

        const success = await requestBroadcasterInfo(globalStreamerbotClient);
        if (!success) {
            console.log('⚠️ Manual broadcaster update failed - check console for details');
        } else {
            console.log('✅ Manual broadcaster update completed successfully');
        }
        return success;

    } catch (error) {
        console.error('❌ Client is not functional:', error.message);
        console.log('🔧 Possible solutions:');
        console.log('  1. Make sure Streamer.bot is running');
        console.log('  2. Check that WebSocket Server is enabled on port 8080 in Streamer.bot');
        console.log('  3. Try refreshing the overlay page');
        return false;
    }
}

// Enhanced Streamer.bot connection diagnostics with detailed state monitoring
function debugStreamerbotConnection() {
    console.log('🔍 === ENHANCED STREAMER.BOT CONNECTION DIAGNOSTICS ===');

    if (!globalStreamerbotClient) {
        console.error('❌ No global Streamer.bot client available');
        console.log('💡 Solutions:');
        console.log('  1. Refresh the page to trigger client initialization');
        console.log('  2. Check for JavaScript errors during page load');
        console.log('  3. Verify @streamerbot/client library is loaded');
        return { error: 'NO_CLIENT', clientExists: false };
    }

    console.log('✅ Global client exists');
    console.log('🔍 === CLIENT PROPERTIES ===');
    console.log('  Type:', typeof globalStreamerbotClient);
    console.log('  Constructor:', globalStreamerbotClient.constructor.name);
    console.log('  Connection state:', initializationState.connected);
    console.log('  Socket exists:', !!globalStreamerbotClient.socket);

    // Enhanced socket diagnostics
    if (globalStreamerbotClient.socket) {
        const socket = globalStreamerbotClient.socket;
        const readyState = socket.readyState;
        const stateNames = ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'];

        console.log('🔍 === SOCKET DIAGNOSTICS ===');
        console.log('  Socket readyState:', readyState, `(${stateNames[readyState] || 'UNKNOWN'})`);
        console.log('  Socket URL:', socket.url);
        console.log('  Socket protocol:', socket.protocol);
        console.log('  Socket extensions:', socket.extensions);
        console.log('  Socket bufferedAmount:', socket.bufferedAmount);

        // Check socket event listeners
        const eventTypes = ['open', 'close', 'error', 'message'];
        console.log('🔍 Socket event listeners:');
        eventTypes.forEach(type => {
            console.log(`    ${type}: ${socket['on' + type] ? 'assigned' : 'none'}`);
        });
    } else {
        console.log('❌ No socket available - connection was never attempted');
    }

    // Configuration diagnostics
    console.log('🔍 === CONFIGURATION DIAGNOSTICS ===');
    console.log('  Connection URL: ws://127.0.0.1:8080/');

    // Available methods check
    console.log('🔍 === CLIENT METHODS ===');
    const methods = Object.getOwnPropertyNames(globalStreamerbotClient).filter(prop =>
        typeof globalStreamerbotClient[prop] === 'function'
    );
    console.log('  Available methods:', methods);
    console.log('  Has connect():', methods.includes('connect'));
    console.log('  Has disconnect():', methods.includes('disconnect'));
    console.log('  Has getBroadcaster():', methods.includes('getBroadcaster'));
    console.log('  Has getGlobals():', methods.includes('getGlobals'));

    // Initialization state
    console.log('🔍 === INITIALIZATION STATE ===');
    console.log('  Connected:', initializationState.connected);
    console.log('  Globals loaded:', initializationState.globalsLoaded);
    console.log('  Broadcaster loaded:', initializationState.broadcasterLoaded);
    console.log('  Ready:', initializationState.ready);
    console.log('  Subscription attempts:', subscriptionAttempts);
    console.log('  Subscription successful:', subscriptionSuccess);

    // Connection timing analysis
    const timeSinceLoad = Date.now() - (window.pageLoadTime || Date.now());
    console.log('🔍 === TIMING ANALYSIS ===');
    console.log('  Page load time:', window.pageLoadTime || 'Not set');
    console.log('  Time since load:', timeSinceLoad + 'ms');

    // Network connectivity test
    console.log('🔍 === NETWORK CONNECTIVITY ===');
    console.log('  Online status:', navigator.onLine);
    console.log('  User agent:', navigator.userAgent);

    const diagnosticResult = {
        clientExists: !!globalStreamerbotClient,
        connected: initializationState.connected,
        socketState: globalStreamerbotClient?.socket?.readyState,
        socketUrl: globalStreamerbotClient?.socket?.url,
        initState: initializationState,
        config: 'ws://127.0.0.1:8080/',
        timeSinceLoad,
        online: navigator.onLine,
        methods: methods,
        subscriptionAttempts,
        subscriptionSuccess
    };

    // Generate recommendations
    console.log('🔍 === DIAGNOSTIC RECOMMENDATIONS ===');
    if (!globalStreamerbotClient.socket) {
        console.log('❌ No socket - connection never attempted');
        console.log('💡 Try: window.initializeGlobalStreamerbotClient()');
    } else if (globalStreamerbotClient.socket.readyState === 3) { // CLOSED
        console.log('❌ Socket closed - connection failed or was terminated');
        console.log('💡 Try: Check Streamer.bot WebSocket Server settings');
        console.log('💡 Try: window.testManualConnection() to test different configs');
    } else if (globalStreamerbotClient.socket.readyState === 0) { // CONNECTING
        console.log('⏳ Socket still connecting - may need more time');
        console.log('💡 Wait a few seconds and check again');
    } else if (globalStreamerbotClient.socket.readyState === 1) { // OPEN
        console.log('✅ Socket is open but client shows disconnected');
        console.log('💡 This may indicate an event listener issue (already fixed)');
    }

    return diagnosticResult;
}

// Connection state monitoring function for continuous diagnosis
function monitorConnectionState(durationSeconds = 30) {
    console.log(`🔄 Starting connection state monitoring for ${durationSeconds} seconds...`);
    const startTime = Date.now();
    const interval = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTime) / 1000);

        if (elapsed >= durationSeconds) {
            clearInterval(interval);
            console.log('⏹️ Connection monitoring complete');
            return;
        }

        const state = {
            time: elapsed + 's',
            connected: initializationState.connected,
            socketState: globalStreamerbotClient?.socket?.readyState,
            initState: initializationState.connected
        };

        // Only log changes or every 5 seconds
        if (elapsed % 5 === 0 || state.connected !== monitorConnectionState.lastConnected) {
            console.log(`📊 [${elapsed}s] Connection state:`, state);
            monitorConnectionState.lastConnected = state.connected;
        }
    }, 1000);

    console.log('💡 Monitor will log every 5 seconds and on state changes');
    return interval;
}

// Enhanced debug function to check broadcaster variables
function debugBroadcasterVariables() {
    console.log('🔍 Current broadcaster variable values:');
    const variables = ['broadcasterDisplayName', 'broadcasterUsername', 'broadcasterUserId', 'broadcasterTwitchUrl', 'broadcasterProfileImageUrl'];

    variables.forEach(varName => {
        const element = document.querySelector(`[data-variable="${varName}"]`);
        if (element) {
            console.log(`  ${varName}: "${element.textContent || element.innerHTML}"`);
        } else {
            console.log(`  ${varName}: No element found`);
        }
    });

    // Check DOM elements directly
    const profileName = document.getElementById('profile-name');
    const profileLink = document.getElementById('profile-link');
    const profileFallback = document.getElementById('profile-fallback');

    console.log('🔍 Direct DOM element values:');
    console.log(`  profile-name: "${profileName?.textContent || 'Not found'}"`);
    console.log(`  profile-link: "${profileLink?.textContent || 'Not found'}"`);
    console.log(`  profile-fallback: "${profileFallback?.textContent || 'Not found'}"`);

    return {
        profileName: profileName?.textContent,
        profileLink: profileLink?.textContent,
        profileFallback: profileFallback?.textContent
    };
}

// Manual connection test function to diagnose configuration issues
async function testManualConnection() {
    console.log('🧪 === MANUAL CONNECTION TESTING STARTED ===');
    console.log('🔄 Testing different Streamer.bot connection configurations...');

    // Test configurations with different endpoints and settings
    const baseConfig = {
        host: '127.0.0.1',
        port: 8080,
        autoReconnect: true,
        retries: 5,
        retryInterval: 2000,
        immediate: false
    };

    const testConfigs = [
        { ...baseConfig, endpoint: '/', description: 'Default configuration (endpoint: /)' },
        { ...baseConfig, endpoint: '/ws', description: 'WebSocket endpoint (/ws)' },
        { ...baseConfig, endpoint: '/websocket', description: 'Full websocket endpoint (/websocket)' },
        { ...baseConfig, endpoint: '', description: 'Empty endpoint' },
        { ...baseConfig, immediate: true, description: 'Immediate connection mode' },
        { ...baseConfig, host: 'localhost', description: 'localhost instead of 127.0.0.1' }
    ];

    const results = [];

    for (let i = 0; i < testConfigs.length; i++) {
        const config = testConfigs[i];
        console.log(`\n🧪 TEST ${i + 1}/${testConfigs.length}: ${config.description}`);
        console.log('🔍 Configuration:', JSON.stringify(config, null, 2));

        try {
            // Create a test client for this configuration
            console.log('🔄 Creating test client...');
            const testClient = new StreamerbotClient(config);

            if (!testClient) {
                console.error('❌ Failed to create test client');
                results.push({ config: config.description, status: 'CLIENT_CREATION_FAILED', error: 'Client creation returned null' });
                continue;
            }

            console.log('✅ Test client created successfully');

            // Add basic event listeners to test connection
            let connectionResult = {
                connected: false,
                error: null,
                timeout: false
            };

            const connectionPromise = new Promise((resolve) => {
                // Success handler
                testClient.on('WebsocketClient.Open', () => {
                    console.log('✅ Test connection successful!');
                    connectionResult.connected = true;
                    resolve(connectionResult);
                    testClient.disconnect?.() || testClient.close?.(); // Clean up
                });

                // Error handler
                testClient.on('WebsocketClient.Close', (event) => {
                    console.log('❌ Test connection failed/closed');
                    console.log('🔍 Close event:', event);
                    if (!connectionResult.connected) {
                        connectionResult.error = event;
                        resolve(connectionResult);
                    }
                });

                // Timeout handler (5 seconds)
                setTimeout(() => {
                    if (!connectionResult.connected) {
                        console.log('⏰ Test connection timeout (5 seconds)');
                        connectionResult.timeout = true;
                        resolve(connectionResult);
                        testClient.disconnect?.() || testClient.close?.(); // Clean up
                    }
                }, 5000);
            });

            // Attempt connection
            console.log('🔄 Attempting test connection...');
            testClient.connect();

            // Wait for result
            const result = await connectionPromise;

            if (result.connected) {
                console.log('🎉 SUCCESS: Configuration works!');
                results.push({ config: config.description, status: 'SUCCESS' });
            } else if (result.timeout) {
                console.log('⏰ TIMEOUT: No response within 5 seconds');
                results.push({ config: config.description, status: 'TIMEOUT' });
            } else {
                console.log('❌ FAILED: Connection failed');
                results.push({ config: config.description, status: 'FAILED', error: result.error });
            }

        } catch (error) {
            console.error('❌ Test failed with exception:', error);
            results.push({ config: config.description, status: 'EXCEPTION', error: error.message });
        }

        // Wait 500ms between tests to avoid overwhelming the server
        if (i < testConfigs.length - 1) {
            console.log('⏸️ Waiting 500ms before next test...');
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    // Summary
    console.log('\n📊 === MANUAL CONNECTION TEST RESULTS ===');
    results.forEach((result, index) => {
        const status = result.status === 'SUCCESS' ? '✅' :
                      result.status === 'TIMEOUT' ? '⏰' : '❌';
        console.log(`${status} Test ${index + 1}: ${result.config} - ${result.status}`);
        if (result.error) {
            console.log(`    Error: ${typeof result.error === 'string' ? result.error : JSON.stringify(result.error)}`);
        }
    });

    const successfulTests = results.filter(r => r.status === 'SUCCESS');

    if (successfulTests.length > 0) {
        console.log('\n🎉 SUCCESS! Found working configuration(s):');
        successfulTests.forEach((test, index) => {
            console.log(`  ${index + 1}. ${test.config}`);
        });
        console.log('\n💡 NEXT STEPS:');
        console.log('  1. Update StreamerbotConfig with working configuration');
        console.log('  2. Restart the overlay to test with new config');
    } else {
        console.log('\n❌ NO WORKING CONFIGURATIONS FOUND');
        console.log('💡 TROUBLESHOOTING STEPS:');
        console.log('  1. Verify Streamer.bot is running and WebSocket Server is enabled');
        console.log('  2. Check Streamer.bot WebSocket Server settings (port, binding address)');
        console.log('  3. Try different ports if 8080 is occupied');
        console.log('  4. Check Windows firewall or antivirus blocking connections');
        console.log('  5. Try restarting Streamer.bot application');
    }

    return results;
}

// Export test functions and new methods
window.testGetGlobals = testGetGlobals;
window.testGetBroadcaster = testGetBroadcaster;
window.requestInitialGlobalVariablesBulk = requestInitialGlobalVariablesBulk;
window.requestBroadcasterInfo = requestBroadcasterInfo;
window.manualUpdateBroadcaster = manualUpdateBroadcaster;
window.debugBroadcasterVariables = debugBroadcasterVariables;
window.debugStreamerbotConnection = debugStreamerbotConnection;
window.updateBroadcasterDisplayDirectly = updateBroadcasterDisplayDirectly;
window.testManualConnection = testManualConnection;
window.monitorConnectionState = monitorConnectionState;

// Export state tracking and readiness functions
window.debugInitializationState = debugInitializationState;
window.isInitializationComplete = isInitializationComplete;
window.waitForClientReady = waitForClientReady;

// Export for manual initialization
window.initializeGlobalStreamerbotClient = initializeGlobalStreamerbotClient;
// StreamerbotConfig removed - using inline configuration with callbacks
window.ExampleHtmlVariables = ExampleHtmlVariables;

// Removed workaround function exports - no longer needed with proper callback configuration

console.log('🎮 Clean example.html Streamer.bot integration loaded');

// Wait for ComponentComposer to be available, then log readiness
setTimeout(() => {
    if (window.ComponentComposer) {
        console.log('✅ ComponentComposer detected and ready for event forwarding');
        console.log('🔍 ComponentComposer components:', window.ComponentComposer.components.size);
    } else {
        console.warn('⚠️ ComponentComposer not detected after 2 seconds');
        console.log('💡 This may indicate a timing issue or ComponentComposer failed to load');
    }
}, 2000);