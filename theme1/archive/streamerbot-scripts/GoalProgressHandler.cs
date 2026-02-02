/*
=============================================================================
GOAL PROGRESS HANDLER
=============================================================================
TRIGGER: Twitch > Channel Goal > Goal Progress
PURPOSE: Updates goal progress in real-time when progress changes

SETUP:
1. Create new action in Streamer.bot: "Goal Progress Handler"
2. Set trigger: Twitch > Channel Goal > Goal Progress
3. Add Sub-Action: Execute C# Code
4. Copy-paste the code below
=============================================================================
*/

using System;

public class CPHInline
{
    // Normalize goal types for consistent variable naming (same as GoalBeginHandler)
    private string NormalizeGoalType(string goalType)
    {
        if (string.IsNullOrEmpty(goalType))
            return "Unknown";

        // Convert to lowercase for comparison
        string type = goalType.ToLower().Trim();

        // Map different variations to consistent names
        switch (type)
        {
            case "follow":
            case "follower":
            case "follows":
                return "Follower";

            case "subscribe":
            case "subscription":
            case "subscriber":
            case "sub":
            case "subs":
            case "new_subscription":
            case "new_subscriber":
                return "Subscription";

            case "bit":
            case "bits":
            case "cheer":
            case "cheers":
            case "cheering":
            case "new_bit":
            case "new_bits":
                return "Bit";

            case "donation":
            case "donate":
            case "tip":
                return "Donation";

            case "raid":
            case "raids":
                return "Raid";

            case "host":
            case "hosts":
                return "Host";

            case "viewer":
            case "viewers":
                return "Viewer";

            default:
                // Capitalize first letter and remove underscores/spaces
                return char.ToUpper(type[0]) + type.Substring(1).Replace("_", "").Replace(" ", "");
        }
    }

    public bool Execute()
    {
        try
        {
            // Get goal data from Streamer.bot event
            string goalId = args["goal.id"].ToString();
            string goalType = args["goal.type"].ToString();
            string goalDescription = args["goal.description"].ToString();
            int currentAmount = Convert.ToInt32(args["goal.currentAmount"]);
            int targetAmount = Convert.ToInt32(args["goal.targetAmount"]);

            CPH.LogInfo($"📈 Goal Progress: {goalDescription} [{goalType}] ({currentAmount}/{targetAmount})");

            // Normalize goal type for variable naming
            string normalizedType = NormalizeGoalType(goalType);

            // Update goal-type-specific variables directly
            CPH.SetGlobalVar($"goal{normalizedType}Id", goalId);
            CPH.SetGlobalVar($"goal{normalizedType}Type", normalizedType.ToLower());  // Store normalized type for consistency
            CPH.SetGlobalVar($"goal{normalizedType}Description", goalDescription);
            CPH.SetGlobalVar($"goal{normalizedType}Current", currentAmount.ToString());
            CPH.SetGlobalVar($"goal{normalizedType}Target", targetAmount.ToString());

            CPH.LogInfo($"✅ Updated goal{normalizedType}* variables: {currentAmount}/{targetAmount}");

            return true;
        }
        catch (Exception ex)
        {
            CPH.LogError($"❌ Error in Goal Progress Handler: {ex.Message}");
            return false;
        }
    }
}