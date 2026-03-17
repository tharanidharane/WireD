import VideoCallLayout from "./VideoCallLayout";

function VideoCall({
  localVideoRef,
  remoteParticipants,
  bindRemoteVideo,
  callStatus,
  remoteName,
  isMuted,
  isCameraOff,
  onToggleMute,
  onToggleCamera,
  onEndCall,
  onShareScreen,
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
      isCameraOff={isCameraOff}
      onToggleMute={onToggleMute}
      onToggleCamera={onToggleCamera}
      onEndCall={onEndCall}
      onShareScreen={onShareScreen}
    />
  );
}

export default VideoCall;
