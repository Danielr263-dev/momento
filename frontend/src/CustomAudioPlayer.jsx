import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2 } from "lucide-react";

export default function CustomAudioPlayer({ src, albumArt, title, artist }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0 to 100
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) audio.pause();
    else audio.play();

    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoaded = () => setDuration(audio.duration || 0);
    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress(((audio.currentTime / audio.duration) * 100) || 0);
    };

    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTimeUpdate);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
    };
  }, [src]);

  const handleSeek = (e) => {
    const newProgress = parseFloat(e.target.value);
    setProgress(newProgress);

    const audio = audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = (newProgress / 100) * audio.duration;
      setCurrentTime(audio.currentTime);
    }
  };

  const formatTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="w-full bg-purple-900/80 rounded-2xl px-4 py-3 flex items-center gap-4 shadow-lg border border-purple-700">
      {/* Album Art */}
      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden shadow-md">
        <img
          src={albumArt}
          alt={title}
          className="w-full h-full object-cover"
        />
      </div>

      {/* Track Info + Controls */}
      <div className="flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-white font-bold truncate">{title}</p>
            <p className="text-gray-300 text-sm truncate">{artist}</p>
          </div>
          <button
            onClick={togglePlay}
            className="text-green-400 hover:text-green-300 transition-colors ml-2"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
          </button>
        </div>

        {/* Progress Bar */}
        <input
          type="range"
          min={0}
          max={100}
          value={progress}
          onChange={handleSeek}
          className="w-full h-1.5 mt-2 bg-purple-800 rounded-full appearance-none accent-green-400 cursor-pointer"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <Volume2 className="text-gray-300 ml-2" size={20} />

      {src && <audio ref={audioRef} src={src} preload="metadata" />}
    </div>
  );
}