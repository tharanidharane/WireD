import { Phone, PhoneOff, Video } from "lucide-react";
import Avatar from "../Avatar";

function IncomingCallModal({ call, onAccept, onReject }) {
  if (!call) return null;

  const title = call.conversationType === "group"
    ? `${call.conversationName || "Group"}`
    : call.caller?.name || "Unknown caller";

  const description = call.conversationType === "group"
    ? `${call.callType === "video" ? "Video" : "Audio"} call for ${call.conversationName || "your group"}`
    : call.callType === "video"
      ? "Video call request"
      : "Audio call request";

  return (
    <div className="call-overlay">
      <div className="incoming-call-card">
        <Avatar user={call.caller} className="xl" />
        <p className="eyebrow">Incoming {call.callType} call</p>
        <h2>{title}</h2>
        <p className="incoming-call-copy">{description}</p>

        <div className="incoming-call-actions">
          <button type="button" className="call-action-button decline" onClick={onReject}>
            <PhoneOff size={18} />
            <span>Decline</span>
          </button>
          <button type="button" className="call-action-button accept" onClick={onAccept}>
            {call.callType === "video" ? <Video size={18} /> : <Phone size={18} />}
            <span>Accept</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default IncomingCallModal;
