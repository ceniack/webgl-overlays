const express = require('express');
const path = require('path');
const WebSocket = require('ws');
const fs = require('fs');

// Enable file logging via environment variable: DEBUG_TO_FILE=true npm run dev
const debugToFile = process.env.DEBUG_TO_FILE === 'true';

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (debugToFile && !fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Safe file write function with error handling
function safeAppendToFile(filename, content) {
    if (!debugToFile) return;

    try {
        const filePath = path.join(logsDir, filename);
        fs.appendFileSync(filePath, content);
    } catch (error) {
        // Fallback to console if file write fails
        console.error(`Failed to write to ${filename}:`, error.message);
    }
}




if (debugToFile) {
    // Simple dual logging - console + file (only when DEBUG_TO_FILE=true)
    const originalConsoleLog = console.log;
    console.log = function(...args) {
        const timestamp = new Date().toISOString();
        const message = args.join(' ');

        // Keep normal console output for VS Code
        originalConsoleLog(...args);

        // Also write to file for Claude
        safeAppendToFile('debug.log', `${timestamp} [SERVER] ${message}\n`);
    };

    const originalConsoleError = console.error;
    console.error = function(...args) {
        const timestamp = new Date().toISOString();
        const message = args.join(' ');

        originalConsoleError(...args);
        safeAppendToFile('debug.log', `${timestamp} [SERVER ERROR] ${message}\n`);
    };
}

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for parsing JSON requests
app.use(express.json());

// API ROUTES FIRST - must be before static middleware

// Debug logging endpoint for overlay debugging
app.post('/api/debug-log', (req, res) => {
    const { level = 'info', message, timestamp } = req.body;

    if (debugToFile) {
        // Only log to file if debug mode enabled
        const logLine = `${timestamp || new Date().toISOString()} [${level.toUpperCase()}] ${message}\n`;
        safeAppendToFile('debug.log', logLine);
    }

    console.log(`[OVERLAY:${level.toUpperCase()}]`, message);
    res.status(200).json({ success: true });
});

// System information endpoint
app.get('/debug/system', (req, res) => {
  res.json({
    overlay_system: {
      production: '/template/overlay',
      description: 'Modular TypeScript component system',
      features: ['ComponentComposer', 'Design Tokens', 'TypeScript', 'Vite Build'],
      components: ['BroadcasterInfo', 'CounterCarousel', 'HealthMonitor'],
      status: 'ACTIVE'
    },
    component_routes: {
      individual: '/component/section/:name',
      examples: [
        '/component/section/BroadcasterInfo',
        '/component/section/CounterCarousel',
        '/component/section/HealthMonitor'
      ]
    }
  });
});

// PAGE ROUTES SECOND

// Basic route for clean example.html system - now redirects to template
app.get('/', (req, res) => {
  res.redirect('/template/overlay');
});

// Valid themes and layouts for query parameter injection
const VALID_THEMES = ['cyberpunk', 'dark-minimal'];
const VALID_LAYOUTS = ['default', 'wide', 'compact', 'fullscreen'];

// Routes for template rendering
app.get('/template/:name', (req, res) => {
  const templateName = req.params.name;

  // Input validation: prevent path traversal attacks
  // Only allow alphanumeric characters, hyphens, and underscores
  if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) {
    console.log(`⚠️ Invalid template name rejected: ${templateName}`);
    return res.status(400).send('Invalid template name');
  }

  // Check for compiled template first (from Vite build - nested in templates/ subdirectory)
  const compiledPath = path.join(__dirname, 'public', 'templates', 'compiled', 'templates', `${templateName}.html`);
  const originalPath = path.join(__dirname, 'public', 'templates', `${templateName}.html`);

  let filePath = null;
  if (fs.existsSync(compiledPath)) {
    filePath = compiledPath;
  } else if (fs.existsSync(originalPath)) {
    filePath = originalPath;
  }

  if (!filePath) {
    console.log(`❌ Template not found: ${templateName}`);
    return res.status(404).type('text').send(`Template ${templateName} not found`);
  }

  // Read and inject theme/layout parameters into HTML
  const theme = VALID_THEMES.includes(req.query.theme) ? req.query.theme : 'cyberpunk';
  const layout = VALID_LAYOUTS.includes(req.query.layout) ? req.query.layout : 'default';

  let html = fs.readFileSync(filePath, 'utf-8');

  // Inject data-theme and data-layout attributes
  html = html.replace(/data-theme="[^"]*"/, `data-theme="${theme}"`);
  html = html.replace(/data-layout="[^"]*"/, `data-layout="${layout}"`);

  // Inject the correct theme stylesheet path
  html = html.replace(
    /href="\/css\/themes\/[^"]*\/theme\.css"/,
    `href="/css/themes/${theme}/theme.css"`
  );

  res.type('html').send(html);
});

// Route for compiled templates specifically
app.get('/compiled/:name', (req, res) => {
  const templateName = req.params.name;

  // Input validation: prevent path traversal attacks
  if (!/^[a-zA-Z0-9_-]+$/.test(templateName)) {
    return res.status(400).send('Invalid template name');
  }

  const compiledPath = path.join(__dirname, 'public', 'templates', 'compiled', `${templateName}.html`);

  if (fs.existsSync(compiledPath)) {
    res.sendFile(compiledPath);
  } else {
    console.log(`❌ Compiled template not found: ${templateName}`);
    res.status(404).type('text').send(`Compiled template ${templateName} not found`);
  }
});

// Input validation helper for component names
const isValidComponentName = (name) => /^[a-zA-Z0-9_-]+$/.test(name);

// Semantic atomic design routes (new structure)
// Routes MUST come before static middleware to prevent directory redirects
app.get('/component/element/:name', (req, res) => {
  const componentName = req.params.name;
  if (!isValidComponentName(componentName)) {
    return res.status(400).send('Invalid component name');
  }
  const componentPath = path.join(__dirname, 'public', 'components', 'elements', componentName, `${componentName}.html`);
  if (fs.existsSync(componentPath)) {
    res.sendFile(componentPath);
  } else {
    res.status(404).type('text').send(`Component ${componentName} not found`);
  }
});

app.get('/component/feature/:name', (req, res) => {
  const componentName = req.params.name;
  if (!isValidComponentName(componentName)) {
    return res.status(400).send('Invalid component name');
  }
  const componentPath = path.join(__dirname, 'public', 'components', 'features', componentName, `${componentName}.html`);
  if (fs.existsSync(componentPath)) {
    res.sendFile(componentPath);
  } else {
    res.status(404).type('text').send(`Component ${componentName} not found`);
  }
});

app.get('/component/section/:name', (req, res) => {
  const componentName = req.params.name;
  if (!isValidComponentName(componentName)) {
    return res.status(400).send('Invalid component name');
  }
  const componentPath = path.join(__dirname, 'public', 'components', 'sections', componentName, `${componentName}.html`);
  if (fs.existsSync(componentPath)) {
    res.sendFile(componentPath);
  } else {
    res.status(404).type('text').send(`Component ${componentName} not found`);
  }
});

// Serve component assets at the URL structure the HTML expects
// Static middleware AFTER routes so component HTML pages are served by routes
app.use('/component/section', express.static(path.join(__dirname, 'public', 'components', 'sections')));
app.use('/component/element', express.static(path.join(__dirname, 'public', 'components', 'elements')));
app.use('/component/feature', express.static(path.join(__dirname, 'public', 'components', 'features')));

// ASSET ROUTES THIRD

// Serve Vite compiled JavaScript assets at root level (main-*.js files)
app.get(/^\/main-.*\.js$/, (req, res) => {
  const fileName = req.path.substring(1); // Remove leading /
  const filePath = path.join(__dirname, 'public', 'templates', 'compiled', fileName);
  if (fs.existsSync(filePath)) {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(filePath);
  } else {
    console.log(`❌ Vite asset not found: ${fileName}`);
    res.status(404).send('Vite asset not found');
  }
});

// Serve other compiled assets
app.use('/assets', express.static(path.join(__dirname, 'public', 'templates', 'compiled', 'assets')));

// Handle favicon.ico to prevent 404 errors
app.get('/favicon.ico', (req, res) => {
  res.status(204).send(); // No content - prevents 404 errors
});

// STATIC MIDDLEWARE LAST - catch-all for files
app.use(express.static(path.join(__dirname, 'public')));

// Start the HTTP server
const server = app.listen(PORT, () => {
  console.log(`🚀 OBS Overlay Server running at http://localhost:${PORT}`);
  console.log(`📺 Production Overlay: http://localhost:${PORT}/template/overlay`);
  console.log(`🎯 Add to OBS Browser Source with URL above`);
  console.log(`✨ Modular TypeScript components with ComponentComposer`);
  console.log(`🔗 Official @streamerbot/client integration`);
});

// WebSocket server for real-time updates from streamer.bot
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  // Send welcome message
  ws.send(JSON.stringify({
    type: 'connection',
    message: 'Connected to overlay server',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      // Simple logging for clean example.html system
      if (message.type === 'browser_log' && debugToFile) {
        safeAppendToFile('debug.log', `${message.timestamp} [BROWSER] ${message.message}\n`);
        return;
      }

      // Broadcast message to all connected clients
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      });
    } catch (error) {
      console.error('❌ Invalid JSON received:', error);
    }
  });

  ws.on('close', () => {
    // Connection closed - no logging needed for normal operation
  });
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down overlay server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});