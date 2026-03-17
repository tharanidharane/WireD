import VideoCallLayout from "./VideoCallLayout";

function AudioCall({
  localVideoRef,
  remoteVideoRef,
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
      remoteVideoRef={remoteVideoRef}
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
