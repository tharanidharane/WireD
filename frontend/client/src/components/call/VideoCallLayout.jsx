import Avatar from "../Avatar";
import CallControls from "./CallControls";

function VideoCallLayout({
  localVideoRef,
  remoteParticipants = [],
  bindRemoteVideo,
  callStatus,
  remoteName,
  currentUserName = "You",
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onEndCall,
  onShareScreen,
  isAudioOnly = false
}) {
  const visibleRemoteParticipants = remoteParticipants.filter((participant) => participant?.user);

  return (
    <div className="call-overlay">
      <div className={`call-stage-shell ${isAudioOnly ? "audio-only" : ""}`}>
        <div className="call-stage-main">
          {!isAudioOnly ? (
            visibleRemoteParticipants.length > 0 ? (
              <div className={`call-video-grid ${visibleRemoteParticipants.length > 1 ? "multi" : "single"}`}>
                {visibleRemoteParticipants.map((participant) => (
                  <div key={participant.user._id} className="call-video-tile">
                    <video
                      ref={(node) => bindRemoteVideo?.(participant.user._id, node)}
                      autoPlay
                      playsInline
                      className="call-main-video"
                    />
                    <div className="call-video-label">{participant.user.name}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="call-waiting-stage">
                <Avatar user={{ name: remoteName }} className="call-audio-avatar" />
                <h2>{remoteName}</h2>
                <p>{callStatus}</p>
              </div>
            )
          ) : (
            <div className="call-audio-stage">
              <Avatar user={{ name: remoteName }} className="call-audio-avatar" />
              <p className="panel-kicker">Audio call</p>
              <h2>{remoteName}</h2>
              <p>{callStatus}</p>
              <div className="call-voice-bars">
                <span />
                <span />
                <span />
                <span />
                <span />
                <span />
              </div>
            </div>
          )}

          <div className="call-main-overlay">
            <div>
              <p className="panel-kicker">{isAudioOnly ? "Voice room" : "Video call"}</p>
              <h2>{remoteName}</h2>
              <p>{callStatus}</p>
            </div>
          </div>

          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={isAudioOnly ? "hidden-video" : "call-self-video"}
          />
        </div>

        <div className="call-stage-sidebar">
          <h3>Call</h3>
          <div className="call-participant-stack">
            {visibleRemoteParticipants.map((participant) => (
              <div key={participant.user._id} className="call-participant-card">
                <Avatar user={participant.user} className="large" />
                <div>
                  <strong>{participant.user.name}</strong>
                  <p>Connected participant</p>
                </div>
              </div>
            ))}
            <div className="call-participant-card">
              <Avatar user={{ name: currentUserName }} className="large" />
              <div>
                <strong>{currentUserName}</strong>
                <p>You</p>
              </div>
            </div>
            <div className="call-message-card">
              <strong>Live conversation</strong>
              <p>Call controls stay wired to the existing WebRTC flow.</p>
            </div>
          </div>
        </div>

        <div className="call-stage-footer">
          <div className="call-tile-row">
            {visibleRemoteParticipants.map((participant) => (
              <div key={participant.user._id} className="call-mini-tile">
                <Avatar user={participant.user} className="tiny" />
                <span>{participant.user.name}</span>
              </div>
            ))}
            <div className="call-mini-tile">
              <Avatar user={{ name: currentUserName }} className="tiny" />
              <span>{currentUserName}</span>
            </div>
          </div>

          <CallControls
            isAudioOnly={isAudioOnly}
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            onToggleMute={onToggleMute}
            onToggleCamera={onToggleCamera}
            onEndCall={onEndCall}
            onShareScreen={onShareScreen}
          />
        </div>
      </div>
    </div>
  );
}

export default VideoCallLayout;
