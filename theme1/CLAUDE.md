# CLAUDE.md - Stream Overlay System (Theme1)

This file provides guidance to Claude Code (claude.ai/code) when working with this TypeScript-based stream overlay system.

## Project Overview

This is a **modular component overlay system** for OBS Studio featuring **TypeScript components** that integrate with **Streamer.bot** using the **official @streamerbot/client**. The system uses semantic atomic design with ComponentComposer for orchestration.

**Target Users**: Live streamers and developers who want a modular, type-safe overlay system with reusable components.

## Development Commands

### Server Management
```bash
# Start production server (port 3000)
npm start

# Start development server with auto-restart and file logging
DEBUG_TO_FILE=true npm run dev

# Install dependencies
npm install
```

### Building TypeScript (IMPORTANT)
**After editing any TypeScript files in `src/`, you MUST rebuild:**
```bash
# Build TypeScript to public/dist/ (REQUIRED after TS changes)
node build.js
```
**Note:** `npm run build` does not work reliably on this system due to npm/Windows shell issues. Always use `node build.js` directly to ensure the build runs.

## Production URLs
- `/template/overlay` - Main overlay bar (OBS Browser Source)
- `/template/alerts` - Alert notifications overlay
- `/debug/system` - System information
- `/api/global-variables` - Variable API

## Directory Structure

```
theme1/
├── package.json
├── server.js                 # Express server
├── build.js                  # Vite build wrapper
├── vite.config.js            # Build configuration
├── CLAUDE.md                 # This documentation
├── CONTRIBUTING.md           # Contributor guide
├── config.js                 # Server configuration
├── data/
│   └── globalVariables.json  # Persistent variable storage
├── archive/
│   ├── legacy-js/            # Archived JavaScript files
│   │   ├── overlay-common.js
│   │   ├── platform-data.js
│   │   └── streamerbot-integration.js
│   ├── legacy-overlays/
│   └── dev-files/
├── public/
│   ├── css/
│   │   ├── overlay-common.css
│   │   └── theme1.css
│   ├── js/
│   │   └── streamerbot-client.js  # Official @streamerbot/client
│   ├── dist/                      # Vite build output
│   │   └── stream-overlay.iife.js
│   ├── templates/
│   │   ├── overlay.html           # Main overlay bar
│   │   └── alerts.html            # Alert notifications
│   └── components/                # Legacy component files
└── src/
    ├── js/
    │   ├── main.ts                # Application entry point
    │   ├── EventBus.ts            # Event system
    │   ├── EventConstants.ts      # Event type constants
    │   ├── Logger.ts              # Logging system
    │   └── streamerbot-integration.ts  # Platform integration
    ├── css/
    │   └── style.css              # Main styles
    ├── types/
    │   ├── index.ts               # Type exports
    │   ├── events.ts              # Event interfaces
    │   ├── alerts.ts              # Alert types
    │   ├── components.ts          # Component interfaces
    │   ├── streamerbot.ts         # Streamer.bot types
    │   ├── goals.ts               # Goal tracking types
    │   └── carousel.ts            # Carousel types
    ├── tokens/                    # Design tokens
    │   ├── index.ts
    │   ├── colors.ts
    │   ├── spacing.ts
    │   ├── typography.ts
    │   └── animation.ts
    ├── components/sections/       # TypeScript components
    │   ├── BroadcasterInfo/
    │   │   ├── BroadcasterInfo.ts
    │   │   └── BroadcasterInfo.css
    │   ├── CounterCarousel/
    │   │   ├── CounterCarousel.ts
    │   │   └── CounterCarousel.css
    │   ├── HealthMonitor/
    │   │   ├── HealthMonitor.ts
    │   │   └── HealthMonitor.css
    │   ├── AlertFeed/             # Available, not yet integrated
    │   │   ├── AlertFeed.ts
    │   │   └── AlertFeed.css
    │   ├── GoalTracker/           # Available, not yet integrated
    │   │   ├── GoalTracker.ts
    │   │   └── GoalTracker.css
    │   └── RecentActivity/        # Available, not yet integrated
    │       ├── RecentActivity.ts
    │       └── RecentActivity.css
    └── composition/
        └── ComponentComposer.ts   # Component orchestration
```

## Component Architecture

### Active Components
- **BroadcasterInfo**: Profile display, live indicator, Twitch URL, DecAPI image loading
- **CounterCarousel**: Multi-counter rotating display with real-time updates
- **HealthMonitor**: Heart rate/ECG waveform display

### Available Components (Not Yet Integrated)
- **AlertFeed**: Event notification display
- **GoalTracker**: Progress bar for stream goals
- **RecentActivity**: Activity feed display

### ComponentComposer
Orchestrates component lifecycle and registration. Components are registered by name and instantiated with container selectors.

## Event System

### EventBus
Central event hub for inter-component communication. Located at `src/js/EventBus.ts`.

### Event Types (from EventConstants.ts)
```typescript
// Core events
COMPONENT_READY        // Component initialized
COMPONENT_DESTROYED    // Component destroyed

// Counter events
COUNTER_UPDATE         // Counter value changed

// Broadcaster events
BROADCASTER_UPDATE     // Profile data updated

// Alert events
ALERT_TRIGGER          // Alert notification triggered

// Stream events
STREAM_STATUS          // Stream online/offline state

// Health events
HEALTH_STATUS          // Heart rate data received
```

### Platform Events (from streamerbot-integration.ts)
Supported platforms and events:
- **Twitch**: Follow, Subscribe, Cheer, Raid, Host, RewardRedemption
- **YouTube**: Subscribe, SuperChat, SuperSticker, MemberMilestone
- **Kick**: Follow, Subscribe
- **Trovo**: Follow, Subscribe
- **Donations**: StreamElements, Streamlabs, TipeeeStream, TreatStream, Fourthwall, KoFi, Patreon

## WebSocket Architecture

```
Streaming Platform Events (Twitch/YouTube/Kick/Trovo)
         ↓
Streamer.bot (localhost:8080)
         ↓
Official @streamerbot/client
         ↓
streamerbot-integration.ts → EventBus
         ↓
TypeScript Components
         ↓
Overlay Server (localhost:3000) ← Variables persist to data/globalVariables.json
```

**Port Usage:**
- **Port 8080**: Streamer.bot WebSocket server
- **Port 3000**: Overlay Express server

## Global Variables

### Counter Variables
- `counter1`, `counter1label`
- `counter2`, `counter2label`
- `counter3`, `counter3label`

### Broadcaster Variables
- `broadcasterDisplayName`, `broadcasterUsername`
- `broadcasterUserId`, `broadcasterTwitchUrl`
- `broadcasterProfileImageTrigger`

### Goal Variables
- `activeGoalTypes` (comma-separated: "Follower,Subscription,Bit")
- Type-specific: `goalFollowerCurrent`, `goalFollowerTarget`, etc.

## Streamer.bot Client Configuration

```javascript
// Correct pattern - separate parameters
const client = new StreamerbotClient({
    host: '127.0.0.1',
    port: 8080,
    endpoint: '/',
    autoReconnect: true,
    retries: 5,
    retryInterval: 2000
});

// WRONG - causes URL duplication error
const client = new StreamerbotClient({
    endpoint: 'ws://127.0.0.1:8080/'  // Results in: ws://127.0.0.1:8080ws://127.0.0.1:8080/
});
```

## Development & Debugging

### Logger Usage
Use the Logger class instead of console.log:
```typescript
import { logger } from './Logger';
const myLogger = logger.createChildLogger('MyComponent');
myLogger.info('Message');
myLogger.debug('Debug message');
myLogger.error('Error message', error);
```

### Debug Functions (Browser Console)
```javascript
// Debug all global variables
window.debugVariables();

// Debug goal system
window.debugGoals();

// Access ComponentComposer
window.ComponentComposer

// Access Streamer.bot client
window.streamerbotClient
```

### File Logging
```bash
# Enable file logging to logs/ directory
DEBUG_TO_FILE=true npm run dev
```

## OBS Integration

### Browser Source Settings
- **URL**: `http://localhost:3000/template/overlay`
- **Resolution**: 1920×257 (bottom bar overlay) or custom
- **Custom CSS**: Not required (styles included)

### Alerts Overlay
- **URL**: `http://localhost:3000/template/alerts`
- **Resolution**: 1920×1080 (full screen)
- Displays notifications for follows, subs, cheers, etc.

## API Endpoints

- `GET /` → Redirects to /template/overlay
- `GET /template/:name` → Serves template HTML files
- `GET /api/global-variables` → Read persisted variables
- `POST /api/global-variables` → Update single variable
- `POST /api/global-variables/bulk` → Update multiple variables
- `GET /debug/system` → System information

## Key Design Principles

### 1. Type Safety
- Full TypeScript with strict mode
- Defined interfaces for all events and data
- No implicit any types

### 2. Event-Driven Architecture
- EventBus for decoupled communication
- Components subscribe to relevant events
- Clear event type constants

### 3. Component Isolation
- Each component manages its own state
- Components communicate via EventBus
- Clean lifecycle (initialize/destroy)

### 4. Persistent Storage
- Variables persist to `data/globalVariables.json`
- Throttled writes for performance
- Graceful fallbacks if storage fails
