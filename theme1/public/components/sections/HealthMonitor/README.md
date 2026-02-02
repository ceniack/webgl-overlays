# Heart Rate Monitor Component

A standalone heart rate monitor component for OBS Studio overlays with real-time Streamer.bot integration.

## Features

- **Real-time Heart Rate Display**: Shows BPM with animated waveform
- **SVG Heart Rate Graph**: Animated polyline showing ECG-like waveform
- **Dynamic Animation Speed**: Animation speed adjusts to match actual BPM
- **Active/Inactive States**: Visual indicators for data availability
- **Timeout Handling**: 15-second timeout before marking as inactive
- **Streamer.bot Integration**: Connects to Streamer.bot for real-time data
- **Standalone Operation**: Works independently of other overlay components

## Files

- `heartrate-monitor.html` - Main HTML structure
- `heartrate-monitor.css` - Complete styling and animations
- `heartrate-monitor.js` - JavaScript functionality and Streamer.bot integration
- `index.html` - Simple entry point for OBS
- `README.md` - This documentation

## Usage

### OBS Studio Integration

1. **Browser Source URL**: `http://localhost:3000/components/heartrate-monitor/`
2. **Resolution**: 350x250 (recommended) or custom
3. **Custom CSS**: Not required (styles included in component)

### Direct Access

- **Main Component**: `http://localhost:3000/components/heartrate-monitor/heartrate-monitor.html`
- **Simple Entry Point**: `http://localhost:3000/components/heartrate-monitor/index.html`

### Streamer.bot Integration

The component automatically connects to Streamer.bot at `ws://127.0.0.1:8080/` and listens for:

1. **Custom Events**: `heart_rate_pulse` events with `heartRate` and `measuredAt` data
2. **Global Variables**: `heartRate` or `heart_rate` variable updates

#### Example Streamer.bot Action

To send heart rate data, create an action in Streamer.bot that triggers a custom event:

```csharp
// C# code for Streamer.bot action
CPH.WebsocketBroadcastJson("heart_rate_pulse", new {
    heartRate = 75,
    measuredAt = DateTime.Now.ToString("yyyy-MM-ddTHH:mm:ss.fffZ")
});
```

Or update a global variable:

```csharp
// C# code to set global variable
CPH.SetGlobalVar("heartRate", "75");
```

## Animation System

The component uses a sophisticated animation system:

- **Base Speed**: 60 BPM = 2.5 second animation cycle
- **Dynamic Adjustment**: Animation speed updates in real-time based on BPM
- **Speed Calculation**: `duration = 60 / heartRate * 2.5` seconds
- **Range Limits**: 0.5s to 5.0s (20 BPM to 300 BPM effective range)

## Debug Functions

Open browser console and use these functions:

```javascript
// Debug current state
debugHeartRate();

// Test with specific BPM
testHeartRate(85);

// Run test sequence
testHeartRateSequence();
```

## States

### Active State
- **Border**: Glowing secondary color border
- **Animation**: Full speed waveform animation
- **Display**: Current BPM value and "Live" status

### Inactive State
- **Opacity**: Reduced to 50%
- **Animation**: Paused waveform
- **Display**: "Waiting for data..." or "Disconnected" status

## Customization

### Colors

Edit CSS variables in `heartrate-monitor.css`:

```css
:root {
    --primary: #00d4ff;     /* Waveform color */
    --secondary: #ff3366;   /* BPM display color */
    --border-color: rgba(255, 255, 255, 0.2);
    --text-muted: rgba(255, 255, 255, 0.6);
}
```

### Size

Adjust the graph dimensions:

```css
.heart-rate-graph {
    width: 275px;  /* Graph width */
    height: 90px;  /* Graph height */
}
```

### Animation Speed

Modify the base animation duration:

```css
.heart-rate-monitor {
    --animation-duration: 2.5s; /* Default 60 BPM equivalent */
}
```

## Browser Compatibility

- **OBS Studio**: Chromium-based (recommended)
- **Chrome/Edge**: Full support
- **Firefox**: Full support
- **Safari**: Full support

## Troubleshooting

### Connection Issues

1. **Check Streamer.bot**: Ensure Streamer.bot is running on port 8080
2. **Check Console**: Open browser console for error messages
3. **Test Debug**: Use `debugHeartRate()` to check connection status

### Animation Issues

1. **Performance**: Check if browser/OBS has hardware acceleration enabled
2. **Timing**: Verify heart rate values are within reasonable range (20-300 BPM)
3. **Sync**: Use `testHeartRateSequence()` to test animation transitions

### Data Issues

1. **Events**: Verify Streamer.bot is sending `heart_rate_pulse` events
2. **Variables**: Check if `heartRate` global variable is being set
3. **Format**: Ensure heart rate values are valid integers

## Dependencies

- **streamerbot-client.js**: Official Streamer.bot client library
- **Modern Browser**: ES6+ support required for class syntax

## Performance

- **CPU Usage**: Minimal (CSS animations)
- **Memory**: ~2-3MB
- **Network**: Only WebSocket connection to Streamer.bot
- **Rendering**: Hardware-accelerated CSS animations