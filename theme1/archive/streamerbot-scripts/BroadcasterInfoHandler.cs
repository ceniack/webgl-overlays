/*
=============================================================================
BROADCASTER INFO HANDLER
=============================================================================
TRIGGER: Timer (runs every 30 seconds) or Manual execution
PURPOSE: Gets broadcaster Twitch information and updates overlay variables

SETUP:
1. Create new action in Streamer.bot: "Broadcaster Info Handler"
2. Set trigger: Timer > Interval > 30 seconds (or Timed: Interval)
3. Add Sub-Action: Execute C# Code
4. Copy-paste the code below

This action will populate global variables that the overlay can read to
display the broadcaster's actual Twitch username, display name, and profile image.
=============================================================================
*/

using System;

public class CPHInline
{
    public bool Execute()
    {
        try
        {
            // Get broadcaster information from Streamer.bot
            var broadcasterInfo = CPH.TwitchGetBroadcaster();

            if (broadcasterInfo != null)
            {
                string displayName = broadcasterInfo.UserName ?? "Unknown";
                string username = broadcasterInfo.UserLogin ?? displayName.ToLower();
                string userId = broadcasterInfo.UserId ?? "";

                CPH.LogInfo($"📺 Broadcaster Info: {displayName} (@{username}) [ID: {userId}]");

                // Set global variables for overlay
                CPH.SetGlobalVar("broadcasterDisplayName", displayName);
                CPH.SetGlobalVar("broadcasterUsername", username);
                CPH.SetGlobalVar("broadcasterUserId", userId);
                CPH.SetGlobalVar("broadcasterTwitchUrl", $"twitch.tv/{username}");

                // Set a trigger for the overlay to load the profile image
                // The overlay will use the username to call DecAPI properly
                CPH.SetGlobalVar("broadcasterProfileImageTrigger", username);

                CPH.LogInfo($"✅ Set broadcaster variables: {displayName} (@{username}) - overlay will load profile image");

                return true;
            }
            else
            {
                CPH.LogError("❌ Could not get broadcaster information from Streamer.bot");

                // Set fallback values
                CPH.SetGlobalVar("broadcasterDisplayName", "Streamer");
                CPH.SetGlobalVar("broadcasterUsername", "streamer");
                CPH.SetGlobalVar("broadcasterUserId", "");
                CPH.SetGlobalVar("broadcasterTwitchUrl", "twitch.tv/streamer");
                CPH.SetGlobalVar("broadcasterProfileImageTrigger", "");

                return false;
            }
        }
        catch (Exception ex)
        {
            CPH.LogError($"❌ Error in Broadcaster Info Handler: {ex.Message}");

            // Set fallback values in case of error
            CPH.SetGlobalVar("broadcasterDisplayName", "Streamer");
            CPH.SetGlobalVar("broadcasterUsername", "streamer");
            CPH.SetGlobalVar("broadcasterUserId", "");
            CPH.SetGlobalVar("broadcasterTwitchUrl", "twitch.tv/streamer");
            CPH.SetGlobalVar("broadcasterProfileImageTrigger", "");

            return false;
        }
    }
}