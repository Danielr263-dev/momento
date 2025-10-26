from google.adk.agents import Agent, SequentialAgent
# Import SignatureExtractor agent
from vision_agent.agent import SignatureExtractor 
from music_agent.agent import music_agent
from fulfillment_agent.agent import fulfillment_agent

# Define the sequential pipeline
momento_router = SequentialAgent(
    name='momento_router',
    description='Manages the end-to-end workflow: analyzes an image, finds a matching song, and prepares playback data.',
    sub_agents=[
        # Vision Analysis
        SignatureExtractor,
        # Music analysis
        music_agent,
        # Maps vision to music
        fulfillment_agent,
        # SpotifyFulfiller,
    ]
)

# root_agent pointer
root_agent = momento_router