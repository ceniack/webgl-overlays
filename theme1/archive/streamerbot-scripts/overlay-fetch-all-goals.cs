/*
=============================================================================
ACTION: Overlay - Fetch All Goals
GROUP: Overlay
=============================================================================

SETUP INSTRUCTIONS:
1. Create new action in Streamer.bot
2. Name: "Overlay - Fetch All Goals"
3. Group: "Overlay"
4. Add Sub-Action: "Execute C# Code"
5. Copy-paste the code below
6. Set up triggers as listed below

TRIGGERS:
- 701: Unknown

DESCRIPTION:
No description available

=============================================================================
*/

using System;
using System.Net;
using System.IO;

public class CPHInline
{
    public bool Execute()
    {
        int goalCount = 0;
        string goalsJson = "[";
        
        try
        {
            string broadcasterId = "53644604";
            if (args.ContainsKey("broadcastUserId"))
                broadcasterId = args["broadcastUserId"].ToString();
            
            string accessToken = CPH.TwitchOAuthToken;
            string clientId = CPH.TwitchClientId;

            string url = "https://api.twitch.tv/helix/goals?broadcaster_id=" + broadcasterId;
            CPH.LogInfo("Fetching goals from: " + url);

            HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
            request.Method = "GET";
            request.Headers.Add("Authorization", "Bearer " + accessToken);
            request.Headers.Add("Client-Id", clientId);

            using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
            using (StreamReader reader = new StreamReader(response.GetResponseStream()))
            {
                string json = reader.ReadToEnd();
                CPH.LogInfo("Goals API response: " + json);

                int searchStart = 0;
                bool first = true;
                
                while (true)
                {
                    int typeStart = json.IndexOf("\"type\":\"", searchStart);
                    if (typeStart == -1) break;

                    typeStart += 8;
                    int typeEnd = json.IndexOf("\"", typeStart);
                    string goalType = json.Substring(typeStart, typeEnd - typeStart);

                    int descStart = json.IndexOf("\"description\":\"", searchStart) + 15;
                    int descEnd = json.IndexOf("\"", descStart);
                    string description = json.Substring(descStart, descEnd - descStart);

                    int currentStart = json.IndexOf("\"current_amount\":", searchStart) + 17;
                    int currentEnd = json.IndexOf(",", currentStart);
                    int current = int.Parse(json.Substring(currentStart, currentEnd - currentStart).Trim());

                    int targetStart = json.IndexOf("\"target_amount\":", searchStart) + 16;
                    int targetEnd = json.IndexOf(",", targetStart);
                    int braceEnd = json.IndexOf("}", targetStart);
                    if (targetEnd == -1 || targetEnd > braceEnd)
                        targetEnd = braceEnd;
                    int target = int.Parse(json.Substring(targetStart, targetEnd - targetStart).Trim());

                    if (!first) goalsJson += ",";
                    goalsJson += "{\"type\":\"" + goalType + "\",\"description\":\"" + description + "\",\"current_amount\":" + current + ",\"target_amount\":" + target + "}";
                    first = false;
                    goalCount++;

                    searchStart = targetEnd;
                }
            }
        }
        catch (Exception ex)
        {
            CPH.LogError("Error fetching goals: " + ex.Message);
        }

        goalsJson += "]";
        
        string broadcast = "{\"goals\":" + goalsJson + "}";
        CPH.WebsocketBroadcastJson(broadcast);
        CPH.LogInfo("Broadcast " + goalCount + " goals to overlay");

        return true;
    }
}
