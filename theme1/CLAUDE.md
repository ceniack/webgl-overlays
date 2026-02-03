# CLAUDE.md - Clean Example.html Stream Overlay System

This file provides guidance to Claude Code (claude.ai/code) when working with this clean, minimal stream overlay system.

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

## Production URL
- **OBS Browser Source**: `http://localhost:3000/template/example` (clean URL - no .html needed)
- **Architecture**: Modular TypeScript components with ComponentComposer

## Modular Component System
- `/template/example` - Complete overlay with all components
- `/component/section/:name` - Individual component access
- `/debug/system` - System information

## Component Architecture
- **BroadcasterInfo**: Profile display, live indicator, Twitch URL, DecAPI image loading
- **CounterCarousel**: Multi-counter rotating display with real-time updates
- **HealthMonitor**: Heart rate/ECG waveform display
- **ComponentComposer**: Orchestrates real-time updates across all components

## Clean Architecture

### Technology Stack
- **Backend**: Express.js server + WebSocket server + JSON persistence
- **Frontend**: Single self-contained HTML overlay with inline JavaScript
- **Integration**: Official @streamerbot/client (no custom WebSocket code)
- **Dependencies**: express, ws (minimal dependencies)

### WebSocket Architecture (Clean Separation)
```
Streaming Platform Events (Twitch/YouTube/etc)
         ↓
Streamer.bot (localhost:8080)
         ↓
Official @streamerbot/client
         ↓
example.html overlay
         ↓
Overlay Server (localhost:3000) ← Variables persist to data/globalVariables.json
```

**Port Usage:**
- **Port 8080**: Official @streamerbot/client handles all Streamer.bot communication
- **Port 3000**: Overlay server handles UI communication and variable persistence

## Essential Files Structure

**Minimal File Set:**
```
/
├── package.json              # Dependencies
├── server.js                 # Clean Express server
├── CLAUDE.md                 # This documentation
├── data/
│   └── globalVariables.json  # Persistent variable storage
├── archive/
│   └── streamerbot-scripts/  # Archived C# scripts
│       ├── TwitchGoals.cs
│       └── (other C# files)
└── public/
    ├── css/
    │   ├── overlay-common.css # Essential overlay styles
    │   └── theme1.css         # Glass-morphism theme
    ├── js/
    │   ├── streamerbot-client.js    # Official @streamerbot/client
    │   ├── overlay-common.js        # Utilities (no custom WebSocket)
    │   └── streamerbot-integration.js  # Official client setup
    └── overlays/
        └── example.html       # Main overlay (self-contained)
```

### Core JavaScript Libraries (Cleaned)

**`public/js/overlay-common.js`**:
- `WebSocketManager` - Handles overlay server communication (port 3000)
- `OverlayUtils` - Animation, formatting, notification utilities
- `OverlayBase` - Simplified base class (no custom Streamer.bot client)
- **Removed**: Custom `StreamerbotClient` class (replaced by official client)

**`public/js/streamerbot-integration.js`**:
- Initializes official @streamerbot/client
- Auto-requests global variables on connection
- Maps platform events to example.html format
- Handles `GlobalVariableUpdated` events
- **Single source of truth** for Streamer.bot communication

**`public/overlays/example.html`**:
- **Self-contained** overlay (2,500+ lines)
- Uses official @streamerbot/client via streamerbot-integration.js
- Features: counters, broadcaster info, goal tracking, activity feeds
- **No custom WebSocket code** - everything via official client

## Streamer.bot Integration

### C# Scripts (Archived)
All C# scripts moved to `archive/streamerbot-scripts/`:
- `TwitchGoals.cs` - Fetch Twitch goals from API
- `GoalBeginHandler.cs` - Handle goal start events
- `GoalProgressHandler.cs` - Track goal progress
- `GoalEndHandler.cs` - Handle goal completion
- `BroadcasterInfoHandler.cs` - Get broadcaster profile

### Global Variables (Auto-Handled)
**Counter Variables:**
- `counter1`, `counter1label`
- `counter2`, `counter2label`

**Broadcaster Variables:**
- `broadcasterDisplayName`, `broadcasterUsername`
- `broadcasterUserId`, `broadcasterTwitchUrl`
- `broadcasterProfileImageTrigger`

**Goal Variables:**
- `activeGoalTypes` (comma-separated: "Follower,Subscription,Bit")
- Type-specific: `goalFollowerCurrent`, `goalFollowerTarget`, etc.

### Official Client Configuration
```javascript
StreamerbotConfig = {
    endpoint: 'ws://127.0.0.1:8080/',
    autoReconnect: true,
    retries: 10,
    retryInterval: 1000
};
```

## Platform Support (Official Client)

**Supported Events:**
- **Twitch**: Follow, Subscribe, Cheer, Raid
- **YouTube**: Subscribe, SuperChat
- **Global Variables**: Automatic handling with persistence

**Event Flow:**
1. Platform event → Streamer.bot
2. Official client receives event
3. Event mapped to example.html format
4. Activity feed updated
5. Variables auto-persisted to JSON storage

## Development & Debugging

### Built-in Debug Functions
Open browser console in example.html:

```javascript
// Debug all global variables
window.debugVariables();

// Debug goal system
window.debugGoals();

// Test profile image loading
window.testProfileImage('yourusername');

// Test goal rendering with mock data
window.testGoalRender();
```

### File Logging (Development)
```bash
# Enable file logging to logs/ directory
DEBUG_TO_FILE=true npm run dev
```

**Log Files:**
- `logs/debug.log` - Server and browser messages
- Variable changes auto-logged to console

## Server Configuration (Simplified)

### Essential Endpoints Only
- `GET /` → Redirects to /overlay/example
- `GET /overlay/:name` → Serves overlay HTML files
- `GET /api/global-variables` → Read persisted variables
- `POST /api/global-variables` → Update single variable
- `POST /api/global-variables/bulk` → Update multiple variables
- **WebSocket server** → Real-time communication with overlay

**Removed Endpoints:**
- Debug logging endpoints (replaced with simple console logging)
- Complex message routing (official client handles this)
- Multiple overlay support (single overlay focus)

## Key Design Principles

### 1. Zero Redundancy
- **Single overlay**: Only example.html
- **Single client**: Official @streamerbot/client only
- **Single purpose**: Production-ready stream overlay

### 2. Official Client First
- **No custom WebSocket code** for Streamer.bot
- **Auto-reconnection** handled by official client
- **Event mapping** standardized through official client
- **Global variables** handled through official client API

### 3. Persistent Storage
- Variables automatically persist to `data/globalVariables.json`
- **Throttled writes** (max 1 write per 100ms)
- **Atomic writes** with retry logic for WSL/Windows compatibility
- **Graceful fallbacks** if storage fails

### 4. Self-Contained Design
- example.html has **all JavaScript inline** (no external dependencies)
- **Minimal script tags**: Official client + integration + utilities
- **No build process** required
- **Direct editing** of HTML file for customization

## Important Development Notes

- **Production-ready**: Optimized for streaming performance
- **Error handling**: Comprehensive fallbacks throughout
- **Browser compatibility**: Tested with Chromium (OBS), Chrome, Firefox
- **Auto-reconnection**: Built into official client with exponential backoff
- **Minimal dependencies**: Only essential packages
- **Clean separation**: Overlay server (port 3000) vs Streamer.bot client (port 8080)

## Usage Instructions

### 1. Start the Server
```bash
DEBUG_TO_FILE=true npm start
```

### 2. Add to OBS
- **Browser Source URL**: `http://localhost:3000/template/example`
- **Resolution**: 1920x257 (bottom bar overlay) or custom
- **Custom CSS**: Not required (styles included in components)

### 3. Configure Streamer.bot
- Official @streamerbot/client connects automatically
- ComponentComposer orchestrates real-time updates
- Global variables sync with all components

### 4. Customize
- Edit individual components in `/src/components/sections/`
- Components auto-compile via TypeScript → Vite
- Use ComponentComposer for component orchestration
- Leverage design tokens for consistent theming

**Result**: A clean, maintainable overlay system with zero redundancy and official client integration.

## Common Development Issues & Solutions

### Streamer.bot WebSocket Connection Configuration

**CRITICAL PATTERN**: Always use separate `host`, `port`, and `endpoint` parameters for StreamerbotClient:

```javascript
// ✅ CORRECT - Separate parameters
const client = new StreamerbotClient({
    host: '127.0.0.1',
    port: 8080,
    endpoint: '/',
    autoReconnect: true,
    retries: 5,
    retryInterval: 2000
});

// ❌ WRONG - Full URL as endpoint causes duplication
const client = new StreamerbotClient({
    endpoint: 'ws://127.0.0.1:8080/',  // Results in: ws://127.0.0.1:8080ws://127.0.0.1:8080/
    autoReconnect: true
});
```

**Common Error**: `Failed to construct 'WebSocket': The URL 'ws://127.0.0.1:8080ws://127.0.0.1:8080/' is invalid.`

**Root Cause**: The client constructor concatenates `scheme://host:port` + `endpoint`, so passing a full URL as `endpoint` duplicates the URL.

**Solution**: Use the separate parameter pattern shown above. The official @streamerbot/client library expects this configuration format.

### Component Integration Architecture

**Pattern**: Use existing client instead of creating multiple clients:

1. **streamer-integration.js** creates the primary client and handles connection
2. **ComponentComposer** should reuse the existing `window.streamerbotClient`
3. **Components** receive updates via the ComponentComposer broadcast system

**Why**: Multiple clients cause connection conflicts and resource waste. Single client pattern ensures reliable real-time updates.

### Debugging Client Connection Issues

**Check these in browser console**:

1. **Client Availability**: `typeof window.streamerbotClient !== 'undefined'`
2. **Connection State**: `window.streamerbotClient?.socket?.readyState` (should be 1 for OPEN)
3. **Component Registration**: `window.ComponentComposer?.components.size` (should show component count)

**Real-time Data Flow**: Streamer.bot → Official Client → Integration Script → ComponentComposer → Individual Components