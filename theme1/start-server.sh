#!/bin/bash

# Theme1 Overlay Server Start Script
# Starts the Node.js server in the background

echo "🚀 Starting Theme1 Overlay Server..."

# Make sure we're in the right directory
cd "$(dirname "$0")"

# Check if server is already running
if curl -s --max-time 2 http://localhost:3000 >/dev/null 2>&1; then
    echo "⚠️  Server is already running on port 3000!"
    echo "   Main Overlay: http://localhost:3000/overlay/example"
    echo "   To stop server: ./stop-server.sh"
    exit 1
fi

# Stop any existing processes first
echo "   Cleaning up any existing processes..."
pkill -f "node server.js" 2>/dev/null
fuser -k 3000/tcp 2>/dev/null
sleep 2

# Start server in background
echo "   Starting server in background..."
nohup npm start > server.log 2>&1 &

# Wait for server to start
echo "   Waiting for server to initialize..."
sleep 3

# Check if server started successfully
if curl -s --max-time 5 http://localhost:3000 >/dev/null 2>&1; then
    echo "✅ Server started successfully!"
    echo ""
    echo "📺 Main Overlay: http://localhost:3000/overlay/example"
    echo ""
    echo "🧩 Components:"
    echo "   Heart Rate: http://localhost:3000/components/heartrate-monitor/"
    echo "   Branding:   http://localhost:3000/components/branding/"
    echo "   Counters:   http://localhost:3000/components/counters/"
    echo ""
    echo "🎮 Demo Pages:"
    echo "   Heart Rate: http://localhost:3000/components/heartrate-monitor/demo.html"
    echo "   Branding:   http://localhost:3000/components/branding/demo.html"
    echo "   Counters:   http://localhost:3000/components/counters/demo.html"
    echo ""
    echo "🛑 To stop server: ./stop-server.sh"
    echo "📝 View logs: tail -f server.log"
else
    echo "❌ Server failed to start!"
    echo "📝 Check server.log for errors:"
    tail -10 server.log
fi

echo ""