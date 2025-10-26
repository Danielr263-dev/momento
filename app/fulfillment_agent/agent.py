import json
import os
import aiohttp
from google.adk.agents import Agent
from typing import Optional

# Configuration for the Gemini API call (Standard ADK approach)
API_KEY = "" # ADK environment will inject the key
API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent"
MODEL_NAME = "gemini-2.5-flash-preview-09-2025"

class SpotifyFulfiller(Agent):
    """
    Stage 3: Fulfillment Agent. Reads debug logs and track data from context.state.
    It then uses the Gemini LLM to compile and format the final verbose output,
    including the full Stage 2 debug log and the list of candidate songs.
    """
    
    def __init__(self, **kwargs):
        super().__init__(
            name='SpotifyFulfiller',
            model=MODEL_NAME, # Use the model name for the agent definition
            instruction='Reads data and debug logs from context.state and uses the LLM to provide the final combined, formatted output.',
            **kwargs
        )

    async def generate_content(self, context, **kwargs):
        # 1. Retrieve data from context.state
        stage2_log = context.state.get('stage2_debug_log', "STAGE 2 DEBUG LOG NOT FOUND.")
        track_features = context.state.get('track_features')
        track_data = context.state.get('track_data', [])
        
        # Format candidate song list for the LLM prompt
        candidate_songs_list = []
        if track_data:
            # Send the top 5 tracks to the LLM
            for i, song in enumerate(track_data[:5]):
                candidate_songs_list.append(f"{i+1}. {song['name']} by {song['artist']}")
        
        songs_string = "\n".join(candidate_songs_list) or "No candidate songs found."
        
        # Extract features string for the LLM
        features_str = json.dumps(track_features, indent=2) if track_features else "[]"
        
        # 2. Construct the Detailed Prompt for the LLM
        system_prompt = (
            "You are a technical output summarizer and music curator. Your task is to combine the "
            "provided debug log and track data into a single, comprehensive, formatted markdown response. "
            "Follow the exact structure below:\n\n"
            "1. Start with the header '--- Full Agent Pipeline Output ---\n'."
            "2. Paste the entire contents of the 'DEBUG LOG' exactly as provided."
            "3. Create a section titled '--- Stage 3: Candidate Tracks & Recommendation ---'."
            "4. List the 'CANDIDATE SONGS' using bold markdown for titles."
            "5. Based on the first song in the list, provide a final recommendation in a friendly, single sentence."
        )

        user_query = (
            f"DEBUG LOG:\n{stage2_log}\n"
            f"\nCANDIDATE SONGS ({len(track_data)} total):\n{songs_string}\n"
            f"\nAUDIO FEATURES (Used for selection):\n{features_str}"
        )

        # 3. Call the Gemini API
        payload = {
            "contents": [{ "parts": [{ "text": user_query }] }],
            "systemInstruction": { "parts": [{ "text": system_prompt }] }
        }

        # Handle API key and session
        apiKey = os.environ.get('GEMINI_API_KEY', API_KEY)
        apiUrl = f"{API_URL}?key={apiKey}"
        
        # Use exponential backoff for robustness
        MAX_RETRIES = 5
        for attempt in range(MAX_RETRIES):
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.post(apiUrl, 
                                            headers={'Content-Type': 'application/json'},
                                            data=json.dumps(payload)) as response:
                        
                        if response.status == 200:
                            result = await response.json()
                            generated_text = result.get('candidates')[0]['content']['parts'][0]['text']
                            return generated_text
                        elif response.status == 429 and attempt < MAX_RETRIES - 1:
                            # Handle rate limiting with exponential backoff
                            await asyncio.sleep(2 ** attempt)
                            continue
                        else:
                            error_text = await response.text()
                            return f"❌ LLM Compilation Failed (HTTP {response.status}): {error_text}"

            except Exception as e:
                return f"❌ LLM Compilation Failed (Network Error): {e}"
        
        return "❌ LLM Compilation Failed after multiple retries."

# Ensure the required library for asyncio.sleep is available if needed (for Python ADK)
import asyncio 

fulfillment_agent = SpotifyFulfiller()