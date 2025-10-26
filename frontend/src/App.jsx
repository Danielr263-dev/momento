import React, { useState, useCallback, useRef } from "react";

// --- Progress Bar Component ---
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

  const FeatureItem = ({ name, value }) => (
    <div className="flex justify-between mb-1 text-xs text-gray-400">
      <span className="font-medium">{name}:</span>
      <span className="font-bold">{value.toFixed(2)}</span>
    </div>
  );

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
          ? "❌ File too large (max 4MB)."
          : "🚫 Please select an image file."
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

  // --- NEW: Call backend instead of fake processing ---
  const processImageForMatch = useCallback(async () => {
    if (!uploadedFile || isProcessing) return;

    setIsProcessing(true);
    setResults(null);
    setAnalysisStep(1);

    const formData = new FormData();
    formData.append("file", uploadedFile.file);

    try {
      const res = await fetch("http://127.0.0.1:8000/analyze-image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (data.success) {
        setResults(data.data);
        setAnalysisStep(3);
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      alert("Network error: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedFile, isProcessing]);

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
            <p className="mt-2 text-base font-medium">
              Drag & drop your image here
            </p>
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
                    <svg
                      className="animate-spin h-8 w-8 text-white"
                      viewBox="0 0 24 24"
                    >
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
              🎶 Musical Match
            </h3>

            <div className="mb-6 p-4 bg-purple-900/40 rounded-xl border border-purple-700 shadow-inner">
              <p className="font-semibold text-gray-200 mb-2">Image Analysis:</p>
              <p className="text-2xl font-extrabold text-purple-300">
                Mood: {results.analysis.mood}
              </p>

              <h4 className="mt-4 text-sm font-bold text-gray-300">
                Target Acoustic Profile:
              </h4>
              <div className="grid grid-cols-2 gap-x-4">
                {Object.entries(results.analysis.target_features).map(
                  ([key, value]) => (
                    <FeatureItem
                      key={key}
                      name={key.charAt(0).toUpperCase() + key.slice(1)}
                      value={value}
                    />
                  )
                )}
              </div>
            </div>

            <div className="p-4 bg-purple-900/60 rounded-xl border border-purple-500 shadow-xl">
              <p className="font-semibold text-gray-100 mb-2">Final Match:</p>
              <p className="text-2xl font-extrabold text-green-400">
                {results.match.name}
              </p>
              <p className="text-lg text-gray-200 mt-1">{results.match.artist}</p>
              <p className="text-sm text-gray-400 mt-2">
                Match Quality: {results.match.distance.toFixed(4)}
              </p>

              {results.match.preview_url && (
                <audio
                  controls
                  className="w-full mt-4 rounded-lg shadow-md bg-purple-700"
                >
                  <source src={results.match.preview_url} type="audio/mpeg" />
                  Your browser does not support the audio element.
                </audio>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
