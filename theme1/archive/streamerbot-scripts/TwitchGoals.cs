/*
=============================================================================
ACTION: Update Goals for Overlay
GROUP: Overlay
=============================================================================

DESCRIPTION:
Fetches Twitch Goals from API and updates global variables for overlay display

SETUP INSTRUCTIONS:
1. Create new action in Streamer.bot
2. Name: "Update Goals for Overlay"
3. Add Sub-Action: "Execute C# Code"
4. Copy-paste the code below
5. Set up timer trigger to run every 5 minutes

REQUIREMENTS:
- Ensure your Streamer.bot Twitch connection has "channel:read:goals" scope
- Go to Platforms > Twitch and re-authorize if needed to add this scope

GLOBAL VARIABLES UPDATED:
- goalCount: Total number of active goals
- goal1Current, goal2Current, goal3Current: Current progress amounts for each goal
- goal1Target, goal2Target, goal3Target: Target amounts for each goal
- goal1Description, goal2Description, goal3Description: Goal descriptions
- goal1Type, goal2Type, goal3Type: Goal types (follower, subscription, bits, etc.)

=============================================================================
*/

using System;
using System.Net;
using System.IO;

public class CPHInline
{
    public bool Execute()
    {
        // Get Twitch credentials from Streamer.bot
        if (string.IsNullOrEmpty(CPH.TwitchOAuthToken) || string.IsNullOrEmpty(CPH.TwitchClientId))
        {
            CPH.LogInfo("❌ Missing Twitch OAuth credentials");

            // Set default values for overlay
            CPH.SetGlobalVar("goalCurrent", "150");
            CPH.SetGlobalVar("goalTarget", "200");
            CPH.SetGlobalVar("goalDescription", "No OAuth Setup");
            CPH.SetGlobalVar("goalType", "follower");

            return false;
        }

        try
        {
            // Get broadcaster information from Streamer.bot
            var broadcasterInfo = CPH.TwitchGetBroadcaster();
            string broadcasterId = broadcasterInfo.UserId;

            string accessToken = CPH.TwitchOAuthToken;
            string clientId = CPH.TwitchClientId;

            CPH.LogInfo("📺 Broadcaster ID: " + broadcasterId);

            string url = "https://api.twitch.tv/helix/goals?broadcaster_id=" + broadcasterId;
            CPH.LogInfo("🌐 Calling Twitch API: " + url);

            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
            request.Method = "GET";
            request.Headers.Add("Authorization", "Bearer " + accessToken);
            request.Headers.Add("Client-Id", clientId);

            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            using (StreamReader reader = new StreamReader(response.GetResponseStream()))
            {
                string json = reader.ReadToEnd();
                CPH.LogInfo("📥 API Response: " + json);

                // Check if we have any goals in the response
                if (json.Contains("\"data\":[]") || !json.Contains("\"type\":"))
                {
                    CPH.LogInfo("📭 No active goals found");

                    // Set default values for overlay
                    CPH.SetGlobalVar("goalCurrent", "150");
                    CPH.SetGlobalVar("goalTarget", "200");
                    CPH.SetGlobalVar("goalDescription", "No Active Goals");
                    CPH.SetGlobalVar("goalType", "follower");

                    return true;
                }

                // Parse all goals with enhanced error handling and boundary-aware extraction
                int goalCount = 0;
                int searchStart = 0;

                // Clear previous goal count
                CPH.SetGlobalVar("goalCount", "0");

                // Enhanced debug logging
                CPH.LogInfo("📋 Starting goal parsing from API response");
                CPH.LogInfo("🔍 Sample JSON structure: " + json.Substring(0, Math.Min(300, json.Length)));

                while (true)
                {
                    // Find the type field within the current goal scope
                    int typeStart = json.IndexOf("\"type\":\"", searchStart);
                    if (typeStart == -1) break;

                    try
                    {
                        typeStart += 8; // Move past "type":"

                        // Use same reliable delimiter pattern as numeric fields
                        // Look for either "," (more fields follow) or "}" (last field)
                        int typeEndComma = json.IndexOf("\",", typeStart);
                        int typeEndBrace = json.IndexOf("\"}", typeStart);

                        int typeEnd;
                        if (typeEndComma == -1 && typeEndBrace == -1)
                        {
                            CPH.LogError("❌ Could not find end delimiter for type field in goal " + (goalCount + 1));
                            // Try to find next goal and continue
                            int nextGoal = json.IndexOf("\"type\":\"", typeStart + 1);
                            searchStart = nextGoal != -1 ? nextGoal : json.Length;
                            continue;
                        }

                        // Use the closer delimiter
                        if (typeEndComma == -1) typeEnd = typeEndBrace;
                        else if (typeEndBrace == -1) typeEnd = typeEndComma;
                        else typeEnd = Math.Min(typeEndComma, typeEndBrace);

                        string goalType = json.Substring(typeStart, typeEnd - typeStart);
                        CPH.LogInfo("🎯 Extracted goal type: '" + goalType + "'");

                        // Description extraction with same pattern
                        int descStart = json.IndexOf("\"description\":\"", searchStart);
                        if (descStart == -1)
                        {
                            CPH.LogError("❌ Could not find description field in goal " + (goalCount + 1));
                            searchStart = typeEnd + 10; // Skip ahead and continue
                            continue;
                        }
                        descStart += 15;

                        int descEndComma = json.IndexOf("\",", descStart);
                        int descEndBrace = json.IndexOf("\"}", descStart);

                        int descEnd;
                        if (descEndComma == -1 && descEndBrace == -1)
                        {
                            CPH.LogError("❌ Could not find end delimiter for description field in goal " + (goalCount + 1));
                            searchStart = typeEnd + 10; // Skip ahead and continue
                            continue;
                        }

                        // Use the closer delimiter
                        if (descEndComma == -1) descEnd = descEndBrace;
                        else if (descEndBrace == -1) descEnd = descEndComma;
                        else descEnd = Math.Min(descEndComma, descEndBrace);

                        string description = json.Substring(descStart, descEnd - descStart);
                        CPH.LogInfo("📝 Extracted description: '" + description + "'");

                        // Current amount extraction (same as original working code)
                        int currentStart = json.IndexOf("\"current_amount\":", searchStart) + 17;
                        int currentEnd = json.IndexOf(",", currentStart);
                        int braceEnd = json.IndexOf("}", currentStart);
                        if (currentEnd == -1 || (braceEnd != -1 && currentEnd > braceEnd))
                            currentEnd = braceEnd;
                        int current = int.Parse(json.Substring(currentStart, currentEnd - currentStart).Trim());

                        // Target amount extraction (same as original working code)
                        int targetStart = json.IndexOf("\"target_amount\":", searchStart) + 16;
                        int targetEnd = json.IndexOf(",", targetStart);
                        braceEnd = json.IndexOf("}", targetStart);
                        if (targetEnd == -1 || targetEnd > braceEnd)
                            targetEnd = braceEnd;
                        int target = int.Parse(json.Substring(targetStart, targetEnd - targetStart).Trim());

                        goalCount++;
                        CPH.LogInfo("✅ Goal " + goalCount + ": " + description + " (" + current + "/" + target + ") [" + goalType + "]");

                        // Update Streamer.bot global variables for this goal
                        CPH.SetGlobalVar("goal" + goalCount + "Current", current.ToString());
                        CPH.SetGlobalVar("goal" + goalCount + "Target", target.ToString());
                        CPH.SetGlobalVar("goal" + goalCount + "Description", description);
                        CPH.SetGlobalVar("goal" + goalCount + "Type", goalType);

                        // Update search position using the target end (same as original working code)
                        searchStart = targetEnd;

                        CPH.LogInfo("🔄 Successfully parsed goal " + goalCount + ", moving to next goal at position " + searchStart);
                    }
                    catch (Exception ex)
                    {
                        CPH.LogError("❌ Failed to parse goal " + (goalCount + 1) + ": " + ex.Message);

                        // Set fallback values for this goal to prevent overlay issues
                        goalCount++;
                        CPH.SetGlobalVar("goal" + goalCount + "Type", "unknown");
                        CPH.SetGlobalVar("goal" + goalCount + "Description", "Parse Error");
                        CPH.SetGlobalVar("goal" + goalCount + "Current", "0");
                        CPH.SetGlobalVar("goal" + goalCount + "Target", "1");

                        // Skip to next potential goal object
                        int nextGoalStart = json.IndexOf("{", searchStart + 1);
                        if (nextGoalStart == -1) break;
                        searchStart = nextGoalStart;
                    }
                }

                // Set the total goal count
                CPH.SetGlobalVar("goalCount", goalCount.ToString());
                CPH.LogInfo("🎯 Updated " + goalCount + " goals in global variables for overlay");

                return true;
            }
        }
        catch (WebException ex)
        {
            HttpWebResponse errorResponse = (HttpWebResponse)ex.Response;
            if (errorResponse != null)
            {
                if (errorResponse.StatusCode == HttpStatusCode.Unauthorized)
                {
                    CPH.LogError("🚨 401 Unauthorized - Token may lack 'channel:read:goals' scope");
                    CPH.SetGlobalVar("goalDescription", "Missing OAuth Scope");
                }
                else
                {
                    CPH.LogError("❌ Twitch API Error " + errorResponse.StatusCode + ": " + ex.Message);
                    CPH.SetGlobalVar("goalDescription", "API Error");
                }
            }
            else
            {
                CPH.LogError("❌ Network Error: " + ex.Message);
                CPH.SetGlobalVar("goalDescription", "Network Error");
            }

            // Set default values for overlay
            CPH.SetGlobalVar("goalCurrent", "150");
            CPH.SetGlobalVar("goalTarget", "200");
            CPH.SetGlobalVar("goalType", "follower");

            return false;
        }
        catch (Exception ex)
        {
            CPH.LogError("❌ Error fetching goals: " + ex.Message);

            // Set default values for overlay
            CPH.SetGlobalVar("goalCurrent", "150");
            CPH.SetGlobalVar("goalTarget", "200");
            CPH.SetGlobalVar("goalDescription", "API Error");
            CPH.SetGlobalVar("goalType", "follower");

            return false;
        }
    }
}