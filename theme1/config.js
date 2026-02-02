module.exports = {
    server: {
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || 'localhost'
    },
    
    streamerbot: {
        host: process.env.STREAMERBOT_HOST || '127.0.0.1',
        port: parseInt(process.env.STREAMERBOT_PORT) || 8080,
        endpoint: process.env.STREAMERBOT_ENDPOINT || '/',
        maxRetries: parseInt(process.env.STREAMERBOT_MAX_RETRIES) || 10,
        retryInterval: parseInt(process.env.STREAMERBOT_RETRY_INTERVAL) || 1000
    },
    
    timeouts: {
        componentReady: 2000,
        clientInit: 5000,
        profileImageRetry: 100,
        clientInitAttempts: 50
    },
    
    logging: {
        debugToFile: process.env.DEBUG_TO_FILE === 'true',
        logsDir: 'logs'
    },
    
    overlay: {
        width: 1920,
        height: 257
    },
    
    globalVariables: [
        'broadcasterDisplayName',
        'broadcasterUsername',
        'broadcasterUserId',
        'broadcasterTwitchUrl',
        'broadcasterProfileImageTrigger',
        'broadcasterProfileImageUrl',
        'broadcasterDescription',
        'counter1',
        'counter1label',
        'counter2',
        'counter2label',
        'counter3',
        'counter3label',
        'counter4',
        'counter4label',
        'heartRate',
        'heartRateStatus'
    ],
    
    platformEvents: [
        'Twitch.Follow',
        'Twitch.Subscribe',
        'Twitch.Cheer',
        'Twitch.Raid',
        'YouTube.Subscribe',
        'YouTube.SuperChat',
        'YouTube.SuperSticker'
    ],
    
    paths: {
        public: 'public',
        templates: 'public/templates',
        compiled: 'public/templates/compiled',
        components: 'public/components',
        layouts: 'public/layouts',
        dist: 'public/dist',
        data: 'data'
    }
};
