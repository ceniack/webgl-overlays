/**
 * Standalone Broadcaster Branding Component
 * Integrates with Streamer.bot for real-time broadcaster information
 */

class BrandingComponent {
    constructor() {
        this.client = null;
        this.isConnected = false;
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

        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        console.log('📺 Branding Component initializing...');

        // Skip setDefaults() - integration script will set real broadcaster data
        console.log('📺 Skipping setDefaults() to prevent override of integration script data');

        // Connect to Streamer.bot
        this.connectToStreamerbot();

        // Set up debug functions
        this.setupDebugFunctions();

        console.log('📺 Branding Component initialized successfully');
    }

    setDefaults() {
        // Only set broadcaster defaults if current values are still HTML defaults
        const currentName = document.getElementById('profile-name').textContent;
        const currentLink = document.getElementById('profile-link').textContent;

        // Check if values are still HTML defaults (not real broadcaster data)
        if (currentName === 'STREAMER' && currentLink === 'twitch.tv/streamer') {
            console.log('📺 Setting broadcaster defaults (no real data detected)');
            document.getElementById('profile-name').textContent = this.config.broadcaster.defaultDisplayName;
            document.getElementById('profile-link').textContent = this.config.broadcaster.defaultTwitchUrl;
            document.getElementById('profile-fallback').textContent = this.config.broadcaster.defaultDisplayName.charAt(0).toUpperCase();
        } else {
            console.log('📺 Keeping existing broadcaster data:', currentName);
        }
    }

    connectToStreamerbot() {
        // Check for both possible exports
        const ClientClass = typeof StreamerbotClient !== 'undefined' ? StreamerbotClient :
                           typeof Streamerbot !== 'undefined' && Streamerbot.Client ? Streamerbot.Client : null;

        if (!ClientClass) {
            console.error('📺 Streamer.bot client not found. Make sure streamerbot-client.js is loaded.');
            this.enableTestMode();
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

            console.log('📺 Creating client with config:', config);

            // Create and initialize client
            this.client = new ClientClass(config);

            // Set up event handlers
            this.setupEventHandlers();

            // Connect to Streamer.bot
            this.client.connect();

            console.log('📺 Connecting to Streamer.bot...');

            // Add connection timeout
            setTimeout(() => {
                if (!this.isConnected) {
                    console.warn('📺 Connection timeout after 10 seconds - enabling test mode');
                    this.enableTestMode();
                }
            }, 10000);

        } catch (error) {
            console.error('📺 Failed to connect to Streamer.bot:', error);
            this.enableTestMode();
        }
    }

    setupEventHandlers() {
        if (!this.client) return;

        // Connection events
        this.client.on('WebsocketClient.Open', () => {
            this.isConnected = true;
            console.log('📺 Connected to Streamer.bot successfully');
            this.requestInitialData();
        });

        this.client.on('WebsocketClient.Close', (event) => {
            this.isConnected = false;
            console.log('📺 Disconnected from Streamer.bot');
        });

        // Global variable events for broadcaster info
        this.client.on('Misc.GlobalVariableUpdated', (data) => {
            try {
                const variableName = data.name;
                const variableValue = data.newValue;

                if (variableName && variableValue !== undefined) {
                    console.log('📺 GlobalVariableUpdated:', variableName, '=', variableValue);
                    this.handleVariableUpdate(variableName, variableValue);
                }
            } catch (error) {
                console.error('📺 Error processing global variable update:', error);
            }
        });
    }

    async requestInitialData() {
        if (!this.client || !this.isConnected) return;

        console.log('📺 Requesting initial broadcaster data...');

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
                if (response && response.variable !== undefined) {
                    console.log(`📺 Got initial ${variable} =`, response.variable);
                    this.handleVariableUpdate(variable, response.variable);
                }
            } catch (error) {
                console.warn(`📺 Failed to get initial ${variable}:`, error);
            }
        }

        // Also try to get broadcaster info from API
        try {
            const broadcasterData = await this.client.getBroadcaster();
            if (broadcasterData && broadcasterData.status === 'ok') {
                console.log('📺 Got broadcaster data from API:', broadcasterData);
                this.updateFromBroadcasterAPI(broadcasterData);
            }
        } catch (error) {
            console.warn('📺 Could not get broadcaster data from API:', error);
        }
    }

    handleVariableUpdate(variableName, variableValue) {
        const config = this.config.broadcaster;

        switch (variableName) {
            case config.displayNameVariable:
                this.updateBroadcasterDisplayName(variableValue);
                break;
            case config.usernameVariable:
                this.updateBroadcasterUsername(variableValue);
                break;
            case config.userIdVariable:
                console.log('📺 Broadcaster user ID updated:', variableValue);
                break;
            case config.twitchUrlVariable:
                this.updateBroadcasterTwitchUrl(variableValue);
                break;
            case config.profileImageTriggerVariable:
                if (variableValue && variableValue.trim() !== '') {
                    this.loadBroadcasterProfileImage(variableValue.trim());
                }
                break;
        }
    }

    updateFromBroadcasterAPI(data) {
        // Extract broadcaster information from API response
        if (data.platforms) {
            // Try to get Twitch data first, fallback to other platforms
            let platformData = data.platforms.twitch || data.platforms.kick || data.platforms.youtube;

            if (platformData) {
                const displayName = platformData.broadcastUserName || platformData.broadcasterUserName;
                const username = platformData.broadcastUser || platformData.broadcasterLogin;

                if (displayName) {
                    console.log('📺 Updating display name from API:', displayName);
                    this.updateBroadcasterDisplayName(displayName);
                }

                if (username) {
                    console.log('📺 Updating username from API:', username);
                    this.updateBroadcasterUsername(username);
                }
            }
        }
    }

    updateBroadcasterDisplayName(displayName) {
        if (!displayName || displayName.trim() === '') return;

        console.log('📺 Updating broadcaster display name:', displayName);
        document.getElementById('profile-name').textContent = displayName;
        document.getElementById('profile-fallback').textContent = displayName.charAt(0).toUpperCase();
    }

    updateBroadcasterTwitchUrl(twitchUrl) {
        if (!twitchUrl || twitchUrl.trim() === '') return;

        console.log('📺 Updating broadcaster Twitch URL:', twitchUrl);
        document.getElementById('profile-link').textContent = twitchUrl;
    }

    updateBroadcasterUsername(username) {
        if (!username || username.trim() === '') return;

        console.log('📺 Updating broadcaster username:', username);

        // Update the Twitch URL
        document.getElementById('profile-link').textContent = `twitch.tv/${username}`;

        // Also trigger profile image loading
        console.log('📺 Auto-triggering profile image load from username update');
        this.loadBroadcasterProfileImage(username);
    }

    loadBroadcasterProfileImage(username) {
        console.log('📺 Loading broadcaster profile image for username:', username);

        if (!username || username.trim() === '') {
            console.error('📺 No username provided for profile image loading');
            this.showFallbackImage();
            return;
        }

        const decApiUrl = `https://decapi.me/twitch/avatar/${username}`;
        console.log('📺 Making DecAPI request to:', decApiUrl);

        // Use DecAPI to get the actual profile image URL
        fetch(decApiUrl)
            .then(response => {
                console.log('📺 DecAPI response status:', response.status, response.statusText);
                return response.text();
            })
            .then(url => {
                url = url.trim();
                console.log('📺 DecAPI raw response:', url);

                if (url && url.startsWith('http') && !url.toLowerCase().includes('error') && !url.toLowerCase().includes('user not found')) {
                    this.loadImageFromUrl(url);
                } else {
                    console.log('📺 DecAPI returned invalid/error response:', url);
                    this.showFallbackImage();
                }
            })
            .catch(error => {
                console.error('📺 DecAPI fetch failed:', error);
                this.showFallbackImage();
            });
    }

    loadImageFromUrl(url) {
        const img = document.getElementById('profile-image');
        const fallback = document.getElementById('profile-fallback');

        console.log('📺 Attempting to load image from URL:', url);

        // Add a timeout to catch slow-loading images
        const timeout = setTimeout(() => {
            console.warn('📺 Profile image loading timeout, showing fallback');
            this.showFallbackImage();
        }, 10000); // 10 second timeout

        img.onload = () => {
            clearTimeout(timeout);
            console.log('📺 Broadcaster profile image loaded successfully');
            img.style.display = 'block';
            fallback.style.display = 'none';
        };

        img.onerror = () => {
            clearTimeout(timeout);
            console.error('📺 Broadcaster profile image failed to load from URL:', url);
            this.showFallbackImage();
        };

        img.src = url;
    }

    showFallbackImage() {
        const img = document.getElementById('profile-image');
        const fallback = document.getElementById('profile-fallback');
        img.style.display = 'none';
        fallback.style.display = 'block';
    }

    enableTestMode() {
        console.log('📺 Enabling test mode - Streamer.bot client not available');

        // Set test data
        setTimeout(() => {
            this.updateBroadcasterDisplayName('TestStreamer');
            this.updateBroadcasterUsername('testuser');
        }, 2000);
    }

    // Test functions for development
    testProfileImage(username = 'shroud') {
        console.log(`📺 Testing profile image with username: ${username}`);
        this.loadBroadcasterProfileImage(username);
    }

    testBroadcasterData(displayName = 'TestStreamer', username = 'testuser') {
        console.log(`📺 Testing broadcaster data: ${displayName} (${username})`);
        this.updateBroadcasterDisplayName(displayName);
        this.updateBroadcasterUsername(username);
    }

    setupDebugFunctions() {
        // Global debug functions
        window.brandingComponent = this;

        window.debugBranding = () => {
            console.log('📺 Branding Component Debug Info:');
            console.log('- Connected:', this.isConnected);
            console.log('- Display Name:', document.getElementById('profile-name')?.textContent);
            console.log('- Profile Link:', document.getElementById('profile-link')?.textContent);
            console.log('- Profile Fallback:', document.getElementById('profile-fallback')?.textContent);

            const img = document.getElementById('profile-image');
            console.log('- Profile Image Visible:', img.style.display === 'block');
            console.log('- Profile Image URL:', img.src);
        };

        window.testProfileImage = (username) => this.testProfileImage(username);
        window.testBroadcasterData = (displayName, username) => this.testBroadcasterData(displayName, username);

        console.log('📺 Debug functions registered: debugBranding(), testProfileImage(username), testBroadcasterData(displayName, username)');
    }
}

// Initialize the branding component when script loads
new BrandingComponent();