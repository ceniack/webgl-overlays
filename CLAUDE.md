# CLAUDE.md - Nunjucks OBS Theme Framework System

This file provides guidance to Claude Code (claude.ai/code) when working with this **Nunjucks-based theme framework** for OBS overlays with real-time Streamer.bot integration and visual layout editing.

## Project Overview

This is a **modern theme framework** for OBS Studio featuring **Nunjucks templating**, **GridStack.js visual editor**, and **real-time Streamer.bot integration**. The system provides easy data access in templates with seamless real-time updates.

**Target Users**: Live streamers and developers who want a flexible, template-based overlay system with visual editing capabilities.

## Directory Structure

```
/mnt/c/Users/ceniack/Videos/OBS Studio/stream-overlays/
├── theme1/                           # Original overlay system (preserved)
│   ├── NUNJUCKS_THEME_FRAMEWORK_PLAN.md  # Implementation plan
│   └── [existing overlay files...]
└── obs-theme-framework/              # New Nunjucks framework (port 3001)
    ├── package.json
    ├── server.js
    ├── config/
    │   └── nunjucks.js              # Nunjucks setup with custom filters
    ├── services/
    │   └── StreamerBotBridge.js     # Real-time Streamer.bot integration
    ├── templates/
    │   ├── themes/
    │   │   └── grid-theme/
    │   │       ├── overlays/
    │   │       │   └── example.njk    # Main overlay template
    │   │       └── layouts/
    │   │           └── base.njk       # Base layout
    │   └── components/              # Reusable Nunjucks components
    │       ├── counters/
    │       │   ├── counter-box.njk    # Easy variable access
    │       │   └── counter-carousel.njk
    │       ├── branding/
    │       │   └── profile.njk        # Real-time broadcaster info
    │       ├── activity/
    │       │   └── activity-feed.njk  # Real-time event feed
    │       ├── goals/
    │       │   └── goal-bar.njk       # Progress tracking
    │       └── vitals/
    │           └── heart-rate.njk     # Health monitoring
    ├── public/                      # Frontend assets
    │   ├── js/
    │   │   ├── realtime-updates.js     # Socket.IO client
    │   │   ├── gridstack-obs.js        # GridStack integration
    │   │   └── socket.io.js            # Socket.IO library
    │   └── css/
    │       ├── overlay-grid.css        # GridStack + OBS styles
    │       └── theme1.css              # Theme styling
    ├── themes/                      # Theme configurations
    │   └── grid-theme/
    │       └── config.json             # Theme settings
    └── storage/
        └── layouts/                    # Saved GridStack layouts
```

## Development Commands

### Theme Framework Management (Port 3001)
```bash
# Navigate to framework directory
cd obs-theme-framework

# Install dependencies
npm install

# Start framework server
npm start

# Start with debug logging
npm run dev

# Start in visual editor mode
npm run editor
```

### Essential URLs
- **Example Overlay**: http://localhost:3001/theme/grid-theme/overlay/example
- **Visual Editor**: http://localhost:3001/theme/grid-theme/editor
- **Event Tester**: http://localhost:3001/test/websocket-events
- **API Data**: http://localhost:3001/api/data

## Key Architecture Features

### Technology Stack
- **Backend**: Express.js + Socket.IO + Nunjucks templating
- **Frontend**: GridStack.js visual editor + real-time WebSocket updates
- **Integration**: Official @streamerbot/client with enhanced event discovery
- **Templates**: Nunjucks (Twig-like syntax) with easy data binding

### Real-Time Data Architecture
```
Streaming Platform Events (Twitch/YouTube/etc)
         ↓
Streamer.bot (localhost:8080)
         ↓
Official @streamerbot/client
         ↓
StreamerBotBridge Service (Enhanced Event Discovery)
         ↓
Socket.IO → Nunjucks Templates → GridStack Components
         ↓
Real-time overlay updates (no page reload)
```

**Port Usage:**
- **Port 8080**: Official @streamerbot/client handles all Streamer.bot communication
- **Port 3001**: Theme framework handles templating, visual editing, and real-time updates
- **Port 3000**: Original overlay system (preserved, can run alongside)

## Template System Features

### Easy Data Access Patterns
Templates can access data with simple, intuitive syntax:

```html
{# Access global variables from existing system #}
{{ data.variables.counter1 | formatNumber }}
{{ data.variables.broadcasterDisplayName }}

{# Access latest events with easy syntax #}
{{ data.events.lastFollower.displayName }}
{{ data.events.lastSubscriber.tier }}
{{ data.events.lastCheer.bits }}

{# Access session counters #}
{{ data.counters.followers }}
{{ data.counters.subscribers }}

{# Access recent activity #}
{% for activity in data.events.recentActivity %}
  {{ activity.type }} - {{ activity.timestamp | timeAgo }}
{% endfor %}
```

### Real-Time Update System
Components automatically update when:
- New Streamer.bot events arrive (follows, subs, cheers, etc.)
- Global variables change
- Session counters increment
- Activity feed updates

### Custom Nunjucks Filters
- `formatNumber` - Adds thousand separators: `1234 → 1,234`
- `timeAgo` - Relative time display: `2 minutes ago`
- `currency` - Currency formatting: `$25.00`

## Component Development

### Creating Components
```html
{# templates/components/example/my-component.njk #}
<div class="my-component" data-update="events.lastFollower">
  <h3>Recent Follower</h3>
  {% if data.events.lastFollower %}
    <div>Thanks {{ data.events.lastFollower.displayName }}!</div>
    <small>{{ data.events.lastFollower.timestamp | timeAgo }}</small>
  {% endif %}
</div>
```

### GridStack Integration
Components work seamlessly with GridStack visual editor:
- Drag-and-drop placement
- Real-time data binding
- Layout persistence
- OBS-optimized dimensions (1920×257px)

## Streamer.bot Integration

### Enhanced Event Discovery
The StreamerBotBridge service provides:
- **Universal Event Listener**: Catches ALL Streamer.bot events
- **Dynamic Event Discovery**: Automatically detects new event types
- **Raw Event Logging**: For testing and template development
- **Event Structure Analysis**: Helps with template data access

### Supported Events
All standard Streamer.bot events plus automatic discovery:
- **Twitch**: Follow, Subscribe, Cheer, Raid, Host, RewardRedemption
- **YouTube**: Subscribe, SuperChat, SuperSticker, MemberMilestone
- **Global Variables**: Real-time updates with persistence
- **Custom Events**: Automatically detected and logged

### Event Testing
Use the advanced testing template at `/test/websocket-events`:
- Live event stream monitoring
- Event structure exploration
- Template data access pattern generation
- Raw event export for analysis

## Development & Debugging

### Built-in Debug Tools
The framework includes comprehensive debugging:

```javascript
// Access current overlay data
window.getCurrentOverlayData();

// Request data refresh
window.requestDataRefresh();

// View available events (in testing template)
// Navigate to: http://localhost:3001/test/websocket-events
```

### Visual Editor Debug Mode
```bash
# Start in editor mode for layout testing
EDITOR_MODE=true npm start
```

### Event Discovery
The framework automatically discovers and logs all Streamer.bot events:
- View live events in browser console
- Export event structures for template development
- Test template data access patterns

## Key Design Principles

### 1. Easy Template Data Access
- Simple syntax: `{{ data.events.lastFollower.displayName }}`
- No complex API calls required
- Real-time data available immediately
- Intuitive template structure

### 2. Real-Time Updates
- No page reloads in OBS
- Component-level updates
- WebSocket-driven data flow
- Performance optimized for streaming

### 3. Visual Layout Editor
- GridStack.js drag-and-drop interface
- OBS-optimized dimensions
- Live data preview
- Layout persistence

### 4. Comprehensive Event Support
- Universal event listener
- Dynamic event discovery
- Raw event logging for development
- Easy testing and debugging

## Framework Benefits Over Traditional Overlays

### Developer Experience
- **Nunjucks Templating**: Familiar Twig-like syntax
- **Component Reusability**: Modular template system
- **Real-Time Development**: See changes instantly
- **Visual Editor**: No code required for layout changes

### Performance
- **Component Updates**: Only changed parts refresh
- **No Page Reloads**: Seamless experience in OBS
- **Efficient WebSockets**: Minimal bandwidth usage
- **Optimized Rendering**: Template caching and smart updates

### Flexibility
- **Multiple Themes**: Easy theme switching
- **Custom Components**: Simple component creation
- **Layout Variations**: GridStack visual editing
- **Data Binding**: Automatic real-time updates

## Usage Instructions

### 1. Start the Framework
```bash
cd obs-theme-framework
npm install
npm start
```

### 2. Add to OBS
- **Browser Source URL**: `http://localhost:3001/theme/grid-theme/overlay/example`
- **Resolution**: 1920×257 (bottom bar overlay) or custom
- **Custom CSS**: Not required (styles included in templates)

### 3. Configure Streamer.bot
- Official @streamerbot/client connects automatically to port 8080
- Framework discovers and logs all available events
- Global variables sync automatically with templates

### 4. Develop & Customize
- **Edit Templates**: Modify `.njk` files in `templates/` directory
- **Create Components**: Add new components in `templates/components/`
- **Visual Editing**: Use `/editor` URL for drag-and-drop layout
- **Test Events**: Use `/test/websocket-events` for event discovery

### 5. Advanced Features
- **Custom Themes**: Create new theme directories
- **Component Library**: Build reusable component collections
- **Layout Variants**: Save multiple layouts per theme
- **Event Testing**: Comprehensive event monitoring and analysis

**Result**: A modern, flexible theme framework with easy template development, real-time data access, and visual layout editing capabilities.