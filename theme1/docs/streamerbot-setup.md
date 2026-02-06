# Streamer.bot Setup: LatestEvent Global Variables

The overlay's LatestEvent sections (Latest Follower, Latest Sub, etc.) persist data through Streamer.bot global variables. The overlay is **read-only** — Streamer.bot is the source of truth.

## How It Works

```
Streamer.bot receives platform event (Follow, Sub, etc.)
  -> your existing action runs
  -> Set Global Variable sub-action saves JSON to a persisted global
  -> GlobalVariableUpdated fires over WebSocket to the overlay

Overlay loads:
  -> getGlobals() fetches all persisted globals
  -> detects latestEvent* variables, parses JSON
  -> LatestEvent components render the data

Real-time updates:
  -> Misc.GlobalVariableUpdated event fires
  -> same parse + render path (no page reload needed)
```

## Setup: Add Sub-Actions to Your Existing Actions

For each event type you want to track, add one **Set Global Variable** sub-action to your existing Streamer.bot action.

**Path:** Core > Globals > Set Global Variable

**Docs:** [Set Global Variable](https://docs.streamer.bot/api/sub-actions/core/globals/global-set) | [SetGlobalVar C#](https://docs.streamer.bot/api/csharp/methods/core/globals/set-global-var)

---

## Variable Reference

Each event type uses one persisted global variable containing a JSON string.

| Variable Name | Set By | JSON Fields |
|---|---|---|
| `latestEventFollow` | Follow trigger | `type`, `platform`, `user`, `timestamp` |
| `latestEventSub` | Sub trigger | `type`, `platform`, `user`, `tier`, `months`, `timestamp` |
| `latestEventCheer` | Cheer trigger | `type`, `platform`, `user`, `amount`, `timestamp` |
| `latestEventRaid` | Raid trigger | `type`, `platform`, `user`, `viewers`, `timestamp` |
| `latestEventDonation` | Donation trigger | `type`, `platform`, `user`, `amount`, `currency`, `timestamp` |
| `latestEventRedemption` | Redemption trigger | `type`, `platform`, `user`, `reward`, `cost`, `timestamp` |
| `latestEventFirstword` | First Word trigger | `type`, `platform`, `user`, `message`, `timestamp` |

### Valid `platform` values

Must match the overlay's `AlertPlatform` type:

`twitch`, `youtube`, `kick`, `trovo`, `streamlabs`, `streamelements`, `kofi`, `tipeeestream`, `donordrive`, `fourthwall`

---

## Examples

### Follow (Twitch)

1. Open your existing Twitch Follow event action
2. Add sub-action: **Core > Globals > Set Global Variable**
3. Configure:
   - **Persisted**: On
   - **Variable Name**: `latestEventFollow`
   - **Value**: `{"type":"follow","platform":"twitch","user":"%userName%","timestamp":%unixtime%}`

If you later add a **Kick Follow** trigger, use the same variable name — the latest follow from any platform overwrites the previous:
   - **Value**: `{"type":"follow","platform":"kick","user":"%userName%","timestamp":%unixtime%}`

### Subscription (Twitch)

1. Open your existing Twitch Subscription event action
2. Add sub-action: **Core > Globals > Set Global Variable**
3. Configure:
   - **Persisted**: On
   - **Variable Name**: `latestEventSub`
   - **Value**: `{"type":"sub","platform":"twitch","user":"%userName%","tier":"%tier%","months":%cumulativeMonths%,"timestamp":%unixtime%}`

### Cheer (Twitch)

- **Variable Name**: `latestEventCheer`
- **Value**: `{"type":"cheer","platform":"twitch","user":"%userName%","amount":%bits%,"timestamp":%unixtime%}`

### Raid (Twitch)

- **Variable Name**: `latestEventRaid`
- **Value**: `{"type":"raid","platform":"twitch","user":"%userName%","viewers":%viewers%,"timestamp":%unixtime%}`

### Channel Point Redemption (Twitch)

- **Variable Name**: `latestEventRedemption`
- **Value**: `{"type":"redemption","platform":"twitch","user":"%userName%","reward":"%rewardName%","cost":%rewardCost%,"timestamp":%unixtime%}`

### First Word (Twitch)

- **Variable Name**: `latestEventFirstword`
- **Value**: `{"type":"firstword","platform":"twitch","user":"%userName%","message":"%message%","timestamp":%unixtime%}`

### Donations (Multiple Platforms)

Donation events are the most likely to come from multiple platforms. Each donation service trigger sets its own platform value. All use the same variable name `latestEventDonation` — whichever fires last is what the overlay displays.

**KoFi:**
- **Value**: `{"type":"donation","platform":"kofi","user":"%userName%","amount":%amount%,"currency":"$","timestamp":%unixtime%}`

**StreamElements:**
- **Value**: `{"type":"donation","platform":"streamelements","user":"%userName%","amount":%amount%,"currency":"$","timestamp":%unixtime%}`

**Streamlabs:**
- **Value**: `{"type":"donation","platform":"streamlabs","user":"%userName%","amount":%amount%,"currency":"$","timestamp":%unixtime%}`

---

## Variable Reference Notes

### %variable% names

The exact `%variable%` names depend on what Streamer.bot provides for each trigger. Check the **Variables** tab in each trigger's documentation for the exact names. Common ones:

| Trigger | Variables |
|---|---|
| Follow | `%userName%`, `%userId%` |
| Sub | `%userName%`, `%tier%`, `%cumulativeMonths%`, `%isMultiMonth%`, `%multiMonthDuration%`, `%multiMonthTenure%` |
| Cheer | `%userName%`, `%bits%` |
| Raid | `%userName%`, `%viewers%` |
| Redemption | `%userName%`, `%rewardName%`, `%rewardCost%` |

### Timestamp: %unixtime%

`%unixtime%` is a generic variable available in **all** actions. It returns unix time in **seconds** (e.g., `1725936677`). The overlay automatically converts seconds to milliseconds when parsing.

Source: [Streamer.bot docs: Guide > Variables > Generic](https://docs.streamer.bot/guide/variables#generic)

### Dynamic Platform Detection (Advanced)

`%eventSource%` exists as a generic variable but **requires C# to access** — it cannot be used directly in the Set Global Variable value field.

**Simple approach:** Hardcode the platform string per trigger (e.g., `"platform":"twitch"` in your Twitch Follow action). Since each trigger is platform-specific, this is straightforward.

**Advanced approach:** Use a C# Execute Code sub-action *before* the Set Global Variable sub-action:

```csharp
CPH.SetArgument("platform", args["eventSource"].ToString().ToLower());
```

Then use `%platform%` in the JSON value instead of a hardcoded platform string.

---

## Verification

1. Rebuild the overlay: `node build.js`
2. Restart the server: `npm start`
3. Open `/template/overlay-all` — LatestEvent sections should be empty
4. Run `testAllLatestEvents()` in the browser console — sections populate but data does NOT persist on reload (test events are display-only)
5. With Streamer.bot connected:
   - Manually set `latestEventFollow` global in Streamer.bot to: `{"type":"follow","platform":"twitch","user":"TestUser","timestamp":1738000000}`
   - Reload overlay — Follow section shows "TestUser"
6. Trigger a real Follow event — overlay updates in real-time via GlobalVariableUpdated
7. Reload — data persists from Streamer.bot globals
