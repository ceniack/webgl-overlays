/*
=============================================================================
GOAL END HANDLER (OPTIONAL)
=============================================================================
TRIGGER: Twitch > Channel Goal > Goal End
PURPOSE: Clean up when goals finish or are removed

SETUP:
1. Create new action in Streamer.bot: "Goal End Handler"
2. Set trigger: Twitch > Channel Goal > Goal End
3. Add Sub-Action: Execute C# Code
4. Copy-paste the code below

NOTE: This is optional - if you don't create this action, ended goals
will just remain in the variables until new goals overwrite them.
=============================================================================
*/

using System;

public class CPHInline
{
    // Normalize goal types for consistent variable naming (same as other handlers)
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

            CPH.LogInfo($"🏁 Goal Ended: {goalDescription} [{goalType}]");

            // Normalize goal type for variable naming
            string normalizedType = NormalizeGoalType(goalType);

            // Clear goal-type-specific variables
            CPH.SetGlobalVar($"goal{normalizedType}Id", "");
            CPH.SetGlobalVar($"goal{normalizedType}Type", "");
            CPH.SetGlobalVar($"goal{normalizedType}Description", "");
            CPH.SetGlobalVar($"goal{normalizedType}Current", "0");
            CPH.SetGlobalVar($"goal{normalizedType}Target", "1");

            // Remove this goal type from active goals list
            string activeTypes = CPH.GetGlobalVar<string>("activeGoalTypes", false) ?? "";
            if (activeTypes.Contains(normalizedType))
            {
                string[] typeArray = activeTypes.Split(',');
                string newActiveTypes = "";
                foreach (string type in typeArray)
                {
                    if (type.Trim() != normalizedType)
                    {
                        newActiveTypes = string.IsNullOrEmpty(newActiveTypes) ? type.Trim() : newActiveTypes + "," + type.Trim();
                    }
                }
                CPH.SetGlobalVar("activeGoalTypes", newActiveTypes);
            }

            CPH.LogInfo($"🗑️ Cleared goal{normalizedType}* variables and removed from active goals");

            return true;
        }
        catch (Exception ex)
        {
            CPH.LogError($"❌ Error in Goal End Handler: {ex.Message}");
            return false;
        }
    }
}