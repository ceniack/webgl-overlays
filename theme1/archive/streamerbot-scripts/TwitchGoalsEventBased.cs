/*
=============================================================================
TWITCH GOALS - EVENT-BASED APPROACH
=============================================================================

DESCRIPTION:
Uses Streamer.bot's built-in Goal events instead of manual API parsing.
Much simpler, more reliable, and provides real-time updates.

BENEFITS:
- No JSON parsing bugs
- Real-time updates via events
- Clean data access through Streamer.bot variables
- Automatic handling of multiple goals
- Much simpler code

GLOBAL VARIABLES UPDATED:
- goalCount: Total number of active goals
- goal1Id, goal2Id, goal3Id: Unique goal IDs for tracking
- goal1Current, goal2Current, goal3Current: Current progress amounts
- goal1Target, goal2Target, goal3Target: Target amounts
- goal1Description, goal2Description, goal3Description: Goal descriptions
- goal1Type, goal2Type, goal3Type: Goal types (follower, subscription, bits, etc.)

=============================================================================
IMPLEMENTATION STEPS
=============================================================================

1. DISABLE OLD ACTION:
   - Find your old "Update Goals for Overlay" action with manual API parsing
   - Disable or delete it to avoid conflicts

2. CREATE GOAL BEGIN ACTION:
   - Name: "Goal Begin Handler"
   - Trigger: Twitch > Channel Goal > Goal Begin
   - Sub-Action: Execute C# Code → Copy code from GoalBeginHandler.cs

3. CREATE GOAL PROGRESS ACTION:
   - Name: "Goal Progress Handler"
   - Trigger: Twitch > Channel Goal > Goal Progress
   - Sub-Action: Execute C# Code → Copy code from GoalProgressHandler.cs

4. OPTIONAL - CREATE GOAL END ACTION:
   - Name: "Goal End Handler"
   - Trigger: Twitch > Channel Goal > Goal End
   - Sub-Action: Execute C# Code → Copy code from GoalEndHandler.cs

=============================================================================
INDIVIDUAL C# FILES
=============================================================================

This directory now contains separate C# files for each action:

📄 GoalBeginHandler.cs - Handle new goal creation
📄 GoalProgressHandler.cs - Handle goal progress updates
📄 GoalEndHandler.cs - Handle goal completion/removal (optional)

Copy the code from each individual file into the corresponding Streamer.bot
action. Do NOT copy all the code into a single action - each action needs
its own separate C# code block.

=============================================================================
WHY THIS APPROACH FIXES goal2Type
=============================================================================

The original manual JSON parsing had bugs in boundary detection and string
extraction that caused goal2Type to be empty or incorrect.

The event-based approach:
✅ Receives clean data directly from Streamer.bot
✅ No JSON parsing required
✅ Real-time updates via events
✅ Reliable goal.type access through args["goal.type"]
✅ Automatic handling of multiple goals

Expected result: goal2Type will be populated correctly with values like
"follower", "subscription", "bit", etc.

=============================================================================
TESTING PROCEDURE
=============================================================================

1. Set up the three actions using the individual .cs files
2. Disable your old complex parsing action
3. Start a new goal on Twitch Dashboard
4. Check Streamer.bot logs for "🎯 New Goal Started" message
5. Make progress on goal (get follow/sub/bits)
6. Check logs for "📈 Goal Progress" message
7. Verify overlay displays goal with correct type

If you see the log messages, the events are working and goal2Type should
be populated correctly in your overlay.

=============================================================================
TROUBLESHOOTING
=============================================================================

If events don't fire:
- Check that Twitch connection has channel:read:goals scope
- Verify triggers are set correctly (Channel Goal > Goal Begin/Progress)
- Check Action Queue in Streamer.bot to see if events are being received
- Test with a simple goal (like follower goal) first

If goal2Type is still empty:
- Check args["goal.type"] value in logs
- Verify global variable names match overlay JavaScript expectations
- Test with manual SetGlobalVar calls to isolate overlay vs data issues

=============================================================================
*/

// This file is for documentation only.
// Use the individual .cs files for actual implementation:
// - GoalBeginHandler.cs
// - GoalProgressHandler.cs
// - GoalEndHandler.cs