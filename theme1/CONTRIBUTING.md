# Contributing to Stream Overlays

This guide covers how to contribute to the stream overlay system.

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- Streamer.bot running on localhost:8080 (optional for full testing)

### Setup
```bash
# Navigate to theme1 directory
cd theme1

# Install dependencies
npm install

# Start development server
npm run dev

# Build TypeScript after changes
node build.js
```

### Verify Setup
1. Open `http://localhost:3000/template/overlay` in browser
2. Open browser console - should see initialization logs
3. Open `http://localhost:3000/debug/system` for system info

## Architecture Overview

### Entry Point
- `src/js/main.ts` - Application initialization
- Initializes Streamer.bot client
- Registers components with ComponentComposer

### Event System
- `src/js/EventBus.ts` - Central event hub
- `src/js/EventConstants.ts` - Event type definitions
- Components communicate via EventBus, not direct references

### Integration
- `src/js/streamerbot-integration.ts` - Platform event handling
- Receives events from Streamer.bot, emits to EventBus

### Components
Located in `src/components/sections/`:
- Each component is a self-contained TypeScript class
- Components have their own CSS file
- Components subscribe to EventBus for updates

## Creating a New Component

### 1. Create Component Directory
```
src/components/sections/MyComponent/
├── MyComponent.ts
└── MyComponent.css (optional)
```

### 2. Component Template
```typescript
import { eventBus } from '../../../js/EventBus';
import { EVENT_TYPES } from '../../../js/EventConstants';
import { logger } from '../../../js/Logger';

const componentLogger = logger.createChildLogger('MyComponent');

export class MyComponent {
  private container: HTMLElement;
  private isInitialized = false;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    componentLogger.info('Initializing');

    // Set up event listeners
    eventBus.on(EVENT_TYPES.SOME_EVENT, this.handleEvent.bind(this));

    // Render initial state
    this.render();

    this.isInitialized = true;
    componentLogger.info('Initialized');
  }

  private handleEvent(data: unknown): void {
    componentLogger.debug('Event received', data);
    this.render();
  }

  private render(): void {
    // Update DOM
    this.container.innerHTML = `<div class="my-component">Content</div>`;
  }

  destroy(): void {
    eventBus.off(EVENT_TYPES.SOME_EVENT, this.handleEvent.bind(this));
    this.isInitialized = false;
    componentLogger.info('Destroyed');
  }

  // Required for ComponentComposer
  get elementId(): string {
    return this.container.id || 'my-component';
  }

  updateData(data: unknown): void {
    // Handle data updates from ComponentComposer
  }
}
```

### 3. Register in ComponentComposer
Edit `src/composition/ComponentComposer.ts`:
```typescript
import { MyComponent } from '../components/sections/MyComponent/MyComponent';

// In setupDefaultComponents():
this.registry.register('MyComponent', async (config: ComponentConfig) => {
  const container = document.querySelector(config.path) as HTMLElement;
  if (!container) {
    throw new Error(`Container not found: ${config.path}`);
  }
  return new MyComponent(container) as unknown as Component;
});
```

### 4. Add to main.ts
```typescript
const componentConfigs = [
  // ... existing components
  { name: 'MyComponent', path: '.my-component-section' }
];
```

### 5. Add HTML Container
In `public/templates/overlay.html`:
```html
<section class="my-component-section">
  <!-- Component renders here -->
</section>
```

## Event System

### Using EventBus
```typescript
import { eventBus } from './EventBus';
import { EVENT_TYPES } from './EventConstants';

// Subscribe to events
eventBus.on(EVENT_TYPES.COUNTER_UPDATE, (data) => {
  console.log('Counter updated:', data);
});

// Emit events
eventBus.emit(EVENT_TYPES.COUNTER_UPDATE, {
  counterName: 'counter1',
  value: 42,
  timestamp: Date.now()
});

// Unsubscribe
eventBus.off(EVENT_TYPES.COUNTER_UPDATE, handler);
```

### Adding New Event Types
1. Add to `src/js/EventConstants.ts`:
```typescript
export const EVENT_TYPES = {
  // ... existing
  MY_NEW_EVENT: 'my_new_event'
} as const;
```

2. Add interface to `src/types/events.ts`:
```typescript
export interface MyNewEventPayload {
  someData: string;
  timestamp: number;
}
```

## Code Style

### TypeScript
- Use strict mode
- Define interfaces for all data structures
- Avoid `any` type - use `unknown` if type is truly unknown
- Use Logger instead of console.log

### Logging
```typescript
import { logger } from './Logger';
const myLogger = logger.createChildLogger('ComponentName');

myLogger.debug('Debug message');  // Detailed debugging
myLogger.info('Info message');    // Normal operation
myLogger.warn('Warning message'); // Potential issues
myLogger.error('Error', error);   // Errors
```

### Naming Conventions
- Components: PascalCase (`BroadcasterInfo`)
- Files: Match component name (`BroadcasterInfo.ts`)
- Events: SCREAMING_SNAKE_CASE (`COUNTER_UPDATE`)
- Variables: camelCase

### Comments
- Add JSDoc for public APIs
- Explain "why" not "what"
- Keep comments up to date

## Testing

### Manual Testing
1. Start server: `npm start`
2. Open overlay in browser
3. Use console debug functions:
```javascript
window.debugVariables();
window.debugGoals();
window.ComponentComposer
```

### Test with Streamer.bot
1. Ensure Streamer.bot is running on port 8080
2. Send test events through Streamer.bot
3. Watch browser console for event handling

### OBS Testing
1. Add Browser Source: `http://localhost:3000/template/overlay`
2. Set resolution: 1920x257
3. Test with stream preview

## Build Process

### Development
```bash
npm run dev  # Auto-restart on changes
```

### Production Build
```bash
node build.js  # Required after TypeScript changes
```

Build output goes to `public/dist/stream-overlay.iife.js`

### Build Issues
If `npm run build` fails, use `node build.js` directly (Windows shell compatibility).

## Pull Request Process

1. Create feature branch from `master`
2. Make changes following code style
3. Run `node build.js` to verify build succeeds
4. Test in browser and OBS
5. Submit PR with clear description

### PR Description Template
```markdown
## Summary
Brief description of changes

## Changes
- List specific changes

## Testing
- How changes were tested

## Screenshots
(if applicable)
```

## Common Issues

### Build Errors
- Run `npm install` to update dependencies
- Use `node build.js` instead of `npm run build`
- Check TypeScript errors in IDE

### WebSocket Connection
- Verify Streamer.bot is running
- Check port 8080 is not blocked
- Use correct client configuration (separate host/port)

### Component Not Rendering
- Check container selector exists in HTML
- Verify component is registered in ComponentComposer
- Check browser console for errors

## Questions?

Open an issue on the repository for questions or problems.
