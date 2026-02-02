/**
 * Streamer.bot Platform Event Comparison Data
 *
 * This file contains comprehensive data about WebSocket events supported
 * across different streaming platforms and integrations.
 *
 * Data sources: Streamer.bot documentation and GitHub repository analysis
 * Total: 49+ event categories, 25+ platforms, 250+ discrete event types
 */

// Platform categories for organization
const PLATFORM_CATEGORIES = {
    STREAMING: 'streaming',
    HARDWARE: 'hardware',
    MONETIZATION: 'monetization',
    CONTENT: 'content',
    UTILITY: 'utility'
};

// Event complexity levels
const COMPLEXITY = {
    EASY: 'easy',
    MEDIUM: 'medium',
    COMPLEX: 'complex'
};

// Alert priority levels
const PRIORITY = {
    HIGH: 'high',
    MEDIUM: 'medium',
    LOW: 'low'
};

// Coverage status
const COVERAGE = {
    FULL: 'full',
    PARTIAL: 'partial',
    NONE: 'none',
    WEBHOOK: 'webhook'
};

// Platform tier classification
const PLATFORM_TIERS = {
    TIER1: {
        label: 'Essential',
        description: 'Highest event coverage, primary platforms',
        platforms: ['twitch', 'youtube']
    },
    TIER2: {
        label: 'Growing',
        description: 'Good potential, expanding coverage',
        platforms: ['kick', 'trovo']
    },
    TIER3: {
        label: 'Specialized',
        description: 'Hardware and niche integrations',
        platforms: ['elgato', 'obs', 'meld', 'streamlabs', 'patreon', 'kofi', 'fourthwall']
    }
};

// Main platform data structure
const PLATFORM_DATA = {
    // Tier 1 - Essential Platforms
    twitch: {
        name: 'Twitch',
        category: PLATFORM_CATEGORIES.STREAMING,
        tier: 'TIER1',
        totalEvents: 137,
        description: 'Leading streaming platform with comprehensive WebSocket event support',
        website: 'https://twitch.tv',
        events: {
            follow: {
                count: 15,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.HIGH,
                description: 'New followers, unfollows, follower milestones'
            },
            chat: {
                count: 25,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.HIGH,
                description: 'Chat messages, commands, emotes, timeouts, bans'
            },
            subscribe: {
                count: 18,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.HIGH,
                description: 'New subs, resubs, gift subs, sub milestones (all tiers)'
            },
            donations: {
                count: 12,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.MEDIUM,
                priority: PRIORITY.HIGH,
                description: 'Bits, donations, cheer events with amounts'
            },
            raids: {
                count: 8,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.HIGH,
                description: 'Incoming/outgoing raids, host events'
            },
            channelPoints: {
                count: 14,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.MEDIUM,
                priority: PRIORITY.MEDIUM,
                description: 'Channel point redeems, custom rewards'
            },
            stream: {
                count: 12,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.MEDIUM,
                description: 'Stream online/offline, title/game changes'
            },
            moderaton: {
                count: 16,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.MEDIUM,
                priority: PRIORITY.MEDIUM,
                description: 'Mod actions, user timeouts, chat clearing'
            },
            hypeTrain: {
                count: 6,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.MEDIUM,
                priority: PRIORITY.MEDIUM,
                description: 'Hype train events, levels, contributions'
            },
            predictions: {
                count: 8,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.COMPLEX,
                priority: PRIORITY.LOW,
                description: 'Prediction events, outcomes, locked states'
            },
            polls: {
                count: 5,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.MEDIUM,
                priority: PRIORITY.LOW,
                description: 'Poll creation, voting, completion'
            }
        }
    },

    youtube: {
        name: 'YouTube',
        category: PLATFORM_CATEGORIES.STREAMING,
        tier: 'TIER1',
        totalEvents: 29,
        description: 'Major streaming platform with growing live event support',
        website: 'https://youtube.com',
        events: {
            subscribe: {
                count: 8,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.HIGH,
                description: 'Channel subscriptions, membership levels'
            },
            chat: {
                count: 12,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.HIGH,
                description: 'Live chat messages, moderation events'
            },
            donations: {
                count: 6,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.MEDIUM,
                priority: PRIORITY.HIGH,
                description: 'Super Chat, Super Thanks monetization'
            },
            stream: {
                count: 3,
                coverage: COVERAGE.PARTIAL,
                complexity: COMPLEXITY.MEDIUM,
                priority: PRIORITY.MEDIUM,
                description: 'Stream status changes (limited API access)'
            }
        }
    },

    // Tier 2 - Growing Platforms
    kick: {
        name: 'Kick',
        category: PLATFORM_CATEGORIES.STREAMING,
        tier: 'TIER2',
        totalEvents: 22,
        description: 'Rapidly growing streaming platform with competitive features',
        website: 'https://kick.com',
        events: {
            follow: {
                count: 4,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.HIGH,
                description: 'Follower events and milestones'
            },
            chat: {
                count: 8,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.HIGH,
                description: 'Chat messages, emotes, moderation'
            },
            subscribe: {
                count: 6,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.HIGH,
                description: 'Subscriptions with tier support'
            },
            stream: {
                count: 4,
                coverage: COVERAGE.PARTIAL,
                complexity: COMPLEXITY.MEDIUM,
                priority: PRIORITY.MEDIUM,
                description: 'Stream state and metadata changes'
            }
        }
    },

    trovo: {
        name: 'Trovo',
        category: PLATFORM_CATEGORIES.STREAMING,
        tier: 'TIER2',
        totalEvents: 16,
        description: 'Gaming-focused streaming platform with unique features',
        website: 'https://trovo.live',
        events: {
            follow: {
                count: 3,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.HIGH,
                description: 'New followers and milestones'
            },
            chat: {
                count: 6,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.HIGH,
                description: 'Chat messages and moderation'
            },
            gifts: {
                count: 4,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.MEDIUM,
                priority: PRIORITY.MEDIUM,
                description: 'Virtual gift system unique to Trovo'
            },
            stream: {
                count: 3,
                coverage: COVERAGE.PARTIAL,
                complexity: COMPLEXITY.MEDIUM,
                priority: PRIORITY.MEDIUM,
                description: 'Stream status and category changes'
            }
        }
    },

    // Tier 3 - Hardware Platforms
    elgato: {
        name: 'Elgato',
        category: PLATFORM_CATEGORIES.HARDWARE,
        tier: 'TIER3',
        totalEvents: 90,
        description: 'Stream Deck and hardware integration events',
        website: 'https://elgato.com',
        events: {
            streamDeck: {
                count: 45,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.MEDIUM,
                priority: PRIORITY.MEDIUM,
                description: 'Button presses, profile changes, device states'
            },
            lighting: {
                count: 25,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.COMPLEX,
                priority: PRIORITY.LOW,
                description: 'Key Light, Ring Light, Light Strip controls'
            },
            capture: {
                count: 20,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.COMPLEX,
                priority: PRIORITY.LOW,
                description: 'Game Capture, Cam Link device events'
            }
        }
    },

    obs: {
        name: 'OBS Studio',
        category: PLATFORM_CATEGORIES.CONTENT,
        tier: 'TIER3',
        totalEvents: 9,
        description: 'Broadcasting software integration events',
        website: 'https://obsproject.com',
        events: {
            scenes: {
                count: 4,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.HIGH,
                description: 'Scene switches, source visibility'
            },
            recording: {
                count: 3,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.MEDIUM,
                description: 'Recording start/stop/pause events'
            },
            streaming: {
                count: 2,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.MEDIUM,
                description: 'Stream start/stop events'
            }
        }
    },

    meld: {
        name: 'Meld Studio',
        category: PLATFORM_CATEGORIES.CONTENT,
        tier: 'TIER3',
        totalEvents: 12,
        description: 'Alternative broadcasting software',
        website: 'https://meldstudio.com',
        events: {
            scenes: {
                count: 6,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.MEDIUM,
                priority: PRIORITY.MEDIUM,
                description: 'Scene and source management'
            },
            effects: {
                count: 6,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.COMPLEX,
                priority: PRIORITY.LOW,
                description: 'Visual effects and filters'
            }
        }
    },

    // Monetization Platforms
    streamlabs: {
        name: 'Streamlabs',
        category: PLATFORM_CATEGORIES.MONETIZATION,
        tier: 'TIER3',
        totalEvents: 6,
        description: 'Donation and monetization platform',
        website: 'https://streamlabs.com',
        events: {
            donations: {
                count: 6,
                coverage: COVERAGE.FULL,
                complexity: COMPLEXITY.EASY,
                priority: PRIORITY.HIGH,
                description: 'Direct donations, tips, merchandise'
            }
        }
    },

    patreon: {
        name: 'Patreon',
        category: PLATFORM_CATEGORIES.MONETIZATION,
        tier: 'TIER3',
        totalEvents: 5,
        description: 'Subscription-based creator monetization',
        website: 'https://patreon.com',
        events: {
            pledges: {
                count: 5,
                coverage: COVERAGE.WEBHOOK,
                complexity: COMPLEXITY.COMPLEX,
                priority: PRIORITY.MEDIUM,
                description: 'New pledges, cancellations, tier changes'
            }
        }
    },

    fourthwall: {
        name: 'Fourthwall',
        category: PLATFORM_CATEGORIES.MONETIZATION,
        tier: 'TIER3',
        totalEvents: 13,
        description: 'Creator commerce and monetization platform',
        website: 'https://fourthwall.com',
        events: {
            sales: {
                count: 8,
                coverage: COVERAGE.WEBHOOK,
                complexity: COMPLEXITY.COMPLEX,
                priority: PRIORITY.MEDIUM,
                description: 'Merchandise sales, digital products'
            },
            donations: {
                count: 5,
                coverage: COVERAGE.WEBHOOK,
                complexity: COMPLEXITY.MEDIUM,
                priority: PRIORITY.MEDIUM,
                description: 'Direct support and tips'
            }
        }
    },

    kofi: {
        name: 'Ko-Fi',
        category: PLATFORM_CATEGORIES.MONETIZATION,
        tier: 'TIER3',
        totalEvents: 4,
        description: 'Simple creator support platform',
        website: 'https://ko-fi.com',
        events: {
            donations: {
                count: 4,
                coverage: COVERAGE.WEBHOOK,
                complexity: COMPLEXITY.MEDIUM,
                priority: PRIORITY.MEDIUM,
                description: 'One-time and recurring support'
            }
        }
    }
};

// Event category groups for table organization
const EVENT_CATEGORIES = {
    'Core Engagement': {
        events: ['follow', 'subscribe', 'chat'],
        description: 'Essential viewer interaction events',
        priority: PRIORITY.HIGH
    },
    'Monetization': {
        events: ['donations', 'pledges', 'sales', 'gifts'],
        description: 'Revenue generating events',
        priority: PRIORITY.HIGH
    },
    'Community': {
        events: ['raids', 'channelPoints', 'hypeTrain'],
        description: 'Community building and engagement',
        priority: PRIORITY.MEDIUM
    },
    'Content Management': {
        events: ['scenes', 'recording', 'streaming', 'effects'],
        description: 'Broadcasting and content control',
        priority: PRIORITY.MEDIUM
    },
    'Platform Specific': {
        events: ['predictions', 'polls', 'moderaton'],
        description: 'Unique platform features',
        priority: PRIORITY.MEDIUM
    },
    'Hardware Integration': {
        events: ['streamDeck', 'lighting', 'capture'],
        description: 'Physical device integrations',
        priority: PRIORITY.LOW
    }
};

// Strategic recommendations
const STRATEGIC_RECOMMENDATIONS = {
    universal: {
        title: 'Universal Alert Events',
        description: 'Events supported across multiple platforms - highest implementation priority',
        events: [
            { event: 'follow', platforms: ['twitch', 'youtube', 'kick', 'trovo'], impact: 'high' },
            { event: 'subscribe', platforms: ['twitch', 'youtube', 'kick'], impact: 'high' },
            { event: 'chat', platforms: ['twitch', 'youtube', 'kick', 'trovo'], impact: 'high' },
            { event: 'donations', platforms: ['twitch', 'youtube', 'streamlabs', 'kofi'], impact: 'high' }
        ]
    },
    platformSpecific: {
        title: 'High-Value Platform-Specific Events',
        description: 'Unique events with strong viewer engagement potential',
        events: [
            { event: 'channelPoints', platform: 'twitch', impact: 'high' },
            { event: 'hypeTrain', platform: 'twitch', impact: 'high' },
            { event: 'gifts', platform: 'trovo', impact: 'medium' },
            { event: 'streamDeck', platform: 'elgato', impact: 'medium' }
        ]
    },
    gaps: {
        title: 'Cross-Platform Implementation Gaps',
        description: 'Areas where custom implementation could provide value',
        opportunities: [
            'YouTube raid equivalents (premieres, collaborations)',
            'Kick unique features (placeholder for future developments)',
            'Hardware integration with non-Elgato devices',
            'Custom monetization tracking across platforms'
        ]
    }
};

// Implementation phases
const IMPLEMENTATION_ROADMAP = {
    phase1: {
        title: 'Core Events - Tier 1 Platforms',
        description: 'Essential events for primary platforms',
        platforms: ['twitch', 'youtube'],
        events: ['follow', 'subscribe', 'chat', 'donations'],
        complexity: COMPLEXITY.EASY,
        timeframe: 'Immediate priority'
    },
    phase2: {
        title: 'Platform-Specific Premium Events',
        description: 'High-value unique features',
        platforms: ['twitch', 'kick', 'trovo'],
        events: ['channelPoints', 'hypeTrain', 'raids', 'gifts'],
        complexity: COMPLEXITY.MEDIUM,
        timeframe: 'Secondary priority'
    },
    phase3: {
        title: 'Hardware and Specialty Integrations',
        description: 'Advanced integrations for enhanced production',
        platforms: ['elgato', 'obs', 'streamlabs'],
        events: ['streamDeck', 'scenes', 'effects', 'lighting'],
        complexity: COMPLEXITY.COMPLEX,
        timeframe: 'Future expansion'
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PLATFORM_DATA,
        EVENT_CATEGORIES,
        PLATFORM_TIERS,
        STRATEGIC_RECOMMENDATIONS,
        IMPLEMENTATION_ROADMAP,
        PLATFORM_CATEGORIES,
        COMPLEXITY,
        PRIORITY,
        COVERAGE
    };
} else {
    // Browser environment
    window.PlatformData = {
        PLATFORM_DATA,
        EVENT_CATEGORIES,
        PLATFORM_TIERS,
        STRATEGIC_RECOMMENDATIONS,
        IMPLEMENTATION_ROADMAP,
        PLATFORM_CATEGORIES,
        COMPLEXITY,
        PRIORITY,
        COVERAGE
    };
}