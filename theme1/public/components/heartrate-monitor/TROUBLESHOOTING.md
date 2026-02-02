# Heart Rate Monitor - Connection Troubleshooting Guide

## ❌ Issue: Connection Timeout

The heart rate monitor component is **working correctly**, but it cannot connect to Streamer.bot because:

**🔍 Root Cause**: Port 8080 is not accessible (Connection refused)

This indicates that Streamer.bot is either:
1. **Not running**
2. **WebSocket server is disabled**
3. **Running on a different port**

## ✅ Solutions

### Step 1: Verify Streamer.bot is Running

1. **Start Streamer.bot application**
2. **Check if it's running in system tray**
3. **Look for Streamer.bot process in Task Manager**

### Step 2: Enable WebSocket Server in Streamer.bot

1. Open **Streamer.bot**
2. Go to **Settings** → **WebSocket Server**
3. **Enable** the WebSocket Server
4. Verify **port is set to 8080** (default)
5. Make sure **bind address is 127.0.0.1** or **0.0.0.0**
6. **Apply/Save** settings

### Step 3: Check Firewall Settings

1. **Windows Firewall** may be blocking port 8080
2. **Add exception** for Streamer.bot application
3. **Allow inbound connections** on port 8080

### Step 4: Test Connection

Use our debug tools to verify:

#### Option A: Network Test
```bash
# Test if port 8080 is accessible
timeout 5s bash -c '</dev/tcp/127.0.0.1/8080' && echo "✅ Connected" || echo "❌ Connection failed"
```

#### Option B: Browser Debug Console
1. Open: `http://localhost:3000/components/heartrate-monitor/debug.html`
2. Click **"Test Raw WebSocket"** button
3. Check debug log for connection results

#### Option C: Component Demo
1. Open: `http://localhost:3000/components/heartrate-monitor/demo.html`
2. Component will show **"Test mode"** if Streamer.bot unavailable
3. Use **test buttons** to verify component functionality

## 🎮 Component Status

### ✅ What's Working
- **Heart rate monitor component**: Fully functional
- **Animation system**: BPM-responsive animations working
- **Test mode**: Automatic fallback when Streamer.bot unavailable
- **Debug functions**: All testing capabilities operational

### ⚠️ What Needs Streamer.bot
- **Real-time data**: Heart rate from external devices
- **Event integration**: Custom events and global variables
- **Production use**: Live streaming overlay functionality

## 🧪 Testing Without Streamer.bot

The component includes **test mode** for development:

### Manual Testing
```javascript
// Open browser console on component page
testHeartRate(75);              // Test specific BPM
testHeartRateSequence();        // Run animation sequence
debugHeartRate();               // Show debug info
```

### Demo Page Testing
- **Interactive controls** for heart rate simulation
- **Continuous demo mode** with realistic variations
- **Real-time status updates** and debug logging

## 🔧 Configuration Options

### Different Streamer.bot Port
If Streamer.bot uses different port, edit `heartrate-monitor.js`:

```javascript
const config = {
    host: '127.0.0.1',
    port: 8081,        // Change from 8080 to your port
    endpoint: '/',
    // ... other settings
};
```

### Remote Streamer.bot
For remote Streamer.bot instance:

```javascript
const config = {
    host: '192.168.1.100',  // Remote IP address
    port: 8080,
    endpoint: '/',
    // ... other settings
};
```

## 📊 Diagnostic Tools

### Debug Console
**URL**: `http://localhost:3000/components/heartrate-monitor/debug.html`

**Features**:
- Real-time connection monitoring
- WebSocket state diagnostics
- Component status tracking
- Live debug log capture
- Test controls and simulation

### Test Commands
```javascript
// In browser console:
window.heartRateMonitor.testHeartRate(80);
window.heartRateMonitor.testHeartRateSequence();
window.heartRateMonitor.debugHeartRate();
```

## 🆘 Common Issues

### Issue: "StreamerbotClient not found"
**Solution**: Verify `streamerbot-client.js` is loading
- Check network tab in browser dev tools
- Ensure file path is correct in HTML

### Issue: "Connection timeout"
**Solution**: Start Streamer.bot and enable WebSocket server
- Follow Step 1 & 2 above

### Issue: "Test functions not working"
**Solution**: Component not fully loaded
- Wait for iframe to load completely
- Check console for JavaScript errors

### Issue: Animation not smooth
**Solution**: Browser performance
- Enable hardware acceleration
- Close other browser tabs
- Check for high CPU usage

## 📞 Support

### Quick Fixes
1. **Restart Streamer.bot** application
2. **Refresh** overlay page
3. **Check Windows Firewall** settings
4. **Use test mode** for development

### Advanced Debugging
1. Open **debug console**: `/debug.html`
2. Check **browser dev tools** (F12)
3. Test **raw WebSocket** connection
4. Verify **Streamer.bot settings**

## 🎯 Summary

**Component Status**: ✅ **Working Perfectly**
**Issue**: ❌ **Streamer.bot not accessible**
**Solution**: ✅ **Start Streamer.bot + Enable WebSocket Server**

The heart rate monitor component is fully functional and ready for production use once Streamer.bot is properly configured and running.