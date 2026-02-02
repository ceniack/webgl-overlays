#!/bin/bash

# Theme1 Overlay Server Stop Script
# Safely stops the Node.js server running on port 3000

echo "🛑 Stopping Theme1 Overlay Server..."

# Method 1: Kill Node.js server process by name
echo "   Killing Node.js server processes..."
pkill -f "node server.js" 2>/dev/null
sleep 1

# Method 2: Kill any process using port 3000
echo "   Freeing up port 3000..."
fuser -k 3000/tcp 2>/dev/null
sleep 1

# Method 3: Kill any remaining npm processes (backup)
pkill -f "npm start" 2>/dev/null

# Wait a moment for processes to terminate
sleep 2

# Check if server is actually stopped
echo "   Verifying server is stopped..."
if curl -s --max-time 2 http://localhost:3000 >/dev/null 2>&1; then
    echo "❌ Server may still be running on port 3000"
    echo "   Try running: sudo fuser -k 3000/tcp"
else
    echo "✅ Server successfully stopped!"
    echo "   Port 3000 is now free"
fi

echo ""
echo "📝 Server Log Location: ./server.log"
echo "🚀 To restart server: npm start"
echo ""