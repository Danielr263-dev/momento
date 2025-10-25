from google.adk.agents.llm_agent import LlmAgent

SignatureExtractor = LlmAgent(
    model='gemini-2.5-flash',
    name='SignatureExtractor',
    description='Analyzes visual input to extract an emotional keyword and an estimated acoustic feature vector for music matching.',
    instruction=(
        "You are a visual emotion and mood analyzer. "
        "Given an image, infer the emotional atmosphere, lighting intensity, color tone, and energy level. "
        "Return your analysis as a single JSON object **without** any extra text or formatting. "
        "Your JSON must strictly have this exact structure:\n\n"
        "{\n"
        '  "mood": "<a single, strong adjective>",\n'
        '  "features": {\n'
        '    "valence": <float between 0 and 1>,  // happiness or positivity of the mood\n'
        '    "energy": <float between 0 and 1>,   // perceived intensity or activity\n'
        '    "danceability": <float between 0 and 1>,  // how rhythmically fluid or dynamic the image feels\n'
        '    "acousticness": <float between 0 and 1>,  // how natural/organic vs synthetic it feels\n'
        '    "instrumentalness": <float between 0 and 1>,  // degree of calm, minimal, or ambient quality\n'
        '    "tempo": <integer between 40 and 200>  // estimated beats per minute representing visual pacing\n'
        '  }\n'
        "}\n\n"
        "Rules:\n"
        "- Output only valid JSON.\n"
        "- Choose a strong, descriptive mood adjective.\n"
        "- Estimate features consistently so they could align with Spotify's audio_features.\n"
        "- Do not add explanations, markdown, or commentary."
    ),
    output_key='visual_signature',
    tools=[]
)