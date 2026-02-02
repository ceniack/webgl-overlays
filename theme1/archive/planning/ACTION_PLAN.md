# Action Plan: Theme1 Stream Overlay System Improvements

**Generated**: 2024
**Status**: In Progress
**Priority**: Critical → High → Medium → Low

---

## PHASE 1: CRITICAL FIXES (Security & Stability)

### ✅ 1.1 Add Input Validation to Server Routes
**Priority**: CRITICAL 🔴
**Estimated Time**: 30 minutes
**Files**: `server.js`

**Issue**: Path traversal vulnerability in route handlers

**Implementation**:
```javascript
// Add validation helper function
function validatePathParam(param) {
    // Remove any non-alphanumeric characters except hyphens and underscores
    const sanitized = param.replace(/[^a-zA-Z0-9-_]/g, '');
    
    // Check for path traversal attempts
    if (!sanitized || param.includes('..') || param.includes('/') || param.includes('\\')) {
        return null;
    }
    
    return sanitized;
}

// Apply to all route handlers
app.get('/template/:name', (req, res) => {
    const templateName = validatePathParam(req.params.name);
    if (!templateName) {
        return res.status(400).send('Invalid template name');
    }
    // ... rest of handler
});
```

**Files to Update**:
- Lines 106-121: `/template/:name`
- Lines 124-134: `/compiled/:name`
- Lines 138-166: `/component/element/:name`, `/component/feature/:name`, `/component/section/:name`
- Lines 174-177: `/layout/:name`
- Lines 180-184: `/component/ts/:type/:name`

---

### ✅ 1.2 Create Centralized Configuration
**Priority**: CRITICAL 🔴
**Estimated Time**: 45 minutes
**Files**: New `config.js`, update all files using config

**Implementation**:
```javascript
// config.js
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
        profileImageRetry: 100
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
        'counter1', 'counter1label',
        'counter2', 'counter2label',
        'counter3', 'counter3label',
        'counter4', 'counter4label',
        'heartRate', 'heartRateStatus'
    ]
};
```

**Files to Update**:
- `server.js`: Import and use config
- `src/js/main.js`: Import and use config
- `public/js/streamerbot-integration.js`: Import and use config

---

### ✅ 1.3 Add Error Boundaries to Component Initialization
**Priority**: CRITICAL 🔴
**Estimated Time**: 30 minutes
**Files**: `src/js/main.js`

**Implementation**: See detailed code in main.js update below

---

### ✅ 1.4 Convert Synchronous File Operations to Async
**Priority**: HIGH 🟡
**Estimated Time**: 1 hour
**Files**: `server.js`

**Changes**:
- Replace `fs.existsSync()` with `fs.promises.access()`
- Replace `fs.appendFileSync()` with `fs.promises.appendFile()`
- Update route handlers to async/await
- Add proper error handling

---

## PHASE 2: TYPESCRIPT IMPLEMENTATION

### ✅ 2.1 Create TypeScript Type Definitions
**Priority**: HIGH 🟡
**Estimated Time**: 2 hours
**Files**: New `src/types/` directory

**Create**:
- `src/types/streamerbot.d.ts` - Streamer.bot client types
- `src/types/components.d.ts` - Component interfaces
- `src/types/events.d.ts` - Event types
- `src/types/config.d.ts` - Configuration types

---

### ✅ 2.2 Convert ComponentComposer to TypeScript
**Priority**: HIGH 🟡
**Estimated Time**: 2 hours
**Files**: `src/js/main.js` → `src/composition/ComponentComposer.ts`

**Benefits**:
- Type-safe component registration
- Better IDE autocomplete
- Catch errors at compile time

---

### ✅ 2.3 Convert Components to TypeScript
**Priority**: MEDIUM 🟠
**Estimated Time**: 3 hours
**Files**: Create new `.ts` files in `src/components/sections/`

**Components to Convert**:
1. `BroadcasterInfo.ts`
2. `CounterCarousel.ts`
3. `HealthMonitor.ts`

---

## PHASE 3: ARCHITECTURE IMPROVEMENTS

### ✅ 3.1 Implement Event-Based Communication System
**Priority**: HIGH 🟡
**Estimated Time**: 3 hours
**Files**: New `src/js/EventBus.js`, update all components

**Implementation**:
```javascript
// EventBus.js
class EventBus {
    constructor() {
        this.listeners = new Map();
    }
    
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (!this.listeners.has(event)) return;
        const callbacks = this.listeners.get(event);
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    }
    
    emit(event, data) {
        if (!this.listeners.has(event)) return;
        this.listeners.get(event).forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in event listener for ${event}:`, error);
            }
        });
    }
    
    clear() {
        this.listeners.clear();
    }
}

export const eventBus = new EventBus();
```

**Replace Global Functions With**:
```javascript
// Instead of: window.updateBroadcasterDisplayName = ...
eventBus.on('broadcaster:displayName', (displayName) => {
    // Update display name
});

// Instead of: window.updateBroadcasterDisplayName(name)
eventBus.emit('broadcaster:displayName', name);
```

---

### ✅ 3.2 Fix Vite Path Aliases
**Priority**: MEDIUM 🟠
**Estimated Time**: 15 minutes
**Files**: `vite.config.js`

**Change**:
```javascript
resolve: {
    alias: {
        '@components': resolve(__dirname, 'src/components'),
        '@js': resolve(__dirname, 'src/js'),
        '@css': resolve(__dirname, 'src/css'),
        '@types': resolve(__dirname, 'src/types'),
        '@composition': resolve(__dirname, 'src/composition')
    }
}
```

---

### ✅ 3.3 Add Rate Limiting
**Priority**: MEDIUM 🟠
**Estimated Time**: 20 minutes
**Files**: `server.js`, `package.json`

**Implementation**:
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);
```

---

## PHASE 4: CODE QUALITY IMPROVEMENTS

### ✅ 4.1 Break Up Large Files
**Priority**: MEDIUM 🟠
**Estimated Time**: 4 hours

**Files to Split**:

1. **`streamerbot-integration.js` (1385 lines)**
   - Split into:
     - `streamerbot-client-manager.js` (client initialization)
     - `variable-processor.js` (variable processing)
     - `event-handlers.js` (event handling)
     - `component-coordinator.js` (readiness coordination)

2. **`overlay-common.js` (646 lines)**
   - Split into:
     - `debug-logger.js` (debug logging)
     - `websocket-manager.js` (WebSocket management)
     - `overlay-utils.js` (utilities)

3. **`main.js` (580 lines)**
   - Already planned to convert to TypeScript modules

---

### ✅ 4.2 Add JSDoc Comments
**Priority**: LOW 🔵
**Estimated Time**: 3 hours
**Files**: All JavaScript files

**Template**:
```javascript
/**
 * Broadcasts an event to all registered components
 * @param {string} eventType - Type of event (e.g., 'globalVariableUpdated')
 * @param {Object} data - Event data to broadcast
 * @param {string} data.name - Variable name
 * @param {*} data.newValue - New value
 * @param {*} [data.oldValue] - Previous value (optional)
 * @returns {void}
 * @throws {Error} If eventType is invalid
 */
broadcastToComponents(eventType, data) {
    // ...
}
```

---

### ✅ 4.3 Add Unit Tests
**Priority**: LOW 🔵
**Estimated Time**: 8 hours
**Files**: New `tests/` directory

**Setup**:
```bash
npm install --save-dev jest @types/jest ts-jest
```

**Test Files to Create**:
- `tests/ComponentComposer.test.ts`
- `tests/EventBus.test.js`
- `tests/config.test.js`
- `tests/components/BroadcasterInfo.test.ts`

---

### ✅ 4.4 Improve TypeScript Configuration
**Priority**: LOW 🔵
**Estimated Time**: 15 minutes
**Files**: `tsconfig.json`

**Changes**:
```json
{
    "compilerOptions": {
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true,
        "strictBindCallApply": true,
        "strictPropertyInitialization": true,
        "noImplicitOverride": true,
        "noUncheckedIndexedAccess": true
    }
}
```

---

## PHASE 5: DOCUMENTATION & CLEANUP

### ✅ 5.1 Update CLAUDE.md
**Priority**: MEDIUM 🟠
**Estimated Time**: 1 hour
**Files**: `CLAUDE.md`

**Updates Needed**:
- Reflect TypeScript implementation
- Document new EventBus system
- Update architecture diagrams
- Add security best practices
- Document configuration system

---

### ✅ 5.2 Create CONTRIBUTING.md
**Priority**: LOW 🔵
**Estimated Time**: 1 hour
**Files**: New `CONTRIBUTING.md`

**Include**:
- Code style guidelines
- Naming conventions
- Git workflow
- Testing requirements
- PR template

---

### ✅ 5.3 Audit and Remove Unused Dependencies
**Priority**: LOW 🔵
**Estimated Time**: 30 minutes
**Files**: `package.json`

**Check**:
- `@vitejs/plugin-legacy` - Is this used?
- `vite-plugin-html` - Not in vite.config.js

---

## IMPLEMENTATION ORDER

### Week 1: Critical Fixes
- [ ] Day 1: Input validation (1.1)
- [ ] Day 2: Centralized config (1.2)
- [ ] Day 3: Error boundaries (1.3)
- [ ] Day 4: Async file operations (1.4)
- [ ] Day 5: Rate limiting (3.3)

### Week 2: TypeScript Foundation
- [ ] Day 1-2: Type definitions (2.1)
- [ ] Day 3-4: Convert ComponentComposer (2.2)
- [ ] Day 5: Fix Vite aliases (3.2)

### Week 3: Architecture Improvements
- [ ] Day 1-2: EventBus implementation (3.1)
- [ ] Day 3-5: Convert components to TypeScript (2.3)

### Week 4: Code Quality
- [ ] Day 1-2: Break up large files (4.1)
- [ ] Day 3: JSDoc comments (4.2)
- [ ] Day 4-5: Documentation updates (5.1, 5.2)

### Week 5: Testing & Polish
- [ ] Day 1-3: Unit tests (4.3)
- [ ] Day 4: TypeScript config improvements (4.4)
- [ ] Day 5: Dependency audit (5.3)

---

## SUCCESS METRICS

### Code Quality
- [ ] All TypeScript files compile without errors
- [ ] No `any` types in production code
- [ ] Test coverage > 70%
- [ ] No ESLint errors

### Security
- [ ] All inputs validated
- [ ] Rate limiting active
- [ ] No path traversal vulnerabilities
- [ ] Security audit passes

### Performance
- [ ] No synchronous file operations in hot paths
- [ ] Component initialization < 2 seconds
- [ ] Memory leaks eliminated
- [ ] Event listeners properly cleaned up

### Developer Experience
- [ ] Full IDE autocomplete
- [ ] Clear error messages
- [ ] Comprehensive documentation
- [ ] Easy to add new components

---

## ROLLBACK PLAN

If issues arise:
1. All changes in feature branches
2. Git tags before each phase
3. Backup of working version
4. Incremental deployment
5. Monitoring and logging

---

## NOTES

- Each phase can be done independently
- Critical fixes should be deployed immediately
- TypeScript conversion can be gradual
- Keep backward compatibility during transition
- Test thoroughly in OBS before deploying
