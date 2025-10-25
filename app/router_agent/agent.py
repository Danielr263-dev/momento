from google.adk.agents import Agent, SequentialAgent
# 1. Import the SignatureExtractor from its specific file path
from vision_agent.agent import SignatureExtractor 

# Placeholders;
# from app.match_engine.agent import MatchEngine 
# from app.spotify_fulfiller.agent import SpotifyFulfiller

# 2. Define the Orchestrator Pipeline
momento_router = SequentialAgent(
    name='momento_router',
    description='Manages the end-to-end workflow: analyzes an image, finds a matching song, and prepares playback data.',
    sub_agents=[
        # Vision Analysis
        SignatureExtractor,
        
        # Matchmaking and Ranking (Placeholder)
        # MatchEngine,
        
        # Fulfillment (Placeholder)
        # SpotifyFulfiller,
    ]
)

# root_agent pointer
root_agent = momento_router