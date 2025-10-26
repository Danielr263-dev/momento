import json
import os
import base64
import aiohttp 
from google.adk.agents import Agent
from dotenv import load_dotenv
from typing import Optional, List

# Load from .env
load_dotenv() 

# Configure spotify api
SPOTIFY_API_URL = "https://api.spotify.com/v1/"
SPOTIFY_AUTH_URL = "https://accounts.spotify.com/api/token"

# Renamed class for consistency with super().__init__(name='MusicSuggestorAgent')
class MusicSuggestorAgent(Agent): 
    """
    Stage 2: Data Acquisition - Focuses on authenticating and fetching track audio
    features from a public playlist based on the mood keyword from the Vision Agent.
    """
    
    access_token: Optional[str] = None

    def __init__(self, **kwargs):
        super().__init__(
            name='MusicSuggestorAgent',
            model='gemini-2.5-flash',  # Model required by ADK
            instruction='Acquires Spotify track features and passes data and logs to context.state.',
            **kwargs
        )

    # Spotify authentication
    async def get_spotify_access_token(self, debug_log: str) -> tuple[str, str]:
        if self.access_token:
            return self.access_token, debug_log

        client_id = os.environ.get('SPOTIFY_CLIENT_ID')
        client_secret = os.environ.get('SPOTIFY_CLIENT_SECRET')

        # --- CRITICAL CREDENTIAL CHECK AND LOGGING ---
        if not client_id or not client_secret:
            debug_log += "❌ ERROR: SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET is missing or empty in environment.\n"
            raise ValueError("SPOTIFY_CLIENT_ID/SPOTIFY_CLIENT_SECRET not set.")
        
        debug_log += "✅ Credentials found. Attempting Spotify token acquisition...\n"

        auth_str = f"{client_id}:{client_secret}"
        encoded_auth = base64.b64encode(auth_str.encode()).decode()

        headers = {
            'Authorization': f'Basic {encoded_auth}',
            'Content-Type': 'application/x-www-form-urlencoded'
        }
        data = {'grant_type': 'client_credentials'}

        async with aiohttp.ClientSession() as session:
            async with session.post(SPOTIFY_AUTH_URL, headers=headers, data=data) as response:
                if response.status != 200:
                    # Enhanced error reporting: include status and body in the exception
                    error_body = await response.text()
                    debug_log += f"❌ Spotify Auth failed. Status: {response.status}, Response: {error_body[:150]}...\n"
                    raise Exception(f"Spotify Auth failed: {response.status} - {error_body}")
                
                auth_data = await response.json()
                self.access_token = auth_data.get('access_token')
                debug_log += "✅ Access token received successfully.\n"
                return self.access_token, debug_log

    # Search for playlist including keyword
    async def search_playlist(self, keyword: str, token: str):
        headers = {'Authorization': f'Bearer {token}'}
        search_params = {'q': f'playlist:{keyword}', 'type': 'playlist', 'limit': 1}

        async with aiohttp.ClientSession() as session:
            async with session.get(SPOTIFY_API_URL + 'search', headers=headers, params=search_params) as response:
                data = await response.json()
                items = data.get('playlists', {}).get('items', [])
                if not items:
                    return None, None
                playlist = items[0]
                return playlist['id'], playlist['name']

    # Fetch track data
    async def fetch_track_ids(self, playlist_id: str, token: str, limit: int = 50) -> List[dict]:
        headers = {'Authorization': f'Bearer {token}'}
        # Request track ID, name, and the first artist's name
        params = {'limit': limit, 'fields': 'items.track(id,name,artists)'}
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{SPOTIFY_API_URL}playlists/{playlist_id}/tracks", headers=headers, params=params) as resp:
                data = await resp.json()
                track_data = []
                for item in data.get('items', []):
                    track = item.get('track')
                    if track and track.get('id'):
                        artist_name = track['artists'][0]['name'] if track.get('artists') else 'Unknown Artist'
                        track_data.append({
                            'id': track['id'],
                            'name': track['name'],
                            'artist': artist_name
                        })
                return track_data

    # Fetch track audio features
    async def fetch_track_features(self, track_ids: List[str], token: str):
        features = []
        if not track_ids:
            return features

        headers = {'Authorization': f'Bearer {token}'}

        chunk_ids = ",".join(track_ids) 
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{SPOTIFY_API_URL}audio-features?ids={chunk_ids}", headers=headers) as resp:
                data = await resp.json()
                for item in data.get('audio_features', []):
                    if item:
                        vector = [
                            item['danceability'],
                            item['energy'],
                            item['valence'],
                            item['tempo'],
                            item['loudness'],
                            item['acousticness'],
                            item['instrumentalness'],
                            item['speechiness']
                        ]
                        features.append({'id': item['id'], 'vector': vector})
        return features

    # Execution method for adk
    async def generate_content(self, context, **kwargs):
        # Debug log init
        debug_log = "--- DEBUG LOG START (Stage 2) ---\n"
        
        vision_output_json_string = context.state.get('visual_signature')
        
        # Log initial input
        debug_log += f"Input from context.state['visual_signature']: {vision_output_json_string}\n"
        
        if not vision_output_json_string:
            debug_log += "ERROR: visual_signature is None or empty.\n"
            context.state['stage2_debug_log'] = debug_log
            return "ERROR: Vision Agent output (visual_signature) not found."

        try:
            data = json.loads(vision_output_json_string)
            keyword = data.get('mood', 'Relaxing')
            
            # Log extracted keyword
            debug_log += f"Successfully parsed JSON. Extracted Mood Keyword: {keyword}\n"

            # --- START SPOTIFY ACQUISITION ---
            # Pass debug_log to the authentication function to capture errors early
            token, debug_log = await self.get_spotify_access_token(debug_log)
            # debug_log is now updated with credential status and token success/failure details
            debug_log += f"Spotify Token Acquired (Length: {len(token) if token else 0})\n"

            playlist_id, playlist_name = await self.search_playlist(keyword, token)
            
            # Log playlist search results
            debug_log += f"Playlist Search Attempted for '{keyword}'. Result: ID={playlist_id}, Name='{playlist_name}'\n"
            
            if not playlist_id:
                # Append debug log to context.state for next agent
                debug_log += f"❌ Failed to find playlist for keyword: {keyword}\n"
                context.state['stage2_debug_log'] = debug_log + "--- DEBUG LOG END (Stage 2) ---\n"
                return f"❌ Could not find playlist for keyword: {keyword}"

            # Fetch track data (ID, Name, Artist)
            track_data = await self.fetch_track_ids(playlist_id, token)
            track_ids = [t['id'] for t in track_data] # Extract IDs for feature fetching
            
            # Fetch audio features
            track_features = await self.fetch_track_features(track_ids, token)
            
            # Log track count
            debug_log += f"Total Track Data Fetched: {len(track_data)}\n"
            debug_log += f"Total Features Fetched via API: {len(track_features)}\n"

            # --- STORE DATA IN context.state ---
            context.state['track_data'] = track_data 
            context.state['track_features'] = track_features
            debug_log += f"Track metadata and features successfully stored in context.state.\n"


            # --- PREVIEW STRING FOR UI (Stored for the next agent) ---
            preview_list = "\n".join([f"{f['id']} | {f['vector']}" for f in track_features[:5]])
            
            final_output_summary = (
                f"✅ **Spotify Features Acquired (Stage 2)**\n"
                f"Playlist: **{playlist_name}** | Tracks Fetched: {len(track_features)}\n"
                f"Preview of first 5 feature vectors:\n{preview_list}\n"
                f"Data stored in context.state for Stage 3."
            )
            
            # Store debug log and summary in context.state
            context.state['stage2_debug_log'] = debug_log + "--- DEBUG LOG END (Stage 2) ---\n"
            context.state['stage2_summary'] = final_output_summary

            # Return a simple confirmation for the ADK step
            return final_output_summary

        except (json.JSONDecodeError, ValueError) as e:
            # Store error log in context.state
            debug_log += f"Caught JSON/Value Error: {e}\n"
            context.state['stage2_debug_log'] = debug_log + "--- DEBUG LOG END (Stage 2) ---\n"
            return f"❌ Spotify Acquisition Failed: JSON or key error: {e}"
        except Exception as e:
            # Store general exceptions in context.state
            debug_log += f"Caught General Exception: {e}\n"
            context.state['stage2_debug_log'] = debug_log + "--- DEBUG LOG END (Stage 2) ---\n"
            return f"❌ Spotify Acquisition Failed: {e}"


music_agent = MusicSuggestorAgent()
