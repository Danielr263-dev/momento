import React, { useState, useCallback, useRef } from 'react';

// Main App Component
const App = () => {
    // --- State Management ---
    const [uploadedFile, setUploadedFile] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [analysisStep, setAnalysisStep] = useState(0); // 0: Ready, 1: Analysis, 2: Data, 3: Rank, 4: Complete
    const [statusMessage, setStatusMessage] = useState('Ready to process.');
    const [results, setResults] = useState(null); // Stores the final song match object
    const fileInputRef = useRef(null);
    const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB

    // --- Helper Components (Future-proof structure) ---

    // Component to render a single audio feature row
    const FeatureItem = ({ name, value }) => (
        <div className="flex justify-between mb-1 text-xs text-gray-600">
            <span className="font-medium">{name}:</span>
            <span className="font-bold">{value.toFixed(2)}</span>
        </div>
    );

    // --- UI Logic Handlers ---

    const updateStatus = useCallback((message, step, classes = 'text-gray-700 bg-gray-100 border-gray-200') => {
        setStatusMessage(message);
        setAnalysisStep(step);
        // Note: In React, we update classes directly in the main JSX based on state
    }, []);

    const resetUI = useCallback(() => {
        setUploadedFile(null);
        setIsProcessing(false);
        setAnalysisStep(0);
        setStatusMessage('Ready to process.');
        setResults(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = null;
        }
    }, []);

    const handleFiles = useCallback((files) => {
        if (files.length === 0) return;

        const file = files[0];

        if (!file.type.startsWith('image/') || file.size > MAX_FILE_SIZE) {
            const error = file.size > MAX_FILE_SIZE ? '❌ File size exceeds 4MB limit.' : '🚫 Please drop an image file (JPG, PNG).';
            updateStatus(error, 0, 'text-red-600 bg-red-100 border-red-200');
            setUploadedFile(null);
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setUploadedFile({
                file: file,
                name: file.name,
                previewUrl: e.target.result,
                base64Data: e.target.result.split(',')[1]
            });
            updateStatus(`✅ File loaded: ${file.name}. Click 'Find the Music Match' to proceed.`, 0, 'text-green-600 bg-green-100 border-green-200');
        };
        reader.readAsDataURL(file);
    }, [updateStatus]);

    // Drag-and-Drop Handlers
    const preventDefaults = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = useCallback((e) => {
        preventDefaults(e);
        e.currentTarget.classList.remove('drag-zone-active');
        handleFiles(e.dataTransfer.files);
    }, [handleFiles]);

    // --- Core Agent Logic Simulation (Replicating the Staged Workflow) ---

    const processImageForMatch = useCallback(() => {
        if (!uploadedFile || isProcessing) return;

        setIsProcessing(true);
        setResults(null); // Clear previous results

        // Mock data based on file name for a predictable demo
        const isJoyful = uploadedFile.name.toLowerCase().includes('sun') || uploadedFile.name.toLowerCase().includes('party');

        // Stage 1: Image Analysis (Agent 1)
        updateStatus('🚀 Stage 1: Sending image to Gemini for mood and target feature extraction.', 1, 'text-blue-600 bg-blue-100 border-blue-200');

        const mockAnalysisOutput = {
            mood: isJoyful ? 'Energetic & Joyful' : 'Melancholy & Calm',
            target_features: isJoyful ? {
                danceability: 0.90, energy: 0.95, valence: 0.85, instrumentalness: 0.05
            } : {
                danceability: 0.15, energy: 0.20, valence: 0.10, instrumentalness: 0.70
            },
            keyword: isJoyful ? 'Pop-Party' : 'Lofi-Chill'
        };

        // STEP 1 COMPLETE: Display Mock Analysis
        setTimeout(() => {
            // Stage 2: Data Acquisition (Agent 2)
            updateStatus(`🔄 Stage 2: Using keyword "${mockAnalysisOutput.keyword}" to fetch and load candidate tracks from Spotify API.`, 2, 'text-yellow-600 bg-yellow-100 border-yellow-300');

            // Mock Candidate List
            const mockCandidateTracks = [
                { name: "Here Comes The Sun", artist: "The Beatles", energy: 0.7, valence: 0.9, distance: 0.05, spotify_id: "3hrf52x7t1pS0M3nN8nL3i", preview_url: "https://p.scdn.co/mp3-preview/a64f5016e15cc6c723f59e7ed22030f0653606b2?cid=23fe1211e4f44c9b9148d4889c0953c8" },
                { name: "Drivers License", artist: "Olivia Rodrigo", energy: 0.3, valence: 0.2, distance: 0.8, spotify_id: "1hrf52x7t1pS0M3nN8nL3i", preview_url: "https://p.scdn.co/mp3-preview/1a221f7360c707d72224a1879c8ceb2d69f37c38?cid=23fe1211e4f44c9b9148d4889c0953c8" },
                { name: "Lofi Study Beats", artist: "Chill Maestro", energy: 0.1, valence: 0.1, distance: 0.02, spotify_id: "2hrf52x7t1pS0M3nN8nL3i", preview_url: "https://p.scdn.co/mp3-preview/d8804c81881512f7188b48842d0399d8d648c66c?cid=23fe1211e4f44c9b9148d4889c0953c8" },
                { name: "Don't Stop Me Now", artist: "Queen", energy: 0.99, valence: 0.95, distance: 0.1, spotify_id: "4hrf52x7t1pS0M3nN8nL3i", preview_url: "https://p.scdn.co/mp3-preview/5cf4f5a34237199c9d0689b7b6c336b9e4d6a1b2?cid=23fe1211e4f44c9b9148d4889c0953c8" },
            ];

            // Stage 3: ML Ranking (Agent 3)
            setTimeout(() => {
                updateStatus('🧠 Stage 3: Calculating Euclidean Distance for final ranking.', 3, 'text-purple-600 bg-purple-100 border-purple-300');

                // Find the mock best match based on mock mood
                const sortedMatches = mockCandidateTracks
                    .sort((a, b) => a.distance - b.distance); 

                const bestMatch = isJoyful
                    ? sortedMatches.find(t => t.name === "Here Comes The Sun")
                    : sortedMatches.find(t => t.name === "Lofi Study Beats");
                
                // Final State Update
                setResults({
                    analysis: mockAnalysisOutput,
                    match: bestMatch
                });

                // Final Status
                updateStatus(`🎉 Success! Found song "${bestMatch.name}" by ${bestMatch.artist}.`, 4, 'text-green-700 bg-green-100 border-green-300');
                setIsProcessing(false);

            }, 1500); // Stage 3 delay
        }, 1500); // Stage 2 delay

    }, [uploadedFile, isProcessing, updateStatus]);

    // Handle A2A play button click (Mock)
    const mockPlaySong = useCallback(() => {
        updateStatus('Attempting to open song in Spotify... (A2A Command Sent)', 4, 'text-indigo-600 bg-indigo-100 border-indigo-300');
        console.log(`A2A Fulfillment: Playing song with ID ${results.match.spotify_id} in Spotify client.`);
    }, [results]);


    // --- Render Logic (Conditional Rendering) ---

    // Define classes based on processing step
    const getStatusClasses = (step) => {
        let classes = 'mt-4 p-3 rounded-lg text-sm border transition-all duration-300 ';
        if (step === 1) classes += 'text-blue-600 bg-blue-100 border-blue-200';
        else if (step === 2) classes += 'text-yellow-600 bg-yellow-100 border-yellow-300';
        else if (step === 3) classes += 'text-purple-600 bg-purple-100 border-purple-300';
        else if (step === 4) classes += 'text-green-700 bg-green-100 border-green-300';
        else classes += 'text-gray-700 bg-gray-100 border-gray-200';
        return classes;
    };

    const dropZoneClasses = uploadedFile ? 'hidden' : `border-4 border-dashed rounded-lg p-10 text-center cursor-pointer transition-all duration-200 ${isProcessing ? 'border-gray-300' : 'hover:border-blue-500 hover:bg-gray-50 border-gray-300'}`;

    const buttonText = isProcessing ?
        (analysisStep === 1 ? '1/3 Analyzing Image Mood...' : analysisStep === 2 ? '2/3 Acquiring Data Candidates...' : '3/3 Calculating Best Match...') :
        (analysisStep === 4 ? 'Analysis Complete! Find Another?' : 'Find the Music Match');

    const buttonStyle = analysisStep === 4 ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-400 hover:bg-blue-600';


    // --- JSX Return ---

    return (
        <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50 font-sans">
            <div id="app-card" className="bg-white shadow-2xl rounded-xl p-8 max-w-lg w-full transition-all duration-300">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">momento 🎵</h1>
                <p className="text-gray-500 mb-6">Upload an image to generate its musical match using AI analysis.</p>

                {/* Drag & Drop Zone */}
                <div 
                    id="drop-zone"
                    className={dropZoneClasses}
                    onClick={() => fileInputRef.current.click()}
                    onDragEnter={(e) => { preventDefaults(e); e.currentTarget.classList.add('drag-zone-active'); }}
                    onDragLeave={(e) => { preventDefaults(e); e.currentTarget.classList.remove('drag-zone-active'); }}
                    onDragOver={preventDefaults}
                    onDrop={handleDrop}
                >
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 16m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-2 text-sm text-gray-600 font-semibold">Drag and drop your image here</p>
                    <p className="text-xs text-gray-500">or click to select file (PNG, JPG, up to 4MB)</p>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/jpg" onChange={(e) => handleFiles(e.target.files)} />
                </div>

                {/* Image Preview and Status */}
                {uploadedFile && (
                    <div id="preview-container" className="mt-6">
                        <h3 className="text-lg font-semibold text-gray-800 mb-3">Image Preview:</h3>
                        <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden shadow-inner">
                            <img id="image-preview" src={uploadedFile.previewUrl} alt="Image Preview" className="w-full h-full object-cover"/>
                            {/* Simple loader overlay */}
                            {isProcessing && (
                                <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                                    <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            )}
                        </div>
                        <p id="file-name" className="text-sm font-medium text-gray-700 mt-2 truncate">{uploadedFile.name}</p>
                    </div>
                )}

                {/* Action Button */}
                <button
                    id="match-button"
                    disabled={!uploadedFile || isProcessing}
                    className={`mt-6 w-full py-3 text-white font-bold rounded-lg shadow-md transition-all duration-300 ${buttonStyle} disabled:bg-gray-300 disabled:cursor-not-allowed`}
                    onClick={analysisStep === 4 ? resetUI : processImageForMatch}
                >
                    {buttonText}
                </button>

                {/* Status Message Box */}
                <div id="status-box" className={getStatusClasses(analysisStep)}>
                    {statusMessage}
                </div>

                {/* RESULTS Display Panel */}
                {results && results.analysis && (
                    <div id="results-panel" className="mt-8 pt-6 border-t border-gray-200">
                        <h2 className="text-xl font-bold text-gray-900 mb-4">🎶 Analysis Results</h2>
                        
                        {/* Agent 1 Output: Mood and Target Features */}
                        <div id="analysis-output" className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                            <p className="font-semibold text-gray-800 mb-2">1. Image Analysis (Gemini Model):</p>
                            <p id="output-mood" className="text-2xl font-extrabold text-yellow-700">Mood: {results.analysis.mood}</p>
                            
                            <h4 className="mt-3 text-sm font-bold text-gray-700">Target Acoustic Profile:</h4>
                            <div id="output-features" className="grid grid-cols-2 gap-x-4">
                                {Object.entries(results.analysis.target_features).map(([key, value]) => (
                                    <FeatureItem key={key} name={key.charAt(0).toUpperCase() + key.slice(1)} value={value} />
                                ))}
                            </div>
                        </div>

                        {/* Agent 3 Output: Final Song Match */}
                        <div id="match-output" className="p-4 bg-green-50 rounded-lg border border-green-200">
                            <p className="font-semibold text-gray-800 mb-2">3. Final Match & Rank:</p>
                            <div id="final-song-match">
                                <p className="text-2xl font-extrabold text-green-700">{results.match.name}</p>
                                <p className="text-lg text-gray-700 mt-1">{results.match.artist}</p>
                                <p className="text-sm text-gray-500 mt-2">Match Quality (Distance): {results.match.distance.toFixed(4)}</p>
                                
                                {/* 30-second audio preview */}
                                <audio controls className="w-full mt-4 rounded-lg shadow-md">
                                    <source src={results.match.preview_url} type="audio/mpeg" />
                                    Your browser does not support the audio element.
                                </audio>
                            </div>
                            
                            <button 
                                id="play-button" 
                                className="mt-4 py-2 px-4 bg-green-500 text-white font-bold rounded-lg shadow-md hover:bg-green-600 transition-colors"
                                onClick={mockPlaySong}
                            >
                                Open "{results.match.name}" in Spotify (A2A)
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;