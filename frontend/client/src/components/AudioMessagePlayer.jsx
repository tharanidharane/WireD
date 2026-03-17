import { Pause, Play } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

const formatDuration = (value) => {
  if (!Number.isFinite(value) || value < 0) return "00:00";

  const minutes = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
};

function AudioMessagePlayer({ src }) {
  const audioRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;

    const handleLoadedMetadata = () => setDuration(audio.duration || 0);
    const handleTimeUpdate = () => setProgress(audio.currentTime || 0);
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("play", handlePlay);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("play", handlePlay);
    };
  }, []);

  const bars = useMemo(
    () => Array.from({ length: 28 }, (_, index) => 18 + ((index * 9) % 26)),
    []
  );

  const handleTogglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      await audio.play();
    } else {
      audio.pause();
    }
  };

  const handleSeek = (event) => {
    const nextTime = Number(event.target.value);
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = nextTime;
    setProgress(nextTime);
  };

  return (
    <div className="audio-message-player">
      <audio ref={audioRef} src={src} preload="metadata" />
      <button
        type="button"
        className="audio-player-toggle"
        onClick={handleTogglePlayback}
        aria-label={isPlaying ? "Pause voice message" : "Play voice message"}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>

      <div className="audio-player-track">
        <div className="audio-player-waveform" aria-hidden="true">
          {bars.map((height, index) => {
            const activeRatio = duration ? progress / duration : 0;
            const isActive = index / bars.length <= activeRatio;

            return (
              <span
                key={index}
                className={isActive ? "active" : ""}
                style={{ height: `${height}px` }}
              />
            );
          })}
        </div>

        <input
          type="range"
          min="0"
          max={duration || 0}
          step="0.1"
          value={progress}
          onChange={handleSeek}
          className="audio-player-range"
          aria-label="Seek voice message"
        />
      </div>

      <span className="audio-player-time">
        {formatDuration(progress || duration ? progress : 0)} / {formatDuration(duration)}
      </span>
    </div>
  );
}

export default AudioMessagePlayer;
