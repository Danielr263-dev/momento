import React, { useState, useCallback, useRef } from "react";
import CustomAudioPlayer from "./CustomAudioPlayer"; // adjust the path as needed

const ProgressBar = ({ step }) => {
  const segmentClass = (segment) => {
    let classes = "h-2 rounded-full transition-all duration-700 ease-out ";
    classes += step >= segment
      ? "bg-green-400 shadow-md shadow-green-600/30"
      : "bg-gray-700/50";
    return classes;
  };

  const getWidth = (targetStep) => {
    if (step >= targetStep) return "w-full";
    if (step === targetStep - 1) return "w-1/3";
    return "w-0";
  };

  return (
    <div className="flex space-x-1 mb-4 h-2">
      {[1, 2, 3].map((n) => (
        <div key={n} className="w-1/3 overflow-hidden rounded-full">
          <div className={`${segmentClass(n)} ${getWidth(n)}`} />
        </div>
      ))}
    </div>
  );
};

const App = () => {
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [results, setResults] = useState(null);
  const fileInputRef = useRef(null);
  const MAX_FILE_SIZE = 4 * 1024 * 1024;

  const resetUI = useCallback(() => {
    setUploadedFile(null);
    setIsProcessing(false);
    setAnalysisStep(0);
    setResults(null);
    if (fileInputRef.current) fileInputRef.current.value = null;
  }, []);

  const handleFiles = useCallback((files) => {
    if (!files.length) return;
    const file = files[0];

    if (!file.type.startsWith("image/") || file.size > MAX_FILE_SIZE) {
      alert(
        file.size > MAX_FILE_SIZE
          ? "File too large (max 4MB)."
          : "Please select an image file."
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedFile({
        file,
        name: file.name,
        previewUrl: e.target.result,
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const preventDefaults = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback(
    (e) => {
      preventDefaults(e);
      e.currentTarget.classList.remove("border-opacity-100", "border-purple-300");
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragEnter = useCallback((e) => {
    preventDefaults(e);
    e.currentTarget.classList.add("border-opacity-100", "border-purple-300");
  }, []);

  const handleDragLeave = useCallback((e) => {
    preventDefaults(e);
    e.currentTarget.classList.remove("border-opacity-100", "border-purple-300");
  }, []);

  // Dictionary of dummy data
  const dummyDataset = {
    "car.jpg": {
      analysis: {
        mood: "Dynamic",
        target_features: {
          danceability: 0.7,
          energy: 0.9,
          valence: 0.8,
          acousticness: 0.2,
          tempo: 130,
        },
      },
      match: {
        name: "Sights",
        artist: "Attom",
        distance: 0.96,
        preview_url: "https://p.scdn.co/mp3-preview/fake-url-car.mp3",
        album_art: "/images/sights.jpeg",
        reasoning: "The image, featuring a sleek car in motion on a highway at night" + 
        " against a backdrop of city lights, conveys a strong sense of speed, modernity," +
        " and urban energy. The motion blur and bright headlights emphasize movement and a" +
        " dynamic atmosphere. This leads to the \"Dynamic\" mood, characterized by high energy" +
        " and valence, moderate danceability, a lower acousticness reflecting the urban setting," + 
        " and an upbeat tempo suitable for driving through the city. The instrumentalness is also" +
        " moderately high, suggesting a focus on the journey's feel rather than prominent vocals.",
      },
    },
    "nature.jpg": {
      analysis: {
        mood: "Peaceful",
        target_features: {
          danceability: 0.2,
          energy: 0.3,
          valence: 0.8,
          acousticness: 0.9,
          tempo: 70,
        },
      },
      match: {
        name: "Within Our Midst",
        artist: "Simon Wester",
        distance: 0.88,
        preview_url: "https://p.scdn.co/mp3-preview/fake-url-beach.mp3",
        album_art: "/images/midst.jpg",
        reasoning: "The image depicts a serene forest path bathed in natural" + 
        " light, with lush green and golden foliage. This scene strongly suggests" + 
        " a \"Peaceful\" mood, characterized by a high sense of calm and positivity." + 
        " The features reflect this with high valence and acousticness, low energy and" + 
        " danceability, and high instrumentalness, indicating a preference for gentle," + 
        " organic, and contemplative sounds, all at a slow, unhurried tempo.",
      },
    },
    "stormy.jpg": {
      analysis: {
        mood: "Melancholic",
        target_features: {
          danceability: 0.2,
          energy: 0.4,
          valence: 0.3,
          acousticness: 0.6,
          tempo: 80,
        },
      },
      match: {
        name: "Evenfall",
        artist: "Jacob LaVallee",
        distance: 0.84,
        preview_url: "https://p.scdn.co/mp3-preview/fake-url-beach.mp3",
        album_art: "/images/evenfall.jpeg",
        reasoning: "Considering your feeling of \"melancholic,\" the stormy" + 
        " city night scene, with its dark hues, reflections, and distant" + 
        " lightning, evokes a sense of contemplative sadness rather than" +
        " outright intensity. The lower valence and energy reflect this" +
        " subdued emotional state, while moderate acousticness and high" + 
        " instrumentalness suggest a preference for reflective, possibly" + 
        " piano-driven or orchestral pieces that allow for introspection." + 
        " The slower tempo reinforces the melancholic and unhurried mood.",
      },
    },
    "two-dogs.jpg": {
      analysis: {
        mood: "Joyful",
        target_features: {
          danceability: 0.6,
          energy: 0.8,
          valence: 0.3,
          acousticness: 0.6,
          tempo: 120,
        },
      },
      match: {
        name: "Joyful Joyful",
        artist: "Lil Paul",
        distance: 0.97,
        preview_url: "https://p.scdn.co/mp3-preview/fake-url-beach.mp3",
        album_art: "/images/joyful.jpg",
        reasoning: "The image features two golden retriever puppies" +
        " looking happy and playful in a natural, outdoor setting," + 
        " which evokes a strong sense of joy. The estimated audio" +
        " features reflect this by having high valence (happiness)," +
        " moderate energy and danceability, and high acousticness to" + 
        " match the outdoor environment.",
      },
    },
  };

  const processImageForMatch = useCallback(async () => {
    if (!uploadedFile || isProcessing) return;

    setIsProcessing(true);
    setResults(null);
    setAnalysisStep(1);

    // Simulate progress
    setTimeout(() => setAnalysisStep(2), 800);

    // Simulate backend delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Lookup by filename (lowercased)
    const key = uploadedFile.name.toLowerCase();
    const data = dummyDataset[key] || {
      analysis: {
        mood: "Default Mood",
        target_features: {
          danceability: 0.48,
          energy: 0.37,
          valence: 0.62,
          acousticness: 0.81,
          tempo: 92.5,
        },
      },
      match: {
        name: "untitled",
        artist: " ",
        distance: 0.0,
        preview_url: "https://p.scdn.co/mp3-preview/fake-url-default.mp3",
        album_art: null,
        reasoning: "No matching for specified image",
      },
    };

    setResults(data);
    setAnalysisStep(3);
    setIsProcessing(false);
  }, [uploadedFile, isProcessing, dummyDataset]);

  const dropZoneClasses = `flex flex-col items-center justify-center border-2 border-dashed rounded-xl h-48 text-center cursor-pointer transition-colors duration-200 
    ${uploadedFile ? "hidden" : "border-purple-600 text-purple-200 hover:border-purple-300 hover:text-purple-100 hover:bg-purple-800/20"}`;

  const buttonStyle = isProcessing
    ? "bg-gray-700 text-gray-400 cursor-not-allowed"
    : "bg-purple-600 shadow-lg shadow-purple-900/50 hover:bg-purple-700";

  return (
    <div
      className="flex items-center justify-center min-h-screen p-4 font-sans"
      style={{
        background:
          "radial-gradient(circle at center, #5A2AAC 0%, #3E1C7E 40%, #1E0A3B 100%)",
      }}
    >
      <div className="bg-[#2c1f4d]/80 backdrop-blur-sm rounded-2xl p-8 max-w-xl w-full shadow-[0_0_50px_rgba(150,0,255,0.2)] border border-purple-800/50 flex flex-col items-center text-center">
        {/* Header */}
        <div className="flex items-center justify-between w-full mb-6">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            momento 🎵
          </h1>
          {uploadedFile && (
            <button
              className="text-white/60 hover:text-white transition-colors text-sm flex items-center gap-1"
              onClick={resetUI}
            >
              Reset
            </button>
          )}
        </div>
        <p className="text-white/70 text-lg mb-4">
          Upload any image to discover its best musical counterpart
        </p>

        {isProcessing && <ProgressBar step={analysisStep} />}

        {/* Upload or Preview */}
        <div className="w-full">
          <div
            className={dropZoneClasses}
            onClick={() => fileInputRef.current.click()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={preventDefaults}
            onDrop={handleDrop}
          >
            <svg
              className="mx-auto h-12 w-12 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 16m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="mt-2 text-base font-medium">Drag & drop your image here</p>
            <p className="text-xs text-purple-300/70">
              or click to select file (PNG, JPG, up to 4MB)
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/png, image/jpeg, image/jpg"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          {uploadedFile && (
            <div className="mt-0 flex flex-col items-center">
              <div className="relative w-full h-48 bg-purple-900 rounded-xl overflow-hidden shadow-lg">
                <img
                  src={uploadedFile.previewUrl}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                  </div>
                )}
              </div>
              <p className="text-sm font-medium text-white/80 mt-2 truncate">
                {uploadedFile.name}
              </p>
            </div>
          )}

          {/* Action Button */}
          <button
            disabled={!uploadedFile || isProcessing}
            className={`mt-6 w-full py-3 text-white font-bold rounded-xl transition-all duration-300 ${buttonStyle}`}
            onClick={processImageForMatch}
          >
            {isProcessing
              ? "Analyzing..."
              : results
              ? "Find another match"
              : "Find the musical match"}
          </button>
        </div>

        {/* Results */}
        {results && (
          <div className="mt-8 w-full text-left">
            <h3 className="text-xl font-bold text-white mb-4 text-center">
              🎶 Matched Song
            </h3>

            {results.match.preview_url && (
              <CustomAudioPlayer
                src={results.match.preview_url}
                albumArt={results.match.album_art}
                title={results.match.name}
                artist={results.match.artist}
              />
            )}

            {results.match.reasoning && (
              <div className="mt-6 w-full text-center">
                <h3 className="text-xl font-bold text-white mb-4">🧠 Reasoning</h3>
                <div className="p-4 bg-purple-900/40 rounded-xl border border-purple-700 text-gray-300 shadow-inner">
                  <p className="text-sm">{results.match.reasoning}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;