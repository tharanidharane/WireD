import { Download, Eye, Flame, Image as ImageIcon, Play, Smile, Trash2 } from "lucide-react";
import AudioMessagePlayer from "./AudioMessagePlayer";
import Avatar from "./Avatar";
import { getAssetUrl } from "../utils/media";
import { getMessageKind } from "../utils/messageType";

const formatTime = (time) =>
  new Date(time).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });

function MessageBubble({
  message,
  isOwn,
  currentUser,
  activeFriend,
  onDeleteMessage,
  onOpenEmojiPicker,
  isRead
}) {
  const canDelete = isOwn && !message.pending;
  const sender = isOwn ? currentUser : message.sender || activeFriend;
  const messageKind = getMessageKind(message);
  const mediaUrl = message.mediaUrl ? getAssetUrl(message.mediaUrl) : "";

  return (
    <div className={`message-row ${isOwn ? "own" : ""}`}>
      {!isOwn && <Avatar user={sender} className="tiny message-avatar" />}

      <div className={`message-stack ${isOwn ? "own" : ""}`}>
        <div className="message-author-row">
          <strong>{sender?.name || "User"}</strong>
          <span>{formatTime(message.timestamp)}</span>
        </div>

        <div className={`message-bubble ${isOwn ? "own" : ""} ${message.pending ? "pending" : ""}`}>
          {canDelete && (
            <button
              type="button"
              className="message-delete"
              onClick={() => onDeleteMessage(message)}
              aria-label="Delete message"
            >
              <Trash2 size={14} />
            </button>
          )}

          {message.messageText && message.messageText !== "__voice__" && messageKind === "text" && (
            <p>{message.messageText}</p>
          )}

          {messageKind === "image" && message.mediaUrl && (
            <img src={mediaUrl} alt="shared content" className="message-media" />
          )}

          {messageKind === "audio" && message.mediaUrl && (
            <AudioMessagePlayer src={mediaUrl} />
          )}

          {messageKind === "video" && message.mediaUrl && (
            <video controls className="message-media">
              <source src={mediaUrl} />
            </video>
          )}

          {messageKind === "file" && message.mediaUrl && (
            <a href={mediaUrl} target="_blank" rel="noreferrer" className="file-message-card">
              <span className="file-message-icon">
                {message.mediaType === "image" ? <ImageIcon size={18} /> : <Download size={18} />}
              </span>
              <span className="file-message-copy">
                <strong>Shared file</strong>
                <span>Open or download</span>
              </span>
            </a>
          )}

          <div className="message-reactions">
            <button
              type="button"
              className="reaction-pill"
              onClick={onOpenEmojiPicker}
              aria-label="Add emoji"
            >
              <Smile size={12} />
            </button>
            <span className={`reaction-pill ${isRead ? "read" : ""}`} aria-label={isRead ? "Read" : "Unread"}>
              {messageKind === "video" ? <Flame size={12} /> : <Eye size={12} />}
            </span>
            {messageKind === "video" && (
              <span className="reaction-pill" aria-hidden="true">
                <Play size={12} />
              </span>
            )}
          </div>

          <div className="message-meta">
            <span className="message-time">{formatTime(message.timestamp)}</span>
            {isOwn && !message.pending && (
              <span className={`message-status ${isRead ? "read" : ""}`}>
                <Eye size={12} />
                {isRead ? "Read" : "Sent"}
              </span>
            )}
            {message.pending && <span className="message-status">Sending...</span>}
          </div>
        </div>
      </div>

      {isOwn && <Avatar user={sender} className="tiny message-avatar" />}
    </div>
  );
}

export default MessageBubble;
