import VideoCallLayout from "./VideoCallLayout";

function AudioCall({
  localVideoRef,
  remoteParticipants,
  bindRemoteVideo,
  callStatus,
  remoteName,
  isMuted,
  onToggleMute,
  onEndCall,
  currentUserName
}) {
  return (
    <VideoCallLayout
      localVideoRef={localVideoRef}
      remoteParticipants={remoteParticipants}
      bindRemoteVideo={bindRemoteVideo}
      callStatus={callStatus}
      remoteName={remoteName}
      currentUserName={currentUserName}
      isMuted={isMuted}
      isCameraOff
      onToggleMute={onToggleMute}
      onToggleCamera={() => {}}
      onEndCall={onEndCall}
      onShareScreen={() => {}}
      isAudioOnly
    />
  );
}

export default AudioCall;
