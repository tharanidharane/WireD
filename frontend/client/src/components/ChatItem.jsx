import { memo } from "react";
import Avatar from "./Avatar";

const formatRelativeTime = (time) => {
  if (!time) return "";

  const now = new Date();
  const target = new Date(time);
  const diffMinutes = Math.max(1, Math.round((now - target) / 60000));

  if (diffMinutes < 60) return `${diffMinutes}m`;
  if (diffMinutes < 1440) return `${Math.round(diffMinutes / 60)}h`;
  return `${Math.round(diffMinutes / 1440)}d`;
};

function ChatItem({
  title,
  subtitle,
  time,
  badge,
  avatarUser,
  active,
  onClick,
  trailing,
  variant = "conversation",
  isOnline,
  isPinned
}) {
  return (
    <button
      type="button"
      className={`chat-list-item ${active ? "active" : ""} ${variant}`}
      onClick={onClick}
    >
      <div className="chat-avatar-wrap">
        <Avatar user={avatarUser} className="chat-list-avatar" />
        {isOnline ? <span className="chat-online-dot" /> : null}
      </div>
      <div className="chat-list-copy">
        <div className="chat-list-topline">
          <strong>{title}</strong>
          <span>{time ? formatRelativeTime(time) : trailing || ""}</span>
        </div>
        <div className="chat-list-bottomline">
          <p>{subtitle}</p>
          <div className="chat-row-meta">
            {isPinned ? <span className="chat-pin-indicator" /> : null}
            {badge ? <span className="chat-unread-badge">{badge}</span> : null}
          </div>
        </div>
      </div>
    </button>
  );
}

export default memo(ChatItem);
