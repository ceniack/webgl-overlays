/*
=============================================================================
GOAL BEGIN HANDLER
=============================================================================
TRIGGER: Twitch > Channel Goal > Goal Begin
PURPOSE: Captures when new goals start and sets up global variables

SETUP:
1. Create new action in Streamer.bot: "Goal Begin Handler"
2. Set trigger: Twitch > Channel Goal > Goal Begin
3. Add Sub-Action: Execute C# Code
4. Copy-paste the code below

ENHANCEMENTS:
- Enhanced activeGoalTypes list management with proper Contains() checking
- Added detailed logging for troubleshooting
- More robust string handling for goal type lists
=============================================================================
*/

using System;
using System.Linq;
using System.Collections.Generic;

public class CPHInline
{
    // Normalize goal types for consistent variable naming
    private string NormalizeGoalType(string goalType)
    {
        if (string.IsNullOrEmpty(goalType))
            return "Unknown";

        string type = goalType.ToLower().Trim();

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
                return char.ToUpper(type[0]) + type.Substring(1).Replace("_", "").Replace(" ", "");
        }
    }

    // Enhanced activeGoalTypes management with more robust error handling
    private string UpdateActiveGoalTypes(string normalizedType)
    {
        try
        {
            // Get current value with explicit null handling
            string currentActiveTypes = "";
            try
            {
                var currentValue = CPH.GetGlobalVar<string>("activeGoalTypes", false);
                currentActiveTypes = currentValue ?? "";
                CPH.LogInfo($"📖 Retrieved activeGoalTypes: '{currentActiveTypes}' (Type: {currentValue?.GetType().Name ?? "null"})");
            }
            catch (Exception ex)
            {
                CPH.LogError($"❌ Error getting activeGoalTypes: {ex.Message}");
                currentActiveTypes = "";
            }

            CPH.LogInfo($"🔄 UpdateActiveGoalTypes: Current='{currentActiveTypes}', Adding='{normalizedType}'");

            // Split current types into a list for easier management
            List<string> typesList = new List<string>();

            if (!string.IsNullOrEmpty(currentActiveTypes) && currentActiveTypes.Trim() != "")
            {
                try
                {
                    typesList = currentActiveTypes.Split(',')
                                                .Select(t => t.Trim())
                                                .Where(t => !string.IsNullOrEmpty(t))
                                                .ToList();
                }
                catch (Exception ex)
                {
                    CPH.LogError($"❌ Error splitting activeGoalTypes: {ex.Message}");
                    typesList = new List<string>();
                }
            }

            CPH.LogInfo($"📋 Current types list: [{string.Join(", ", typesList)}] (Count: {typesList.Count})");

            // Add the new type if it's not already in the list
            bool typeExists = typesList.Any(t => string.Equals(t, normalizedType, StringComparison.OrdinalIgnoreCase));

            if (!typeExists)
            {
                typesList.Add(normalizedType);
                CPH.LogInfo($"➕ Added '{normalizedType}' to active types (new list count: {typesList.Count})");
            }
            else
            {
                CPH.LogInfo($"✅ '{normalizedType}' already exists in active types");
            }

            // Rebuild the comma-separated string
            string newActiveTypes = string.Join(",", typesList);

            CPH.LogInfo($"🎯 Final activeGoalTypes: '{newActiveTypes}' (will be set as global var)");

            return newActiveTypes;
        }
        catch (Exception ex)
        {
            CPH.LogError($"❌ Critical error in UpdateActiveGoalTypes: {ex.Message}");
            // Fallback: just return the new type if everything fails
            CPH.LogError($"🚨 FALLBACK: Returning just '{normalizedType}' as activeGoalTypes");
            return normalizedType;
        }
    }

    public bool Execute()
    {
        try
        {
            // Get goal data from Streamer.bot event variables
            string goalId = args["goal.id"].ToString();
            string goalType = args["goal.type"].ToString();
            string goalDescription = args["goal.description"].ToString();
            int currentAmount = Convert.ToInt32(args["goal.currentAmount"]);
            int targetAmount = Convert.ToInt32(args["goal.targetAmount"]);

            CPH.LogInfo($"🎯 New Goal Started: {goalDescription} [{goalType}] ({currentAmount}/{targetAmount})");

            // Normalize goal type for variable naming
            string normalizedType = NormalizeGoalType(goalType);
            CPH.LogInfo($"🔄 Goal type normalization: '{goalType}' → '{normalizedType}'");

            // Update goal-type-specific variables (automatically overwrites existing goals of same type)
            CPH.SetGlobalVar($"goal{normalizedType}Id", goalId);
            CPH.SetGlobalVar($"goal{normalizedType}Type", normalizedType.ToLower());  // Store normalized type
            CPH.SetGlobalVar($"goal{normalizedType}Description", goalDescription);
            CPH.SetGlobalVar($"goal{normalizedType}Current", currentAmount.ToString());
            CPH.SetGlobalVar($"goal{normalizedType}Target", targetAmount.ToString());

            CPH.LogInfo($"✅ Set goal{normalizedType}* variables:");
            CPH.LogInfo($"  📛 goal{normalizedType}Type = '{normalizedType.ToLower()}'");
            CPH.LogInfo($"  📊 goal{normalizedType}Current = '{currentAmount}'");
            CPH.LogInfo($"  🎯 goal{normalizedType}Target = '{targetAmount}'");
            CPH.LogInfo($"  📝 goal{normalizedType}Description = '{goalDescription}'");

            // Update active goal types using enhanced logic
            string newActiveTypes = UpdateActiveGoalTypes(normalizedType);

            // Set the variable and verify it was set correctly
            CPH.SetGlobalVar("activeGoalTypes", newActiveTypes);
            CPH.LogInfo($"📝 Set activeGoalTypes to: '{newActiveTypes}'");

            // Verify the variable was actually set by reading it back
            try
            {
                string verifyValue = CPH.GetGlobalVar<string>("activeGoalTypes", false);
                CPH.LogInfo($"✅ Verification - activeGoalTypes now reads: '{verifyValue}'");

                if (verifyValue != newActiveTypes)
                {
                    CPH.LogError($"❌ MISMATCH! Set: '{newActiveTypes}' but reads: '{verifyValue}'");
                }
            }
            catch (Exception ex)
            {
                CPH.LogError($"❌ Error verifying activeGoalTypes: {ex.Message}");
            }

            CPH.LogInfo($"✅ Goal updated: {goalType} goal '{goalDescription}' → goal{normalizedType}* variables");
            CPH.LogInfo($"📊 Final active goal types should be: {newActiveTypes}");

            return true;
        }
        catch (Exception ex)
        {
            CPH.LogError($"❌ Error in Goal Begin Handler: {ex.Message}");
            CPH.LogError($"❌ Stack trace: {ex.StackTrace}");
            return false;
        }
    }
}