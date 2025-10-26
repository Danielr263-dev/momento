import os
import requests
import base64
import json
from google.adk.tools import FunctionTool
import numpy as np
import random

# Define constants
SPOTIFY_AUTH_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_API_BASE = "https://api.spotify.com/v1/"

# Default features used for error handling/missing data points
DEFAULT_FEATURES = {
    "danceability": 0.5,
    "energy": 0.5,
    "valence": 0.5,
    "acousticness": 0.5,
    "instrumentalness": 0.1,
    "tempo": 120.0
}

# Spotify authentication
def get_spotify_access_token() -> str:
    """Authenticates with Spotify using client credentials flow."""
    client_id = os.environ.get('SPOTIFY_CLIENT_ID')
    client_secret = os.environ.get('SPOTIFY_CLIENT_SECRET')
    if not client_id or not client_secret:
        raise ValueError("Spotify credentials not set in environment variables.")

    auth_str = f"{client_id}:{client_secret}"
    encoded_auth = base64.b64encode(auth_str.encode()).decode()
    headers = {
        'Authorization': f'Basic {encoded_auth}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    data = {'grant_type': 'client_credentials'}
    response = requests.post(SPOTIFY_AUTH_URL, headers=headers, data=data)
    response.raise_for_status()
    access_token = response.json().get('access_token')
    if not access_token:
        raise Exception("Spotify token response missing access_token.")
    return access_token


# Playlist search tool with Top 50 fallback
def search_spotify_playlist(keyword: str, limit: int = 1) -> str:
    """Searches Spotify for a playlist matching the keyword, falling back to Global Top 50 if none is found."""
    try:
        token = get_spotify_access_token()
        headers = {'Authorization': f'Bearer {token}'}
        params = {'q': keyword, 'type': 'playlist', 'limit': limit}
        response = requests.get(SPOTIFY_API_BASE + 'search', headers=headers, params=params)
        response.raise_for_status()

        data = response.json()
        playlists = data.get('playlists', {})
        items = playlists.get('items', [])

        if not items:
            # Fallback to a default Top 50 playlist (Spotify’s Global Top 50 ID)
            top50_playlist_id = "37i9dQZEVXbMDoHDwVN2tF"  # Global Top 50
            top50_playlist_name = "Top 50 - Global"
            return json.dumps({
                "playlist_id": top50_playlist_id,
                "playlist_name": top50_playlist_name,
                "note": f"No playlist found for '{keyword}', defaulted to Top 50"
            })

        playlist = items[0]
        playlist_id = playlist.get('id')
        playlist_name = playlist.get('name')

        if not playlist_id:
             return json.dumps({"error": "Search tool found a playlist but it was invalid or missing an ID."})

        return json.dumps({
            "playlist_id": playlist_id,
            "playlist_name": playlist_name,
        })

    except Exception as e:
        return json.dumps({"error": f"Search tool failed: {str(e)}"})

SearchPlaylistTool = FunctionTool(func=search_spotify_playlist)


# Access playlist metadata
def get_playlist_track_metadata(playlist_id: str, limit: int = 3) -> str:
    """Fetches simple metadata for the first N tracks in a playlist."""
    try:
        token = get_spotify_access_token()
        headers = {'Authorization': f'Bearer {token}'}
        params = {'limit': limit}
        response = requests.get(f"{SPOTIFY_API_BASE}playlists/{playlist_id}/tracks", headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        track_data = []
        for item in data.get('items', []):
            track = item.get('track')
            if track and track.get('id'):
                artist_name = track['artists'][0]['name'] if track.get('artists') else 'Unknown Artist'
                track_data.append({'id': track['id'], 'name': track['name'], 'artist': artist_name})
        return json.dumps({"tracks": track_data})
    except Exception as e:
        return json.dumps({"error": f"Metadata tool failed: {str(e)}"})

TrackMetadataTool = FunctionTool(func=get_playlist_track_metadata)


# Fetch Spotify audio features
def get_track_features(track_ids: list[str]) -> dict:
    """Fetches audio features for a list of track IDs, using safe defaults for missing values."""
    features_map = {}
    token = get_spotify_access_token()
    headers = {'Authorization': f'Bearer {token}'}

    for i in range(0, len(track_ids), 50):
        batch = track_ids[i:i+50]
        ids_param = ','.join(batch)
        try:
            response = requests.get(
                f"{SPOTIFY_API_BASE}audio-features",
                headers=headers,
                params={'ids': ids_param}
            )
            response.raise_for_status()
            for f in response.json().get('audio_features', []):
                if f and f.get('id'):
                    # Create the vector using safe defaults for any features that might be None
                    features_map[f['id']] = np.array([
                        f.get('danceability') if f.get('danceability') is not None else DEFAULT_FEATURES['danceability'],
                        f.get('energy') if f.get('energy') is not None else DEFAULT_FEATURES['energy'],
                        f.get('valence') if f.get('valence') is not None else DEFAULT_FEATURES['valence'],
                        f.get('acousticness') if f.get('acousticness') is not None else DEFAULT_FEATURES['acousticness'],
                        f.get('instrumentalness') if f.get('instrumentalness') is not None else DEFAULT_FEATURES['instrumentalness'],
                        (f.get('tempo') if f.get('tempo') is not None else DEFAULT_FEATURES['tempo']) / 200.0 # Tempo scaling
                    ])
        except requests.exceptions.HTTPError as e:
            print(f"Warning: batch {batch} failed: {e}")
            continue
    return features_map


def cosine_similarity(vec1: np.ndarray, vec2: np.ndarray) -> float:
    """Calculates the cosine similarity between two NumPy vectors."""
    if vec1 is None or vec2 is None:
        return 0.0
    norm1, norm2 = np.linalg.norm(vec1), np.linalg.norm(vec2)
    # Return 0.0 if either vector has zero magnitude (e.g., all features are 0)
    if norm1 == 0 or norm2 == 0:
        return 0.0
    return float(np.dot(vec1, vec2) / (norm1 * norm2))


# Most similar tracks tool

def get_most_similar_tracks(playlist_id: str, target_features: dict, limit: int = 3) -> str:
    """
    Retrieves tracks from a playlist, calculates cosine similarity against
    the target features, and returns the top matches. 
    Missing features get small random variations added to avoid identical vectors.
    """
    try:
        token = get_spotify_access_token()
        headers = {'Authorization': f'Bearer {token}'}
        params = {'limit': 50}  # fetch up to 50 tracks
        response = requests.get(f"{SPOTIFY_API_BASE}playlists/{playlist_id}/tracks", headers=headers, params=params)
        response.raise_for_status()
        data = response.json()
        
        # Get track metadata
        tracks = [
            {'id': t['track']['id'], 'name': t['track']['name'], 'artist': t['track']['artists'][0]['name']}
            for t in data.get('items', []) if t.get('track') and t['track'].get('id')
        ]

        # Get audio features for the tracks
        features_map = get_track_features([t['id'] for t in tracks])

        # Create the target feature vector
        target_vec = np.array([
            target_features.get('danceability') if target_features.get('danceability') is not None else DEFAULT_FEATURES['danceability'],
            target_features.get('energy') if target_features.get('energy') is not None else DEFAULT_FEATURES['energy'],
            target_features.get('valence') if target_features.get('valence') is not None else DEFAULT_FEATURES['valence'],
            target_features.get('acousticness') if target_features.get('acousticness') is not None else DEFAULT_FEATURES['acousticness'],
            target_features.get('instrumentalness') if target_features.get('instrumentalness') is not None else DEFAULT_FEATURES['instrumentalness'],
            (target_features.get('tempo') if target_features.get('tempo') is not None else DEFAULT_FEATURES['tempo']) / 200.0
        ])

        # Add random noise
        def with_noise(val, scale=0.25, min_val=0.0, max_val=1.0):
            noisy = val + random.uniform(-scale, scale)
            return max(min(noisy, max_val), min_val)

        # Find similarity
        for t in tracks:
            base_vec = features_map.get(t['id'])
            if base_vec is None:
                # Use default features with small random noise for each dimension
                base_vec = np.array([
                    with_noise(DEFAULT_FEATURES['danceability']),
                    with_noise(DEFAULT_FEATURES['energy']),
                    with_noise(DEFAULT_FEATURES['valence']),
                    with_noise(DEFAULT_FEATURES['acousticness']),
                    with_noise(DEFAULT_FEATURES['instrumentalness']),
                    with_noise(DEFAULT_FEATURES['tempo'] / 200.0)
                ])
            t['similarity'] = cosine_similarity(base_vec, target_vec)

        # Rank and return top matches
        top_tracks = sorted(tracks, key=lambda x: x['similarity'], reverse=True)[:limit]
        return json.dumps({'top_matches': top_tracks}, indent=2)

    except Exception as e:
        return json.dumps({'error': f'Similarity functionality failed: {str(e)}'})

SimilarTracksTool = FunctionTool(func=get_most_similar_tracks)