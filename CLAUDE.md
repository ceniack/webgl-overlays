# CLAUDE.md - Stream Overlay System

This file provides guidance to Claude Code (claude.ai/code) when working with this TypeScript-based stream overlay system.

## Project Overview

This is a **modular component overlay system** for OBS Studio featuring **TypeScript components** that integrate with **Streamer.bot** using the **official @streamerbot/client**. The system uses semantic atomic design with ComponentComposer for orchestration.

**Target Users**: Live streamers and developers who want a modular, type-safe overlay system with reusable components.

## Development Commands

### Server Management
```bash
# Navigate to theme directory
cd theme1

# Start production server (port 3000)
npm start

# Start development server with auto-restart and file logging
DEBUG_TO_FILE=true npm run dev

# Install dependencies
npm install
```

### Building TypeScript (IMPORTANT)
**After editing any TypeScript files in `theme1/src/`, you MUST rebuild:**
```bash
# Build TypeScript to public/dist/ (REQUIRED after TS changes)
cd theme1
node build.js
```
**Note:** `npm run build` does not work reliably on this system due to npm/Windows shell issues. Always use `node build.js` directly to ensure the build runs.

## Production URLs
- `/template/overlay` - Main overlay bar (OBS Browser Source)
- `/template/overlay-all` - All components visible (testing/development)
- `/template/alerts` - Alert notifications overlay
- `/template/canvas` - Canvas grid overlay (1920×1080, OBS Browser Source)
- `/template/canvas-editor` - Visual canvas editor with drag-and-drop
- `/debug/system` - System information
- `/api/global-variables` - Variable API

## Directory Structure

```
theme1/
├── package.json
├── server.js                 # Express server
├── build.js                  # Vite build wrapper
├── vite.config.js            # Build configuration
├── CONTRIBUTING.md           # Contributor guide
├── config.js                 # Server configuration
├── data/
│   ├── globalVariables.json  # Persistent variable storage
│   └── layouts/              # Canvas layout JSON storage
│       └── default-canvas.json
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
│   │   ├── theme1.css
│   │   ├── canvas-editor.css
│   │   └── themes/                    # Theme stylesheets (served by Express)
│   │       ├── cyberpunk/theme.css
│   │       ├── dark-minimal/theme.css
│   │       └── arc-raiders/theme.css
│   ├── js/
│   │   ├── streamerbot-client.js  # Official @streamerbot/client
│   │   └── canvas-editor.js
│   ├── dist/                      # Vite build output
│   │   └── stream-overlay.iife.js
│   ├── templates/
│   │   ├── overlay.html           # Main overlay bar
│   │   ├── overlay-all.html       # All components visible (testing)
│   │   ├── alerts.html            # Alert notifications
│   │   ├── canvas.html            # Canvas grid overlay
│   │   └── canvas-editor.html     # Visual canvas editor
│   └── components/                # Legacy component files
└── src/
    ├── js/
    │   ├── main.ts                # Application entry point
    │   ├── EventBus.ts            # Event system
    │   ├── EventConstants.ts      # Event type constants
    │   ├── Logger.ts              # Logging system
    │   ├── ThemeManager.ts        # Theme switching via query params
    │   └── streamerbot-integration.ts  # Platform integration
    ├── build/
    │   └── vite-plugin-design-tokens.js  # Token → CSS variable generator
    ├── css/
    │   ├── index.css              # Layer cascade imports
    │   ├── layers/
    │   │   ├── 01-reset.css       # Browser reset
    │   │   ├── 02-tokens.css      # Auto-generated design token variables
    │   │   ├── 03-base.css        # Base element styles
    │   │   ├── 04-utilities.css   # Utility classes
    │   │   ├── 05-animations.css  # Keyframe animations
    │   │   ├── 06-layout.css      # Overlay bar, sections, positioning
    │   │   └── 07-shared.css      # Cross-component shared styles
    │   └── themes/                # Theme source files (build reference)
    │       ├── cyberpunk/theme.css
    │       ├── dark-minimal/theme.css
    │       └── arc-raiders/theme.css
    ├── icons/
    │   └── platform-icons.ts      # Shared SVG icons & brand colors
    ├── types/
    │   ├── index.ts               # Type exports
    │   ├── events.ts              # Event interfaces
    │   ├── alerts.ts              # Alert types
    │   ├── components.ts          # Component interfaces
    │   ├── streamerbot.ts         # Streamer.bot types
    │   ├── goals.ts               # Goal tracking types
    │   ├── carousel.ts            # Carousel types
    │   └── canvas.ts              # Canvas layout types
    ├── tokens/                    # Design tokens (source of truth)
    │   ├── index.ts
    │   ├── colors.ts              # Color tokens (brand, alert, etc.)
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
    │   ├── AlertFeed/
    │   │   ├── AlertFeed.ts       # Multi-alert display with platform icons
    │   │   └── AlertFeed.css
    │   ├── LatestEvent/
    │   │   ├── LatestEvent.ts     # Per-type event display with platform icons
    │   │   └── LatestEvent.css
    │   ├── GoalTracker/           # Available, not yet integrated
    │   │   ├── GoalTracker.ts
    │   │   └── GoalTracker.css
    │   └── RecentActivity/        # Available, not yet integrated
    │       ├── RecentActivity.ts
    │       └── RecentActivity.css
    └── composition/
        ├── ComponentComposer.ts   # Component orchestration
        └── CanvasRenderer.ts      # Canvas grid layout renderer
```

## Component Architecture

### Active Components
- **BroadcasterInfo**: Profile display, live indicator, Twitch URL, DecAPI image loading
- **CounterCarousel**: Multi-counter rotating display with real-time updates
- **HealthMonitor**: Heart rate/ECG waveform display
- **AlertFeed**: Multi-alert notification display with platform icons, card-style rendering, configurable `maxVisible` slots. Used by `alerts.html`.
- **LatestEvent**: Per-type event display (follow, sub, cheer, raid, donation, redemption, firstword). Multiple instances per overlay, each filtered by configured event type. Platform icons, relative timestamps, persistence via Streamer.bot global variables.

### Available Components (Not Yet Integrated)
- **GoalTracker**: Progress bar for stream goals
- **RecentActivity**: Activity feed display

### ComponentComposer
Orchestrates component lifecycle and registration. Components are registered by name and instantiated with container selectors.

### Canvas System
- **CanvasRenderer** (`theme1/src/composition/CanvasRenderer.ts`): Builds 1920×1080 CSS Grid canvas from layout JSON. Creates cell wrappers, mounts components via ComponentComposer. Fetches layout from `/api/canvas-layout/:name`. Debug mode: `?debug=grid`.

## CSS Layer Architecture

Styles are organized into ordered layers imported by `theme1/src/css/index.css`:

| Layer | File | Purpose |
|-------|------|---------|
| 01 | `01-reset.css` | Browser reset |
| 02 | `02-tokens.css` | Auto-generated design token CSS variables |
| 03 | `03-base.css` | Base element styles |
| 04 | `04-utilities.css` | Utility classes |
| 05 | `05-animations.css` | Keyframe animations |
| 06 | `06-layout.css` | Overlay bar, sections, OBS dimensions |
| 07 | `07-shared.css` | Cross-component shared styles |

Component-specific CSS is co-located in each component's directory and imported by `main.ts`.

**Important:** `02-tokens.css` is auto-generated by the build — do not edit it manually.

## Design Token System

Design tokens are defined in TypeScript and auto-generated into CSS variables at build time.

**Flow:** `theme1/src/tokens/*.ts` → `vite-plugin-design-tokens.js` → `theme1/src/css/layers/02-tokens.css`

Token naming convention: `--token-{category}-{group}-{name}` (e.g., `--token-color-alert-follow`)

Short-hand aliases are also generated: `--alert-follow: var(--token-color-alert-follow)`

Alert color tokens:
- `--token-color-alert-follow`, `--token-color-alert-sub`, `--token-color-alert-cheer`
- `--token-color-alert-raid`, `--token-color-alert-donation`, `--token-color-alert-redemption`
- `--token-color-alert-firstword`

## Theme System

Seven themes are available, switchable via `?theme=` query parameter on any template URL:
- **cyberpunk** (default): Neon cyan/pink, Orbitron display font
- **dark-minimal**: Muted colors, Inter font, understated aesthetic
- **arc-raiders**: Retro sci-fi "NASA-punk" — warm cream (#eae0cd) on near-black, crimson accent (#ff2439), Chakra Petch + Barlow fonts
- **fallout-pipboy**: Green phosphor CRT terminal — monochrome green, scanlines, phosphor glow, VT323 + Share Tech Mono fonts
- **fallout-vaulttec**: 1950s Vault-Tec propaganda — atomic gold/blue, geometric dot pattern, Righteous + Prompt fonts
- **fallout-wasteland**: Post-apocalyptic desert grit — rust brown/tan, paper grain texture, Special Elite + Bitter fonts
- **fallout-nukacola**: 1950s Nuka-Cola diner — candy red/cream, chrome buttons, neon glow, Pacifico + Nunito fonts

Theme files override `:root` CSS token variables. Both pages (`overlay.html`, `alerts.html`) load:
1. `dist/assets/stream-overlay.css` — bundled CSS with all token variables + component styles
2. `/css/themes/{name}/theme.css` — theme overrides (served by Express from `public/css/themes/`)

**Dual file locations:** Theme CSS exists in both `theme1/src/css/themes/` (build reference) and `theme1/public/css/themes/` (served by Express). These must be kept in sync manually since the build does not copy them.

Valid themes: configured in `server.js` `VALID_THEMES` array.
Valid layouts: `default`, `wide`, `compact`, `fullscreen`, `canvas`.

## Event System

### EventBus
Central event hub for inter-component communication. Located at `theme1/src/js/EventBus.ts`.

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

// Latest event events
LATEST_EVENT_RESTORE   // Restore persisted latest event data

// Goal events
GOAL_PROGRESS          // Goal progress updated

// Activity events
ACTIVITY_ITEM          // New activity feed item
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
Overlay Server (localhost:3000) ← Variables persist to theme1/data/globalVariables.json
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

// --- Alert testing (on /template/alerts page) ---
window.testAlert('follow')           // Single alert test
window.testAlertQueue(5)             // Queue multiple alerts
window.testPlatformAlert('kick', 'follow', 'KickUser')  // Platform-specific
window.testAllPlatforms()            // Cycle all platform+type combos
window.testHelp()                    // Print command reference
window.showDebug()                   // Show debug panel (active/queue counts)
window.hideDebug()                   // Hide debug panel
window.listActions()                 // List Streamer.bot actions
window.runAction('name', {})         // Run a Streamer.bot action
window.debugAlertFeed()              // Dump AlertFeed internal state

// --- Canvas overlay (on /template/canvas page) ---
window.debugCanvas()              // Dump CanvasRenderer state
window.canvasRenderer             // Access CanvasRenderer instance

// --- LatestEvent testing ---
window.testLatestEvent('follow')  // Test specific event type
window.testAllLatestEvents()      // Fire all event types
window.debugLatestEvents()        // Dump all LatestEvent state
window.clearLatestEvents()        // Clear LatestEvent state

// --- Counter carousel ---
window.debugCounters()            // Dump counter state
window.testCounterValues()        // Random test values
window.testCounterLabels()        // Test label updates
window.testCounterVisibility()    // Toggle random visibility
```

### Testing All Components
- **URL**: `http://localhost:3000/template/overlay-all`
- All sections visible (LatestEvent, counters, heart rate, branding)
- Same bundle as overlay, different layout for testing

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
- **Resolution**: 1920×1080 (full screen, `data-layout="fullscreen"`)
- Uses bundled TypeScript AlertFeed component (same CSS bundle as overlay)
- `data-component="alerts-html"` initializes AlertFeed with `maxVisible: 3`
- No inline JS/CSS — shares `dist/assets/stream-overlay.css` with overlay
- Theme switching: append `?theme=dark-minimal` to URL

### Canvas Overlay
- **URL**: `http://localhost:3000/template/canvas`
- **Resolution**: 1920×1080 (full canvas with transparent background)
- 48×27 CSS Grid cell system
- Layout switchable via `?canvasLayout=name`
- Theme switchable via `?theme=arc-raiders`
- Debug grid: `?debug=grid`

## API Endpoints

- `GET /` → Redirects to /template/overlay
- `GET /template/:name` → Serves template HTML files
- `GET /api/global-variables` → Read persisted variables
- `POST /api/global-variables` → Update single variable
- `POST /api/global-variables/bulk` → Update multiple variables
- `GET /debug/system` → System information
- `GET /api/canvas-layouts` → List all saved canvas layouts
- `GET /api/canvas-layout/:name` → Read a canvas layout JSON
- `POST /api/canvas-layout/:name` → Save/update a canvas layout
- `DELETE /api/canvas-layout/:name` → Delete a canvas layout

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
- Variables persist to `theme1/data/globalVariables.json`
- Throttled writes for performance
- Graceful fallbacks if storage fails

## Automatic Cleanup

A pre-commit hook automatically deletes before each commit:
- `.tmp*` files (created by Claude Code edit operations)
- `nul` files (Windows artifacts from `/dev/null` redirects)

No manual cleanup needed — the hook handles it.
