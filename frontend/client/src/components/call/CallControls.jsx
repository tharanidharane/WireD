import { Maximize2, Mic, MicOff, MonitorUp, PhoneOff, Video, VideoOff } from "lucide-react";

function CallControls({
  isAudioOnly,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onEndCall,
  onShareScreen
}) {
  const handleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen?.();
      return;
    }

    await document.exitFullscreen?.();
  };

  return (
    <div className="call-controls">
      <button type="button" className="call-control" onClick={onToggleMute} aria-label="Toggle microphone">
        {isMuted ? <MicOff size={18} /> : <Mic size={18} />}
      </button>

      {!isAudioOnly && (
        <button type="button" className="call-control" onClick={onToggleCamera} aria-label="Toggle camera">
          {isCameraOff ? <VideoOff size={18} /> : <Video size={18} />}
        </button>
      )}

      <button
        type="button"
        className="call-control"
        aria-label="Share screen"
        onClick={onShareScreen}
        disabled={isAudioOnly}
      >
        <MonitorUp size={18} />
      </button>

      <button type="button" className="call-control" aria-label="Fullscreen" onClick={handleFullscreen}>
        <Maximize2 size={18} />
      </button>

      <button type="button" className="call-control danger" onClick={onEndCall} aria-label="End call">
        <PhoneOff size={18} />
      </button>
    </div>
  );
}

export default CallControls;
