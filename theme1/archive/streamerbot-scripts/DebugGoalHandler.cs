/*
=============================================================================
DEBUG GOAL HANDLER
=============================================================================
TRIGGER: Twitch > Channel Goal > Goal Begin (TEMPORARY FOR DEBUGGING)
PURPOSE: Logs detailed information about goal types and variables to help diagnose
         why follower goals work but other goal types don't display correctly.

SETUP:
1. TEMPORARILY replace your "Goal Begin Handler" action with this debug version
2. Set trigger: Twitch > Channel Goal > Goal Begin
3. Add Sub-Action: Execute C# Code
4. Copy-paste the code below
5. Create goals of different types and check Streamer.bot logs
6. Once we identify the issue, switch back to the original handler

This is ONLY for debugging - replace with normal handler once issue is found!
=============================================================================
*/

using System;
using System.Linq;

public class CPHInline
{
    // Same normalization as before
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

    public bool Execute()
    {
        try
        {
            CPH.LogInfo("🐛 DEBUG GOAL HANDLER - Raw event data:");

            // Log ALL available args
            CPH.LogInfo("📋 Available goal event fields:");
            foreach (var key in args.Keys.Cast<object>().ToList())
            {
                var value = args[key?.ToString()];
                CPH.LogInfo($"  🔍 {key}: '{value}' (Type: {value?.GetType().Name})");
            }

            // Get goal data from event
            string goalId = args["goal.id"]?.ToString() ?? "NO_ID";
            string goalType = args["goal.type"]?.ToString() ?? "NO_TYPE";
            string goalDescription = args["goal.description"]?.ToString() ?? "NO_DESCRIPTION";
            string currentAmountStr = args["goal.currentAmount"]?.ToString() ?? "0";
            string targetAmountStr = args["goal.targetAmount"]?.ToString() ?? "0";

            int currentAmount = 0;
            int targetAmount = 0;

            try { currentAmount = Convert.ToInt32(currentAmountStr); } catch { }
            try { targetAmount = Convert.ToInt32(targetAmountStr); } catch { }

            CPH.LogInfo($"🎯 RAW Goal Data:");
            CPH.LogInfo($"  📝 ID: '{goalId}'");
            CPH.LogInfo($"  🏷️ Type: '{goalType}' (Length: {goalType?.Length})");
            CPH.LogInfo($"  📖 Description: '{goalDescription}'");
            CPH.LogInfo($"  📊 Current: '{currentAmountStr}' → {currentAmount}");
            CPH.LogInfo($"  🎯 Target: '{targetAmountStr}' → {targetAmount}");

            // Test normalization
            string normalizedType = NormalizeGoalType(goalType);
            CPH.LogInfo($"🔄 Goal Type Normalization:");
            CPH.LogInfo($"  Input: '{goalType}' → Output: '{normalizedType}'");

            // Show what variable names will be created
            CPH.LogInfo($"📝 Variable names that will be created:");
            CPH.LogInfo($"  🆔 goal{normalizedType}Id = '{goalId}'");
            CPH.LogInfo($"  🏷️ goal{normalizedType}Type = '{goalType}'");
            CPH.LogInfo($"  📖 goal{normalizedType}Description = '{goalDescription}'");
            CPH.LogInfo($"  📊 goal{normalizedType}Current = '{currentAmount}'");
            CPH.LogInfo($"  🎯 goal{normalizedType}Target = '{targetAmount}'");

            // Actually set the variables (same as normal handler)
            CPH.SetGlobalVar($"goal{normalizedType}Id", goalId);
            CPH.SetGlobalVar($"goal{normalizedType}Type", goalType);
            CPH.SetGlobalVar($"goal{normalizedType}Description", goalDescription);
            CPH.SetGlobalVar($"goal{normalizedType}Current", currentAmount.ToString());
            CPH.SetGlobalVar($"goal{normalizedType}Target", targetAmount.ToString());

            // Update active goal types
            string activeTypes = CPH.GetGlobalVar<string>("activeGoalTypes", false) ?? "";
            CPH.LogInfo($"📋 Current activeGoalTypes: '{activeTypes}'");

            if (!activeTypes.Contains(normalizedType))
            {
                string newActiveTypes = string.IsNullOrEmpty(activeTypes) ? normalizedType : activeTypes + "," + normalizedType;
                CPH.SetGlobalVar("activeGoalTypes", newActiveTypes);
                CPH.LogInfo($"📋 Updated activeGoalTypes: '{activeTypes}' → '{newActiveTypes}'");
            } else {
                CPH.LogInfo($"📋 Goal type '{normalizedType}' already in activeGoalTypes");
            }

            // Log final variable state
            CPH.LogInfo($"✅ DEBUG: Variables set for {normalizedType} goal:");
            CPH.LogInfo($"  goal{normalizedType}Type = {CPH.GetGlobalVar<string>($"goal{normalizedType}Type", false)}");
            CPH.LogInfo($"  goal{normalizedType}Current = {CPH.GetGlobalVar<string>($"goal{normalizedType}Current", false)}");
            CPH.LogInfo($"  goal{normalizedType}Target = {CPH.GetGlobalVar<string>($"goal{normalizedType}Target", false)}");
            CPH.LogInfo($"  goal{normalizedType}Description = {CPH.GetGlobalVar<string>($"goal{normalizedType}Description", false)}");
            CPH.LogInfo($"  activeGoalTypes = {CPH.GetGlobalVar<string>("activeGoalTypes", false)}");

            CPH.LogInfo("🐛 END DEBUG GOAL HANDLER");

            return true;
        }
        catch (Exception ex)
        {
            CPH.LogError($"❌ Error in Debug Goal Handler: {ex.Message}");
            CPH.LogError($"❌ Stack trace: {ex.StackTrace}");
            return false;
        }
    }
}